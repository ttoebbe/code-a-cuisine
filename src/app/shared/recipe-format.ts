import {
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  TIME_OPTIONS,
  type ChipOption,
} from '../generator/preferences-step/preference-options';
import type { CuisineStyle, Diet, TimeCategory } from '../models/recipe-filters.types';
import type { RecipeIngredient } from '../models/recipe.interface';

/**
 * Looks a value up in a chip option list.
 * @param options Option list that defines the visible wording.
 * @param value Value to translate.
 * @returns The label, or the raw value when the list has no entry for it.
 */
function findLabel<T extends string>(options: readonly ChipOption<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Visible label of a cooking time category, e.g. "Quick". */
export function getTimeLabel(value: TimeCategory): string {
  return findLabel(TIME_OPTIONS, value);
}

/** Visible label of a cuisine style, e.g. "Italian". */
export function getCuisineLabel(value: CuisineStyle): string {
  return findLabel(CUISINE_OPTIONS, value);
}

/**
 * Visible label of a diet.
 * @param value Diet of the recipe.
 * @returns The label, or null for 'none' which is not worth a chip.
 */
export function getDietLabel(value: Diet): string | null {
  return value === 'none' ? null : findLabel(DIET_OPTIONS, value);
}

/**
 * Formats the cooking time for the recipe header.
 * @param minutes Cooking time in minutes.
 * @returns Display string such as "20min".
 */
export function formatCookingTime(minutes: number): string {
  return `${minutes}min`;
}

/**
 * Formats amount and unit of a recipe ingredient.
 * Qualitative entries carry no amount and render as an empty column.
 * @param ingredient Ingredient of a generated recipe.
 * @returns Display string such as "150g", "1 piece" or "".
 */
export function formatRecipeAmount(ingredient: RecipeIngredient): string {
  const { amount, unit } = ingredient;
  if (amount === null || unit === null) return '';
  if (unit !== 'piece') return `${amount}${unit}`;
  return amount === 1 ? '1 piece' : `${amount} pieces`;
}
