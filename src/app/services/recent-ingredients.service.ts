import { Injectable, signal } from '@angular/core';

/** Storage key of the ingredients this browser has seen the user add. */
const STORAGE_KEY = 'code-a-cuisine.recent-ingredients';

/** Upper bound of remembered names, so the entry can never grow without limit. */
const MAX_REMEMBERED = 50;

/**
 * Reads the remembered names, tolerating every way the entry can be unusable:
 * storage blocked by the browser, malformed JSON, or a value of the wrong type.
 * @returns The stored names, or an empty list when nothing usable is there.
 */
function readStoredNames(): readonly string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

/**
 * Persists the remembered names, ignoring a failing write. Losing the memory of
 * a private-mode session is acceptable; breaking the form over it is not.
 * @param names Names to store.
 */
function writeStoredNames(names: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Storage full or blocked. The suggestions simply do not survive the session.
  }
}

/**
 * Remembers ingredients the user typed themselves, so specialities the static
 * list does not carry still show up as suggestions next time. Deliberately
 * per-browser: a shared list would let one user's typo reach everybody else.
 */
@Injectable({ providedIn: 'root' })
export class RecentIngredientsService {
  private readonly remembered = signal<readonly string[]>(readStoredNames());

  /** Names this browser added before, most recently used first. */
  readonly names = this.remembered.asReadonly();

  /**
   * Moves a name to the front of the memory, dropping the oldest once full.
   * @param name Ingredient name the user just added.
   */
  remember(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const kept = this.remembered().filter((entry) => entry.toLowerCase() !== key);
    const next = [trimmed, ...kept].slice(0, MAX_REMEMBERED);
    this.remembered.set(next);
    writeStoredNames(next);
  }
}
