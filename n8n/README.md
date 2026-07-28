# n8n — Rezept-Generierung

Zwei Workflows als exportierte JSONs. Sie sind die **einzige Quelle** und mit der laufenden Instanz
synchron — es gibt kein Build-Skript mehr.

| Datei                           | Inhalt                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| `generate-recipe.workflow.json` | Haupt-Workflow (Webhook → Validierung/Quota → Gemini → Antwort) |
| `error-handler.workflow.json`   | Error-Trigger: loggt und mailt fehlgeschlagene Läufe            |

> Änderungen an den Code-Nodes (`guard`, `map-ai`, `log-error`) werden ab jetzt **direkt in der
> n8n-UI** gemacht und der Workflow danach neu exportiert, sodass diese Dateien aktuell bleiben.

Den JSON-Vertrag zum Frontend beschreibt [`docs/n8n-webhook.md`](../docs/n8n-webhook.md).

## Importieren

n8n läuft lokal in Docker auf `http://localhost:5678` (Compose-Datei unter `~/n8n`).

**Per CLI** (in Git Bash `MSYS_NO_PATHCONV=1` setzen, sonst werden die Pfade umgeschrieben):

```bash
export MSYS_NO_PATHCONV=1
docker cp n8n/error-handler.workflow.json   n8n:/tmp/
docker cp n8n/generate-recipe.workflow.json n8n:/tmp/
docker exec n8n n8n import:workflow --input=/tmp/error-handler.workflow.json
docker exec n8n n8n import:workflow --input=/tmp/generate-recipe.workflow.json
docker exec n8n n8n update:workflow --id=codeacuisine-generate-recipe --active=true
docker restart n8n          # nötig, damit die Produktions-Webhook-URL registriert wird
```

**Per UI:** Workflows → Import from File, beide Dateien einlesen, dann
**Code a Cuisine — Generate Recipe** über den Schalter oben rechts **aktivieren**.

Die Workflow-IDs sind fest (`codeacuisine-generate-recipe`, `codeacuisine-error-handler`), damit der
Haupt-Workflow den Error-Handler über `settings.errorWorkflow` referenzieren kann.

## Credentials anlegen (vor dem Import)

Beide Credentials müssen **vor** dem Import existieren, sonst zeigen die Nodes eine leere
Credential-Auswahl. Zugangsdaten stehen ausschließlich in der n8n-UI, nie im Repo.

**1. Gemini-API-Key** — Credentials → New → _Header Auth_, Name
`Google Gemini API key (x-goog-api-key)`:

| Feld  | Wert                         |
| ----- | ---------------------------- |
| Name  | `x-goog-api-key`             |
| Value | der Key aus Google AI Studio |

Das Modell (`gemini-3.5-flash`) steht bei Gemini in der URL, nicht im Body.

**2. Gmail-SMTP** — Credentials → New → _SMTP_, Name `Code a Cuisine SMTP (error mails)`:

| Feld     | Wert                                           |
| -------- | ---------------------------------------------- |
| Host     | `smtp.gmail.com`                               |
| Port     | `465`                                          |
| SSL/TLS  | an (implizites SSL, kein STARTTLS)             |
| User     | die Gmail-Adresse                              |
| Password | ein **App-Passwort**, nicht das Konto-Passwort |

Das App-Passwort setzt aktivierte Zwei-Faktor-Authentifizierung voraus (Google-Konto → Sicherheit →
App-Passwörter). Outlook.com scheidet aus: Microsoft hat Basic Auth für SMTP bei privaten Konten
Anfang 2026 abgeschaltet. Gmail lässt als Absender nur das authentifizierte Konto zu — Empfänger der
Fehlermails bleibt trotzdem `toebbe.thomas@outlook.de`.

Wird auf einer frischen Instanz eine neue Credential angelegt, bekommt sie eine andere Id. In dem
Fall im importierten Workflow den betroffenen Node einmal öffnen und die Credential neu auswählen.

## Quota zurücksetzen

Der Kostenairbag (3 Rezepte pro IP und Tag, 12 systemweit) zählt in einer JSON-Datei auf dem
n8n-Datenvolume. Zum Zurücksetzen die Datei löschen — sie wird beim nächsten Lauf neu angelegt:

```bash
docker exec n8n rm /home/node/.n8n/quota-state.json
```

Der Datei-Zugriff braucht `NODE_FUNCTION_ALLOW_BUILTIN=fs` in der `docker-compose.yml` unter `~/n8n`.

## Rauch-Test (ohne echten Key)

```bash
export MSYS_NO_PATHCONV=1
# CORS-Preflight
curl -i -X OPTIONS http://localhost:5678/webhook/generate-recipe \
  -H "Origin: http://localhost:4200" -H "Access-Control-Request-Method: POST"
# Validierung greift serverseitig, bevor der LLM gerufen wird
curl -X POST http://localhost:5678/webhook/generate-recipe -H "Content-Type: application/json" \
  -d '{"ingredients":[],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```
