import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { NutritionInfo, NutritionScope } from '../../models/recipe.interface';

/** One rendered row of the nutrition table. */
interface NutritionRow {
  label: string;
  scope: NutritionScope;
}

/**
 * Nutrition block of the recipe view. The Lastenheft asks for per-portion and
 * total values, so both scopes are listed as rows of one table.
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

  /** Servings the recipe is calculated for, used in the row label. */
  readonly portions = input.required<number>();

  /** The two scopes in display order. */
  protected readonly rows = computed<NutritionRow[]>(() => [
    { label: 'Per portion', scope: this.nutrition().perPortion },
    { label: `All ${this.portions()} portions`, scope: this.nutrition().total },
  ]);
}
