import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { RecipeStep as RecipeStepModel } from '../../models/recipe.interface';
import { RecipeStep } from '../recipe-step/recipe-step';

/**
 * Directions section of the recipe view. Steps that share a parallel group run
 * at the same time and are placed side by side on desktop, which is how the
 * work split between several chefs becomes readable.
 */
@Component({
  selector: 'app-recipe-directions',
  imports: [RecipeStep],
  templateUrl: './recipe-directions.html',
  styleUrl: './recipe-directions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDirections {
  /** Steps in chronological order. */
  readonly steps = input.required<RecipeStepModel[]>();

  /** Number of people cooking this recipe. */
  readonly cooks = input.required<number>();

  /** Whether the steps are visible; only the mobile layout can fold them. */
  protected readonly expanded = signal(true);

  /** Chef badges only help when the work is actually split. */
  protected readonly showChef = computed(() => this.cooks() > 1);

  /** Folds the step list in or out. */
  protected toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
