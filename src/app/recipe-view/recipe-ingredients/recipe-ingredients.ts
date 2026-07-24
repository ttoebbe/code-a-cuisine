import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { RecipeIngredient } from '../../models/recipe.interface';
import { formatRecipeAmount } from '../../shared/recipe-format';

/**
 * Ingredient section of the recipe view. Splits what the user already has from
 * the basics that have to be bought, and can be folded away on mobile.
 */
@Component({
  selector: 'app-recipe-ingredients',
  templateUrl: './recipe-ingredients.html',
  styleUrl: './recipe-ingredients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeIngredients {
  /** Ingredients the user entered in the wizard. */
  readonly yourIngredients = input.required<RecipeIngredient[]>();

  /** Basics the recipe adds on top, at most three per the Lastenheft. */
  readonly extraIngredients = input.required<RecipeIngredient[]>();

  /** Whether the lists are visible; only the mobile layout can fold them. */
  protected readonly expanded = signal(true);

  /** Folds the ingredient lists in or out. */
  protected toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }

  /**
   * Formats the amount column of one row.
   * @param ingredient Ingredient to render.
   * @returns Display string such as "150g", "1 piece" or an empty string.
   */
  protected amountLabel(ingredient: RecipeIngredient): string {
    return formatRecipeAmount(ingredient);
  }
}
