import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
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

  /**
   * Opens the modal for every error, not just the first render. When a retry
   * fails again before the template has dropped the dialog, the component is
   * reused instead of recreated, and a one-shot open would leave it closed.
   */
  constructor() {
    afterRenderEffect(() => {
      this.error();
      const dialog = this.dialogRef().nativeElement;
      if (!dialog.open) dialog.showModal();
    });
  }

  /**
   * Closes the modal and then runs its primary action. The order matters: the
   * action can drop this component from the template, and a dialog removed
   * while still open keeps its slot in the browser's top layer — WebKit then
   * refuses to open the next one.
   */
  protected onAction(): void {
    this.dialogRef().nativeElement.close();
    this.emitAction(this.presentation().action);
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
