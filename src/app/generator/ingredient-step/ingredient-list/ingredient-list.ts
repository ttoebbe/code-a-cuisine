import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { RequestIngredient } from '../../../models/recipe-request.interface';
import { formatAmount } from '../ingredient-options';

/**
 * Right-hand card of step 1: shows the collected ingredients and offers an
 * edit and a delete action per row.
 */
@Component({
  selector: 'app-ingredient-list',
  imports: [],
  templateUrl: './ingredient-list.html',
  styleUrl: './ingredient-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientList {
  /** Ingredients collected so far, in insertion order. */
  readonly ingredients = input.required<RequestIngredient[]>();

  /** Emits the index of the row the user wants to edit. */
  readonly edit = output<number>();

  /** Emits the index of the row the user wants to delete. */
  readonly remove = output<number>();

  /**
   * Formats amount and unit for display, e.g. "150g" or "1".
   * @param ingredient Row to render.
   * @returns Display string for the amount column.
   */
  protected amountLabel(ingredient: RequestIngredient): string {
    return formatAmount(ingredient.amount, ingredient.unit);
  }
}
