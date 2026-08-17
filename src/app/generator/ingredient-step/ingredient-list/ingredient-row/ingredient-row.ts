import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { IngredientUnit } from '../../../../models/recipe-filters.types';
import type { RequestIngredient } from '../../../../models/recipe-request.interface';
import { UNIT_OPTIONS, formatAmount } from '../../ingredient-options';
import {
  AMOUNT_ERROR_MESSAGE,
  parseAmount,
  positiveAmountValidator,
} from '../../ingredient-validators';

/**
 * One entry of the ingredient list. Shows amount, unit and name as text and
 * swaps the amount and the unit for input controls while the row is open for
 * editing, so a correction happens where the entry is instead of in the form.
 */
@Component({
  selector: 'app-ingredient-row',
  imports: [ReactiveFormsModule],
  templateUrl: './ingredient-row.html',
  styleUrl: './ingredient-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.ingredient-row--editing]': 'isEditing()' },
})
export class IngredientRow {
  private readonly formBuilder = inject(FormBuilder);

  /** Entry this row renders. */
  readonly ingredient = input.required<RequestIngredient>();

  /** True while the list opened this row for editing. */
  readonly isEditing = input(false);

  /** Emits when the user wants to open this row. */
  readonly edit = output<void>();

  /** Emits when the user leaves edit mode without keeping the changes. */
  readonly cancelEdit = output<void>();

  /** Emits the entry with its new amount and unit. */
  readonly save = output<RequestIngredient>();

  /** Emits when the user wants to delete this row. */
  readonly remove = output<void>();

  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly amountErrorMessage = AMOUNT_ERROR_MESSAGE;

  protected readonly form = this.formBuilder.nonNullable.group({
    amount: ['', [Validators.required, positiveAmountValidator]],
    unit: ['g' as IngredientUnit],
  });

  private readonly amountRef = viewChild<ElementRef<HTMLInputElement>>('amountField');
  private readonly editRef = viewChild<ElementRef<HTMLButtonElement>>('editButton');

  private wasEditing = false;

  /** Amount and unit as one display string, e.g. "150g" or "1". */
  protected readonly amountLabel = computed(() => {
    const { amount, unit } = this.ingredient();
    return formatAmount(amount, unit);
  });

  /**
   * Fills the controls when the row opens and moves the focus along with the
   * mode, so the keyboard never lands on a control that just disappeared.
   */
  constructor() {
    effect(() => this.applyEditing(this.isEditing()));
    afterRenderEffect(() => this.moveFocus(this.isEditing()));
  }

  /**
   * Mirrors the entry into the controls once the row opens.
   * @param isEditing Whether the row is currently open for editing.
   */
  private applyEditing(isEditing: boolean): void {
    if (!isEditing) return;
    const { amount, unit } = this.ingredient();
    this.form.setValue({ amount: String(amount), unit });
  }

  /**
   * Focuses the amount field while editing and the edit button afterwards.
   * The previous mode is tracked so the first render leaves the focus alone.
   * @param isEditing Whether the row is currently open for editing.
   */
  private moveFocus(isEditing: boolean): void {
    if (isEditing) this.amountRef()?.nativeElement.focus();
    else if (this.wasEditing) this.editRef()?.nativeElement.focus();
    this.wasEditing = isEditing;
  }

  /**
   * True once the amount field has been touched and is rejected. Drives
   * aria-invalid, so the message is tied to the field it belongs to.
   * @returns Whether the amount currently violates a rule.
   */
  protected isAmountInvalid(): boolean {
    const { amount } = this.form.controls;
    return amount.touched && amount.invalid;
  }

  /**
   * Leaves edit mode without keeping the changes.
   * @param event Keydown event coming from the edit controls.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.cancelEdit.emit();
  }

  /** Validates the controls and emits the entry with its new amount and unit. */
  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { amount, unit } = this.form.getRawValue();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) return;
    this.save.emit({ name: this.ingredient().name, amount: parsedAmount, unit });
  }
}
