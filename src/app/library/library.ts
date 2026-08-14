import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe } from '../models/recipe.interface';
import { RecipeLibraryService } from '../services/recipe-library.service';
import { CuisineFilter } from './cuisine-filter/cuisine-filter';
import { MostLikedRow } from './most-liked-row/most-liked-row';

/**
 * Cookbook screen: the entry point to the library. It presents the favourites
 * and the cuisine categories; each category opens its recipes on its own page.
 */
@Component({
  selector: 'app-library',
  imports: [CuisineFilter, MostLikedRow, RouterLink],
  templateUrl: './library.html',
  styleUrl: './library.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Library {
  private readonly library = inject(RecipeLibraryService);

  /** Favourites of the header row, across every cuisine. */
  private readonly mostLiked = resource({
    loader: () => this.library.listMostLiked(),
    defaultValue: [] as Recipe[],
  });

  /**
   * Favourites to display, empty while the read is loading or has failed.
   * Reading `value()` directly would throw a ResourceValueError in the error
   * state and take the whole cookbook down with it.
   */
  protected readonly favourites = computed<Recipe[]>(() =>
    this.mostLiked.hasValue() ? this.mostLiked.value() : [],
  );

  /** True while the first read is still running. */
  protected readonly isLoading = this.mostLiked.isLoading;

  /** True when the favourites could not be read at all. */
  protected readonly hasFailed = computed(() => this.mostLiked.error() !== undefined);

  /** Reads the favourites again after a failed attempt. */
  protected reload(): void {
    this.mostLiked.reload();
  }
}
