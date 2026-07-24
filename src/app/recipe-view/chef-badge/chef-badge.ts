import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Colour-coded marker for the chef a step belongs to. Rendered as text rather
 * than as the badge image from the design, so it also works for a third chef
 * and scales with the user's font size.
 */
@Component({
  selector: 'app-chef-badge',
  templateUrl: './chef-badge.html',
  styleUrl: './chef-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChefBadge {
  /** 1-based chef number, matching RecipeStep.assignedChef. */
  readonly chef = input.required<number>();
}
