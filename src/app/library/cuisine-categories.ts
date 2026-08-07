import type { CuisineStyle } from '../models/recipe-filters.types';
import { getCuisineLabel } from '../shared/recipe-format';

/** One category of the cookbook, shown as a tile and used as list filter. */
export interface CuisineCategory {
  value: CuisineStyle;
  /** Heading of the tile, e.g. "Italian cuisine". */
  label: string;
  /** Small emblem next to the heading. */
  icon: string;
  /** Square photo of the tile. */
  image: string;
  /** Decorative band above the filtered list. */
  banner: string;
  /** Intrinsic width of the band, so the list reserves its space. */
  bannerWidth: number;
  /** Intrinsic height of the band. */
  bannerHeight: number;
}

/**
 * Pixel size of every banner file in public/img/cookbook/banners. All six are
 * the same 3x export of the design's 1143 x 144 band (spec 4.19), so one pair
 * of numbers covers them and every row on the page is the same height.
 */
const BANNER_SIZE = { width: 3437, height: 432 };

/** Tile order of the design mock-up, which differs from the generator chips. */
const CATEGORY_ORDER: readonly CuisineStyle[] = [
  'italian',
  'german',
  'japanese',
  'gourmet',
  'indian',
  'fusion',
];

/**
 * Builds the tile of one cuisine from the shared asset naming.
 * @param value Cuisine style of the tile.
 * @returns Category with label and image paths.
 */
function buildCategory(value: CuisineStyle): CuisineCategory {
  return {
    value,
    label: `${getCuisineLabel(value)} cuisine`,
    icon: `/img/cookbook/icons/${value}.png`,
    image: `/img/cookbook/category-${value}.png`,
    banner: `/img/cookbook/banners/${value}.png`,
    bannerWidth: BANNER_SIZE.width,
    bannerHeight: BANNER_SIZE.height,
  };
}

/** All categories of the cookbook grid. */
export const CUISINE_CATEGORIES: readonly CuisineCategory[] = CATEGORY_ORDER.map(buildCategory);

/**
 * Type guard for the cuisine query parameter of the cookbook route.
 * @param value Raw parameter value, may be missing or arbitrary text.
 * @returns True when the value names a known cuisine.
 */
export function isCuisineStyle(value: string | undefined): value is CuisineStyle {
  return CUISINE_CATEGORIES.some((category) => category.value === value);
}

/**
 * Looks up one category.
 * @param value Cuisine style to find.
 * @returns The category, or null when no tile exists for it.
 */
export function findCuisineCategory(value: CuisineStyle | null): CuisineCategory | null {
  return CUISINE_CATEGORIES.find((category) => category.value === value) ?? null;
}
