# n8n — Rezept-Generierung

Dieser Ordner enthält den n8n-Workflow, der aus einer Zutaten-Anfrage drei Rezepte erzeugt und
sie im JSON-Vertrag aus [`docs/n8n-webhook.md`](../docs/n8n-webhook.md) zurückgibt.

## Dateien

| Datei                           | Inhalt                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| `generate-recipe.workflow.json` | Haupt-Workflow (Webhook → Validierung/Quota → Claude → Antwort)  |
| `error-handler.workflow.json`   | Error-Trigger-Workflow, loggt fehlgeschlagene Ausführungen       |
| `src/guard.js`                  | Code-Node: Validierung + Tages-Quota + Anthropic-Request-Bau     |
| `src/map-ai.js`                 | Code-Node: Claude-Antwort → `GeneratedRecipe[]` bzw. `ai_failed` |
| `src/log-error.js`              | Code-Node des Error-Handlers                                     |
| `build-workflows.mjs`           | Generiert die beiden `*.workflow.json` aus den `src/`-Skripten   |

Die Workflow-JSONs werden **generiert**. Nach einer Änderung an einem `src/`-Skript neu bauen:

```bash
node n8n/build-workflows.mjs
```

## In n8n importieren

n8n läuft lokal in Docker auf `http://localhost:5678` (Compose-Datei unter `~/n8n`). Import über die
CLI im Container (Pfad-Konvertierung von Git-Bash mit `MSYS_NO_PATHCONV=1` abschalten):

```bash
export MSYS_NO_PATHCONV=1
docker cp n8n/error-handler.workflow.json   n8n:/tmp/
docker cp n8n/generate-recipe.workflow.json n8n:/tmp/
docker exec n8n n8n import:workflow --input=/tmp/error-handler.workflow.json
docker exec n8n n8n import:workflow --input=/tmp/generate-recipe.workflow.json
docker exec n8n n8n update:workflow --id=codeacuisine-generate-recipe --active=true
docker restart n8n          # nötig, damit die Produktions-Webhook-URL registriert wird
```

Die Workflow-IDs sind fest (`codeacuisine-generate-recipe`, `codeacuisine-error-handler`), damit der
Haupt-Workflow den Error-Handler über `settings.errorWorkflow` referenzieren kann.

## Anthropic-Key eintragen (Pflicht vor dem ersten echten Lauf)

Der LLM-Aufruf nutzt die **HTTP-Header-Auth-Credential** `Anthropic API key (x-api-key)`
(ID `anthropic-header-auth`). Sie wird beim Import mit einem Platzhalter angelegt. Den echten Key
**nur in der n8n-UI** eintragen, nie ins Repo:

1. n8n öffnen → **Credentials** → `Anthropic API key (x-api-key)`.
2. Feld **Value** auf den echten Anthropic-API-Key setzen (das Feld **Name** bleibt `x-api-key`).
3. Speichern. Der `anthropic-version`-Header (`2023-06-01`) steckt fest im HTTP-Node.

Modell: `claude-sonnet-5`. Strukturierte Ausgabe erzwingt der Node über Anthropic **Tool Use**
(`tool_choice` auf das Tool `emit_recipes`), dessen `input_schema` exakt `GeneratedRecipe[]` abbildet.

## Wichtige Entscheidungen

### LLM-Anbieter (Aufgabe 5)

Anthropic Claude **Sonnet 5** über einen generischen HTTP-Request-Node (kein Provider-spezifischer
Node). Grund: volle Kontrolle über Request-Body und Response-Schema, und der Key liegt in einer
austauschbaren Header-Auth-Credential. In n8n waren keine LLM-Credentials vorhanden — der Key kommt
also neu (siehe oben).

### Firestore-Schreiben (Aufgabe 6)

**n8n schreibt bewusst NICHT nach Firestore.** Der Firestore-Write gehört im bestehenden Frontend
zum Bestätigen eines Rezepts: [`RecipeSave`](../src/app/recipe-view/recipe-save/recipe-save.ts) ruft
`RecipeLibraryService.saveRecipe()` und legt genau das **eine vom Nutzer bestätigte** Rezept über die
Security-Rules an. Würde n8n zusätzlich alle drei Vorschläge schreiben, wäre die Bibliothek mit
unbestätigten Rezepten geflutet und beim Bestätigen dupliziert.

