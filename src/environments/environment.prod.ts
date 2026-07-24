/**
 * Production environment. The webhook URL is a placeholder until the n8n
 * instance is deployed; the build replaces environment.ts with this file.
 */
export const environment = {
  production: true,
  /** TODO: replace with the public n8n webhook URL once the instance is deployed. */
  recipeWebhookUrl: 'https://n8n.example.invalid/webhook/generate-recipe',
  webhookTimeoutMs: 90_000,
  useMockWebhook: false,
  /**
   * TODO: replace with the config of the production Firebase project. Until a
   * separate project exists, the dev values from environment.ts may be reused.
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
