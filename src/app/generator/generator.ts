import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RecipeGenerationService } from '../services/recipe-generation.service';
import { GenerationErrorDialog } from './generation-error-dialog/generation-error-dialog';
import { GenerationLoading } from './generation-loading/generation-loading';
import { IngredientStep } from './ingredient-step/ingredient-step';
import { PreferencesStep } from './preferences-step/preferences-step';

/** Steps of the recipe generator wizard. */
export type WizardStep = 1 | 2;

/**
 * Wizard shell of the recipe generator. Owns the current step; the collected
 * request data lives in GeneratorStateService so it survives step changes.
 * While a run is in flight, the loading curtain covers the whole wizard.
 */
@Component({
  selector: 'app-generator',
  imports: [GenerationErrorDialog, GenerationLoading, IngredientStep, PreferencesStep],
  templateUrl: './generator.html',
  styleUrl: './generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Generator {
  protected readonly generation = inject(RecipeGenerationService);

  /** Step currently shown to the user. */
  protected readonly step = signal<WizardStep>(1);

  /** Page title of the current step. */
  protected readonly title = computed(() =>
    this.step() === 1 ? 'Generate recipe' : 'Choose your preferences',
  );

  /**
   * Switches the wizard to another step.
   * @param step Step to display.
   */
  protected goToStep(step: WizardStep): void {
    this.step.set(step);
  }

  /** Sends the unchanged request again after a technical failure. */
  protected onRetry(): void {
    this.generation.generate();
  }

  /** Sends the user back to the ingredient list to correct the request. */
  protected onEditIngredients(): void {
    this.generation.dismissError();
    this.goToStep(1);
  }
}
