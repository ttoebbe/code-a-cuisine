import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe } from '../../models/recipe.interface';
import { formatCookingTime, getDietLabel, getTimeLabel } from '../../shared/recipe-format';

/**
 * One entry of a cuisine list. Only the title is a link, but it covers the
 * whole row, so the accessible name stays short while the target stays large.
 */
@Component({
  selector: 'app-recipe-row',
  imports: [RouterLink],
  templateUrl: './recipe-row.html',
  styleUrl: './recipe-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeRow {
  /** Stored recipe to render. */
  readonly recipe = input.required<Recipe>();

  /** 1-based position in the list, shown as the leading ordinal. */
  readonly position = input.required<number>();

  /** Cooking time of the recipe, e.g. "20min". */
  protected readonly cookingTime = computed(() =>
    formatCookingTime(this.recipe().cookingTimeMinutes),
  );

  /** Diet chip, null for recipes without a diet. */
  protected readonly dietLabel = computed(() => getDietLabel(this.recipe().diet));

  /** Cooking time chip, e.g. "Quick". */
  protected readonly timeLabel = computed(() => getTimeLabel(this.recipe().timeCategory));
}
