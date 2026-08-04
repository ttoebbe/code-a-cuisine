import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe } from '../../models/recipe.interface';
import { RECIPES_PER_PAGE, RecipeLibraryService } from '../../services/recipe-library.service';
import { Pagination } from '../../shared/pagination/pagination';
import { findCuisineCategory, isCuisineStyle } from '../cuisine-categories';
import { RecipeRow } from '../recipe-row/recipe-row';

/**
 * Recipe list of a single cuisine (User Story 13). It is a page of its own so
 * a category stays bookmarkable and the cookbook keeps its overview character.
 * The list is paged in fixed blocks instead of growing on every click, so a
 * long cuisine stays navigable from the bottom of the screen.
 */
@Component({
  selector: 'app-cuisine-recipes',
  imports: [Pagination, RecipeRow, RouterLink],
  templateUrl: './cuisine-recipes.html',
  styleUrl: './cuisine-recipes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuisineRecipes {
  private readonly library = inject(RecipeLibraryService);

  /** Raw cuisine, bound from the path parameter and vetted by the guard. */
  readonly cuisine = input.required<string>();

  /** Validated cuisine, null only while an unknown value is redirected away. */
  protected readonly activeCuisine = computed(() => {
    const value = this.cuisine();
    return isCuisineStyle(value) ? value : null;
  });

  /** Category behind the page, drives heading and banner. */
  protected readonly category = computed(() => findCuisineCategory(this.activeCuisine()));

  /** Query options of the current cuisine. */
  private readonly listOptions = computed(() => ({ cuisine: this.activeCuisine() ?? undefined }));

  /** Every recipe of the cuisine, reloaded whenever the cuisine changes. */
  private readonly allRecipes = resource({
    params: () => this.listOptions(),
    loader: ({ params }) => this.library.listRecipes(params),
    defaultValue: [] as Recipe[],
  });

  /**
   * Recipes of the cuisine, empty while the read is loading or has failed.
   * Reading `value()` directly would throw a ResourceValueError in the error
   * state and take the whole page down before the retry block is rendered.
   */
  private readonly loaded = computed<Recipe[]>(() =>
    this.allRecipes.hasValue() ? this.allRecipes.value() : [],
  );

  /** Page on display, back to the first one whenever the cuisine changes. */
  protected readonly currentPage = linkedSignal<Recipe[], number>({
    source: () => this.loaded(),
    computation: () => 1,
  });

  /** Number of pages, at least one so the empty state keeps its layout. */
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.loaded().length / RECIPES_PER_PAGE)),
  );

  /** Recipes of the current page. */
  protected readonly recipes = computed<Recipe[]>(() =>
    this.loaded().slice(this.firstIndex(), this.firstIndex() + RECIPES_PER_PAGE),
  );

  /** Ordinal of the first recipe on the page, so numbering runs across pages. */
  protected readonly firstPosition = computed(() => this.firstIndex() + 1);

  /** True while the list is loading. */
  protected readonly isLoading = this.allRecipes.isLoading;

  /** True when the list could not be read at all. */
  protected readonly hasFailed = computed(() => this.allRecipes.error() !== undefined);

  /** Heading above the list, e.g. "Italian cuisine". */
  protected readonly listTitle = computed(() => this.category()?.label ?? 'Recipes');

  /** True when the cuisine holds no recipe at all. */
  protected readonly isEmpty = computed(
    () => !this.isLoading() && !this.hasFailed() && this.loaded().length === 0,
  );

  /** Index of the first recipe on the current page. */
  private readonly firstIndex = computed(() => (this.currentPage() - 1) * RECIPES_PER_PAGE);

  /**
   * Shows another page and returns to the top, so the new page starts in view.
   * @param page Page the visitor picked, 1-based.
   */
  protected goToPage(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Reads the cuisine again after a failed attempt. */
  protected reload(): void {
    this.allRecipes.reload();
  }
}
