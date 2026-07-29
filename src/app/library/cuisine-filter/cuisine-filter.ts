import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CUISINE_CATEGORIES } from '../cuisine-categories';

/**
 * Tiles of the first grid row. They are visible without scrolling and one of
 * them is the LCP element, so they load eagerly while the rest stays lazy.
 */
const EAGER_TILE_COUNT = 3;

/**
 * Category grid of the cookbook (User Story 13). Every tile links to the page
 * of its cuisine, so a category stays bookmarkable and opens on its own.
 */
@Component({
  selector: 'app-cuisine-filter',
  imports: [RouterLink],
  templateUrl: './cuisine-filter.html',
  styleUrl: './cuisine-filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuisineFilter {
  /** Tiles of the grid. */
  protected readonly categories = CUISINE_CATEGORIES;

  /** Number of tiles that load eagerly, see EAGER_TILE_COUNT. */
  protected readonly eagerTileCount = EAGER_TILE_COUNT;
}
