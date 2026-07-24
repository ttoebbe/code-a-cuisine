import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RecipeLibraryService } from '../../services/recipe-library.service';

/**
 * Closing call to action of the recipe view. The heart writes straight to the
 * stored recipe, so the count is shared by everybody. A suggestion that is not
 * in the cookbook yet has nothing to write to, so the button stays disabled
 * until it is saved.
 */
@Component({
  selector: 'app-recipe-like',
  templateUrl: './recipe-like.html',
  styleUrl: './recipe-like.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeLike {
  private readonly library = inject(RecipeLibraryService);

  /** Document id of the recipe, null while it only lives in memory. */
  readonly recipeId = input<string | null>(null);

  /** Like count of the stored recipe, null for an unsaved suggestion. */
  readonly likeCount = input<number | null>(null);

  /** Whether this visitor has already given their heart. */
  protected readonly liked = signal(false);

  /** True when the write failed. */
  protected readonly failed = signal(false);

  /** Likes including the one just given, null while the recipe is unsaved. */
  protected readonly total = computed(() => this.readTotal());

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

  /**
   * Adds the optimistic like to the stored counter.
   * @returns Number of likes to display, or null without a stored recipe.
   */
  private readTotal(): number | null {
    const stored = this.likeCount();
    if (stored === null) return null;
    return this.liked() ? stored + 1 : stored;
  }
}
