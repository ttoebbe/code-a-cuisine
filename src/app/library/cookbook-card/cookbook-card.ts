import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe } from '../../models/recipe.interface';
import { formatCookingTime, getCuisineLabel } from '../../shared/recipe-format';

/**
 * One recipe in the cookbook list. Unlike the card of the result screen it
 * shows a stored recipe: it links by document id and carries the like count.
 */
@Component({
  selector: 'app-cookbook-card',
  imports: [RouterLink],
  templateUrl: './cookbook-card.html',
  styleUrl: './cookbook-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookbookCard {
  /** Stored recipe to render. */
  readonly recipe = input.required<Recipe>();

  /** Cooking time of the recipe, e.g. "20min". */
  protected readonly cookingTime = computed(() =>
    formatCookingTime(this.recipe().cookingTimeMinutes),
  );

  /** Cuisine label, e.g. "Italian". */
  protected readonly cuisineLabel = computed(() => getCuisineLabel(this.recipe().cuisine));
}
