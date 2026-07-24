import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { GeneratedRecipe } from '../../models/recipe.interface';
import {
  formatCookingTime,
  getCuisineLabel,
  getDietLabel,
  getTimeLabel,
} from '../../shared/recipe-format';
import { ChefBadge } from '../chef-badge/chef-badge';
import { NutritionTable } from '../nutrition-table/nutrition-table';

/**
 * Head of the recipe view: title, cooking time, the chefs involved and the
 * nutrition block.
 */
@Component({
  selector: 'app-recipe-summary',
  imports: [ChefBadge, NutritionTable],
  templateUrl: './recipe-summary.html',
  styleUrl: './recipe-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeSummary {
  /** Recipe on display. */
  readonly recipe = input.required<GeneratedRecipe>();

  /**
   * Likes of the recipe. Null for a fresh suggestion that is not in the
   * cookbook yet, which hides the counter.
   */
  readonly likeCount = input<number | null>(null);

  /** Cooking time of the recipe, e.g. "20min". */
  protected readonly cookingTime = computed(() =>
    formatCookingTime(this.recipe().cookingTimeMinutes),
  );

  /** Time category label shown as a chip. */
  protected readonly timeLabel = computed(() => getTimeLabel(this.recipe().timeCategory));

  /** Cuisine label shown as a chip. */
  protected readonly cuisineLabel = computed(() => getCuisineLabel(this.recipe().cuisine));

  /** Diet label, null when the recipe carries no restriction. */
  protected readonly dietLabel = computed(() => getDietLabel(this.recipe().diet));

  /** 1-based numbers of all chefs, used for the badge row. */
  protected readonly chefs = computed(() =>
    Array.from({ length: this.recipe().cooks }, (_, position) => position + 1),
  );
}
