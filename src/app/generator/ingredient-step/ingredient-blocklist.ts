import { isKnownIngredient } from './ingredient-matching';

/**
 * Names that are not food a home kitchen cooks with. Both spellings are listed
 * where a German entry has an obvious English twin, because the field takes
 * whatever the user types. A list like this can never be complete — it stops
 * the jokes people actually tried, not every joke imaginable.
 */
const INEDIBLE_NAMES: ReadonlySet<string> = new Set([
  'baumrinde',
  'benzin',
  'cockroach',
  'cockroaches',
  'erde',
  'gasoline',
  'kakerlake',
  'kakerlaken',
  'maggot',
  'maggots',
  'mealworm',
  'mealworms',
  'mehlwurm',
  'mehlwürmer',
  'milbe',
  'milben',
  'mite',
  'mites',
  'nutria',
  'petrol',
  'plastic',
  'plastik',
  'sand',
  'seife',
  'skunk',
  'soap',
  'soil',
  'spider',
  'spiders',
  'spinne',
  'spinnen',
  'stinktier',
  'tree bark',
  'wasp',
  'wasps',
  'wespe',
  'wespen',
]);

/**
 * Everyday German ingredient names written without an umlaut — the ones
 * NON_ENGLISH_LETTERS below cannot catch. Words that mean the same in English
 * ("Butter", "Paprika", "Bratwurst", "Sauerkraut") are deliberately absent, so
 * an English name is never mistaken for a German one.
 */
const NON_ENGLISH_NAMES: ReadonlySet<string> = new Set([
  'apfel',
  'backpulver',
  'banane',
  'bananen',
  'birne',
  'birnen',
  'blumenkohl',
  'bohnen',
  'brokkoli',
  'brot',
  'eier',
  'ente',
  'erbsen',
  'erdbeere',
  'erdbeeren',
  'essig',
  'forelle',
  'gans',
  'garnelen',
  'gurke',
  'gurken',
  'hackfleisch',
  'haferflocken',
  'hase',
  'hefe',
  'honig',
  'huhn',
  'joghurt',
  'kalbfleisch',
  'kaninchen',
  'kardamom',
  'karotten',
  'kartoffel',
  'kartoffeln',
  'kichererbsen',
  'knoblauch',
  'kohl',
  'lachs',
  'lammfleisch',
  'linsen',
  'majoran',
  'mandarinen',
  'mandeln',
  'marmelade',
  'mehl',
  'milch',
  'muskat',
  'nackensteak',
  'nudeln',
  'petersilie',
  'pfeffer',
  'pferd',
  'pilz',
  'pilze',
  'radieschen',
  'rehfleisch',
  'reis',
  'rinderfleisch',
  'rindfleisch',
  'rosinen',
  'sahne',
  'salz',
  'schinken',
  'schmalz',
  'schnittlauch',
  'schokolade',
  'schweinefleisch',
  'sellerie',
  'sojasauce',
  'spinat',
  'thunfisch',
  'thymian',
  'tomate',
  'tomaten',
  'vanille',
  'wasser',
  'wein',
  'wildschwein',
  'wodka',
  'zimt',
  'zimtstange',
  'zitrone',
  'zucker',
  'zwiebel',
  'zwiebeln',
]);

/**
 * Letters no English ingredient name carries. Catches the German names the list
 * above does not hold, and leaves French spellings like "Crème" alone.
 */
const NON_ENGLISH_LETTERS = /[äöüßÄÖÜ]/;

/**
 * Splits a name into lower-cased words, so an entry matches as a whole word and
 * never as part of a longer one.
 * @param name Raw name as typed.
 * @returns The words of that name.
 */
function toWords(name: string): string[] {
  return name.toLowerCase().match(/\p{L}+/gu) ?? [];
}

/**
 * Tells whether one of the listed entries occurs in the name. Single words match
 * word by word, entries holding a space match as a phrase.
 * @param name Raw name as typed.
 * @param entries Lower-cased entries to look for.
 * @returns True as soon as one entry matches.
 */
function containsEntry(name: string, entries: ReadonlySet<string>): boolean {
  const words = toWords(name);
  const joined = ` ${words.join(' ')} `;
  for (const entry of entries) {
    if (entry.includes(' ') ? joined.includes(` ${entry} `) : words.includes(entry)) return true;
  }
  return false;
}

/**
 * Tells whether a name refers to something no kitchen cooks with.
 * @param name Raw name as typed.
 * @returns True when the name carries an inedible entry.
 */
export function isInedibleIngredient(name: string): boolean {
  return containsEntry(name, INEDIBLE_NAMES);
}

/**
 * Tells whether a name was written in another language. A name the shipped list
 * already knows is English by definition and is never questioned, so a future
 * entry colliding with the German list cannot lock the user out of it.
 * @param name Raw name as typed.
 * @returns True when the name is not English.
 */
export function isNonEnglishIngredient(name: string): boolean {
  if (isKnownIngredient(name)) return false;
  return NON_ENGLISH_LETTERS.test(name) || containsEntry(name, NON_ENGLISH_NAMES);
}
