# n8n-Webhook — Rezept-Generierung

Vertrag zwischen Angular-Frontend und n8n-Workflow. Die TypeScript-Interfaces in
[`src/app/models/`](../src/app/models/) sind die einzige Quelle der Wahrheit für die Shapes;
dieses Dokument beschreibt Endpunkt, Regeln und Fehlercodes drumherum.

## Endpunkt

| Umgebung | URL                                             | Datei                             |
| -------- | ----------------------------------------------- | --------------------------------- |
| Dev      | `http://localhost:5678/webhook/generate-recipe` | `src/environments/environment.ts` |
| Prod     | Platzhalter, bis die n8n-Instanz deployed ist   | `environment.prod.ts`             |

- Methode: `POST`, `Content-Type: application/json`
- Timeout im Frontend: 90 s (`environment.webhookTimeoutMs`)
- Aufrufe ausschließlich über `RecipeApiService`, nie direkt aus Components

> **Ist-Stand:** Der Workflow ist gebaut und liegt versioniert unter [`n8n/`](../n8n/). Aufbau,
> Build, Import, Credentials und die getroffenen Entscheidungen stehen in
> [`n8n/README.md`](../n8n/README.md). Vor dem ersten echten Lauf müssen zwei Dinge stimmen:
> **(1)** der Google-API-Key steht in der Header-Auth-Credential `x-goog-api-key` (nur in der
> n8n-UI), **(2)** der Workflow „Code a Cuisine — Generate Recipe" ist **aktiv**.

### CORS

Zwei Stufen, beide im Workflow:

- **Preflight (`OPTIONS`)** beantwortet der Webhook-Node über `allowedOrigins`
  (`http://localhost:4200,http://localhost:4300`).
- **Antwort auf den POST**: beide Respond-Nodes spiegeln `headers.origin` in
  `Access-Control-Allow-Origin` zurück, sofern er in der Allow-Liste steht, sonst
  `http://localhost:4200` — dazu `Vary: Origin`.

Ohne diese Header blockiert Chrome den Aufruf; das Frontend zeigt dann den generischen
`internal_error`-Dialog („The recipe service is not reachable right now").

## Request

Shape: `RecipeRequest` in [`recipe-request.interface.ts`](../src/app/models/recipe-request.interface.ts).

```json
{
  "ingredients": [{ "name": "Pasta", "amount": 200, "unit": "g" }],
  "portions": 2,
  "cooks": 2,
  "timeCategory": "quick",
  "cuisine": "italian",
  "diet": "vegetarian"
}
```

- `unit`: `g` | `ml` | `piece`
- `portions`: 1–12, `cooks`: 1–3 (Frontend klemmt die Werte, n8n validiert erneut)

## Response

Shape: `RecipeResponse` in [`recipe-response.interface.ts`](../src/app/models/recipe-response.interface.ts) —
diskriminierte Union über `status`.

### Erfolg

```json
{ "status": "ok", "recipes": [/* 3 × GeneratedRecipe */] }
```

`GeneratedRecipe` ist das `Recipe`-Interface ohne `id`, `createdAt` und `likeCount`; diese Felder
ergänzt erst der Firestore-Write, den das **Frontend** direkt nach dem Eintreffen der Antwort für
alle drei Vorschläge auslöst (siehe [docs/architektur.md](architektur.md)).

### Fehler

```json
{
  "status": "error",
  "code": "quota_ip_exceeded",
  "message": "You have used all 3 recipes for today.",
  "retryAfter": "2026-07-25T00:00:00Z"
}
```

| Code                    | Bedeutung                              | Dialog-Aktion im Frontend |
| ----------------------- | -------------------------------------- | ------------------------- |
| `quota_ip_exceeded`     | Tageslimit pro IP erschöpft            | Zurück zum Rezept-Wunsch  |
| `quota_system_exceeded` | Tageslimit systemweit erschöpft        | Zurück zum Rezept-Wunsch  |
| `validation_failed`     | Payload/Mengen von n8n abgelehnt       | Zurück zu den Zutaten     |
| `ai_failed`             | KI lieferte kein verwertbares Ergebnis | Erneut versuchen          |
| `internal_error`        | Sammelfall, auch Transportfehler       | Erneut versuchen          |

`message` wird unverändert angezeigt — der Text ist damit Teil des Vertrags. `retryAfter` nur bei
Quota-Fehlern (ISO 8601), sonst `null`.

n8n antwortet **immer mit HTTP 200**, auch im Fehlerfall — Diskriminator ist allein das Feld
`status`. Das Frontend ist trotzdem tolerant und liest die Fehler-Envelope auch aus einer
4xx/5xx-Antwort. Nur wenn gar kein passender Body ankommt (Transport, CORS, Timeout), fällt es auf
`internal_error` zurück; dieser Code kommt also nie aus n8n.

## Umsetzung in n8n

Der Node-Graph des Haupt-Workflows:

```
Webhook (POST generate-recipe)
  → Validate & rate limit   (n8n/src/guard.js  — Validierung + Tages-Quota + Gemini-Request)
  → IF route == ok
      ├─ true  → Generate recipes (Gemini) (HTTP, generateContent, responseSchema, neverError)
      │           → Map AI answer to recipes (n8n/src/map-ai.js)
      │           → IF route == ok → Respond: recipes | Respond: error
      └─ false → Respond: error
```

Die Workflow-JSONs werden aus [`n8n/build-workflows.mjs`](../n8n/build-workflows.mjs) generiert.
Build, Import und die Entscheidungen zu LLM-Anbieter, Firestore und Quota stehen in
[`n8n/README.md`](../n8n/README.md), der Node-für-Node-Durchgang in
[docs/architektur.md](architektur.md).

## Regeln, die in n8n liegen

Diese Punkte prüft das Frontend bewusst **nicht** — es zeigt nur an, was zurückkommt:

- **Quota / Kostenairbag**: 3 Rezepte pro IP und Tag, 12 systemweit. Keine Client-Zähler,
  kein LocalStorage-Ersatz.
- **Zutaten-Abdeckung**: mindestens 70 % der eingegebenen Zutaten müssen im Rezept vorkommen
  (`yourIngredients`).
- **Zusatzzutaten**: maximal 3 Basiszutaten in `extraIngredients`.
- **Arbeitsaufteilung**: bei `cooks > 1` verteilt der Workflow die Schritte auf
  `assignedChef` 1..cooks. Schritte mit gleicher `parallelGroupId` laufen gleichzeitig und werden
  in der Rezeptansicht nebeneinander dargestellt; `parallelGroupId: null` heißt seriell.
- **Nährwerte**: `perPortion` und `total` müssen beide gefüllt sein.

## Ohne laufenden Workflow entwickeln

`environment.useMockWebhook` auf `true` setzen: Der `RecipeApiService` liefert dann die Fixtures
aus [`recipe-mock.data.ts`](../src/app/services/recipe-mock.data.ts) mit 4 s Verzögerung, sodass
Ladeanimation, Ergebnisliste und Rezeptansicht ohne n8n testbar sind. Für Fehlerzustände die
Flagge auf `false` lassen und den Workflow stoppen — dann greift der `internal_error`-Pfad.

## Manueller Test

```bash
curl -X POST http://localhost:5678/webhook/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"Pasta","amount":200,"unit":"g"}],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```
