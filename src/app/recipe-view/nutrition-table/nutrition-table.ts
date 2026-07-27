import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { NutritionInfo, NutritionScope } from '../../models/recipe.interface';

/** One rendered block of the nutrition section. */
interface NutritionRow {
  label: string;
  scope: NutritionScope;
}

/**
 * Nutrition block of the recipe view. The design shows the four values side by
 * side; the Lastenheft additionally asks for per-portion AND total. Both scopes
 * therefore get their own small table, stacked, so the four columns stay wide
 * enough to read on a 390px screen instead of scrolling out of view.
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
  protected readonly rows = computed<NutritionRow[]>(() => [
    { label: 'Per portion', scope: this.nutrition().perPortion },
    { label: `All ${this.portions()} portions`, scope: this.nutrition().total },
  ]);
}
