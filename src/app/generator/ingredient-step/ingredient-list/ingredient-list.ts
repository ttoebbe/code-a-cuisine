import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { RequestIngredient } from '../../../models/recipe-request.interface';
import { IngredientRow } from './ingredient-row/ingredient-row';

/** Which row the user edited and the entry that replaces it. */
export interface IngredientUpdate {
  index: number;
  ingredient: RequestIngredient;
}

/**
 * Right-hand card of step 1: shows the collected ingredients and keeps track of
 * which row is open for editing, so a correction stays inside the list.
 */
@Component({
  selector: 'app-ingredient-list',
  imports: [IngredientRow],
  templateUrl: './ingredient-list.html',
  styleUrl: './ingredient-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientList {
  /** Ingredients collected so far, in insertion order. */
  readonly ingredients = input.required<RequestIngredient[]>();

  /** Emits a row that the user edited in place. */
  readonly update = output<IngredientUpdate>();

  /** Emits the index of the row the user wants to delete. */
  readonly remove = output<number>();

  private readonly editIndex = signal<number | null>(null);

  /**
   * Tells whether a row shows its amount and unit controls.
   * @param index Zero-based position of the row.
   * @returns True while that row is the one open for editing.
   */
  protected isEditing(index: number): boolean {
    return this.editIndex() === index;
  }

  /**
   * Opens a row and closes whichever row was open before.
   * @param index Zero-based position of the row.
   */
  protected onEdit(index: number): void {
    this.editIndex.set(index);
  }

  /** Closes the open row without keeping its changes. */
  protected onCancel(): void {
    this.editIndex.set(null);
  }

  /**
   * Hands the edited row up and closes edit mode.
   * @param index Zero-based position of the row.
   * @param ingredient Validated entry with its new amount and unit.
   */
  protected onSave(index: number, ingredient: RequestIngredient): void {
    this.update.emit({ index, ingredient });
    this.editIndex.set(null);
  }

  /**
   * Deletes a row. Edit mode always closes: the rows below move up, so a kept
   * index would leave the controls open on the wrong ingredient.
   * @param index Zero-based position of the row.
   */
  protected onRemove(index: number): void {
    this.editIndex.set(null);
    this.remove.emit(index);
  }
}
