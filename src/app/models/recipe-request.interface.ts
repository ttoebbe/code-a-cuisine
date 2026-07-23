import type { CuisineStyle, Diet, IngredientUnit, TimeCategory } from './recipe-filters.types';

/**
 * An ingredient entered by the user in the input form.
 * Amount and unit are both required (the form field enforces both).
 */
export interface RequestIngredient {
  name: string;
  amount: number;
  unit: IngredientUnit;
}

/**
 * Request payload sent from Angular to the n8n webhook.
 * Validation (portions 1..12, cooks 1..3, ingredients length >= 1)
 * is enforced by the Angular form and re-validated in n8n.
 */
export interface RecipeRequest {
  ingredients: RequestIngredient[];
  portions: number;
  cooks: number;
  timeCategory: TimeCategory;
  cuisine: CuisineStyle;
  diet: Diet;
}
