import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RecipeStep as RecipeStepModel } from '../../models/recipe.interface';
import { ChefBadge } from '../chef-badge/chef-badge';

/**
 * One cooking step: its position, what to do and — when more than one person
 * is cooking — who is doing it.
 */
@Component({
  selector: 'app-recipe-step',
  imports: [ChefBadge],
  templateUrl: './recipe-step.html',
  styleUrl: './recipe-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeStep {
  /** Step to render. */
  readonly step = input.required<RecipeStepModel>();

  /** False for single-chef recipes, where the badge carries no information. */
  readonly showChef = input.required<boolean>();
}
