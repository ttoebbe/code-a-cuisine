// Regenerates the static autocomplete source from TheMealDB.
// Run manually via `npm run sync:ingredients`, then commit the generated file.
// Deliberately a build-time step: the app must never call this API at runtime.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SOURCE_URL = 'https://www.themealdb.com/api/json/v1/1/list.php?i=list';
const TARGET_FILE = 'src/app/generator/ingredient-step/ingredient-names.ts';

/** Longest name still useful as a suggestion. Cuts entries like "Dried leaves of summer savoury". */
const MAX_NAME_LENGTH = 28;

/**
 * The hand-picked list this app shipped before the sync existed. TheMealDB is
 * missing everyday entries like "Pasta", "Cauliflower" and "Bell pepper", and
 * spells others its own way, so these are merged in rather than replaced. Both
 * spellings of a name may live here on purpose: "Yoghurt" next to the API's
 * "Yogurt" keeps either from being flagged as a typo.
 */
const CURATED_NAMES = [
  'Almonds',
  'Apple',
  'Aubergine',
  'Avocado',
  'Baby spinach',
  'Bacon',
  'Basil',
  'Beef mince',
  'Bell pepper',
  'Broccoli',
  'Butter',
  'Carrot',
  'Cauliflower',
  'Cheddar',
  'Cherry tomatoes',
  'Chicken breast',
  'Chickpeas',
  'Chili flakes',
  'Coconut milk',
  'Cream cheese',
  'Cucumber',
  'Egg',
  'Feta',
  'Garlic',
  'Ginger',
  'Green beans',
  'Honey',
  'Kidney beans',
  'Leek',
  'Lemon',
  'Lentils',
  'Lime',
  'Mozzarella',
  'Mushrooms',
  'Olive oil',
  'Onion',
  'Parmesan',
  'Parsley',
  'Passionfruit',
  'Pasta',
  'Pastrami',
  'Peas',
  'Potato',
  'Rice',
  'Salmon fillet',
  'Soy sauce',
  'Spring onion',
  'Sweet potato',
  'Tofu',
  'Tomato',
  'Yoghurt',
  'Zucchini',
];

/** Floor below which the response counts as broken, so a bad fetch never empties the list. */
const MIN_EXPECTED_NAMES = 500;

/** Line width the packed array keeps, matching .prettierrc so the file reads like the rest. */
const PRINT_WIDTH = 100;

/** Indent of one array line inside the generated module. */
const INDENT = '  ';

/** Header of the generated module, naming its origin and why it ships statically. */
const FILE_HEADER = [
  '// GENERATED FILE - do not edit by hand.',
  '// Run `npm run sync:ingredients` to refresh, then commit the result.',
  `// Source: ${SOURCE_URL} (TheMealDB, public test key).`,
  '',
  '/**',
  ' * Static autocomplete and spell-check source for the ingredient input. Shipped',
  ' * in the bundle on purpose: the generator must stay usable without a backend',
  ' * round trip, so nothing here is fetched at runtime.',
  ' */',
];

/**
 * Fetches the raw ingredient names from TheMealDB.
 * @returns Every strIngredient value the endpoint reports.
 */
async function fetchNames() {
  const response = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'code-a-cuisine-sync' } });
  if (!response.ok) throw new Error(`TheMealDB replied ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.meals)) throw new Error('Unexpected payload: meals is not a list');
  return payload.meals
    .map((meal) => meal?.strIngredient)
    .filter((name) => typeof name === 'string');
}

/**
 * Rewrites a name into the sentence case the app uses, e.g. "Olive Oil" -> "Olive oil".
 * @param name Raw name as delivered by the API.
 * @returns The trimmed name with only its first letter capitalised.
 */
function toSentenceCase(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Normalises, filters and deduplicates the API names together with the curated
 * ones, so an entry the API lacks never disappears from the suggestions.
 * @param rawNames Names as delivered by the API.
 * @returns Alphabetically sorted, unique names fit for the suggestion list.
 */
function buildNameList(rawNames) {
  const byKey = new Map();
  for (const raw of [...rawNames, ...CURATED_NAMES]) {
    const name = toSentenceCase(raw);
    if (name.length < 2 || name.length > MAX_NAME_LENGTH) continue;
    if (!/^[\p{L}\p{N} .,'-]+$/u.test(name)) continue;
    byKey.set(name.toLowerCase(), name);
  }
  return [...byKey.values()].sort((left, right) => left.localeCompare(right));
}

/**
 * Packs the quoted names into lines that stay within the Prettier print width.
 * The generated file is Prettier-ignored: Prettier breaks a string array onto
 * one name per line, which would blow past the project's file length limit.
 * @param names Normalised ingredient names.
 * @returns Indented source lines holding the array entries.
 */
function packEntries(names) {
  const lines = [];
  let current = '';
  for (const name of names) {
    const entry = `'${name.replace(/'/g, "\'")}',`;
    if (current && `${current} ${entry}`.length > PRINT_WIDTH - INDENT.length) {
      lines.push(INDENT + current);
      current = entry;
      continue;
    }
    current = current ? `${current} ${entry}` : entry;
  }
  if (current) lines.push(INDENT + current);
  return lines;
}

/**
 * Renders the generated TypeScript module.
 * @param names Normalised ingredient names.
 * @returns Full file content of the generated module.
 */
function renderModule(names) {
  return [
    ...FILE_HEADER,
    'export const INGREDIENT_NAMES: readonly string[] = [',
    ...packEntries(names),
    '];',
    '',
  ].join('\n');
}

/** Fetches, normalises and writes the ingredient module. */
async function syncIngredients() {
  const names = buildNameList(await fetchNames());
  if (names.length < MIN_EXPECTED_NAMES) {
    throw new Error(`Only ${names.length} names survived, expected at least ${MIN_EXPECTED_NAMES}`);
  }
  const target = join(dirname(fileURLToPath(import.meta.url)), '..', TARGET_FILE);
  await writeFile(target, renderModule(names), 'utf8');
  console.log(`Wrote ${names.length} ingredient names to ${TARGET_FILE}`);
}

syncIngredients().catch((error) => {
  console.error(`sync-ingredients failed: ${error.message}`);
  process.exit(1);
});
