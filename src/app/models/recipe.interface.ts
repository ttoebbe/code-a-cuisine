import type { CuisineStyle, Diet, IngredientUnit, TimeCategory } from './recipe-filters.types';

/**
 * An ingredient as listed in a generated recipe.
 * Amount/unit may be null for qualitative entries (e.g. "Herbs").
 * Note carries clarifying text like "dry basil, oregano, garlic".
 */
export interface RecipeIngredient {
  name: string;
  amount: number | null;
  unit: IngredientUnit | null;
  note: string | null;
}

/**
 * A single cooking step in the chronological plan.
 * Steps sharing the same parallelGroupId run in parallel;
 * parallelGroupId=null means the step is serial.
 */
export interface RecipeStep {
  order: number;
  title: string;
  description: string;
  /**
   * Chef performing this step. 1-based index into the range 1..Recipe.cooks.
   * Always set (never null). When Recipe.cooks === 1, this is constant 1.
   */
  assignedChef: number;
  parallelGroupId: number | null;
}

/** Single macro value: grams AND percentage of total kcal. */
export interface MacroValue {
  grams: number;
  percent: number;
}

/** Nutrition data for one scope (per-portion OR total recipe). */
export interface NutritionScope {
  kcal: number;
  protein: MacroValue;
  carbs: MacroValue;
  fat: MacroValue;
}

/**
 * Full nutrition information (User Story 10).
 * Lastenheft requires both per-portion AND total values.
 */
export interface NutritionInfo {
  perPortion: NutritionScope;
  total: NutritionScope;
}

/**
 * A complete recipe. Also the shape of one document in the Firestore
 * 'recipes' collection.
 */
export interface Recipe {
  /** Firestore document id (assigned on write). */
  id: string;
  title: string;
  /** Actual cooking time in minutes (numeric, e.g. 22). */
  cookingTimeMinutes: number;
  /** Category derived from cookingTimeMinutes, used for filter chip. */
  timeCategory: TimeCategory;
  /** Also used as library category filter (User Story 13). */
  cuisine: CuisineStyle;
  diet: Diet;
  portions: number;
  cooks: number;
  /** Ingredients the user provided (already in the kitchen). */
  yourIngredients: RecipeIngredient[];
  /** Missing basics the user must buy. Max 3 (User Story 7). */
  extraIngredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: NutritionInfo;
  /** ISO 8601 timestamp. Used for pagination cursor and sort. */
  createdAt: string;
  /** Number of likes (Figma "Most liked recipes"). Default 0. */
  likeCount: number;
}

/**
 * Recipe as returned by the n8n workflow: without the technical
 * fields that Angular fills in when persisting to Firestore.
 */
export type GeneratedRecipe = Omit<Recipe, 'id' | 'createdAt' | 'likeCount'>;
