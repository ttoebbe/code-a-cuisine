#!/usr/bin/env node
/**
 * Fills the Firestore recipe library with dummy data, so the cookbook can be
 * tested without a running n8n workflow (Phase 3.3 test plan).
 *
 * Usage:
 *   node scripts/seed-recipes.mjs            writes 30 recipes
 *   node scripts/seed-recipes.mjs --count 8  writes 8 recipes
 *
 * The Firebase config is read from src/environments/environment.ts, or from
 * the FIREBASE_CONFIG environment variable when it holds a JSON object.
 * Every write goes through the same rules as the app: recipes are created
 * unliked and the likes are added one increment at a time.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  increment,
  serverTimestamp,
  terminate,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENVIRONMENT_FILE = resolve(PROJECT_ROOT, 'src/environments/environment.ts');

/** Cooking times cycled through the seeded recipes, one per time category. */
const COOKING_TIMES = [15, 25, 35, 55, 20];

/** Like counts cycled through the seeded recipes. */
const LIKE_COUNTS = [8, 5, 3, 2, 1, 0];

/** Dummy recipes per cuisine; five titles each add up to 30 documents. */
const CUISINES = [
  {
    value: 'italian',
    diet: 'vegetarian',
    ingredients: [
      { name: 'Pasta noodles', amount: 200, unit: 'g', note: null },
      { name: 'Cherry tomatoes', amount: 150, unit: 'g', note: null },
      { name: 'Baby spinach', amount: 100, unit: 'g', note: null },
    ],
    extras: [
      { name: 'Parmesan cheese', amount: 40, unit: 'g', note: null },
      { name: 'Herbs', amount: null, unit: null, note: 'basil, oregano, garlic' },
    ],
    titles: [
      'Pasta with spinach and cherry tomatoes',
      'Baked pasta with tomatoes and greens',
      'Creamy lemon risotto',
      'Focaccia with rosemary and olives',
      'Panzanella with mozzarella',
    ],
  },
  {
    value: 'german',
    diet: 'none',
    ingredients: [
      { name: 'Potatoes', amount: 500, unit: 'g', note: null },
      { name: 'Onion', amount: 1, unit: 'piece', note: null },
      { name: 'Carrots', amount: 200, unit: 'g', note: null },
    ],
    extras: [{ name: 'Butter', amount: 30, unit: 'g', note: null }],
    titles: [
      'Potato soup with root vegetables',
      'Pan-fried potatoes with onions',
      'Carrot and potato mash',
      'Sunday roast with gravy',
      'Bread dumplings with mushrooms',
    ],
  },
  {
    value: 'japanese',
    diet: 'none',
    ingredients: [
      { name: 'Rice', amount: 250, unit: 'g', note: null },
      { name: 'Salmon fillet', amount: 200, unit: 'g', note: null },
      { name: 'Spring onion', amount: 2, unit: 'piece', note: null },
    ],
    extras: [
      { name: 'Soy sauce', amount: 40, unit: 'ml', note: null },
      { name: 'Sesame oil', amount: 15, unit: 'ml', note: null },
    ],
    titles: [
      'Salmon donburi with sesame',
      'Miso ramen with spring onions',
      'Teriyaki rice bowl',
      'Onigiri with grilled salmon',
      'Vegetable udon in broth',
    ],
  },
  {
    value: 'gourmet',
    diet: 'keto',
    ingredients: [
      { name: 'Beef fillet', amount: 300, unit: 'g', note: null },
      { name: 'Mushrooms', amount: 200, unit: 'g', note: null },
      { name: 'Celeriac', amount: 250, unit: 'g', note: null },
    ],
    extras: [
      { name: 'Cream', amount: 100, unit: 'ml', note: null },
      { name: 'Butter', amount: 40, unit: 'g', note: null },
    ],
    titles: [
      'Beef fillet on celeriac purée',
      'Mushroom ragout with herb foam',
      'Slow-cooked beef with jus',
      'Celeriac steak with truffle butter',
      'Duo of mushrooms and cream',
    ],
  },
  {
    value: 'indian',
    diet: 'vegan',
    ingredients: [
      { name: 'Chickpeas', amount: 400, unit: 'g', note: 'cooked' },
      { name: 'Tomatoes', amount: 300, unit: 'g', note: null },
      { name: 'Rice', amount: 200, unit: 'g', note: null },
    ],
    extras: [
      { name: 'Coconut milk', amount: 200, unit: 'ml', note: null },
      { name: 'Spices', amount: null, unit: null, note: 'garam masala, turmeric, cumin' },
    ],
    titles: [
      'Chickpea curry with coconut milk',
      'Tomato dal with rice',
      'Spiced chickpea pilaf',
      'Vegetable korma',
      'Masala rice with roasted tomatoes',
    ],
  },
  {
    value: 'fusion',
    diet: 'vegetarian',
    ingredients: [
      { name: 'Sweet potato', amount: 400, unit: 'g', note: null },
      { name: 'Black beans', amount: 200, unit: 'g', note: 'cooked' },
      { name: 'Lime', amount: 1, unit: 'piece', note: null },
    ],
    extras: [{ name: 'Feta cheese', amount: 80, unit: 'g', note: null }],
    titles: [
      'Sweet potato tacos with lime',
      'Black bean bowl with miso dressing',
      'Kimchi quesadilla',
      'Sweet potato curry burrito',
      'Bean and feta poke bowl',
    ],
  },
];

