import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { RecipeErrorResponse } from '../../models/recipe-response.interface';
import {
  describeError,
  formatRetryAfter,
  readMessage,
  type ErrorAction,
} from './generation-error-copy';

/**
 * Modal shown when a generation run fails. It is a pure display surface: which
 * error occurred and whether a quota is exhausted is decided in n8n.
 */
@Component({
  selector: 'app-generation-error-dialog',
  templateUrl: './generation-error-dialog.html',
  styleUrl: './generation-error-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationErrorDialog {
  /** Envelope of the failed run. */
  readonly error = input.required<RecipeErrorResponse>();

  /** Emits when the dialog is closed without a follow-up action. */
  readonly dismiss = output<void>();

  /** Emits when the user wants to send the same request again. */
  readonly retry = output<void>();

  /** Emits when the user wants to correct the ingredient list. */
  readonly editIngredients = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Wording for the current error code. */
  protected readonly presentation = computed(() => describeError(this.error()));

  /** Explanation text, taken from the workflow answer. */
  protected readonly message = computed(() => readMessage(this.error()));

  /** Quota reset hint, null for every non-quota error. */
  protected readonly retryHint = computed(() => formatRetryAfter(this.error().retryAfter));

  constructor() {
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }

  /** Runs the primary action of the dialog and lets the modal close. */
  protected onAction(): void {
    this.emitAction(this.presentation().action);
    this.dialogRef().nativeElement.close();
  }

  /**
   * Forwards the action to the matching output.
   * @param action Action configured for the current error code.
   */
  private emitAction(action: ErrorAction): void {
    if (action === 'retry') this.retry.emit();
    else if (action === 'ingredients') this.editIngredients.emit();
  }
}
