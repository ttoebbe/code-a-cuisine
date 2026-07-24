import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../services/recipe-generation.service';
import { RecipeDirections } from './recipe-directions/recipe-directions';
import { RecipeIngredients } from './recipe-ingredients/recipe-ingredients';
import { RecipeLike } from './recipe-like/recipe-like';
import { RecipeSummary } from './recipe-summary/recipe-summary';

/** Where the back link of the recipe view leads. */
export type RecipeOrigin = 'results' | 'cookbook';

/** Back link target and wording per origin. */
const BACK_LINKS: Record<RecipeOrigin, { path: string; label: string }> = {
  results: { path: '/results', label: 'Recipe results' },
  cookbook: { path: '/library', label: 'Cookbook' },
};

/**
 * Full view of one recipe. The route decides where the back link leads, so the
 * same view serves a fresh suggestion and later a recipe opened from the
 * cookbook.
 */
@Component({
  selector: 'app-recipe-view',
  imports: [RecipeDirections, RecipeIngredients, RecipeLike, RecipeSummary, RouterLink],
  templateUrl: './recipe-view.html',
  styleUrl: './recipe-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeView {
  private readonly generation = inject(RecipeGenerationService);

  /** Position of the suggestion in the result list, bound from the route. */
  readonly index = input('0');

  /** Screen the user came from, bound from the route data. */
  readonly backTo = input<RecipeOrigin>('results');

  /** Recipe to display, null when the route points past the result list. */
  protected readonly recipe = computed(() => this.generation.recipeAt(Number(this.index())));

  /** Route the back link points to. */
  protected readonly backLink = computed(() => BACK_LINKS[this.backTo()].path);

  /** Wording of the back link. */
  protected readonly backLabel = computed(() => BACK_LINKS[this.backTo()].label);
}
