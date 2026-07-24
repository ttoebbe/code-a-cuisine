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
};
