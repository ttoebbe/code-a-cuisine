import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { NutritionInfo, NutritionScope } from '../../models/recipe.interface';

/** One macronutrient of a block: grams plus its share of the energy. */
interface MacroRow {
  label: string;
  grams: number;
  /** Share of the total kcal in percent, clamped to 0…100. */
  percent: number;
}

/** One rendered block of the nutrition section. */
interface NutritionBlock {
  label: string;
  kcal: number;
  macros: MacroRow[];
}

/**
 * Nutrition block of the recipe view. The Lastenheft asks for per-portion AND
 * total values and for the macros in grams as well as in percent. Each scope
 * therefore gets its own block: energy on top, then one row per macro whose
 * share is both written out and drawn as a bar, so the chart stays readable
 * on a 375px screen and never carries meaning by colour alone.
 */
@Component({
  selector: 'app-nutrition-table',
  templateUrl: './nutrition-table.html',
  styleUrl: './nutrition-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NutritionTable {
  /** Per-portion and total values of the recipe. */
  readonly nutrition = input.required<NutritionInfo>();

  /** Servings the recipe is calculated for, used in the block caption. */
  readonly portions = input.required<number>();

  /** The two scopes in display order. */
  protected readonly blocks = computed<NutritionBlock[]>(() => [
    buildBlock('Per portion', this.nutrition().perPortion),
    buildBlock(`All ${this.portions()} portions`, this.nutrition().total),
  ]);
}

/**
 * Turns one nutrition scope into the block the template renders.
 * @param label Caption of the block, e.g. "Per portion".
 * @param scope Energy and macros of that scope.
 * @returns Block with its three macro rows in display order.
 */
function buildBlock(label: string, scope: NutritionScope): NutritionBlock {
  return {
    label,
    kcal: scope.kcal,
    macros: [
      { label: 'Protein', grams: scope.protein.grams, percent: toShare(scope.protein.percent) },
      { label: 'Fat', grams: scope.fat.grams, percent: toShare(scope.fat.percent) },
      { label: 'Carbs', grams: scope.carbs.grams, percent: toShare(scope.carbs.percent) },
    ],
  };
}

/**
 * Normalises a stored share into a bar width. Recipes saved before the field
 * existed carry no percentage, which must not end up as a NaN-wide bar.
 * @param percent Share as read from the document.
 * @returns The share clamped to 0…100, or 0 when it is missing.
 */
function toShare(percent: number | undefined): number {
  if (percent === undefined || !Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100);
}
