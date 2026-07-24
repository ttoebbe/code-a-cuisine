import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Labelled minus/value/plus control for a bounded integer. The component only
 * reports the requested value; clamping stays in the generator state so the
 * bounds cannot be bypassed from anywhere else.
 */
@Component({
  selector: 'app-stepper-field',
  templateUrl: './stepper-field.html',
  styleUrl: './stepper-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperField {
  /** Visible caption of the control, e.g. "Portions". */
  readonly label = input.required<string>();

  /** Noun used in the button labels, e.g. "portions". */
  readonly unit = input.required<string>();

  /** Current value shown between the buttons. */
  readonly value = input.required<number>();

  /** Lowest value the user may reach. */
  readonly min = input.required<number>();

  /** Highest value the user may reach. */
  readonly max = input.required<number>();

  /** Emits the value the user stepped to. */
  readonly valueChange = output<number>();

  /** True once the value sits on the lower bound. */
  protected readonly atMin = computed(() => this.value() <= this.min());

  /** True once the value sits on the upper bound. */
  protected readonly atMax = computed(() => this.value() >= this.max());

  /**
   * Emits the neighbouring value, unless the bound is already reached.
   * @param offset -1 to decrease, 1 to increase.
   */
  protected step(offset: number): void {
    const next = this.value() + offset;
    if (next < this.min() || next > this.max()) return;
    this.valueChange.emit(next);
  }
}
