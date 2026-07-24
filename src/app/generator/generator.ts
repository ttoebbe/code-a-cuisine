import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IngredientStep } from './ingredient-step/ingredient-step';
import { PreferencesStep } from './preferences-step/preferences-step';

/** Steps of the recipe generator wizard. */
export type WizardStep = 1 | 2;

/**
 * Wizard shell of the recipe generator. Owns the current step; the collected
 * request data lives in GeneratorStateService so it survives step changes.
 */
@Component({
  selector: 'app-generator',
  imports: [IngredientStep, PreferencesStep],
  templateUrl: './generator.html',
  styleUrl: './generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Generator {
  /** Step currently shown to the user. */
  protected readonly step = signal<WizardStep>(1);

  /**
   * Switches the wizard to another step.
   * @param step Step to display.
   */
  protected goToStep(step: WizardStep): void {
    this.step.set(step);
  }
}
