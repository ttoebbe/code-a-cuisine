# n8n-Webhook — die Schnittstelle zum Frontend

So reden Angular-Frontend und n8n-Workflow miteinander. Wie die Daten aussehen, steht in den
TypeScript-Interfaces unter [`src/app/models/`](../src/app/models/) — die sind maßgeblich. Hier geht
es um den Rest: Endpunkt, Fehlercodes und die Regeln, die serverseitig liegen.

## Endpunkt

| Umgebung | URL                                             | Datei                             |
| -------- | ----------------------------------------------- | --------------------------------- |
| Dev      | `http://localhost:5678/webhook/generate-recipe` | `src/environments/environment.ts` |
| Prod     | Platzhalter, bis die n8n-Instanz deployed ist   | `environment.prod.ts`             |

`POST`, `Content-Type: application/json`, das Frontend wartet höchstens 90 s
(`environment.webhookTimeoutMs`). Gerufen wird der Endpunkt nur über `RecipeApiService`, nie direkt
aus einem Component.

## Request

Der Body ist ein `RecipeRequest` aus
[`recipe-request.interface.ts`](../src/app/models/recipe-request.interface.ts).

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
- `portions`: 1–12, `cooks`: 1–3 (das Frontend klemmt die Werte, n8n validiert erneut)

## Response

Zurück kommt ein `RecipeResponse` aus
[`recipe-response.interface.ts`](../src/app/models/recipe-response.interface.ts) — eine
diskriminierte Union über `status`.

**Erfolg:**

```json
{ "status": "ok", "recipes": [/* 3 × GeneratedRecipe */] }
```

`GeneratedRecipe` ist das `Recipe`-Interface ohne `id`, `createdAt` und `likeCount` — diese drei
Felder kommen erst beim Firestore-Write dazu, den das Frontend selbst auslöst.

**Fehler:**

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

`message` zeigt das Frontend unverändert an — der Text landet also genau so beim Nutzer, wie ihn n8n
formuliert. `retryAfter` gibt es nur bei Quota-Fehlern (ISO 8601), sonst steht dort `null`.

n8n antwortet **immer mit HTTP 200**, auch im Fehlerfall — woran man Erfolg und Fehler unterscheidet,
ist allein das Feld `status`. Nur wenn gar kein brauchbarer Body ankommt (Transport, CORS, Timeout),
setzt das Frontend selbst `internal_error` — dieser Code kommt also nie aus n8n.

## Quota — der Kostenairbag

Der Airbag läuft **ausschließlich serverseitig** in n8n. Das Frontend zeigt nur an, was zurückkommt,
und zählt nichts selbst mit.

- **3 Rezepte pro IP und Tag, 12 systemweit**, Reset um Mitternacht UTC (`retryAfter` = die nächste
  UTC-Mitternacht).
- Der Slot wird **vor** dem LLM-Aufruf reserviert — sonst würden wiederholte Fehlversuche das Budget
  aushöhlen.
- Die Zähler liegen in `/home/node/.n8n/quota-state.json` auf dem n8n-Datenvolume. Zurücksetzen:
  siehe [n8n/README.md](../n8n/README.md).

> Ohne vorgelagerten Proxy setzt der Browser kein `x-forwarded-for`; auf `localhost` landen deshalb
> alle Anfragen im IP-Bucket `unknown`. Das systemweite Limit greift trotzdem und ist der harte
> Deckel.

## Was sonst noch in n8n entschieden wird

Diese Punkte prüft das Frontend bewusst **nicht** — es zeigt nur an, was zurückkommt:

- **Zutaten-Abdeckung**: mindestens 70 % der eingegebenen Zutaten müssen im Rezept vorkommen
  (`yourIngredients`).
- **Zusatzzutaten**: maximal 3 Basiszutaten in `extraIngredients`.
- **Arbeitsaufteilung**: bei `cooks > 1` verteilt der Workflow die Schritte auf `assignedChef`
  `1..cooks`. Schritte mit gleicher `parallelGroupId` laufen gleichzeitig und werden nebeneinander
  dargestellt; `parallelGroupId: null` heißt seriell.
- **Nährwerte**: `perPortion` und `total` müssen beide gefüllt sein.

## CORS

Der Webhook-Node beantwortet den Preflight (`OPTIONS`) über `allowedOrigins`
(`http://localhost:4200,http://localhost:4300`); beide Respond-Nodes spiegeln `headers.origin` in
`Access-Control-Allow-Origin` zurück, sofern er in der Allow-Liste steht. Ohne diese Header blockiert
Chrome den Aufruf, und das Frontend zeigt den generischen `internal_error`-Dialog.

## Manueller Test

```bash
curl -X POST http://localhost:5678/webhook/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"Pasta","amount":200,"unit":"g"}],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```
