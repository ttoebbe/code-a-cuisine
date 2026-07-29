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
import type { Recipe } from '../../models/recipe.interface';
import { RecipeLibraryService, type RecipePage } from '../../services/recipe-library.service';
import { CookbookCard } from '../cookbook-card/cookbook-card';
import { findCuisineCategory, isCuisineStyle } from '../cuisine-categories';

/**
 * Recipe list of a single cuisine (User Story 13). It is a page of its own so
 * a category stays bookmarkable and the cookbook keeps its overview character.
 */
@Component({
  selector: 'app-cuisine-recipes',
  imports: [CookbookCard, RouterLink],
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

  /** First page of the list, reloaded whenever the cuisine changes. */
  private readonly firstPage = resource({
    params: () => this.listOptions(),
    loader: ({ params }) => this.library.listRecipes(params),
  });

  /** Pages fetched via "Load more", dropped as soon as the cuisine changes. */
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

  /** True when the list could not be read at all. */
  protected readonly hasFailed = computed(() => this.firstPage.error() !== undefined);

  /** Heading above the list, e.g. "Italian cuisine". */
  protected readonly listTitle = computed(() => this.category()?.label ?? 'Recipes');

  /** Cursor of the last loaded page, null once the end is reached. */
  private readonly cursor = computed(() => this.readLastPage()?.cursor ?? null);

  /** True while another page is available. */
  protected readonly hasMore = computed(() => this.cursor() !== null);

  /** True when the cuisine holds no recipe at all. */
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

  /** Reads the cuisine again after a failed attempt. */
  protected reload(): void {
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
