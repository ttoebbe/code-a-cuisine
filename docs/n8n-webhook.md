# n8n webhook — the interface to the frontend

How the Angular frontend and the n8n workflow talk to each other. What the data looks like is defined
by the TypeScript interfaces in [`src/app/models/`](../src/app/models/) — those are authoritative.
This page covers the rest: the endpoint, the error codes, and the rules that live on the server.

## Endpoint

| Environment | URL                                                    | File                              |
| ----------- | ------------------------------------------------------ | --------------------------------- |
| Dev         | `http://localhost:5678/webhook/generate-recipe`        | `src/environments/environment.ts` |
| Prod        | `https://n8n.thomas-toebbe.de/webhook/generate-recipe` | `environment.prod.ts`             |

`POST`, `Content-Type: application/json`, and the frontend waits at most 90 s
(`environment.webhookTimeoutMs`). The endpoint is only ever called through `RecipeApiService`, never
straight from a component.

## Request

The body is a `RecipeRequest` from
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
- `portions`: 1–12, `cooks`: 1–3 (the frontend clamps the values, n8n validates them again)

## Response

Back comes a `RecipeResponse` from
[`recipe-response.interface.ts`](../src/app/models/recipe-response.interface.ts) — a discriminated
union over `status`.

**Success:**

```json
{ "status": "ok", "recipes": [/* 3 × GeneratedRecipe */] }
```

`GeneratedRecipe` is the `Recipe` interface without `id`, `createdAt` and `likeCount` — those three
fields are added by the Firestore write, which the frontend triggers itself.

**Failure:**

```json
{
  "status": "error",
  "code": "quota_ip_exceeded",
  "message": "You have used all 3 recipes for today.",
  "retryAfter": "2026-07-25T00:00:00Z"
}
```

| Code                    | Meaning                           | Dialog action in the frontend |
| ----------------------- | --------------------------------- | ----------------------------- |
| `quota_ip_exceeded`     | Daily limit per IP used up        | Back to the recipe wish       |
| `quota_system_exceeded` | Daily limit for everyone used up  | Back to the recipe wish       |
| `validation_failed`     | Payload/amounts rejected by n8n   | Back to the ingredients       |
| `ai_failed`             | The AI returned nothing usable    | Try again                     |
| `internal_error`        | Catch-all, transport failures too | Try again                     |

The frontend shows `message` unchanged — the text reaches the user exactly as n8n phrased it.
`retryAfter` only appears on quota errors (ISO 8601), otherwise it is `null`.

n8n **always answers with HTTP 200**, failures included — the only thing telling success and failure
apart is the `status` field. Only when no usable body arrives at all (transport, CORS, timeout) does
the frontend set `internal_error` itself, so that code never comes out of n8n.

## Quota — the cost airbag

The airbag runs **server-side only**, inside n8n. The frontend just displays what comes back and
keeps no counters of its own.

- **3 recipes per IP per day, 12 across the whole system**, reset at UTC midnight (`retryAfter` is
  the next UTC midnight).
- The slot is reserved **before** the LLM call — otherwise repeated failed attempts would eat into
  the budget.
- The counters live in `/home/node/.n8n/quota-state.json` on the n8n data volume. Resetting them:
  see [n8n/README.md](../n8n/README.md).

> Without a proxy in front, the browser sets no `x-forwarded-for`, so on `localhost` every request
> ends up in the IP bucket `unknown`. The system-wide limit still applies and is the hard ceiling.
> Deployed, Caddy sits in front and sets the header, so the per-IP cap works as intended.

## What else is decided inside n8n

The frontend deliberately does **not** check any of this — it only displays what comes back:

- **Ingredient coverage**: at least 70 % of the ingredients you entered have to show up in the recipe
  (`yourIngredients`).
- **Extra ingredients**: at most 3 basic ingredients in `extraIngredients`.
- **Splitting the work**: with `cooks > 1` the workflow spreads the steps across `assignedChef`
  `1..cooks`. Steps sharing a `parallelGroupId` happen at the same time and are shown side by side;
  `parallelGroupId: null` means sequential.
- **Nutrition**: both `perPortion` and `total` have to be filled in.

## CORS

The webhook node answers the preflight (`OPTIONS`) via `allowedOrigins` — the two dev ports plus the
deployed frontend (`https://code-a-cuisine.thomas-toebbe.de`); both respond nodes mirror
`headers.origin` back into `Access-Control-Allow-Origin` as long as it is on the allow list. Without
those headers Chrome blocks the call and the frontend shows the generic `internal_error` dialog.

The allow list appears in three places that have to stay in step: `allowedOrigins` on the webhook
node, `ALLOWED_ORIGINS` in the **Validate & rate limit** code node, and the origin check in both
respond nodes. [deployment.md](deployment.md) lists them alongside the files to change.

## Testing it by hand

Against the local instance:

```bash
curl -X POST http://localhost:5678/webhook/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"Pasta","amount":200,"unit":"g"}],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```

Against the deployed one, with an `Origin` header — without it the respond nodes fall back to the
first entry of the allow list and you learn nothing about CORS:

```bash
curl -X POST https://n8n.thomas-toebbe.de/webhook/generate-recipe \
  -H "Content-Type: application/json" \
  -H "Origin: https://code-a-cuisine.thomas-toebbe.de" \
  -d '{"ingredients":[{"name":"Pasta","amount":200,"unit":"g"}],"portions":2,"cooks":2,"timeCategory":"quick","cuisine":"italian","diet":"vegetarian"}'
```

A `404` here means the workflow is inactive — check the toggle in the n8n editor, see
[deployment.md](deployment.md). Each successful call spends one of the twelve daily system slots.
