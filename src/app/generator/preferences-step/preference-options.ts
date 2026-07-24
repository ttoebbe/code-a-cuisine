import type { CuisineStyle, Diet, TimeCategory } from '../../models/recipe-filters.types';

/** A single selectable chip inside a preference group. */
export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Optional second line, used for the cooking time ranges. */
  hint?: string;
}

/**
 * Cooking time categories. The ranges follow the Lastenheft, not the design
 * mock-up, which showed a narrower "25-40 min" span for the middle option.
 */
export const TIME_OPTIONS: readonly ChipOption<TimeCategory>[] = [
  { value: 'quick', label: 'Quick', hint: 'up to 20 min' },
  { value: 'medium', label: 'Medium', hint: '20-45 min' },
  { value: 'complex', label: 'Elaborate', hint: '45+ min' },
];

/** Cuisine styles offered as recipe-generation filter. */
export const CUISINE_OPTIONS: readonly ChipOption<CuisineStyle>[] = [
  { value: 'german', label: 'German' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'indian', label: 'Indian' },
  { value: 'gourmet', label: 'Gourmet' },
  { value: 'fusion', label: 'Fusion' },
];

/** Diet preferences offered as recipe-generation filter. */
export const DIET_OPTIONS: readonly ChipOption<Diet>[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' },
  { value: 'none', label: 'No restriction' },
];
