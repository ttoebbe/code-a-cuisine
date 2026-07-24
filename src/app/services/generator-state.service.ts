import { Injectable, computed, signal } from '@angular/core';
import type { RequestIngredient } from '../models/recipe-request.interface';

/**
 * Holds the recipe request the user is assembling in the generator wizard.
 * The state is session-only by design: it survives step navigation but not a
 * reload, so no stale ingredient list can be replayed against the webhook.
 */
@Injectable({ providedIn: 'root' })
export class GeneratorStateService {
  private readonly ingredientList = signal<RequestIngredient[]>([]);

  /** Ingredients collected in step 1, in insertion order. */
  readonly ingredients = this.ingredientList.asReadonly();

  /** True as soon as the request holds at least one ingredient. */
  readonly hasIngredients = computed(() => this.ingredientList().length > 0);

  /**
   * Appends an ingredient to the end of the list.
   * @param ingredient Validated ingredient from the input form.
   */
  addIngredient(ingredient: RequestIngredient): void {
    this.ingredientList.update((list) => [...list, ingredient]);
  }

  /**
   * Replaces the ingredient at the given position.
   * @param index Zero-based position in the list.
   * @param ingredient Validated ingredient that replaces the current entry.
   */
  updateIngredient(index: number, ingredient: RequestIngredient): void {
    this.ingredientList.update((list) =>
      list.map((entry, position) => (position === index ? ingredient : entry)),
    );
  }

  /**
   * Removes the ingredient at the given position.
   * @param index Zero-based position in the list.
   */
  removeIngredient(index: number): void {
    this.ingredientList.update((list) => list.filter((_, position) => position !== index));
  }
}
