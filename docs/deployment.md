# Deployment

**The app is live at <https://code-a-cuisine.thomas-toebbe.de>.**

Everything runs on the operator's own infrastructure. One web server (nginx) serves the static
Angular build and forwards exactly one path — the recipe webhook — to the operator's own n8n server.
The browser therefore only ever talks to its own origin.

| Part           | Where it runs                             | Reached as                                         |
| -------------- | ----------------------------------------- | -------------------------------------------------- |
| Static site    | the operator's own server, nginx          | `https://code-a-cuisine.thomas-toebbe.de`          |
| Webhook        | same server, forwards the path to n8n     | `POST /webhook/generate-recipe` on the same origin |
| n8n + Gemini   | the operator's own n8n server, not public | editor only through an SSH tunnel                  |
| Recipe library | Firebase Firestore                        | unchanged, no deployment of its own                |

Because the webhook is same-origin, [environment.prod.ts](../src/environments/environment.prod.ts)
holds the relative URL `/webhook/generate-recipe` and no host at all. Two classics of the old setup
cannot happen any more: there is no `http` URL to trip over mixed content, and no CORS preflight in
production.

The server configuration itself — nginx, the n8n instance, the deploy script — lives in the
operator's private infrastructure repository, because it describes a private network. This page
covers what this repository expects from it.

---

## What the server has to provide

The list below is the contract. It is what the old `.htaccess` and Caddy config used to do, and what
any future host has to do again.

| Requirement                                                       | Why                                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| HTTPS, `http` redirects to `https`                                | the site and the webhook share one origin, so both are on TLS                                         |
| SPA fallback: a path that is not a file answers with `index.html` | Angular routes on real paths (`/generator`, `/library/:id`); without it a reload on a sub-page 404s   |
| Hashed assets cached long, `index.html` with `no-cache`           | the build hashes every asset name (`outputHashing: all`); a cached `index.html` hides a deployment    |
| Forward exactly `POST /webhook/generate-recipe` to n8n            | nothing else of n8n is public, the editor included                                                    |
| Proxy read timeout above 90 seconds                               | the frontend waits up to 90 s (`environment.webhookTimeoutMs`), the workflow is cut off at 80 s       |
| Set `X-Forwarded-For` to the real client address                  | the quota key is its **first** entry — replace the header, never append, or a client picks its bucket |

On the n8n instance:

- `NODE_FUNCTION_ALLOW_BUILTIN=fs` — the **Validate & rate limit** node writes the quota counters
  with `fs` and throws on every call without it.
- UTC (`GENERIC_TIMEZONE=UTC`, `TZ=UTC`) — the quota resets at UTC midnight.
- The Gemini and SMTP credentials, see [n8n/README.md](../n8n/README.md).

---

## How a deployment happens

Two workflows, and only the second one moves the live site:

1. **CI checks.** [ci.yml](../.github/workflows/ci.yml) runs on every push and pull request, any
   branch: `npm ci` → `npm run lint` → `npm run build`. It writes the _example_ Firebase config and
   deploys nothing, so it needs no secrets.
2. **The Deploy button.** [deploy.yml](../.github/workflows/deploy.yml) runs only when started by
   hand — GitHub → **Actions** → **Deploy** → **Run workflow**, from the browser or the GitHub app.
   Target `site`; `commit` empty for the newest `main`, or the hash of a commit on `main` to go
   back. It writes the real Firebase config from the secret `FIREBASE_CONFIG`, runs `npm ci`, lint
   and build, refuses a bundle with `TODO-` or the old n8n host, and attaches the packed build with
   its checksum to the pre-release `live-site`. Only then a second job — no repository code, no npm
   package — sets a new annotated tag `live-site` on the commit.

The server is not reachable from GitHub, and that is intended: it asks for `live-site` every two
minutes, downloads the build of a new tag, checks checksum and contents once more and switches in
one step. It writes `release.txt` with commit and tag; the run waits until
`https://code-a-cuisine.thomas-toebbe.de/release.txt` names its tag, so green means live — after
about six minutes. A failing deploy is tried three times, then the server waits for the next tag.
Merging into `main` stays a code decision, publishing a separate and deliberate one.

The build has to use the filled-in `firebase.config.ts`, never the example. A bundle built from the
`TODO-` placeholders loads fine and its cookbook silently talks to a Firebase project that does not
exist.

### Updating the n8n workflows

The workflow JSONs live in [n8n/](../n8n/) and are versioned like the rest of the code. A change
goes live with the same **Deploy** button, target `n8n`. The run checks that both files carry the
ids of the live workflows, use only the Gemini and SMTP credentials, and that Generate Recipe keeps
its 80-second timeout and the live error handler; then it sets a new annotated tag `live-n8n`.

The n8n server picks the tag up, imports with the CLI only the workflows that differ from the
running ones — the CLI import keeps id and settings from the JSON — publishes again what was
published and restarts n8n once. The webhook is gone for about 30 seconds; the frontend reports
that as a failed generation. If anything fails after the import, the server puts the previous
workflows back. It reports the result as commit status `kiflow`, and the run waits for it.

