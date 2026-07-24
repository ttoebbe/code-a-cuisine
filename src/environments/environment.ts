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
};
