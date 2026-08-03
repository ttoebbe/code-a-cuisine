# n8n — recipe generation

Two workflows, kept here as exported JSON. They are the **single source** and in sync with the
running instance.

| File                            | Content                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `generate-recipe.workflow.json` | Main workflow (webhook → validation/quota → AI Agent → answer) |
| `error-handler.workflow.json`   | Error trigger: logs failed runs and mails them                 |

> Changes to the code nodes (**Validate & rate limit**, **Map AI answer to recipes**, and **Log the
> failure** in the error handler) and to the schema in the **Structured Output Parser** are made
> **directly in the n8n UI**; export the workflow again afterwards so these files stay current.

How the workflow talks to the frontend is described in
[`docs/n8n-webhook.md`](../docs/n8n-webhook.md).

## Importing

n8n runs locally in Docker on `http://localhost:5678` (compose file under `~/n8n`). The same import
steps apply to the server instance — how to set that one up is in
[`docs/deployment.md`](../docs/deployment.md), the compose and Caddy files for it live in
[`deploy/`](deploy/).

**Via CLI** (in Git Bash, set `MSYS_NO_PATHCONV=1` or the paths get rewritten):

```bash
export MSYS_NO_PATHCONV=1
docker cp n8n/error-handler.workflow.json   n8n:/tmp/
docker cp n8n/generate-recipe.workflow.json n8n:/tmp/
docker exec n8n n8n import:workflow --input=/tmp/error-handler.workflow.json
docker exec n8n n8n import:workflow --input=/tmp/generate-recipe.workflow.json
docker exec n8n n8n update:workflow --id=codeacuisine-generate-recipe --active=true
docker restart n8n          # needed so the production webhook URL gets registered
```

**Via the UI:** Workflows → Import from File, read in both files, then **activate**
**Code a Cuisine — Generate Recipe** with the toggle in the top right.

The workflow IDs are fixed (`codeacuisine-generate-recipe`, `codeacuisine-error-handler`) so the main
workflow can reference the error handler through `settings.errorWorkflow`.

## Export hygiene

A fresh export from n8n carries instance-specific fields that the import does not need and that only
produce diff noise. Clean them up **before committing**:

- `"active"` → `false` in both files. Activation belongs to the instance, not the repository — the
  `update:workflow --active=true` line above (or the toggle in the UI) does it after the import.
- Remove the top-level keys `"versionId"` and `"meta"` (the latter holds the `instanceId`).

## Creating the credentials (before importing)

Both credentials have to exist **before** the import, otherwise the nodes show an empty credential
picker. The secrets live in the n8n UI only, never in the repository.

**1. Gemini API key** — Credentials → New → _Google Gemini(PaLM) Api_, name `Google Gemini API`:

| Field   | Value                                                 |
| ------- | ----------------------------------------------------- |
| Host    | `https://generativelanguage.googleapis.com` (default) |
| API Key | the key from Google AI Studio                         |

The credential carries the key only. The model (`models/gemini-3.5-flash`) and `maxOutputTokens` are
set in the **Google Gemini Chat Model** node that hangs off the AI Agent.

**2. Gmail SMTP** — Credentials → New → _SMTP_, name `Code a Cuisine SMTP (error mails)`:

| Field    | Value                                         |
| -------- | --------------------------------------------- |
| Host     | `smtp.gmail.com`                              |
| Port     | `465`                                         |
| SSL/TLS  | on (implicit SSL, no STARTTLS)                |
| User     | the Gmail address                             |
| Password | an **app password**, not the account password |

The app password requires two-factor authentication to be enabled (Google account → Security → App
passwords). Outlook.com is out: Microsoft switched off basic auth for SMTP on personal accounts in
early 2026. Gmail only allows the authenticated account as the sender — the error mails still go to
`toebbe.thomas@outlook.de`.

If a new credential is created on a fresh instance it gets a different ID. In that case open the
affected node once in the imported workflow and pick the credential again.

## Resetting the quota

The cost airbag (3 recipes per IP per day, 12 across the whole system) counts in a JSON file on the
n8n data volume. To reset it, delete the file — it is recreated on the next run:

```bash
export MSYS_NO_PATHCONV=1   # in Git Bash, otherwise the path gets rewritten
docker exec n8n rm -f /home/node/.n8n/quota-state.json
docker exec n8n sh -c 'ls /home/node/.n8n/ | grep -c quota-state.json'   # 0 = reset
```

Without `MSYS_NO_PATHCONV` Git Bash turns the container path into a Windows one, `rm` deletes
nothing and still exits 0 — the reset looks like it worked while the counters stay put. The check
line above is quoted, so it survives either way.

That file access needs `NODE_FUNCTION_ALLOW_BUILTIN=fs` in the `docker-compose.yml` — under `~/n8n`
locally, in [`deploy/docker-compose.yml`](deploy/docker-compose.yml) on the server.
