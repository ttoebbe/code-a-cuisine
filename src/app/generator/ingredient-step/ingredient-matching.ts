import { INGREDIENT_NAMES } from './ingredient-names';

/**
 * Largest edit distance still treated as a misspelling rather than a different
 * ingredient. Two edits catch "Tomatoe" and "Brocoli" without pulling in words
 * that merely rhyme.
 */
const MAX_EDIT_DISTANCE = 2;

/**
 * Below this length a single edit already changes the word entirely ("Rice" to
 * "Lime" is two), so short names only ever match a one-edit neighbour.
 */
const SHORT_NAME_LENGTH = 5;

/** Shortest word that still has a meaningful singular form. Keeps "Ras" intact. */
const MIN_PLURAL_LENGTH = 4;

/**
 * Plural endings and their singular form, longest ending first. Stripping a
 * bare "s" is not enough: "Tomatoes" would become "tomatoe" and would then
 * make the most common misspelling of all count as a known ingredient.
 */
const PLURAL_ENDINGS: readonly { plural: string; singular: string }[] = [
  { plural: 'ies', singular: 'y' },
  { plural: 'oes', singular: 'o' },
  { plural: 'ses', singular: 's' },
  { plural: 'xes', singular: 'x' },
  { plural: 'hes', singular: 'h' },
];

/**
 * Reduces a name to the form the lookup compares, so casing and stray spaces
 * never decide whether an ingredient counts as known.
 * @param name Raw name as typed or as listed.
 * @returns Trimmed, lower-cased name.
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Strips a trailing plural "s", so "Carrots" and "Carrot" are the same word.
 * @param key Already normalised name.
 * @returns The name without its plural ending.
 */
function toSingular(key: string): string {
  if (key.length <= MIN_PLURAL_LENGTH || !key.endsWith('s') || key.endsWith('ss')) return key;
  const ending = PLURAL_ENDINGS.find((candidate) => key.endsWith(candidate.plural));
  if (ending) return key.slice(0, -ending.plural.length) + ending.singular;
  return key.slice(0, -1);
}

/** Every known name and its singular form, so both spellings resolve as known. */
const KNOWN_KEYS: ReadonlySet<string> = new Set(
  INGREDIENT_NAMES.flatMap((name) => {
    const key = normalizeName(name);
    return [key, toSingular(key)];
  }),
);

/**
 * Tells whether a name matches a known ingredient, ignoring case and plural.
 * @param name Raw name as typed.
 * @returns True when the app already knows this ingredient.
 */
export function isKnownIngredient(name: string): boolean {
  const key = normalizeName(name);
  if (!key) return true;
  return KNOWN_KEYS.has(key) || KNOWN_KEYS.has(toSingular(key));
}

/**
 * Computes one row of the distance matrix from the row above it.
 * @param rowIndex 1-based row, i.e. how many characters of left are compared.
 * @param left First word, already normalised.
 * @param right Second word, already normalised.
 * @param previous The row above, holding the distances for one character less.
 * @returns The completed row.
 */
function buildDistanceRow(
  rowIndex: number,
  left: string,
  right: string,
  previous: number[],
): number[] {
  const current = [rowIndex];
  for (let column = 1; column <= right.length; column += 1) {
    const cost = left[rowIndex - 1] === right[column - 1] ? 0 : 1;
    const insertion = current[column - 1] + 1;
    const deletion = previous[column] + 1;
    const substitution = previous[column - 1] + cost;
    current[column] = Math.min(insertion, deletion, substitution);
  }
  return current;
}

/**
 * Levenshtein distance, abandoned as soon as it provably exceeds the limit.
 * @param left First word, already normalised.
 * @param right Second word, already normalised.
 * @param limit Largest distance the caller still cares about.
 * @returns The distance, or limit + 1 once it is known to be larger.
 */
function levenshteinDistance(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = buildDistanceRow(row, left, right, previous);
    if (Math.min(...current) > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length];
}

/**
 * Edit distance a name of this length may have to still count as a typo.
 * @param key Normalised name the user typed.
 * @returns The distance limit for that name.
 */
function distanceLimitFor(key: string): number {
  return key.length < SHORT_NAME_LENGTH ? 1 : MAX_EDIT_DISTANCE;
}

/**
 * Last scan and its result. The notice below the form asks for the hint several
 * times per change detection cycle, and a full scan costs about half a
 * millisecond, so repeating it for an unchanged name is pure waste.
 */
let lastLookup: { key: string; match: string | null } = { key: '', match: null };

/**
 * Finds the known ingredient a misspelled name most likely meant. Returns null
 * for a known name and for anything without a close neighbour, so a genuine
 * speciality the app does not list stays unremarked.
 * @param name Raw name as typed.
 * @returns The closest known ingredient, or null when there is no near match.
 */
export function findClosestIngredient(name: string): string | null {
  const key = normalizeName(name);
  if (!key || isKnownIngredient(key)) return null;
  if (key === lastLookup.key) return lastLookup.match;
  const match = searchClosest(key);
  lastLookup = { key, match };
  return match;
}

/**
 * Scans the known names for the nearest neighbour within the distance limit.
 * @param key Normalised name the user typed, already known to be unlisted.
 * @returns The closest known ingredient, or null when none is close enough.
 */
function searchClosest(key: string): string | null {
  const limit = distanceLimitFor(key);
  let best: string | null = null;
  let bestDistance = limit + 1;
  for (const candidate of INGREDIENT_NAMES) {
    const distance = levenshteinDistance(key, normalizeName(candidate), limit);
    if (distance >= bestDistance) continue;
    best = candidate;
    bestDistance = distance;
    if (bestDistance === 1) break;
  }
  return best;
}
