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

### CORS

Der Browser schickt vor dem POST einen Preflight (`OPTIONS`). Der n8n-Webhook-Node muss daher
antworten mit:

```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, OPTIONS
```

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
ergänzt erst der Firestore-Write.

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

HTTP-Status ist egal: Das Frontend liest die Fehler-Envelope sowohl aus einer 200er- als auch aus
einer 4xx/5xx-Antwort. Nur wenn gar kein passender Body ankommt, fällt es auf `internal_error`
zurück.

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
