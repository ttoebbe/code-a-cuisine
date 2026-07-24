import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GeneratedRecipe } from '../../models/recipe.interface';
import { RecipeLibraryService } from '../../services/recipe-library.service';

/** Lifecycle of one save attempt. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Moves a fresh suggestion into the cookbook. A generated recipe only lives in
 * memory, so this button is the point where it becomes a Firestore document
 * others can find and like.
 */
@Component({
  selector: 'app-recipe-save',
  imports: [RouterLink],
  templateUrl: './recipe-save.html',
  styleUrl: './recipe-save.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeSave {
  private readonly library = inject(RecipeLibraryService);

  /** Suggestion to store. */
  readonly recipe = input.required<GeneratedRecipe>();

  /** Document id of the stored recipe, emitted once the write succeeded. */
  readonly saved = output<string>();

  /** State of the save attempt, drives button label and feedback. */
  protected readonly status = signal<SaveStatus>('idle');

  /** Writes the recipe to the library, unless that already happened. */
  protected async save(): Promise<void> {
    if (this.status() === 'saving' || this.status() === 'saved') return;
    this.status.set('saving');
    try {
      const id = await this.library.saveRecipe(this.recipe());
      this.status.set('saved');
      this.saved.emit(id);
    } catch {
      this.status.set('error');
    }
  }
}
