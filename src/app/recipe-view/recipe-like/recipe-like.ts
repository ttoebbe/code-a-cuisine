import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/**
 * Closing call to action of the recipe view. The heart is local state for now:
 * a suggestion has no document to like yet, the counter is persisted once the
 * recipe is stored in the cookbook.
 */
@Component({
  selector: 'app-recipe-like',
  templateUrl: './recipe-like.html',
  styleUrl: './recipe-like.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeLike {
  /** Whether the user has marked this recipe as delicious. */
  protected readonly liked = signal(false);

  /** Flips the heart. */
  protected toggle(): void {
    this.liked.update((liked) => !liked);
  }
}
