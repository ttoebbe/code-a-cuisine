import { effect, type Signal } from '@angular/core';

/** Prefix of every diagnostic message, so the console can be filtered by it. */
const LOG_PREFIX = '[CaC]';

/** Upper bound of a logged payload, keeps a large body readable. */
const MAX_BODY_LENGTH = 2000;

/**
 * Writes a diagnostic message to the console. Reserved for error paths — the
 * app ships without console.log, so anything logged here is a real failure.
 * @param message What went wrong, without the prefix.
 * @param details Payloads to inspect next to the message.
 */
export function logError(message: string, ...details: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...details);
}

/**
 * Renders an unknown payload as a string short enough for the console.
 * @param body Response body or any other value picked up on an error path.
 * @returns Serialised body, cut off at 2000 characters.
 */
export function describeBody(body: unknown): string {
  if (body === undefined) return '<no body>';
  const text = stringifyBody(body);
  return text.length > MAX_BODY_LENGTH ? `${text.slice(0, MAX_BODY_LENGTH)}… [truncated]` : text;
}

/**
 * Reports a failed resource read once, so Firestore errors such as
 * permission-denied become visible instead of ending as an empty screen.
 * Call from an injection context, e.g. a component constructor.
 * @param label What was being read, e.g. 'the cookbook favourites'.
 * @param error Error signal of the resource.
 */
export function logResourceFailure(label: string, error: Signal<unknown>): void {
  effect(() => {
    const failure = error();
    if (failure !== undefined) logError(`reading ${label} failed`, failure);
  });
}

/**
 * Serialises a value, with a readable fallback for anything JSON cannot take.
 * @param body Value to serialise.
 * @returns JSON of the value, or its string form when stringify fails.
 */
function stringifyBody(body: unknown): string {
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body) ?? String(body);
  } catch {
    return String(body);
  }
}
