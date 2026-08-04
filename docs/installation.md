# Installation

The whole way from `git clone` to a running app **on your own machine**. Everything here is local,
n8n included — the deployed instance is never involved, and nothing you do here touches the live site
at <https://code-a-cuisine.thomas-toebbe.de>. Putting something online is
[deployment.md](deployment.md).

You need Node `^20.19` / `^22.12` / `>=24` (Angular 21), npm, Docker (only for real recipe
generation) and a Firebase project.

## 1. Install the dependencies

```bash
git clone <repository-url>
cd code-a-cuisine
npm install
```

## 2. Create the Firebase config

The web config is not versioned and has to be copied by hand, once per machine — no npm hook does it
for you, and without the file the app does not compile:

```bash
cp src/environments/firebase.config.example.ts src/environments/firebase.config.ts
```

In CI and in the frontend deployment the same file is written from a secret instead; see
[firebase.md](firebase.md).

Then fill in the six values from the Firebase console (**Project settings → Your apps → Web app →
SDK setup and configuration → Config**) and replace the `TODO-…` placeholders. As long as the
placeholders are still there the app runs fine, only the Cookbook shows its error state.

## 3. Set up Firestore

Create a Firestore database in the Firebase console (production mode, region e.g. `eur3`), then:

- **Publish the rules** — paste the contents of [`firestore.rules`](../firestore.rules) into the
  "Rules" tab, or run `firebase deploy --only firestore:rules`.
- **Create the composite index** — collection `recipes`, `cuisine` ascending + `createdAt`
  descending. Without it the category filter fails. The definition lives in
  [`firestore.indexes.json`](../firestore.indexes.json), deploy it with
  `firebase deploy --only firestore:indexes`.

More detail in [docs/firebase.md](firebase.md).

## 4. Set up n8n

The app runs without n8n, only recipe generation fails with `internal_error`.

```bash
cd ~/n8n && docker compose up -d     # then: http://localhost:5678
```

Then, inside n8n:

1. **Create the credentials** — the Google Gemini credential and Gmail SMTP for the error mails. This
   has to happen **before** the import.
2. **Import both workflows** from [`n8n/`](../n8n/) — via CLI or via Import from File.
3. **Activate the main workflow**, then run `docker restart n8n` so the production webhook URL gets
   registered.

Every step in detail: [n8n/README.md](../n8n/README.md).

After that the webhook listens on `http://localhost:5678/webhook/generate-recipe`; the frontend only
ever takes the URL from `environment.recipeWebhookUrl`.

## 5. Start the app

```bash
npm start           # http://localhost:4200
```

---

## Going live

The app is already deployed at <https://code-a-cuisine.thomas-toebbe.de>. Publishing a new version is
a manual step — the `deploy-frontend.yml` workflow is started from the **Actions** tab. How that
works, which secrets it needs, and how the two servers were set up: **[deployment.md](deployment.md)**.
