/**
 * Development environment. The n8n workflow runs in Docker on the local
 * machine, so the webhook lives on localhost. See docs/n8n-webhook.md.
 */
export const environment = {
  production: false,
  /** POST target of the recipe generation workflow. Never hard-code this in a service. */
  recipeWebhookUrl: 'http://localhost:5678/webhook/generate-recipe',
  /** Aborts the call before the browser default kicks in; n8n needs ~15-40s per run. */
  webhookTimeoutMs: 90_000,
  /**
   * Serves the fixtures from recipe-mock.data.ts instead of calling n8n.
   * Flip to true to work on the result screens without a running workflow.
   */
  useMockWebhook: false,
  /**
   * Web app config of the Firebase project that holds the recipe library.
   * Copy the values from the Firebase console (Project settings > Your apps >
   * SDK setup and configuration > Config). These keys are not secrets: they
   * identify the project, access is governed by firestore.rules.
   * See docs/firebase.md.
   */
  firebase: {
    apiKey: 'TODO-firebase-api-key',
    authDomain: 'TODO-project-id.firebaseapp.com',
    projectId: 'TODO-project-id',
    storageBucket: 'TODO-project-id.firebasestorage.app',
    messagingSenderId: 'TODO-sender-id',
    appId: 'TODO-app-id',
  },
};
