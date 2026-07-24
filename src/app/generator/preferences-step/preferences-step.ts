import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  COOKS_RANGE,
  GeneratorStateService,
  PORTIONS_RANGE,
} from '../../services/generator-state.service';
import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { ChipGroup } from './chip-group/chip-group';
import { CUISINE_OPTIONS, DIET_OPTIONS, TIME_OPTIONS } from './preference-options';
import { StepperField } from './stepper-field/stepper-field';

/**
 * Step 2 of the generator wizard. Collects servings, cooks and the three
 * single-select preferences, and releases the generate action once all of them
 * are set.
 */
@Component({
  selector: 'app-preferences-step',
  imports: [ChipGroup, StepperField],
  templateUrl: './preferences-step.html',
  styleUrl: './preferences-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesStep {
  protected readonly state = inject(GeneratorStateService);
  private readonly generation = inject(RecipeGenerationService);

  protected readonly portionsRange = PORTIONS_RANGE;
  protected readonly cooksRange = COOKS_RANGE;
  protected readonly timeOptions = TIME_OPTIONS;
  protected readonly cuisineOptions = CUISINE_OPTIONS;
  protected readonly dietOptions = DIET_OPTIONS;

  /**
   * Hands the assembled request to the n8n workflow.
   * @param event Native submit event of the preferences form.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.generation.generate();
  }
}
