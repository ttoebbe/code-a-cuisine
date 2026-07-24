import type { RecipeSuccessResponse } from '../models/recipe-response.interface';
import type { GeneratedRecipe, NutritionInfo, NutritionScope } from '../models/recipe.interface';

/** Roughly the runtime of a real workflow run, so the loading screen is testable. */
export const MOCK_WEBHOOK_DELAY_MS = 4_000;

/** Energy per gram of macronutrient, used to derive the percentage shares. */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** Energy and macro grams of one nutrition scope. */
interface MacroGrams {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Builds a nutrition block from per-portion values.
 * @param portions Servings the recipe is calculated for.
 * @param values Per-portion energy and macro grams.
 * @returns Nutrition info with per-portion and total scope.
 */
function buildNutrition(portions: number, values: MacroGrams): NutritionInfo {
  const totals: MacroGrams = {
    kcal: values.kcal * portions,
    protein: values.protein * portions,
    carbs: values.carbs * portions,
    fat: values.fat * portions,
  };
  return { perPortion: buildScope(values), total: buildScope(totals) };
}

/**
 * Turns raw macro grams into the scope shape including energy percentages.
 * @param values Energy and macro grams of one scope.
 * @returns Nutrition scope with grams and percent of total energy.
 */
function buildScope(values: MacroGrams): NutritionScope {
  const share = (grams: number, kcalPerGram: number) =>
    Math.round(((grams * kcalPerGram) / values.kcal) * 100);
  return {
    kcal: values.kcal,
    protein: { grams: values.protein, percent: share(values.protein, KCAL_PER_GRAM.protein) },
    carbs: { grams: values.carbs, percent: share(values.carbs, KCAL_PER_GRAM.carbs) },
    fat: { grams: values.fat, percent: share(values.fat, KCAL_PER_GRAM.fat) },
  };
}

const PASTA_SPINACH: GeneratedRecipe = {
  title: 'Pasta with spinach and cherry tomatoes',
  cookingTimeMinutes: 20,
  timeCategory: 'quick',
  cuisine: 'italian',
  diet: 'vegetarian',
  portions: 2,
  cooks: 2,
  yourIngredients: [
    { name: 'Pasta noodles', amount: 80, unit: 'g', note: null },
    { name: 'Baby spinach', amount: 100, unit: 'g', note: null },
    { name: 'Cherry tomatoes', amount: 150, unit: 'g', note: null },
    { name: 'Egg', amount: 1, unit: 'piece', note: null },
  ],
  extraIngredients: [
    { name: 'Parmesan cheese', amount: 40, unit: 'g', note: null },
    { name: 'Olive oil', amount: 30, unit: 'ml', note: null },
    { name: 'Herbs', amount: null, unit: null, note: 'dry basil, oregano, garlic' },
  ],
  steps: [
    {
      order: 1,
      title: 'Cook the pasta',
      description:
        'Cook your noodles in boiling, salted water, until the pasta is al dente. Drain the pasta and reserve some of the pasta water.',
      assignedChef: 1,
      parallelGroupId: 1,
    },
    {
      order: 2,
      title: 'Make the sauce',
      description:
        'While the pasta is cooking, heat olive oil in a pan over medium heat. Add the garlic, and sauté until it starts to turn golden. Add the tomatoes, oregano, salt, and pepper, and cook for 3-4 minutes.',
      assignedChef: 2,
      parallelGroupId: 1,
    },
    {
      order: 3,
      title: 'Finish the pasta',
      description:
        'Add the noodles to the sauce, then add pasta water until the sauce is the right consistency. Simmer for 1 minute, then add the spinach, basil, chili flakes, and parmesan.',
      assignedChef: 1,
      parallelGroupId: 2,
    },
    {
      order: 4,
      title: 'Season and serve',
      description:
        'Lower the heat to low, stir until mixed, and remove from the heat. Season to taste, top with parmesan cheese, and enjoy.',
      assignedChef: 2,
      parallelGroupId: 2,
    },
  ],
  nutrition: buildNutrition(2, { kcal: 630, protein: 18, carbs: 58, fat: 24 }),
};

const SPINACH_FRITTATA: GeneratedRecipe = {
  title: 'Spinach and tomato frittata',
  cookingTimeMinutes: 18,
  timeCategory: 'quick',
  cuisine: 'italian',
  diet: 'vegetarian',
  portions: 2,
  cooks: 1,
  yourIngredients: [
    { name: 'Egg', amount: 4, unit: 'piece', note: null },
    { name: 'Baby spinach', amount: 120, unit: 'g', note: null },
    { name: 'Cherry tomatoes', amount: 150, unit: 'g', note: 'halved' },
  ],
  extraIngredients: [
    { name: 'Olive oil', amount: 20, unit: 'ml', note: null },
    { name: 'Parmesan cheese', amount: 30, unit: 'g', note: null },
  ],
  steps: [
    {
      order: 1,
      title: 'Wilt the spinach',
      description:
        'Heat the olive oil in an oven-proof pan, add the spinach and let it wilt for two minutes. Season with salt and pepper.',
      assignedChef: 1,
      parallelGroupId: null,
    },
    {
      order: 2,
      title: 'Add the eggs',
      description:
        'Whisk the eggs with the grated parmesan, pour them over the spinach and scatter the tomato halves on top.',
      assignedChef: 1,
      parallelGroupId: null,
    },
    {
      order: 3,
      title: 'Bake and rest',
      description:
        'Bake at 200 °C for about ten minutes, until the centre is set. Rest for two minutes before slicing.',
      assignedChef: 1,
      parallelGroupId: null,
    },
  ],
  nutrition: buildNutrition(2, { kcal: 410, protein: 26, carbs: 8, fat: 30 }),
};

const TOMATO_PASTA_BAKE: GeneratedRecipe = {
  title: 'Baked pasta with tomatoes and greens',
  cookingTimeMinutes: 42,
  timeCategory: 'medium',
  cuisine: 'italian',
  diet: 'vegetarian',
  portions: 2,
  cooks: 2,
  yourIngredients: [
    { name: 'Pasta noodles', amount: 200, unit: 'g', note: null },
    { name: 'Cherry tomatoes', amount: 200, unit: 'g', note: null },
    { name: 'Baby spinach', amount: 80, unit: 'g', note: null },
  ],
  extraIngredients: [
    { name: 'Mozzarella', amount: 125, unit: 'g', note: null },
    { name: 'Olive oil', amount: 20, unit: 'ml', note: null },
    { name: 'Herbs', amount: null, unit: null, note: 'oregano, garlic, chili flakes' },
  ],
  steps: [
    {
      order: 1,
      title: 'Pre-cook the pasta',
      description: 'Boil the pasta two minutes short of al dente, then drain and set aside.',
      assignedChef: 1,
      parallelGroupId: 1,
    },
    {
      order: 2,
      title: 'Roast the tomatoes',
      description:
        'Toss the tomatoes with olive oil, garlic and herbs and roast them at 220 °C for twelve minutes, until they burst.',
      assignedChef: 2,
      parallelGroupId: 1,
    },
    {
      order: 3,
      title: 'Combine and bake',
      description:
        'Fold pasta, tomatoes and spinach together, top with torn mozzarella and bake for another fifteen minutes.',
      assignedChef: 1,
      parallelGroupId: null,
    },
  ],
  nutrition: buildNutrition(2, { kcal: 720, protein: 29, carbs: 82, fat: 27 }),
};

/**
 * Fixture response used when environment.useMockWebhook is on. Covers the
 * states the result screens have to render: parallel work for two chefs,
 * a single-chef recipe and an ingredient without amount or unit.
 */
export const MOCK_RECIPE_RESPONSE: RecipeSuccessResponse = {
  status: 'ok',
  recipes: [PASTA_SPINACH, SPINACH_FRITTATA, TOMATO_PASTA_BAKE],
};
