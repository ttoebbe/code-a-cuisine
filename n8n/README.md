# n8n — Rezept-Generierung

Dieser Ordner enthält den n8n-Workflow, der aus einer Zutaten-Anfrage drei Rezepte erzeugt und
sie im JSON-Vertrag aus [`docs/n8n-webhook.md`](../docs/n8n-webhook.md) zurückgibt.

## Dateien

| Datei                           | Inhalt                                                            |
| ------------------------------- | ----------------------------------------------------------------- |
| `generate-recipe.workflow.json` | Haupt-Workflow (Webhook → Validierung/Quota → Gemini → Antwort)   |
| `error-handler.workflow.json`   | Error-Trigger-Workflow: loggt und mailt fehlgeschlagene Läufe     |
| `src/guard.js`                  | Code-Node: Validierung + Tages-Quota + Gemini-Request-Bau         |
| `src/map-ai.js`                 | Code-Node: Gemini-Antwort → `GeneratedRecipe[]` bzw. `ai_failed`  |
| `src/log-error.js`              | Code-Node des Error-Handlers, flacht die Fehlerdaten für die Mail |
| `build-workflows.mjs`           | Generiert die beiden `*.workflow.json` aus den `src/`-Skripten    |

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

Beide Credentials (Gemini-Header-Auth und SMTP) müssen **vor** dem Import in der n8n-UI existieren,
sonst zeigen die Nodes nach dem Import eine leere Credential-Auswahl — siehe die zwei Abschnitte
unten.

## Gemini-Key eintragen (Pflicht vor dem ersten echten Lauf)

Der LLM-Aufruf nutzt eine **HTTP-Header-Auth-Credential** mit dem Header-Namen **`x-goog-api-key`**.
Sie wird **von Hand in der n8n-UI** angelegt (Credentials → New → _Header Auth_); ID und Name stehen
in `build-workflows.mjs` unter `GEMINI_CREDENTIAL` und müssen zur Credential in n8n passen. Den
echten Key nur in der n8n-UI eintragen, nie ins Repo:

1. n8n öffnen → **Credentials** → die Gemini-Header-Auth-Credential.
2. Feld **Name** = `x-goog-api-key`, Feld **Value** = der echte Google-AI-Studio-API-Key.
3. Speichern. Weitere feste Header braucht der HTTP-Node nicht.

Modell: `gemini-3.5-flash` — es steht bei Gemini in der **URL**
(`…/v1beta/models/gemini-3.5-flash:generateContent`), nicht im Body. Strukturierte Ausgabe erzwingt
der Node über `generationConfig.responseMimeType: "application/json"` plus ein `responseSchema`, das
exakt `GeneratedRecipe[]` abbildet.

## SMTP-Credential eintragen (für die Fehler-Mail)

Der Error-Handler verschickt die Fehlermeldung per **Send-Email-Node** an
`toebbe.thomas@outlook.de`. Der Node **referenziert** nur eine SMTP-Credential — Host, Port,
Benutzer und Passwort werden **von Hand in der n8n-UI** eingetragen und stehen **nirgends im Repo**.

Versendet wird über **Gmail-SMTP mit App-Passwort**:

| Feld     | Wert                                           |
| -------- | ---------------------------------------------- |
| Host     | `smtp.gmail.com`                               |
| Port     | `465`                                          |
| SSL/TLS  | an (implizites SSL, kein STARTTLS)             |
| User     | die Gmail-Adresse                              |
| Password | ein **App-Passwort**, nicht das Konto-Passwort |

Das App-Passwort setzt **aktivierte Zwei-Faktor-Authentifizierung** im Google-Konto voraus
(Google-Konto → Sicherheit → App-Passwörter).

> **Warum nicht Outlook.com?** Microsoft hat Basic Auth für SMTP bei privaten Outlook-Konten Anfang
> 2026 abgeschaltet — auch App-Passwörter funktionieren dort nicht mehr, `smtp-mail.outlook.com`
> lehnt den Login ab. Übrig bliebe nur OAuth2, wofür n8ns generischer SMTP-Node nicht gebaut ist.
> Deshalb der Umweg über Gmail; die Mails landen weiterhin im Outlook-Postfach.

1. n8n öffnen → **Credentials** → **New** → _SMTP_.
2. Name exakt `Code a Cuisine SMTP (error mails)` — er muss zu `SMTP_CREDENTIAL` in
   `build-workflows.mjs` passen, sonst findet der importierte Node die Credential nicht.
3. Werte aus der Tabelle oben eintragen und speichern.
4. Im Workflow **Code a Cuisine — Error Handler** den Node **Email the failure** öffnen und prüfen,
   dass die Credential ausgewählt ist. Danach einmal **Test step** ausführen.

**Absender ≠ Empfänger:** Gmail lässt als Absender nur das authentifizierte Konto zu, `fromEmail` ist
deshalb `toebbe.thomas@googlemail.com` (`ALERT_SENDER` in `build-workflows.mjs`); Empfänger bleibt
`toebbe.thomas@outlook.de` (`ALERT_MAILBOX`). Der Node läuft mit `onError: continueRegularOutput`:
ist der Mailserver nicht erreichbar, scheitert der Error-Handler nicht zusätzlich, und die
**Log-Zeile bleibt als Rückfallebene**.

## Wichtige Entscheidungen

### LLM-Anbieter (Aufgabe 5)

**Google Gemini** (`gemini-3.5-flash`) über einen generischen HTTP-Request-Node (kein
Provider-spezifischer Node). Grund: volle Kontrolle über Request-Body und Response-Schema, und der
Key liegt in einer austauschbaren Header-Auth-Credential.

