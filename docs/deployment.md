# Deployment

Two hosts, two jobs. The Angular build is static and goes onto the Hetzner web space; n8n needs
Docker and a root shell, which shared hosting does not give you, so it runs on a small Hetzner Cloud
server.

| Part           | Host                       | Address                             |
| -------------- | -------------------------- | ----------------------------------- |
| Static site    | Hetzner web space (Apache) | `code-a-cuisine.thomas-toebbe.de`   |
| n8n + Gemini   | Hetzner Cloud VPS (CX22)   | `n8n.thomas-toebbe.de`              |
| Recipe library | Firebase Firestore         | unchanged, no deployment of its own |

Both names are hard-wired in a handful of places — see [Changing the domains](#changing-the-domains)
at the bottom if you use different ones.

> **Why n8n has to be on HTTPS:** the site is served over `https`, so a call to an `http` webhook is
> blocked by the browser as mixed content. The frontend would only ever show the generic
> `internal_error` dialog. Caddy handles the certificate, so this is taken care of below.

---

## The workflows

Everything that is repeatable runs in GitHub Actions. What is left by hand is the one-time server
setup further down — creating a VPS or an SSH key is not something a pipeline should do.

| Workflow                                                        | Runs on                                                                                 | Does                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [ci.yml](../.github/workflows/ci.yml)                           | every push and pull request, any branch                                                 | `npm ci` → `npm run lint` → `npm run build`              |
| [deploy-frontend.yml](../.github/workflows/deploy-frontend.yml) | push to `main` touching `src/`, `public/`, `angular.json`, `package*.json`; or manually | builds and mirrors the build output onto the web space   |
| [deploy-n8n.yml](../.github/workflows/deploy-n8n.yml)           | **manually only**                                                                       | copies compose files and workflows to the VPS, starts it |

`deploy-n8n.yml` has no push trigger on purpose: the VPS only exists for the submission phase and
gets deleted afterwards. A workflow firing at a server that is gone would just produce red runs.

Both deploy workflows run under the `production` environment, so their runs show up under
**Deployments** in the repository. GitHub creates that environment on the first run; it has no
approval rules unless you add them.

### Running a deployment

**Actions** tab → pick the workflow → **Run workflow**. `deploy-frontend.yml` also fires by itself on
every relevant push to `main`.

---

## Secrets

**Settings → Secrets and variables → Actions → New repository secret.** Names have to match exactly.

### Web space — used by `deploy-frontend.yml`

| Secret            | Required           | Where it comes from                                                                                   |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `SFTP_HOST`       | yes                | konsoleH → the SSH/SFTP host of the web space (e.g. `wXXXXXXX.kasserver.com` or `thomas-toebbe.de`)   |
| `SFTP_USER`       | yes                | konsoleH → the FTP/SSH user of the web space                                                          |
| `SFTP_PASSWORD`   | one of the two     | the password set for that user in konsoleH                                                            |
| `SFTP_KEY`        | one of the two     | private OpenSSH key **including** the `-----BEGIN/END-----` lines, whose public half sits in konsoleH |
| `SFTP_PORT`       | no, defaults to 22 | only needed if the host listens elsewhere                                                             |
| `SFTP_REMOTE_DIR` | yes                | **absolute** path of the subdomain's document root, e.g. `/code-a-cuisine.thomas-toebbe.de`           |

`SFTP_KEY` wins if both are set. A key is the better option — a password ends up in `sshpass`, which
works but is one more secret that can leak.

> `SFTP_REMOTE_DIR` has to be absolute and point one level below the account root. The upload runs
> `mirror --delete`, so whatever sits in that directory and is not part of the build gets removed.
> The workflow refuses a relative path, an empty value or plain `/` rather than mirroring into the
> account root and taking other subdomains with it.

### VPS — used by `deploy-n8n.yml`

| Secret        | Where it comes from                                                                  |
| ------------- | ------------------------------------------------------------------------------------ |
| `VPS_HOST`    | the server's IPv4 address, or `n8n.thomas-toebbe.de` once the A record resolves      |
| `VPS_USER`    | `root` (that is the user the Hetzner image ships with)                               |
| `VPS_SSH_KEY` | private OpenSSH key whose public half you handed to Hetzner when creating the server |

Both private keys go in as-is, line breaks and all — GitHub stores multi-line secrets fine. Generate
a deploy-only pair with `ssh-keygen -t ed25519 -f deploy_key -C "github-actions"` rather than reusing
a personal key.

---

## Part 1 — one-time setup of the web space

### 1. Create the subdomain

In konsoleH: add `code-a-cuisine.thomas-toebbe.de` as a subdomain with its own document root, and
switch on the free SSL certificate. Wait for it to be issued.

### 2. Note the document root

The path konsoleH shows for that subdomain is what goes into `SFTP_REMOTE_DIR`. Log in once by hand
to confirm the path exists before the first deployment — a typo here means the mirror creates a new
directory that no domain points at:

```bash
sftp <user>@<host>
ls /code-a-cuisine.thomas-toebbe.de
```

### 3. Deploy

Push to `main`, or run `deploy-frontend.yml` manually. The workflow lints, builds with the production
configuration ([environment.prod.ts](../src/environments/environment.prod.ts), and with it the public
webhook URL), then mirrors `dist/code-a-cuisine/browser/` into the document root.

**About the `.htaccess`:** [public/.htaccess](../public/.htaccess) carries the SPA rewrite and the
HTTPS redirect, and it is a dotfile — the classic thing for a deployment to drop silently, because
the landing page still works afterwards and only deep links 404. Two guards cover it:

- `angular.json` copies it into the build output through an explicit asset entry, and the workflow
  fails before connecting if it is not in `dist/`.
- `lftp mirror` reads the local directory itself instead of expanding a shell glob, so dotfiles are
  part of the upload. After the mirror the workflow lists `.htaccess` on the server and fails the run
  if it is not there.

That is also the first thing to check if `/generator` 404s after a reload while the landing page
works.

---

## Part 2 — one-time setup of the VPS

### 1. Create the server and the DNS record

In the Hetzner Cloud console: new project, new server, **CX22**, Ubuntu 24.04, your SSH key. About
€4 a month, billed by the hour, so it can be deleted again after the project is graded.

Then in the Hetzner DNS console for `thomas-toebbe.de`:

| Type | Name  | Value                     |
| ---- | ----- | ------------------------- |
| A    | `n8n` | the server's IPv4 address |

Let's Encrypt only issues the certificate once this record resolves, so set it before the first
deployment.

### 2. Install Docker

```bash
ssh root@<server-ip>
curl -fsSL https://get.docker.com | sh
```

### 3. Create the environment file

`deploy-n8n.yml` deliberately never writes `.env` — it holds `N8N_ENCRYPTION_KEY`, and overwriting it
would make the stored Gemini credential undecryptable. So it is created once, by hand:

```bash
mkdir -p /opt/code-a-cuisine
cd /opt/code-a-cuisine
openssl rand -hex 32          # paste the output as N8N_ENCRYPTION_KEY
nano .env                     # template: n8n/deploy/.env.example in the repository
```

Write the encryption key down. Without it a restored volume cannot decrypt the credentials.

The deployment checks for this file and stops with a clear error if it is missing, rather than
starting containers with empty variables.

### 4. Create the credentials

The two credentials (Gemini API key, Gmail SMTP) live in the n8n UI only and are never part of a
deployment. They have to exist **before** the first workflow import, otherwise the nodes come up with
an empty credential picker. The editor UI is not public — Caddy answers everything except
`/webhook/*` with a 404 and n8n binds its port to loopback — so reach it through an SSH tunnel:

```bash
ssh -L 5678:localhost:5678 root@<server-ip>
```

Then open `http://localhost:5678`, create the owner account, and follow
[n8n/README.md](../n8n/README.md).

Chicken and egg: the credentials need a running n8n, and the first `deploy-n8n.yml` run is what
starts it. So run the workflow once, create the credentials through the tunnel, then run it again —
the second run imports the workflows against existing credentials.

### 5. Deploy

Actions → **Deploy n8n** → **Run workflow**. It copies `n8n/deploy/` and both `*.workflow.json` files
to `/opt/code-a-cuisine/`, runs `docker compose up -d`, and imports the workflows through the n8n CLI
inside the container.

Caddy needs ports 80 and 443. If the Hetzner firewall is on, both have to be open.

### 6. Activate the main workflow

**The import leaves both workflows inactive** — an n8n import never carries an active flag, so the
webhook does not answer yet. This is a one-off; activation survives later deployments:

```bash
cd /opt/code-a-cuisine
docker compose exec -T n8n n8n update:workflow --id=codeacuisine-generate-recipe --active=true
docker compose restart n8n   # registers the production webhook URL
```

The same commands are printed in the run summary of every deployment.

> Re-running the deployment imports by workflow ID and **overwrites** what is on the server. That is
> what makes the repository the source of truth — but it also means edits made in the server UI are
> gone unless they were exported back into `n8n/*.workflow.json` first. See
> [n8n/README.md](../n8n/README.md).

### 7. Smoke test

```bash
curl -X POST https://n8n.thomas-toebbe.de/webhook/generate-recipe \
  -H "Content-Type: application/json" \
  -H "Origin: https://code-a-cuisine.thomas-toebbe.de" \
  -d '{"ingredients":[{"name":"Pasta","amount":200,"unit":"g"}],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```

Expected: HTTP 200 with `"status":"ok"` and three recipes, plus an
`Access-Control-Allow-Origin` header carrying the origin back. A `"status":"error"` with
`internal_error` usually means the Gemini credential is missing or the guard node cannot write its
counter file — check `docker compose logs n8n`.

---

## After the deployment

- **Restrict the Firebase key.** Google Cloud console → APIs & Services → Credentials → the browser
  key → HTTP referrers → `https://code-a-cuisine.thomas-toebbe.de/*`. The key ships inside the JS
  bundle, so the referrer restriction is what actually protects it (see
  [firebase.md](firebase.md)).
- **Check the Firestore rules** are the deployed ones, not the test-mode defaults.
- **Walk the whole flow once** in the browser: generate recipes, reload a recipe URL directly, like
  a recipe, open the cookbook.
- **Watch the quota.** Behind Caddy the real client IP arrives in `x-forwarded-for`, so the per-IP
  cap works properly for the first time — on `localhost` everything used to land in the bucket
  `unknown`. Limits and reset are described in [n8n-webhook.md](n8n-webhook.md).

## Changing the domains

Four places, and they have to agree — a mismatch shows up as a CORS failure, which the frontend can
only report as `internal_error`:

| What                      | Where                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Webhook URL the app calls | [environment.prod.ts](../src/environments/environment.prod.ts)                                     |
| n8n host + certificate    | `N8N_HOST` in `/opt/code-a-cuisine/.env` on the server                                             |
| CORS preflight            | `allowedOrigins` on the webhook node in `n8n/generate-recipe.workflow.json`                        |
| CORS response header      | `ALLOWED_ORIGINS` in the **Validate & rate limit** node and the origin check in both respond nodes |

A new subdomain for the frontend also means a new `SFTP_REMOTE_DIR` secret.

The workflow JSON is only the export — edit the nodes in the n8n UI and export again, as
[n8n/README.md](../n8n/README.md) describes.
