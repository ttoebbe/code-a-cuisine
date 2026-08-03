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

## Part 1 — n8n on the Cloud server

### 1. Create the server and the DNS record

In the Hetzner Cloud console: new project, new server, **CX22**, Ubuntu 24.04, your SSH key. About
€4 a month, billed by the hour, so it can be deleted again after the project is graded.

Then in the Hetzner DNS console for `thomas-toebbe.de`:

| Type | Name  | Value                     |
| ---- | ----- | ------------------------- |
| A    | `n8n` | the server's IPv4 address |

Let's Encrypt only issues the certificate once this record resolves, so set it before starting the
containers.

### 2. Install Docker

```bash
ssh root@<server-ip>
curl -fsSL https://get.docker.com | sh
```

### 3. Copy the deployment files up

From the project directory on your machine:

```bash
scp -r n8n/deploy root@<server-ip>:/opt/code-a-cuisine
```

On the server, create the environment file:

```bash
cd /opt/code-a-cuisine
cp .env.example .env
openssl rand -hex 32          # paste the output as N8N_ENCRYPTION_KEY
nano .env
```

`N8N_ENCRYPTION_KEY` encrypts the stored credentials. Write it down — without it a restored volume
cannot decrypt the Gemini key.

### 4. Start it

```bash
docker compose up -d
docker compose logs -f caddy   # watch the certificate being issued
```

Caddy needs ports 80 and 443. If the Hetzner firewall is on, both have to be open.

### 5. Set up the workflows

The editor UI is deliberately **not** public — Caddy answers everything except `/webhook/*` with a 404, and n8n binds its port to the server's loopback interface only. Reach it through an SSH tunnel:

```bash
ssh -L 5678:localhost:5678 root@<server-ip>
```

Then open `http://localhost:5678` in your browser, create the owner account, and follow
[n8n/README.md](../n8n/README.md): create both credentials **first**, then import the two workflow
files and activate the main one.

### 6. Smoke test

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

## Part 2 — the static site on the web space

### 1. Create the subdomain

In konsoleH: add `code-a-cuisine.thomas-toebbe.de` as a subdomain with its own document root, and
switch on the free SSL certificate. Wait for it to be issued before uploading.

### 2. Build

```bash
npm run build
```

`npm run build` defaults to the production configuration, which swaps in
[environment.prod.ts](../src/environments/environment.prod.ts) and therefore the public webhook URL.
The result lands in `dist/code-a-cuisine/browser/`.

### 3. Upload

Copy the **contents** of `dist/code-a-cuisine/browser/` into the document root — not the folder
itself. Any SFTP client will do:

```bash
sftp <user>@thomas-toebbe.de
put -r dist/code-a-cuisine/browser/* /code-a-cuisine.thomas-toebbe.de/
```

[public/.htaccess](../public/.htaccess) is part of the build output and has to arrive with it. Some
FTP clients hide dotfiles by default — if `/generator` gives a 404 after a reload while the landing
page works, the `.htaccess` did not make it up.

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
| n8n host + certificate    | `N8N_HOST` in `n8n/deploy/.env`                                                                    |
| CORS preflight            | `allowedOrigins` on the webhook node in `n8n/generate-recipe.workflow.json`                        |
| CORS response header      | `ALLOWED_ORIGINS` in the **Validate & rate limit** node and the origin check in both respond nodes |

The workflow JSON is only the export — edit the nodes in the n8n UI and export again, as
[n8n/README.md](../n8n/README.md) describes.
