# n8n — recipe generation

Two workflows, kept here as exported JSON. They are the **single source** and in sync with the
running instance.

| File                            | Content                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `generate-recipe.workflow.json` | Main workflow (webhook → validation/quota → Gemini → answer) |
| `error-handler.workflow.json`   | Error trigger: logs failed runs and mails them               |

> Changes to the code nodes (`guard`, `map-ai`, `log-error`) are made **directly in the n8n UI**;
> export the workflow again afterwards so these files stay current.

How the workflow talks to the frontend is described in
[`docs/n8n-webhook.md`](../docs/n8n-webhook.md).

## Importing

n8n runs locally in Docker on `http://localhost:5678` (compose file under `~/n8n`).

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

## Creating the credentials (before importing)

Both credentials have to exist **before** the import, otherwise the nodes show an empty credential
picker. The secrets live in the n8n UI only, never in the repository.

**1. Gemini API key** — Credentials → New → _Header Auth_, name
`Google Gemini API key (x-goog-api-key)`:

| Field | Value                         |
| ----- | ----------------------------- |
| Name  | `x-goog-api-key`              |
| Value | the key from Google AI Studio |

With Gemini the model (`gemini-3.5-flash`) is part of the URL, not the body.

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
docker exec n8n rm /home/node/.n8n/quota-state.json
```

That file access needs `NODE_FUNCTION_ALLOW_BUILTIN=fs` in the `docker-compose.yml` under `~/n8n`.
