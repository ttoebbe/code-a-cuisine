import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { RecipeRequest } from '../models/recipe-request.interface';
import type { RecipeErrorResponse, RecipeResponse } from '../models/recipe-response.interface';
import type { GeneratedRecipe } from '../models/recipe.interface';
import { GeneratorStateService } from './generator-state.service';
import { RecipeApiService } from './recipe-api.service';
import { RecipeLibraryService } from './recipe-library.service';

/** Lifecycle of one generation run. */
export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Runs the recipe generation and holds its outcome for the result screens.
 * Every suggestion is written to the library as soon as it arrives (User
 * Story 12), so the result screens show recipes that already exist in the
 * cookbook and can be liked right away.
 */
@Injectable({ providedIn: 'root' })
export class RecipeGenerationService {
  private readonly api = inject(RecipeApiService);
  private readonly wizard = inject(GeneratorStateService);
  private readonly library = inject(RecipeLibraryService);
  private readonly router = inject(Router);

  private readonly statusState = signal<GenerationStatus>('idle');
  private readonly recipeList = signal<GeneratedRecipe[]>([]);
  private readonly errorState = signal<RecipeErrorResponse | null>(null);
  private readonly lastRequest = signal<RecipeRequest | null>(null);
  private readonly savedIdList = signal<(string | null)[]>([]);

  /** Current state of the run, drives the loading screen and the error dialog. */
  readonly status = this.statusState.asReadonly();

  /** Suggestions of the last successful run, three per the Lastenheft. */
  readonly recipes = this.recipeList.asReadonly();

  /** Error envelope of the last failed run, null while nothing failed. */
  readonly error = this.errorState.asReadonly();

  /** Request behind the current suggestions, e.g. for the filter chips. */
  readonly request = this.lastRequest.asReadonly();

  /** True while the webhook call is in flight. */
  readonly isLoading = computed(() => this.statusState() === 'loading');

  /** True once suggestions are available to show. */
  readonly hasResults = computed(() => this.recipeList().length > 0);

  /**
   * True when at least one suggestion of the run did not reach the library.
   * The results are shown either way; this only drives a discreet notice.
   */
  readonly hasSaveFailure = computed(() => this.savedIdList().some((id) => id === null));

  /** Sends the collected request to n8n and routes to the results on success. */
  generate(): void {
    const payload = this.wizard.buildRequest();
    if (payload === null || this.isLoading()) return;
    this.statusState.set('loading');
    this.errorState.set(null);
    this.api
      .generateRecipes(payload)
      .subscribe((response) => this.applyResponse(response, payload));
  }

  /**
   * Reads one suggestion by its position in the result list.
   * @param index Zero-based position, typically taken from the route.
   * @returns The recipe, or null when the index is out of range.
   */
  recipeAt(index: number): GeneratedRecipe | null {
    return this.recipeList()[index] ?? null;
  }

  /**
   * Reads the library id a suggestion was stored under.
   * @param index Zero-based position in the result list.
   * @returns The document id, or null while the write is pending or failed.
   */
  savedIdAt(index: number): string | null {
    return this.savedIdList()[index] ?? null;
  }

  /** Closes the error dialog and returns the wizard to its editable state. */
  dismissError(): void {
    if (this.statusState() === 'error') this.statusState.set('idle');
    this.errorState.set(null);
  }

  /** Drops the suggestions, e.g. when the user starts a new generation. */
  reset(): void {
    this.statusState.set('idle');
    this.recipeList.set([]);
    this.errorState.set(null);
    this.lastRequest.set(null);
    this.savedIdList.set([]);
  }

  /**
   * Stores the workflow answer and navigates on success. This is the only
   * place the library write is triggered from, so it happens exactly once per
   * run and not again when the user navigates back to the results. The wizard
   * counters go back to their defaults here, the request itself is kept as a
   * snapshot for the result screens.
   * @param response Envelope returned by the webhook.
   * @param payload Request the answer belongs to.
   */
  private applyResponse(response: RecipeResponse, payload: RecipeRequest): void {
    if (response.status === 'error') {
      this.applyFailure(response);
      return;
    }
    this.recipeList.set(response.recipes);
    this.lastRequest.set(payload);
    this.savedIdList.set([]);
    this.statusState.set('success');
    this.wizard.resetCounts();
    void this.router.navigate(['/results']);
    void this.storeRecipes(response.recipes);
  }

  /**
   * Puts the run into the error state. The envelope is kept so the dialog can
   * word the failure for the user; nothing is written to the console.
   * @param response Error envelope the workflow returned.
   */
  private applyFailure(response: RecipeErrorResponse): void {
    this.errorState.set(response);
    this.statusState.set('error');
  }

  /**
   * Writes every suggestion of the run to the library. Deliberately not
   * awaited by the caller: the results are already on screen, and a failing
   * write must not hold them back.
   * @param recipes Suggestions the workflow returned.
   */
  private async storeRecipes(recipes: GeneratedRecipe[]): Promise<void> {
    const ids = await Promise.all(recipes.map((recipe) => this.storeRecipe(recipe)));
    this.savedIdList.set(ids);
  }

  /**
   * Writes one suggestion to the library.
   * @param recipe Suggestion to persist.
   * @returns The new document id, or null when the write was rejected.
   */
  private async storeRecipe(recipe: GeneratedRecipe): Promise<string | null> {
    try {
      return await this.library.saveRecipe(recipe);
    } catch {
      return null;
    }
  }
}
