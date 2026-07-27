import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RecipeLibraryService } from '../../services/recipe-library.service';

/**
 * Closing call to action of the recipe view. The heart writes straight to the
 * stored recipe, so the count is shared by everybody. Every generated recipe
 * is saved automatically, so the heart is active right away; it only stays
 * disabled when that write did not reach the library.
 */
@Component({
  selector: 'app-recipe-like',
  templateUrl: './recipe-like.html',
  styleUrl: './recipe-like.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeLike {
  private readonly library = inject(RecipeLibraryService);

  /** Document id of the recipe, null while it is not in the library. */
  readonly recipeId = input<string | null>(null);

  /** Like count of the stored recipe. */
  readonly likeCount = input(0);

  /** Whether this visitor has already given their heart. */
  protected readonly liked = signal(false);

  /** True when the write failed. */
  protected readonly failed = signal(false);

  /** Likes including the one just given. */
  protected readonly total = computed(() =>
    this.liked() ? this.likeCount() + 1 : this.likeCount(),
  );

  /** True when there is a document to like. */
  protected readonly isEnabled = computed(() => this.recipeId() !== null && !this.liked());

  /**
   * Adds one like to the stored recipe. The heart fills immediately and only
   * falls back when the write is rejected.
   */
  protected async like(): Promise<void> {
    const id = this.recipeId();
    if (id === null || this.liked()) return;
    this.liked.set(true);
    this.failed.set(false);
    try {
      await this.library.incrementLike(id);
    } catch {
      this.liked.set(false);
      this.failed.set(true);
    }
  }
}
