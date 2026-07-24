import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GeneratedRecipe } from '../models/recipe.interface';
import { RecipeGenerationService } from '../services/recipe-generation.service';
import { RecipeLibraryService } from '../services/recipe-library.service';
import { RecipeDirections } from './recipe-directions/recipe-directions';
import { RecipeIngredients } from './recipe-ingredients/recipe-ingredients';
import { RecipeLike } from './recipe-like/recipe-like';
import { RecipeSave } from './recipe-save/recipe-save';
import { RecipeSummary } from './recipe-summary/recipe-summary';

/** Where the back link of the recipe view leads. */
export type RecipeOrigin = 'results' | 'cookbook';

/** Back link target and wording per origin. */
const BACK_LINKS: Record<RecipeOrigin, { path: string; label: string }> = {
  results: { path: '/results', label: 'Recipe results' },
  cookbook: { path: '/library', label: 'Cookbook' },
};

/** Explanation shown when the requested recipe cannot be displayed. */
const MISSING_TEXTS: Record<RecipeOrigin, string> = {
  results:
    'This suggestion is no longer part of the current results. Generate a new recipe to start over.',
  cookbook: 'This recipe is not part of the cookbook. It may never have been saved.',
};

/**
 * Full view of one recipe. The route decides both where the back link leads
 * and where the recipe comes from: a suggestion of the current run, addressed
 * by its position, or a stored recipe, addressed by its document id.
 */
@Component({
  selector: 'app-recipe-view',
  imports: [RecipeDirections, RecipeIngredients, RecipeLike, RecipeSave, RecipeSummary, RouterLink],
  templateUrl: './recipe-view.html',
  styleUrl: './recipe-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeView {
  private readonly generation = inject(RecipeGenerationService);
  private readonly library = inject(RecipeLibraryService);

  /** Position of the suggestion in the result list, bound from the route. */
  readonly index = input('0');

  /** Document id of a stored recipe, bound from the cookbook route. */
  readonly id = input<string>();

  /** Screen the user came from, bound from the route data. */
  readonly backTo = input<RecipeOrigin>('results');

  /** True when the view shows a recipe of the cookbook. */
  protected readonly isFromCookbook = computed(() => this.backTo() === 'cookbook');

  /** Recipe read from the library, requested only on the cookbook route. */
  private readonly stored = resource({
    params: () => this.readDocumentParams(),
    loader: ({ params }) => this.library.getRecipeById(params.id),
  });

  /** Stored recipe, null while it loads or when the id is unknown. */
  protected readonly storedRecipe = computed(() => this.stored.value() ?? null);

  /** Suggestion of the current generation run. */
  private readonly suggestion = computed(() => this.generation.recipeAt(Number(this.index())));

  /** Recipe to display, null when the route points nowhere. */
  protected readonly recipe = computed<GeneratedRecipe | null>(() =>
    this.isFromCookbook() ? this.storedRecipe() : this.suggestion(),
  );

  /** Likes of the recipe, null for a suggestion that is not stored yet. */
  protected readonly likeCount = computed(() => this.storedRecipe()?.likeCount ?? null);

  /** Document id of the recipe once it exists in the library. */
  protected readonly recipeId = computed(() => this.storedRecipe()?.id ?? this.savedId());

  /** True while the cookbook recipe is being read. */
  protected readonly isLoading = this.stored.isLoading;

  /** Route the back link points to. */
  protected readonly backLink = computed(() => BACK_LINKS[this.backTo()].path);

  /** Wording of the back link. */
  protected readonly backLabel = computed(() => BACK_LINKS[this.backTo()].label);

  /** Explanation of an empty view, depending on where the user came from. */
  protected readonly missingText = computed(() => MISSING_TEXTS[this.backTo()]);

  /** Document id of the suggestion once it was saved, null before that. */
  protected readonly savedId = signal<string | null>(null);

  /**
   * Remembers under which document the suggestion was stored.
   * @param id Document id reported by the save button.
   */
  protected onSaved(id: string): void {
    this.savedId.set(id);
  }

  /**
   * Request of the library read.
   * @returns The document id to load, or undefined to keep the read idle.
   */
  private readDocumentParams(): { id: string } | undefined {
    const id = this.id();
    return id === undefined ? undefined : { id };
  }
}
