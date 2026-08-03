import { firebaseConfig } from './firebase.config';

/**
 * Production environment. Points at the n8n instance on the Hetzner VPS;
 * the build replaces environment.ts with this file. See docs/deployment.md.
 */
export const environment = {
  production: true,
  recipeWebhookUrl: 'https://n8n.thomas-toebbe.de/webhook/generate-recipe',
  webhookTimeoutMs: 90_000,
  /**
   * Same library as development for now. Once a separate production project
   * exists, add firebase.config.prod.ts and import it here instead.
   */
  firebase: firebaseConfig,
};
