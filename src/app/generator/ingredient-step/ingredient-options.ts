import type { IngredientUnit } from '../../models/recipe-filters.types';

/**
 * Static autocomplete source for the ingredient input. Kept local on purpose:
 * the generator must stay usable without a backend round trip.
 */
export const INGREDIENT_NAMES: readonly string[] = [
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

// Three entries, matching the design and the reserved height of the suggestion
// overlay in ingredient-form.scss.
const MAX_SUGGESTIONS = 3;

/** Selectable measurement units with their human readable labels. */
export const UNIT_OPTIONS: readonly { value: IngredientUnit; label: string }[] = [
  { value: 'g', label: 'gram' },
  { value: 'ml', label: 'milliliter' },
  { value: 'piece', label: 'piece' },
];

/** Suffix appended to an amount in the list. Countable pieces show no unit. */
const UNIT_SUFFIX: Record<IngredientUnit, string> = { g: 'g', ml: 'ml', piece: '' };

/**
 * Filters the ingredient names by prefix, case-insensitively.
 * An empty or blank term yields no suggestions so the list stays closed.
 * @param term Raw value of the ingredient input.
 * @returns Up to MAX_SUGGESTIONS matching ingredient names.
 */
export function findIngredientSuggestions(term: string): string[] {
  const prefix = term.trim().toLowerCase();
  if (!prefix) return [];
  const matches = INGREDIENT_NAMES.filter((name) => name.toLowerCase().startsWith(prefix));
  return matches.slice(0, MAX_SUGGESTIONS);
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
