# Deployment

**The app is live at <https://code-a-cuisine.thomas-toebbe.de>.** Both halves are deployed and the
whole flow has been walked end to end in the browser: generate three recipes, reload a recipe URL
directly, like a recipe, open the cookbook.

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

Parts 1 and 2 below are the one-time setup and are **already done** for this installation. They are
kept because they document what the running servers look like, and because the whole thing has to be
reproducible on a fresh account. Day to day only [Running a deployment](#running-a-deployment) and
[Troubleshooting](#troubleshooting) matter.

> **Why n8n has to be on HTTPS:** the site is served over `https`, so a call to an `http` webhook is
> blocked by the browser as mixed content. The frontend would only ever show the generic
> `internal_error` dialog. Caddy handles the certificate, so this is taken care of below.

---

## The workflows

Everything that is repeatable runs in GitHub Actions. What is left by hand is the one-time server
setup further down — creating a VPS or an SSH key is not something a pipeline should do.

| Workflow                                                        | Runs on                                 | Does                                                     |
| --------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| [ci.yml](../.github/workflows/ci.yml)                           | every push and pull request, any branch | `npm ci` → `npm run lint` → `npm run build`              |
| [deploy-frontend.yml](../.github/workflows/deploy-frontend.yml) | **`workflow_dispatch` only**            | builds and mirrors the build output onto the web space   |
| [deploy-n8n.yml](../.github/workflows/deploy-n8n.yml)           | **`workflow_dispatch` only**            | copies compose files and workflows to the VPS, starts it |

CI is the cheap gate: it writes the _example_ Firebase config, lints and builds — nothing is deployed
from it, so it stays green on branches that have no secrets. `deploy-frontend.yml` repeats lint and
build with the real config before it connects to anything, so a broken build never reaches the web
space half-uploaded.

Neither deployment has a push trigger, for two different reasons. `deploy-frontend.yml` is manual so
that merging into `main` is a code decision and publishing is a separate, deliberate one — the live
site only moves when someone starts the run. `deploy-n8n.yml` is manual because the VPS only exists
for the submission phase and gets deleted afterwards; a workflow firing at a server that is gone
would just produce red runs.

> **A `deploy-n8n.yml` run leaves both workflows inactive.** The n8n CLI import carries no active
> flag, so after every run the webhook stops answering until the main workflow is activated again on
> the server — see [step 6](#6-activate-the-main-workflow). The run summary prints the two commands.
> This is the one deployment that is not fire-and-forget; do not trigger it and walk away.

Both deploy workflows run under the `production` environment, so their runs show up under
**Deployments** in the repository. GitHub creates that environment on the first run; it has no
approval rules unless you add them.

Both also use a `concurrency` group with `cancel-in-progress: false`. Two runs writing into the same
document root (or onto the same server) queue instead of cancelling each other — a cancelled mirror
would leave a half-uploaded site behind.

### Running a deployment

**Actions** tab → pick the workflow → **Run workflow**. Both deployments are started this way and
only this way; nothing publishes on its own. From VS Code the GitHub Actions extension offers the
same thing without leaving the editor: the workflow's ▶ button in its **Workflows** view.

Pushing to `main` still runs CI, so the merge is verified either way — it just no longer moves the
live site.

---

## Secrets

**Settings → Secrets and variables → Actions → New repository secret.** Names have to match exactly.
Nine secrets are set on this repository — six for the web space, three for the VPS. CI needs none of
them, which is why it stays green on forks and branches.

`gh secret list` prints the names and when each was last written; values are never readable again
after they are stored, not through the API and not in the UI. A wrong value can only be replaced, not
inspected.

### Web space — used by `deploy-frontend.yml`

| Secret            | Required           | What the workflow does with it                                                                                   | Where it comes from                                                                                 |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `FIREBASE_CONFIG` | yes                | written to `src/environments/firebase.config.ts` before `npm ci`, so the build compiles against the real project | the contents of your local `src/environments/firebase.config.ts`                                    |
| `SFTP_HOST`       | yes                | the host `lftp` opens the sftp connection to                                                                     | konsoleH → the SSH/SFTP host of the web space (e.g. `wXXXXXXX.kasserver.com` or `thomas-toebbe.de`) |
| `SFTP_USER`       | yes                | the login name passed to `open -u`                                                                               | konsoleH → the FTP/SSH user of the web space                                                        |
| `SFTP_PASSWORD`   | one of the two     | handed to `ssh` through `sshpass -e`, so it never reaches the process list                                       | the password set for that user in konsoleH                                                          |
| `SFTP_PORT`       | no, defaults to 22 | the port in the `sftp://` URL                                                                                    | only needed if the host listens elsewhere                                                           |
| `SFTP_REMOTE_DIR` | yes                | the mirror target; validated as an absolute path before anything is uploaded                                     | **absolute** path of the subdomain's document root, e.g. `/code-a-cuisine.thomas-toebbe.de`         |

| Optional alternative | Instead of                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `SFTP_KEY`           | `SFTP_PASSWORD` — private OpenSSH key **including** the `-----BEGIN/END-----` lines, public half in konsoleH |

This installation authenticates with `SFTP_PASSWORD`; `SFTP_KEY` is not set. The workflow accepts
either and prefers the key if both exist — a key is the better option in principle, because a
password ends up in `sshpass`, which works but is one more secret that can leak. Either way the
authentication is done by `ssh`, not by `lftp`; `lftp` only drives the sftp session on top of it.

`firebase.config.ts` is gitignored, so the build has no Firebase values on a clean checkout. Store
the filled-in file as a secret in one go:

```bash
gh secret set FIREBASE_CONFIG < src/environments/firebase.config.ts
```

The deployment refuses to run if that secret is missing or still carries the `TODO-` placeholders.
Falling back to the example would put a site online that loads fine and whose cookbook silently talks
to a Firebase project that does not exist. CI does use the example values — it only proves the code
compiles and deploys nothing.

> `SFTP_REMOTE_DIR` has to be absolute and point one level below the account root. The upload runs
> `mirror --delete`, so whatever sits in that directory and is not part of the build gets removed.
> The workflow refuses a relative path, an empty value or plain `/` rather than mirroring into the
> account root and taking other subdomains with it.

### VPS — used by `deploy-n8n.yml`

| Secret        | Required | What the workflow does with it                                                        | Where it comes from                                                                  |
| ------------- | -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `VPS_HOST`    | yes      | `ssh-keyscan` target, then the `scp`/`ssh` host for every remote step                 | the server's IPv4 address, or `n8n.thomas-toebbe.de` once the A record resolves      |
| `VPS_USER`    | yes      | the SSH login; it needs to be able to run `docker compose`                            | `root` (that is the user the Hetzner image ships with)                               |
| `VPS_SSH_KEY` | yes      | written to `~/.ssh/vps_key` on the runner and used for the copy and the compose calls | private OpenSSH key whose public half you handed to Hetzner when creating the server |

Note what is **not** on this list: no Gemini key, no SMTP password, no `N8N_ENCRYPTION_KEY`. Those
live on the server — the first two as n8n credentials, the third in `/opt/code-a-cuisine/.env` — and
the workflow deliberately never writes either. See [step 3](#3-create-the-environment-file) and
[step 4](#4-create-the-credentials).

Private keys go in as-is, line breaks and all — GitHub stores multi-line secrets fine. Generate a
deploy-only pair with `ssh-keygen -t ed25519 -f deploy_key -C "github-actions"` rather than reusing a
personal key.

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

Run `deploy-frontend.yml` from the **Actions** tab. In order, the workflow

1. writes `firebase.config.ts` from `FIREBASE_CONFIG` and refuses to continue if the secret is
   missing, is not a `firebase.config.ts`, or still holds `TODO-` placeholders,
2. runs `npm ci` and `npm run lint`,
3. builds with the production configuration
   ([environment.prod.ts](../src/environments/environment.prod.ts), and with it the public webhook
   URL),
4. installs `lftp` and `sshpass` and assembles the ssh connect program from whichever SFTP secret is
   set,
5. checks `SFTP_REMOTE_DIR` and the presence of `.htaccess` in `dist/` **before** opening a
   connection, then mirrors `dist/code-a-cuisine/browser/` into the document root,
6. lists `.htaccess` on the server afterwards and fails the run if it is not there.

Everything that can fail cheaply fails before the first byte is uploaded — a run that dies halfway
through a `mirror --delete` is the one outcome worth designing against.

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

**The import leaves both workflows inactive** — an n8n import never carries an active flag, and
`n8n/*.workflow.json` is exported with `"active": false` on purpose (activation belongs to the
instance, not the repository). So the webhook does not answer yet:

```bash
cd /opt/code-a-cuisine
docker compose exec -T n8n n8n update:workflow --id=codeacuisine-generate-recipe --active=true
docker compose restart n8n   # registers the production webhook URL
```

**This is not a one-off.** Every `deploy-n8n.yml` run re-imports and drops the workflow back to
inactive, so these two commands belong to every deployment, not just the first. Skip them and the
live site keeps loading while every generation comes back as `internal_error` — the webhook answers
404 and the frontend cannot tell that apart from any other transport failure. The run summary prints
the commands for exactly that reason.

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

The list below was worked through at go-live and passed; it is what to repeat after a fresh setup or
a domain change.

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

---

## Troubleshooting

What actually went wrong on the way to the first green deployment, and where to look next time.

### `Permission denied` from lftp although ssh works

The upload failed with `Permission denied` while the very same credentials authenticated fine over
plain `ssh` from the runner. The cause sits one step earlier in the log:

```
GetPass() failed -- assume anonymous login
```

`open -u "$SFTP_USER"` hands lftp a user name **without** a password, so lftp asks for one. On a
runner there is no tty, the prompt fails, and lftp quietly falls back to an anonymous login — which
the server then rejects. The credentials were never the problem.

Since `ssh` does the real authentication through `sshpass`, the password lftp asks for is never used;
a placeholder is enough to silence the prompt, and it keeps the real password out of the process
list:

```bash
open -u "$SFTP_USER",unused-by-sftp sftp://$SFTP_HOST:$PORT;
```

Fixed in [`a717b8c`](../.github/workflows/deploy-frontend.yml). The lesson generalises: when lftp
reports an auth failure, read the lines **above** it — the error it prints is often about a
connection it fell back to, not the one you configured.

### Deep links 404 while the landing page works

The `.htaccess` did not make it into the document root. Both guards in the workflow (asset entry in
`angular.json`, `cls` check after the mirror) exist for this and should have failed the run — if they
did not, check whether the asset block in `angular.json` still lists it. See
[step 3](#3-deploy) in Part 1.

### Every generation comes back as `internal_error`

In order of likelihood:

1. **The main workflow is inactive.** After every `deploy-n8n.yml` run, see
   [step 6](#6-activate-the-main-workflow).
2. **CORS.** The origin is not on all three allow lists — see
   [Changing the domains](#changing-the-domains). A blocked preflight reaches the frontend as nothing
   at all, and `internal_error` is the only code it can invent for that.
3. **Mixed content.** An `http://` webhook URL called from the `https://` site is blocked by the
   browser before it leaves. Check what `environment.prod.ts` actually shipped.
4. **The Gemini credential is missing** on a freshly created instance — `docker compose logs n8n`
   says so plainly.

### The debug-secrets detour

An earlier attempt at the SFTP failure added a throwaway workflow that fingerprinted the secrets
(lengths and hashes, never values) and probed which auth methods the server offers. It did its job —
it proved the credentials were fine and pointed at lftp — and was removed again in `47e2d49`. Worth
repeating if a secret is ever suspected, worth deleting again straight after.

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
