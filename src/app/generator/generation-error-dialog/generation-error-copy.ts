import type { RecipeErrorCode, RecipeErrorResponse } from '../../models/recipe-response.interface';

/** What the dialog offers the user after a failed run. */
export type ErrorAction = 'ingredients' | 'retry' | 'close';

/** Everything the dialog template needs for one error code. */
export interface ErrorPresentation {
  title: string;
  subtitle: string;
  actionLabel: string;
  action: ErrorAction;
}

/**
 * Wording per error code. The message text itself always comes from n8n:
 * the quota rules live there, the frontend only relays what it is told.
 */
const PRESENTATIONS: Record<RecipeErrorCode, ErrorPresentation> = {
  validation_failed: {
    title: 'Ups!',
    subtitle: 'Not quite enough…',
    actionLabel: 'Go back to ingredients',
    action: 'ingredients',
  },
  quota_ip_exceeded: {
    title: 'Ups!',
    subtitle: 'The kitchen is closed for today…',
    actionLabel: 'Back to the recipe wish',
    action: 'close',
  },
  quota_system_exceeded: {
    title: 'Ups!',
    subtitle: 'Everyone is cooking right now…',
    actionLabel: 'Back to the recipe wish',
    action: 'close',
  },
  ai_failed: {
    title: 'Ups!',
    subtitle: 'No recipe came out of that…',
    actionLabel: 'Try again',
    action: 'retry',
  },
  internal_error: {
    title: 'Ups!',
    subtitle: 'Something went wrong…',
    actionLabel: 'Try again',
    action: 'retry',
  },
};

/** Shown when the workflow answers without a usable message text. */
const FALLBACK_MESSAGE = 'Please adjust your recipe wish and try again.';

/**
 * Picks the wording for an error envelope.
 * @param error Envelope returned by the workflow.
 * @returns Presentation for the dialog, falling back to the generic error.
 */
export function describeError(error: RecipeErrorResponse): ErrorPresentation {
  return PRESENTATIONS[error.code] ?? PRESENTATIONS.internal_error;
}

/**
 * Reads the explanation shown in the dialog body.
 * @param error Envelope returned by the workflow.
 * @returns The server message, or a neutral fallback when it is empty.
 */
export function readMessage(error: RecipeErrorResponse): string {
  return error.message?.trim() ? error.message : FALLBACK_MESSAGE;
}

/**
 * Renders the quota reset time in the user's locale.
 * @param retryAfter ISO 8601 timestamp sent with quota errors, may be null.
 * @returns Sentence for the dialog, or null when no reset time was sent.
 */
export function formatRetryAfter(retryAfter: string | null): string | null {
  if (!retryAfter) return null;
  const resetAt = new Date(retryAfter);
  if (Number.isNaN(resetAt.getTime())) return null;
  const formatted = resetAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return `You can generate again from ${formatted}.`;
}
