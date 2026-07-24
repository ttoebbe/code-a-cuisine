import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe } from '../models/recipe.interface';
import { RecipeLibraryService, type RecipePage } from '../services/recipe-library.service';
import { CookbookCard } from './cookbook-card/cookbook-card';
import { findCuisineCategory, isCuisineStyle } from './cuisine-categories';
import { CuisineFilter } from './cuisine-filter/cuisine-filter';
import { MostLikedRow } from './most-liked-row/most-liked-row';

/**
 * Cookbook screen: the stored recipes of the whole library, filtered by
 * cuisine through the query parameter and loaded page by page.
 */
@Component({
  selector: 'app-library',
  imports: [CookbookCard, CuisineFilter, MostLikedRow, RouterLink],
  templateUrl: './library.html',
  styleUrl: './library.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Library {
  private readonly library = inject(RecipeLibraryService);

  /** Raw category filter, bound from the 'cuisine' query parameter. */
  readonly cuisine = input<string>();

  /** Validated filter, null when the parameter is missing or unknown. */
  protected readonly activeCuisine = computed(() => {
    const value = this.cuisine();
    return isCuisineStyle(value) ? value : null;
  });

  /** Category behind the active filter, drives heading and banner. */
  protected readonly activeCategory = computed(() => findCuisineCategory(this.activeCuisine()));

  /** Query options of the current filter. */
  private readonly listOptions = computed(() => ({ cuisine: this.activeCuisine() ?? undefined }));

  /** Favourites of the header row, independent of the category filter. */
  protected readonly mostLiked = resource({
    loader: () => this.library.listMostLiked(),
    defaultValue: [] as Recipe[],
  });

  /** First page of the list, reloaded whenever the filter changes. */
  private readonly firstPage = resource({
    params: () => this.listOptions(),
    loader: ({ params }) => this.library.listRecipes(params),
  });

  /** Pages fetched via "Load more", dropped as soon as the filter changes. */
  private readonly extraPages = linkedSignal<RecipePage | undefined, RecipePage[]>({
    source: () => this.firstPage.value(),
    computation: () => [],
  });

  /** True while the next page is on its way. */
  protected readonly isAppending = signal(false);

  /** True when loading the next page failed. */
  protected readonly appendFailed = signal(false);

  /** Every recipe loaded so far, newest first. */
  protected readonly recipes = computed<Recipe[]>(() => [
    ...(this.firstPage.value()?.recipes ?? []),
    ...this.extraPages().flatMap((page) => page.recipes),
  ]);

  /** True while the first page is loading. */
  protected readonly isLoading = this.firstPage.isLoading;

  /** True when the library could not be read at all. */
  protected readonly hasFailed = computed(() => this.firstPage.error() !== undefined);

  /** Heading above the list, e.g. "Italian cuisine". */
  protected readonly listTitle = computed(() => this.activeCategory()?.label ?? 'All recipes');

  /** Cursor of the last loaded page, null once the end is reached. */
  private readonly cursor = computed(() => this.readLastPage()?.cursor ?? null);

  /** True while another page is available. */
  protected readonly hasMore = computed(() => this.cursor() !== null);

  /** True when the query returned no recipe at all. */
  protected readonly isEmpty = computed(
    () => !this.isLoading() && !this.hasFailed() && this.recipes().length === 0,
  );

  /** Appends the next page to the list. */
  protected async loadMore(): Promise<void> {
    const cursor = this.cursor();
    if (cursor === null || this.isAppending()) return;
    this.isAppending.set(true);
    this.appendFailed.set(false);
    try {
      const page = await this.library.listRecipes({ ...this.listOptions(), cursor });
      this.extraPages.update((pages) => [...pages, page]);
    } catch {
      this.appendFailed.set(true);
    } finally {
      this.isAppending.set(false);
    }
  }

  /** Reads the library again after a failed attempt. */
  protected reload(): void {
    this.mostLiked.reload();
    this.firstPage.reload();
  }

  /**
   * Finds the page that carries the current cursor.
   * @returns The last appended page, or the first page when none was added.
   */
  private readLastPage(): RecipePage | undefined {
    return this.extraPages().at(-1) ?? this.firstPage.value();
  }
}
