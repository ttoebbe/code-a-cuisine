import type { IngredientUnit } from '../../models/recipe-filters.types';
import { INGREDIENT_NAMES } from './ingredient-names';

// Three entries, matching the design and the reserved height of the suggestion
// overlay in ingredient-form.scss.
const MAX_SUGGESTIONS = 3;

/** Lower-cased lookup of the shipped names, so merging never lists one twice. */
const KNOWN_KEYS: ReadonlySet<string> = new Set(INGREDIENT_NAMES.map((n) => n.toLowerCase()));

/** Selectable measurement units with their human readable labels. */
export const UNIT_OPTIONS: readonly { value: IngredientUnit; label: string }[] = [
  { value: 'g', label: 'gram' },
  { value: 'ml', label: 'milliliter' },
  { value: 'piece', label: 'piece' },
];

/** Suffix appended to an amount in the list. Countable pieces show no unit. */
const UNIT_SUFFIX: Record<IngredientUnit, string> = { g: 'g', ml: 'ml', piece: '' };

/**
 * Puts the names this browser remembers in front of the shipped ones, dropping
 * those the static list already carries.
 * @param extraNames Names the user added themselves before.
 * @returns The full pool to search, personal entries first.
 */
function mergeNames(extraNames: readonly string[]): readonly string[] {
  const personal = extraNames.filter((name) => !KNOWN_KEYS.has(name.trim().toLowerCase()));
  return [...personal, ...INGREDIENT_NAMES];
}

/**
 * Filters the ingredient names by the typed term, case-insensitively. Names
 * starting with the term rank first, names merely containing it fill up the
 * rest, so typing "pepper" still offers "Bell pepper".
 * An empty or blank term yields no suggestions so the list stays closed.
 * @param term Raw value of the ingredient input.
 * @param extraNames Names this browser remembers from earlier sessions.
 * @returns Up to MAX_SUGGESTIONS matching ingredient names.
 */
export function findIngredientSuggestions(
  term: string,
  extraNames: readonly string[] = [],
): string[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const starting: string[] = [];
  const containing: string[] = [];
  for (const name of mergeNames(extraNames)) {
    const key = name.toLowerCase();
    if (key.startsWith(needle)) starting.push(name);
    else if (key.includes(needle)) containing.push(name);
    if (starting.length >= MAX_SUGGESTIONS) break;
  }
  return [...starting, ...containing].slice(0, MAX_SUGGESTIONS);
}

/**
 * Renders an amount with its unit for the ingredient list, e.g. "150g" or "1".
 * @param amount Numeric quantity.
 * @param unit Measurement unit of the quantity.
 * @returns Display string combining amount and unit suffix.
 */
export function formatAmount(amount: number, unit: IngredientUnit): string {
  return `${amount}${UNIT_SUFFIX[unit]}`;
}
