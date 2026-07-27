import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../services/recipe-generation.service';
import { getCuisineLabel, getDietLabel, getTimeLabel } from '../shared/recipe-format';
import { RecipeCard } from './recipe-card/recipe-card';

/**
 * Result screen of one generation run: the three suggestions the workflow
 * returned, together with the preferences they were generated for.
 */
@Component({
  selector: 'app-results',
  imports: [RecipeCard, RouterLink],
  templateUrl: './results.html',
  styleUrl: './results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Results {
  private readonly generation = inject(RecipeGenerationService);

  /** Suggestions of the current run. */
  protected readonly recipes = this.generation.recipes;

  /** True when a suggestion did not make it into the cookbook. */
  protected readonly hasSaveFailure = this.generation.hasSaveFailure;

  /** Preferences of the request, shown as chips under the lead text. */
  protected readonly filters = computed(() => this.buildFilters());

  /**
   * Collects the labels of the preferences the run was started with.
   * @returns Chip labels in the order cuisine, cooking time, diet.
   */
  private buildFilters(): string[] {
    const request = this.generation.request();
    if (request === null) return [];
    const labels = [getCuisineLabel(request.cuisine), getTimeLabel(request.timeCategory)];
    const diet = getDietLabel(request.diet);
    return diet === null ? labels : [...labels, diet];
  }
}
