import type { GeneratedRecipe } from './recipe.interface';

/** Discriminant used across all n8n responses. */
export type ResponseStatus = 'ok' | 'error';

/**
 * Successful response from n8n.
 * Expected length of `recipes`: 3 (User Story 7).
 */
export interface RecipeSuccessResponse {
  status: 'ok';
  recipes: GeneratedRecipe[];
}

/**
 * Error codes the n8n workflow may return.
 * - quota_ip_exceeded: 3 recipes/IP/day exhausted
 * - quota_system_exceeded: 12 recipes/day system-wide exhausted
 * - validation_failed: request payload rejected by n8n validation
 * - ai_failed: AI did not produce a usable result
 * - internal_error: fallback for uncategorized failures
 */
export type RecipeErrorCode =
  | 'quota_ip_exceeded'
  | 'quota_system_exceeded'
  | 'validation_failed'
  | 'ai_failed'
  | 'internal_error';

/**
 * Error response envelope.
 * retryAfter is populated only for quota errors (ISO 8601 timestamp
 * when the quota resets, typically next-day midnight UTC).
 */
export interface RecipeErrorResponse {
  status: 'error';
  code: RecipeErrorCode;
  message: string;
  retryAfter: string | null;
}

/**
 * Complete n8n response. Discriminated union: narrow via `status`.
 *
 * @example
 * if (res.status === 'ok') {
 *   res.recipes; // GeneratedRecipe[]
 * } else {
 *   res.code;    // RecipeErrorCode
 * }
 */
export type RecipeResponse = RecipeSuccessResponse | RecipeErrorResponse;
