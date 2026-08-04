# Firebase — the recipe library

The library (the "Cookbook") lives in Firestore. This page covers the config, the data model, the
security rules, the indexes and the test data.

## Entering the config (once per machine)

The web config lives in **`src/environments/firebase.config.ts`** and is kept out of version control
via `.gitignore` — without it the app does not compile.

1. Copy [`firebase.config.example.ts`](../src/environments/firebase.config.example.ts) to
   `firebase.config.ts` in the same folder. **By hand** — there is no npm hook that does it.
2. In the Firebase console: **Project settings → Your apps → Web app → SDK setup and configuration →
   Config**.
3. Enter the six values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`,
   `appId`) in place of the `TODO-…` placeholders.

`environment.ts` and `environment.prod.ts` only import the config — no key is written there. As long
as the placeholders are still in place the app runs normally, only the library shows its error state.

### The same file in CI and in the deployment

A clean checkout has no `firebase.config.ts`, so both GitHub workflows create one — and they do it
differently on purpose:

| Where                 | How the file is created                        | Why                                                            |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `ci.yml`              | copies the example as-is, placeholders and all | it only has to prove the code compiles, and it deploys nothing |
| `deploy-frontend.yml` | writes the `FIREBASE_CONFIG` secret into it    | the bundle goes online and has to talk to the real project     |

The deployment refuses to run on a missing secret, on something that does not export `firebaseConfig`,
or on a value that still holds `TODO-` placeholders. Falling back to the example would put a site
online that loads fine and whose cookbook silently talks to a project that does not exist — a failure
that looks like a bug in the app for as long as it takes to check the network tab.

Storing the secret is one command:

```bash
gh secret set FIREBASE_CONFIG < src/environments/firebase.config.ts
```

> The web config is not technically a secret — it ends up in the JS bundle with every deployment. We
> still keep it out of the public repository. The protection that actually works is the security
> rules below plus an **HTTP referrer restriction** on the API key in the Google Cloud console
> (APIs & Services → Credentials → browser key).
>
> What must **never** go into the repository is a service account key
> (`firebase-adminsdk-….json`) — it bypasses every rule. The app does not need one: all writes go
> through the rules as a normal client.

## Setting it up in the console

1. Create a project (Google Analytics can stay off).
2. **Build → Firestore Database → Create database**, production mode, region e.g. `eur3` or
   `europe-west3`.
3. **Add a web app** (the `</>` icon), copy the config, see above.
4. **Rules**: paste the contents of [`firestore.rules`](../firestore.rules) into the "Rules" tab and
   publish. Alternatively run `firebase deploy --only firestore:rules` (the
   [`firebase.json`](../firebase.json) is ready to go).
5. **Create the composite index**, see below.

## Data model — collection `recipes`

- **Document ID**: assigned by Firestore (`addDoc()`) — it _is_ the recipe's `id`.
- **Document shape**: the `Recipe` interface from
  [`recipe.interface.ts`](../src/app/models/recipe.interface.ts) without `id`, and with `createdAt`
  as a Firestore `Timestamp`.
- **Where it comes from**: starting with the n8n response (type `GeneratedRecipe`), the write adds
  `createdAt` (server-side, via `serverTimestamp()`) and `likeCount = 0`.
- **When it is written**: `RecipeGenerationService.applyResponse()` creates **all three** suggestions
  of a run automatically as soon as the response arrives — exactly once per run, without a confirm
  button. n8n never writes to Firestore itself.
- **Mapping**: [`recipe-document.ts`](../src/app/services/recipe-document.ts) translates between
  document and model; when reading, the document ID becomes `id` and the `Timestamp` becomes an ISO
  string.

> `serverTimestamp()` inevitably writes a `Timestamp`, not an ISO string — a single write cannot do
> both. The timestamp wins because it uses the server clock: the sort order no longer depends on the
> client's clock, and the security rule can enforce `createdAt == request.time`.

### Access from the frontend

Every read and write goes through
[`RecipeLibraryService`](../src/app/services/recipe-library.service.ts) (`providedIn: 'root'`) — no
Firestore calls from components:

| Method                        | Query / write                                 |
| ----------------------------- | --------------------------------------------- |
| `saveRecipe(GeneratedRecipe)` | `addDoc()`, returns the document ID           |
| `getRecipeById(id)`           | `getDoc()`, `null` if the document is missing |
| `listRecipes({cuisine?})`     | full list of a cuisine, paged client-side     |
| `listMostLiked(count)`        | the most-liked row                            |
| `incrementLike(id)`           | `updateDoc()` with `increment(1)`             |

## Security rules — what is allowed

Every write comes from the browser and the app has no sign-in, which is why the rules carry the
entire protection:

- **read**: open to everyone — the library is public.
- **create**: only with exactly the fields of the `Recipe` interface, valid ranges (portions 1–12,
  cooks 1–3, at most 3 extra ingredients …), `createdAt == request.time` and `likeCount == 0`.
- **update**: `likeCount + 1` and nothing else. Any other change is rejected.
- **delete**: never.

So a tampered client can neither change other people's recipes nor reset likes.

## Composite index

The category filter combines `where('cuisine', '==', …)` with `orderBy('createdAt', 'desc')`, which
needs a composite index:

| Collection | Field       | Order      |
| ---------- | ----------- | ---------- |
| `recipes`  | `cuisine`   | Ascending  |
| `recipes`  | `createdAt` | Descending |

Create it under **Firestore → Indexes → Composite → Create index**. Without it the filtered call
fails, and the message in the browser console contains a direct link to create it. The definition is
versioned in [`firestore.indexes.json`](../firestore.indexes.json)
(`firebase deploy --only firestore:indexes`).

The single-field indexes for `createdAt` (the full library) and `likeCount` (the most-liked row) are
created by Firestore automatically.

## Test data

The library fills itself from the app: every generation creates **three** recipes. All it takes is a
filled-in `firebase.config.ts`. Likes come from the heart in the detail view — a few of those, so the
"Most liked recipes" row has something to show.

### What that lets you test

| State                    | How to get there                                                |
| ------------------------ | --------------------------------------------------------------- |
| Empty library            | `/library/cuisine/italian` before the first generation          |
| Filled list              | after a few generation runs (3 recipes each)                    |
| Pagination (20 per page) | from 21 recipes on → numbered page navigation below the list    |
| Category page            | `/library/cuisine/italian`, or click a tile                     |
| Unknown category         | `/library/cuisine/klingon` → back to `/library`                 |
| Detail view              | "View" on a card → `/library/<id>`                              |
| Unknown ID               | `/library/does-not-exist` → "Recipe not available"              |
| Likes persisting         | heart in the detail view, then reload — the counter stays       |
| Error state              | switch the network to offline in DevTools and reload `/library` |

To clean up, delete the `recipes` collection in the console — the rules deliberately forbid `delete`
from the client.
