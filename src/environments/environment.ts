import { firebaseConfig } from './firebase.config';

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
   * Firebase project of the recipe library. The values live in the untracked
   * firebase.config.ts, see docs/firebase.md.
   */
  firebase: firebaseConfig,
};