> **Wechsel in Phase 6 (Vorgabe der Developer Akademie):** vorher Anthropic Claude (`claude-sonnet-5`,
> Messages API, erzwungenes Tool `emit_recipes`). Umgestellt wurden nur der HTTP-Node, der
> Request-Bau in `guard.js` und das Auslesen in `map-ai.js`. **Der JSON-Vertrag Angular ↔ n8n ist
> unverändert** — am Frontend wurde keine Zeile angefasst.

### Strukturierte Ausgabe: von Tool Use zu responseSchema

Gemini erwartet für `responseSchema` eine **OpenAPI-3.0-Teilmenge**, nicht JSON Schema. Felder und
Wertebereiche sind identisch zum früheren `input_schema`, die Schreibweise unterscheidet sich:

| Anthropic `input_schema`      | Gemini `responseSchema`            |
| ----------------------------- | ---------------------------------- |
| `type: 'string'` (klein)      | `type: 'STRING'` (Enum-Name, groß) |
| `type: ['integer', 'null']`   | `type: 'INTEGER', nullable: true`  |
| `additionalProperties: false` | entfällt (nicht unterstützt)       |
| Wrapper `{ recipes: [...] }`  | direkt `ARRAY` auf oberster Ebene  |

`map-ai.js` liest die Antwort aus `candidates[0].content.parts[].text` (Denk-Parts mit
`thought: true` werden übersprungen). Das robuste `coerceRecipes` aus der Claude-Zeit bleibt
erhalten. Auf `ai_failed` gemappt werden: HTTP-Fehler und Gemini-Quota (`error` im Body, dank
`neverError`), Safety-Block (`promptFeedback.blockReason`), leere `candidates` und jeder
`finishReason` ungleich `STOP` (SAFETY, MAX_TOKENS, RECITATION).

### Firestore-Schreiben (Aufgabe 6)

**n8n schreibt bewusst NICHT nach Firestore.** Der Firestore-Write liegt im Frontend: der
`RecipeGenerationService` legt **alle drei** Vorschläge über `RecipeLibraryService.saveRecipe()`
an, sobald die Workflow-Antwort eintrifft (Phase 7, siehe unten).

Damit ist die in der Aufgabe genannte Alternative „Service-Account vs. Rules erweitern" hinfällig:
n8n bekommt **keine** Firebase-Credentials. Das ist die stärkste Variante gegenüber beiden
Doc-Vorgaben — kein Service-Account-Key existiert irgendwo, die Rules bleiben die alleinige
Absicherung, und der Kostenairbag (rein in n8n) wird nicht angefasst.

> **Änderung in Phase 7:** Bis dahin schrieb das Frontend nur das **eine vom Nutzer bestätigte**
> Rezept („Save to cookbook"-Button). Die Schul-Checkliste verlangt, dass **alle** generierten
> Rezepte in Firebase landen — der Button ist entfallen, der Save läuft automatisch. Am n8n-Workflow
> und an `firestore.rules` hat sich dadurch **nichts** geändert: der Client-Write geht weiterhin
> durch dieselben Rules. Details in [docs/architektur.md](../docs/architektur.md).

### Tages-Quota / Kostenairbag (Aufgabe 4)

Rein serverseitig im `guard.js`-Node, Zähler in einer JSON-Datei auf dem n8n-Datenvolume
(`/home/node/.n8n/quota-state.json`, Form `{ day, system, perIp }`):

- **3 Rezepte pro IP pro Tag**, **12 systemweit pro Tag**, Reset um Mitternacht UTC
  (`retryAfter` = nächste UTC-Mitternacht).
- IP-Normalisierung: IPv4-mapped IPv6 (`::ffff:a.b.c.d`) → IPv4, IPv6 auf das `/64`-Präfix
  (erste vier Hextets) gruppiert, Zone-ID entfernt. Quelle: `x-forwarded-for` (erster Eintrag),
  sonst `x-real-ip`.
- Ein Slot wird **vor** dem LLM-Aufruf reserviert, damit wiederholte Fehlversuche das Budget nicht
  aushöhlen. Der HTTP-Node läuft mit `neverError`, damit auch eine 4xx-Antwort von Google die
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

Der Error-Handler (`error-handler.workflow.json`) fängt unerwartete Abbrüche des Haupt-Workflows.
Kette: **On workflow error → Log the failure → Email the failure**.

- **Log the failure** (`log-error.js`) schreibt die Zeile `[code-a-cuisine] workflow failed | …` per
  `console.error` ins n8n-Log und flacht die Trigger-Daten auf Einzelfelder (`workflow`, `node`,
  `error`, `stack`, `executionId`, `executionUrl`, `mode`, `failedAt`) für den Mail-Node ab.
- **Email the failure** schickt diese Felder an `toebbe.thomas@outlook.de`. Betreff:
  `[Code a Cuisine] <Workflow> failed: <Fehlermeldung>`; Body: Workflow, gescheiterter Node,
  Fehlertext, Execution-Id samt Modus, Zeitstempel, Link auf die Execution und der Stacktrace.
  Zugangsdaten stehen ausschließlich in der n8n-Credential (siehe Abschnitt oben).

Die Log-Ausgabe bleibt **zusätzlich** bestehen: Sie ist die Rückfallebene, wenn der Mailversand
selbst scheitert (`onError: continueRegularOutput`). Erwartete Fehler (Validierung, Quota, KI) laufen
nicht über den Error-Handler, sondern kommen als Envelope über **Respond: error** zurück.

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
