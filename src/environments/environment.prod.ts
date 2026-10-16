import { firebaseConfig } from './firebase.config';

/**
 * Production environment; the build replaces environment.ts with this file.
 * See docs/deployment.md.
 */
export const environment = {
  production: true,
  /**
   * Same-origin on purpose: the server that serves the site forwards exactly
   * this path to n8n, so the URL carries no host and needs no CORS.
   */
  recipeWebhookUrl: '/webhook/generate-recipe',
  webhookTimeoutMs: 90_000,
  /**
   * Same library as development for now. Once a separate production project
   * exists, add firebase.config.prod.ts and import it here instead.
   */
  firebase: firebaseConfig,
};
