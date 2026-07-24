import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import type { RequestIngredient } from '../../models/recipe-request.interface';
import { GeneratorStateService } from '../../services/generator-state.service';
import { IngredientForm } from './ingredient-form/ingredient-form';
import { IngredientList } from './ingredient-list/ingredient-list';

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

  private readonly editIndex = signal<number | null>(null);

  /** Ingredient currently loaded into the form, or null while adding. */
  protected readonly editing = computed(() => {
    const index = this.editIndex();
    return index === null ? null : (this.state.ingredients()[index] ?? null);
  });

  /**
   * Adds a new ingredient or saves the one being edited.
   * @param ingredient Validated ingredient emitted by the form.
   */
  protected onSave(ingredient: RequestIngredient): void {
    const index = this.editIndex();
    if (index === null) this.state.addIngredient(ingredient);
    else this.state.updateIngredient(index, ingredient);
    this.editIndex.set(null);
  }

  /**
   * Loads a row back into the form.
   * @param index Zero-based position of the row.
   */
  protected onEdit(index: number): void {
    this.editIndex.set(index);
  }

  /**
   * Deletes a row and leaves edit mode when that row was being edited.
   * @param index Zero-based position of the row.
   */
  protected onRemove(index: number): void {
    if (this.editIndex() === index) this.editIndex.set(null);
    this.state.removeIngredient(index);
  }
}
