import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
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
  protected readonly mostLiked = resource({
    loader: () => this.library.listMostLiked(),
    defaultValue: [] as Recipe[],
  });
}
