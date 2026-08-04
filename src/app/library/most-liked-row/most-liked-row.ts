import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe } from '../../models/recipe.interface';
import { formatCookingTime } from '../../shared/recipe-format';

/** One entry of the row, prepared for the template. */
interface MostLikedCard {
  id: string;
  title: string;
  /** Cooking time of the recipe, e.g. "20min". */
  cookingTime: string;
  likeCount: number;
}

/**
 * "Most liked recipes" row in the cookbook header. Scrolls sideways on narrow
 * screens, exactly as the design cuts the third card off.
 */
@Component({
  selector: 'app-most-liked-row',
  imports: [RouterLink],
  templateUrl: './most-liked-row.html',
  styleUrl: './most-liked-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MostLikedRow {
  /** Recipes sorted by like count, highest first. */
  readonly recipes = input.required<Recipe[]>();

  /** True while the first read is still running. */
  readonly isLoading = input(false);

  /** True when the favourites could not be read, so empty means failed. */
  readonly hasFailed = input(false);

  /** Asks the cookbook to read the favourites again. */
  readonly retry = output<void>();

  /** Entries of the row. */
  protected readonly cards = computed<MostLikedCard[]>(() =>
    this.recipes().map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      cookingTime: formatCookingTime(recipe.cookingTimeMinutes),
      likeCount: recipe.likeCount,
    })),
  );
}
