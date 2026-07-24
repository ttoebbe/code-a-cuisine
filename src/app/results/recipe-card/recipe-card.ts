import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GeneratedRecipe } from '../../models/recipe.interface';
import { formatCookingTime } from '../../shared/recipe-format';

/**
 * One of the three suggestions in the result list. Deliberately short: the
 * details follow in the recipe view behind the "View" button.
 */
@Component({
  selector: 'app-recipe-card',
  imports: [RouterLink],
  templateUrl: './recipe-card.html',
  styleUrl: './recipe-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeCard {
  /** Suggestion to render. */
  readonly recipe = input.required<GeneratedRecipe>();

  /** Position in the result list, used as route parameter. */
  readonly index = input.required<number>();

  /** Caption above the title, e.g. "Recipe 2". */
  protected readonly caption = computed(() => `Recipe ${this.index() + 1}`);

  /** Cooking time of the suggestion, e.g. "20min". */
  protected readonly cookingTime = computed(() =>
    formatCookingTime(this.recipe().cookingTimeMinutes),
  );
}