/**
 * Reads the Firebase web config the app is configured with.
 * @returns Config object for initializeApp.
 */
function readFirebaseConfig() {
  if (process.env.FIREBASE_CONFIG) return JSON.parse(process.env.FIREBASE_CONFIG);
  const source = readFileSync(ENVIRONMENT_FILE, 'utf8');
  const block = source.match(/firebase:\s*\{([\s\S]*?)\}/);
  if (block === null) throw new Error(`No firebase block found in ${ENVIRONMENT_FILE}`);
  return Object.fromEntries([...block[1].matchAll(/(\w+):\s*'([^']*)'/g)].map((m) => [m[1], m[2]]));
}

/**
 * Stops the run while the config still carries the placeholder values.
 * @param config Config read from the environment file.
 */
function assertConfigured(config) {
  const missing = Object.entries(config).filter(([, value]) => String(value).startsWith('TODO'));
  if (missing.length === 0) return;
  const keys = missing.map(([key]) => key).join(', ');
  throw new Error(`Firebase config is still a placeholder (${keys}). See docs/firebase.md.`);
}

/**
 * Derives the time category from the cooking time, as the workflow does.
 * @param minutes Cooking time in minutes.
 * @returns 'quick', 'medium' or 'complex'.
 */
function toTimeCategory(minutes) {
  if (minutes <= 20) return 'quick';
  return minutes <= 45 ? 'medium' : 'complex';
}

/**
 * Builds the three cooking steps of a seeded recipe.
 * @param cuisine Cuisine block the recipe belongs to.
 * @param cooks Number of chefs the steps are spread over.
 * @returns Steps in chronological order.
 */
function buildSteps(cuisine, cooks) {
  const [first, second, third] = cuisine.ingredients;
  return [
    {
      title: `Prepare the ${first.name.toLowerCase()}`,
      description: `Weigh and prepare the ${first.name.toLowerCase()}, then set it aside.`,
    },
    {
      title: `Cook the ${second.name.toLowerCase()}`,
      description: `Cook the ${second.name.toLowerCase()} together with the ${third.name.toLowerCase()} until everything is tender.`,
    },
    {
      title: 'Season and serve',
      description: 'Combine both components, season to taste and serve straight away.',
    },
  ].map((step, position) => ({
    ...step,
    order: position + 1,
    assignedChef: (position % cooks) + 1,
    parallelGroupId: null,
  }));
}

/**
 * Turns per-portion macro grams into one nutrition scope.
 * @param values Energy and macro grams.
 * @returns Scope with grams and percentage of the energy.
 */
function buildScope(values) {
  const share = (grams, kcalPerGram) => Math.round(((grams * kcalPerGram) / values.kcal) * 100);
  return {
    kcal: values.kcal,
    protein: { grams: values.protein, percent: share(values.protein, 4) },
    carbs: { grams: values.carbs, percent: share(values.carbs, 4) },
    fat: { grams: values.fat, percent: share(values.fat, 9) },
  };
}

/**
 * Builds the nutrition block of a seeded recipe.
 * @param portions Servings of the recipe.
 * @param position Index inside the cuisine, varies the values a little.
 * @returns Nutrition info with both scopes.
 */
function buildNutrition(portions, position) {
  const perPortion = {
    kcal: 420 + position * 60,
    protein: 18 + position * 3,
    carbs: 45 + position * 5,
    fat: 14 + position * 2,
  };
  const total = Object.fromEntries(
    Object.entries(perPortion).map(([key, value]) => [key, value * portions]),
  );
  return { perPortion: buildScope(perPortion), total: buildScope(total) };
}

/**
 * Builds one dummy recipe.
 * @param cuisine Cuisine block the recipe belongs to.
 * @param position Index of the title inside the cuisine.
 * @returns Recipe in the shape of GeneratedRecipe.
 */
function buildRecipe(cuisine, position) {
  const minutes = COOKING_TIMES[position % COOKING_TIMES.length];
  const portions = 2 + (position % 3);
  const cooks = 1 + (position % 2);
  return {
    title: cuisine.titles[position],
    cookingTimeMinutes: minutes,
    timeCategory: toTimeCategory(minutes),
    cuisine: cuisine.value,
    diet: cuisine.diet,
    portions,
    cooks,
    yourIngredients: cuisine.ingredients,
    extraIngredients: cuisine.extras,
    steps: buildSteps(cuisine, cooks),
    nutrition: buildNutrition(portions, position),
  };
}

/**
 * Collects the recipes to write, cuisine by cuisine.
 * @param count Maximum number of recipes.
 * @returns Recipes together with the likes they should end up with.
 */
function buildSeedRecipes(count) {
  const seeds = [];
  CUISINES.forEach((cuisine) => {
    cuisine.titles.forEach((_, position) => {
      const likes = LIKE_COUNTS[seeds.length % LIKE_COUNTS.length];
      seeds.push({ recipe: buildRecipe(cuisine, position), likes });
    });
  });
  return seeds.slice(0, count);
}

/**
 * Writes one recipe and adds its likes through the same path as the app.
 * @param recipes Reference of the 'recipes' collection.
 * @param seed Recipe and the number of likes to add.
 * @returns Id of the created document.
 */
async function writeRecipe(recipes, seed) {
  const created = await addDoc(recipes, {
    ...seed.recipe,
    createdAt: serverTimestamp(),
    likeCount: 0,
  });
  for (let like = 0; like < seed.likes; like += 1) {
    await updateDoc(doc(recipes, created.id), { likeCount: increment(1) });
  }
  return created.id;
}

/**
 * Reads the requested recipe count from the command line.
 * @returns Number of recipes to write.
 */
function readCount() {
  const flag = process.argv.indexOf('--count');
  if (flag === -1) return Number.MAX_SAFE_INTEGER;
  const count = Number(process.argv[flag + 1]);
  if (!Number.isInteger(count) || count < 1) throw new Error('--count needs a positive integer');
  return count;
}

/** Prints the recipes that would be written, without touching Firestore. */
function printDryRun() {
  const seeds = buildSeedRecipes(readCount());
  seeds.forEach((entry) => {
    console.log(`${entry.recipe.cuisine.padEnd(9)} ${entry.likes} likes  ${entry.recipe.title}`);
  });
  console.log(`${seeds.length} recipes, nothing written (--dry-run).`);
}

/** Writes the dummy library and reports what was created. */
async function seed() {
  if (process.argv.includes('--dry-run')) return printDryRun();
  const config = readFirebaseConfig();
  assertConfigured(config);
  const firestore = getFirestore(initializeApp(config));
  const recipes = collection(firestore, 'recipes');
  const seeds = buildSeedRecipes(readCount());
  console.log(`Writing ${seeds.length} recipes to project ${config.projectId}…`);
  for (const entry of seeds) {
    const id = await writeRecipe(recipes, entry);
    console.log(`  ${entry.recipe.cuisine.padEnd(9)} ${entry.recipe.title} (${id})`);
  }
  await terminate(firestore);
  console.log('Done.');
}

seed().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
