import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import type { RequestIngredient } from '../../models/recipe-request.interface';
import { GeneratorStateService } from '../../services/generator-state.service';
import { IngredientForm } from './ingredient-form/ingredient-form';
import { IngredientList, type IngredientUpdate } from './ingredient-list/ingredient-list';

/**
 * Step 1 of the generator wizard. Wires the input form and the ingredient list
 * to the shared generator state and guards the step transition.
 */
@Component({
  selector: 'app-ingredient-step',
  imports: [IngredientForm, IngredientList],
  templateUrl: './ingredient-step.html',
  styleUrl: './ingredient-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientStep {
  protected readonly state = inject(GeneratorStateService);

  /** Emits once the user advances to the preferences step. */
  readonly next = output<void>();

  /**
   * Appends a new ingredient.
   * @param ingredient Validated ingredient emitted by the form.
   */
  protected onAdd(ingredient: RequestIngredient): void {
    this.state.addIngredient(ingredient);
  }

  /**
   * Writes a row the user edited in the list back into the request.
   * @param update Row position and the entry that replaces it.
   */
  protected onUpdate(update: IngredientUpdate): void {
    this.state.updateIngredient(update.index, update.ingredient);
  }

  /**
   * Deletes a row.
   * @param index Zero-based position of the row.
   */
  protected onRemove(index: number): void {
    this.state.removeIngredient(index);
  }
}