The direction matters too. The repository is the source of truth, so an edit made in the editor has
to be exported back into `n8n/*.workflow.json` and committed, or the next import silently reverts it.
[n8n/README.md](../n8n/README.md#export-hygiene) describes which instance-specific fields to strip
from a fresh export.

### On a fresh n8n instance

1. Create both credentials (Gemini, SMTP) **before** the import, otherwise the nodes come up with an
   empty credential picker.
2. **Import from File**: [error-handler.workflow.json](../n8n/error-handler.workflow.json) first,
   then [generate-recipe.workflow.json](../n8n/generate-recipe.workflow.json).
3. Activate the main workflow with the toggle. The files are exported with `"active": false` on
   purpose — activation belongs to the instance — so this is a one-off step.
4. Set **Timeout** and **Error Workflow** as in step 4 above. The UI import also hands the workflow
   a random id instead of the live one from the file, so the handler has to be picked from the
   dropdown.

### Smoke test

```bash
curl -X POST https://code-a-cuisine.thomas-toebbe.de/webhook/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"Pasta","amount":200,"unit":"g"}],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```

Expected: HTTP 200 with `"status":"ok"` and three recipes. Each successful call spends one of the
twelve daily system slots.

---

## Secrets

CI needs no secret. The Deploy workflow needs exactly one:

| Secret            | Holds                                                               | Read by                     |
| ----------------- | ------------------------------------------------------------------- | --------------------------- |
| `FIREBASE_CONFIG` | the contents of the filled-in `src/environments/firebase.config.ts` | `deploy.yml`, target `site` |

Its values are public anyway — they end up in the bundle every visitor downloads; the API key is
restricted to the site's referrer. The secret only keeps them out of the repository. GitHub holds no
key for the servers: they fetch from GitHub, never the other way round.

What the live setup needs lives outside GitHub:

| Value                         | Where it lives                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Firebase web config           | the secret `FIREBASE_CONFIG`, and `src/environments/firebase.config.ts` on the operator's machine |
| Gemini API key, SMTP password | n8n credentials on the n8n server                                                                 |
| n8n encryption key            | the n8n server's environment                                                                      |

---

## After a deployment or a move

- **Restrict the Firebase key.** Google Cloud console → APIs & Services → Credentials → the browser
  key → HTTP referrers → `https://code-a-cuisine.thomas-toebbe.de/*`. The key ships inside the JS
  bundle, so the referrer restriction is what actually protects it (see [firebase.md](firebase.md)).
- **Check the Firestore rules** are the deployed ones, not the test-mode defaults.
- **Walk the whole flow once** in the browser: generate recipes, reload a recipe URL directly, like
  a recipe, open the cookbook.
- **Watch the quota.** The limits are described in [n8n-webhook.md](n8n-webhook.md); resetting them
  by hand is in [n8n/README.md](../n8n/README.md#resetting-the-quota).

---

## Troubleshooting

### Every generation comes back as `internal_error`

In order of likelihood:

1. **The main workflow is inactive.** Check the toggle in the editor. An import through the editor
   keeps it active; a CLI import does not, which is why that route is not used.
2. **The web server does not reach n8n.** The network tab shows a `404`, `502` or `504` on
   `/webhook/generate-recipe` instead of a `200` with JSON. A `504` after a long wait points at a
   proxy timeout below 90 seconds.
3. **The Gemini credential is missing** on a freshly created instance — the failed execution in the
   n8n editor says so plainly.

### Deep links 404 while the landing page works

The SPA fallback is missing: every path that is not a file has to answer with `index.html`. The
landing page works without it, so this only shows on a reload of `/generator` or a shared recipe
URL.

### Everyone shares one quota bucket

The web server does not set `X-Forwarded-For`, so every request lands in the bucket `unknown` and the
per-IP cap hits all visitors at once. The system-wide limit still holds.

---

## Changing the domains

[environment.prod.ts](../src/environments/environment.prod.ts) no longer contains a domain, so a new
domain touches the server and two places outside it:

| What                       | Where                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Server name + certificate  | the operator's private infrastructure repository                                                                             |
| Origin allow list          | `allowedOrigins` on the webhook node, `ALLOWED_ORIGINS` in **Validate & rate limit**, the origin check in both respond nodes |
| Firebase API key referrers | Google Cloud console → APIs & Services → Credentials → browser key → `https://<domain>/*`                                    |

The allow list no longer gates anything in production — the call is same-origin — but both respond
nodes echo the origin back only when it is on the list, so keep the production origin there. The
workflow JSON is only the export: edit the nodes in the n8n UI and export again, as
[n8n/README.md](../n8n/README.md) describes.

---

## Former VPS setup

[n8n/deploy/](../n8n/deploy/) — `docker-compose.yml`, `Caddyfile` and `.env.example` — describes
how n8n ran before the move: in Docker on a Hetzner Cloud VPS, behind Caddy on a subdomain of its
own, while the static site sat on a Hetzner web space. **These files are no longer used in
production.** They are kept for reference; where their comments point at sections of this page,
they mean its earlier version in the Git history.