Damit ist die in der Aufgabe genannte Alternative „Service-Account vs. Rules erweitern" hinfällig:
n8n bekommt **keine** Firebase-Credentials. Das ist die stärkste Variante gegenüber beiden
Doc-Vorgaben — kein Service-Account-Key existiert irgendwo, die Rules bleiben die alleinige
Absicherung, und der Kostenairbag (rein in n8n) wird nicht angefasst.

> Falls n8n später doch schreiben soll (z. B. Auto-Archiv aller Generierungen), wäre der saubere Weg
> ein anonymer Client-Write über die **Firestore-REST-API** mit `documents:commit` und einem
> `updateTransform` (`setToServerValue: REQUEST_TIME`) für `createdAt` sowie `likeCount = 0` — dann
> greifen die vorhandenen Rules unverändert, ohne Service-Account.

### Tages-Quota / Kostenairbag (Aufgabe 4)

Rein serverseitig im `guard.js`-Node, Zähler in einer JSON-Datei auf dem n8n-Datenvolume
(`/home/node/.n8n/quota-state.json`, Form `{ day, system, perIp }`):

- **3 Rezepte pro IP pro Tag**, **12 systemweit pro Tag**, Reset um Mitternacht UTC
  (`retryAfter` = nächste UTC-Mitternacht).
- IP-Normalisierung: IPv4-mapped IPv6 (`::ffff:a.b.c.d`) → IPv4, IPv6 auf das `/64`-Präfix
  (erste vier Hextets) gruppiert, Zone-ID entfernt. Quelle: `x-forwarded-for` (erster Eintrag),
  sonst `x-real-ip`.
- Ein Slot wird **vor** dem LLM-Aufruf reserviert, damit wiederholte Fehlversuche das Budget nicht
  aushöhlen. Der HTTP-Node läuft mit `neverError`, damit auch eine 4xx-Antwort von Anthropic die
  Ausführung sauber beendet und der bereits verbuchte Zähler in der Datei erhalten bleibt.

> **Lokaler Test-Hinweis:** Ohne vorgelagerten Proxy setzt der Browser kein `x-forwarded-for`; auf
> `localhost` landen daher alle Anfragen im IP-Bucket `unknown`. Das systemweite Limit (12/Tag)
> greift trotzdem und ist der harte Kostendeckel. Hinter einem echten Reverse-Proxy in Prod liefert
> `x-forwarded-for` die echte Client-IP.

**Warum dateibasiert statt Static Data:** Die frühere Variante mit
`$getWorkflowStaticData('global')` persistierte bei Webhook-Läufen nicht zuverlässig — ein harter
Kostendeckel darf davon nicht abhängen. Der Zähler liegt deshalb in `quota-state.json`. Der
Datei-Zugriff (`require('fs')`) ist über `NODE_FUNCTION_ALLOW_BUILTIN=fs` in der
`docker-compose.yml` unter `~/n8n` freigeschaltet.

### Fehlerbenachrichtigung (Aufgabe 7)

Der Error-Handler (`error-handler.workflow.json`) fängt unerwartete Abbrüche des Haupt-Workflows und
schreibt eine Log-Zeile (`log-error.js`). Auf Wunsch von Thomas vorerst **ohne Mailversand** — der
Log-Node lässt sich später durch einen E-Mail-/Slack-Node ersetzen. Erwartete Fehler (Validierung,
Quota, KI) laufen nicht über den Error-Handler, sondern kommen als Envelope zurück.

## Schneller Rauch-Test (ohne echten Key)

```bash
export MSYS_NO_PATHCONV=1
# CORS-Preflight
curl -i -X OPTIONS http://localhost:5678/webhook/generate-recipe \
  -H "Origin: http://localhost:4200" -H "Access-Control-Request-Method: POST"
# Validierung greift serverseitig
curl -X POST http://localhost:5678/webhook/generate-recipe -H "Content-Type: application/json" \
  -d '{"ingredients":[],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```
