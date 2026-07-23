/**
 * Cooking time category. Ranges (Lastenheft):
 * - quick: up to 20 min
 * - medium: 20-45 min
 * - complex: 45+ min
 */
export type TimeCategory = 'quick' | 'medium' | 'complex';

/**
 * Cuisine style. Used both as recipe-generation filter (User Story 4)
 * and as library category filter (User Story 13). Includes 'fusion'
 * for consistency between input side and library category grid.
 */
export type CuisineStyle = 'german' | 'italian' | 'japanese' | 'indian' | 'gourmet' | 'fusion';

/** Diet preference. 'none' maps to Lastenheft "Keine Einschraenkung". */
export type Diet = 'vegetarian' | 'vegan' | 'keto' | 'none';

/** Measurement unit for ingredient quantities. */
export type IngredientUnit = 'g' | 'ml' | 'piece';
