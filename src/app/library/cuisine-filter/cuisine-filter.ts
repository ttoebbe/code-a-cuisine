import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CuisineStyle } from '../../models/recipe-filters.types';
import { CUISINE_CATEGORIES } from '../cuisine-categories';

/**
 * Category grid of the cookbook (User Story 13). Every tile is a link that
 * sets the cuisine query parameter, so a filtered list stays bookmarkable.
 */
@Component({
  selector: 'app-cuisine-filter',
  imports: [RouterLink],
  templateUrl: './cuisine-filter.html',
  styleUrl: './cuisine-filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuisineFilter {
  /** Currently filtered cuisine, null while the whole library is listed. */
  readonly active = input<CuisineStyle | null>(null);

  /** Tiles of the grid. */
  protected readonly categories = CUISINE_CATEGORIES;
}
