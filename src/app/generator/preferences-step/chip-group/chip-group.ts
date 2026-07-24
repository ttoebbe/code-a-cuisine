import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ChipOption } from '../preference-options';

/**
 * Single-select preference group, rendered as a radio group whose radios are
 * styled as chips. Keeping real radios preserves arrow-key navigation and the
 * grouping announced by screen readers.
 */
@Component({
  selector: 'app-chip-group',
  templateUrl: './chip-group.html',
  styleUrl: './chip-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipGroup<T extends string> {
  /** Visible group caption, rendered as the fieldset legend. */
  readonly legend = input.required<string>();

  /** Shared radio name, also used as prefix for the option element ids. */
  readonly name = input.required<string>();

  /** Chips to offer, in display order. */
  readonly options = input.required<readonly ChipOption<T>[]>();

  /** Currently selected value, null while the group is untouched. */
  readonly selected = input<T | null>(null);

  /** Source of the decorative icon shown next to the legend. */
  readonly icon = input.required<string>();

  /** Emits the value of the chip the user picked. */
  readonly pick = output<T>();

  /**
   * Builds the DOM id of an option so its label stays uniquely addressable.
   * @param value Value of the option.
   * @returns Element id combining group name and option value.
   */
  protected buildOptionId(value: T): string {
    return `${this.name()}-${value}`;
  }
}
