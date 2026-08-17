import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { IngredientUnit } from '../../../models/recipe-filters.types';
import type { RequestIngredient } from '../../../models/recipe-request.interface';
import { UNIT_OPTIONS, findIngredientSuggestions } from '../ingredient-options';
import {
  IngredientSuggestions,
  SUGGESTION_LIST_ID,
  buildSuggestionId,
} from '../ingredient-suggestions/ingredient-suggestions';
import {
  AMOUNT_ERROR_MESSAGE,
  MAX_INGREDIENT_NAME_LENGTH,
  blankNameValidator,
  parseAmount,
  positiveAmountValidator,
} from '../ingredient-validators';

/**
 * Input card of step 1: ingredient name with autocomplete, serving size and the
 * add button. Corrections happen in the list itself, so this only ever adds.
 */
@Component({
  selector: 'app-ingredient-form',
  imports: [ReactiveFormsModule, IngredientSuggestions],
  templateUrl: './ingredient-form.html',
  styleUrl: './ingredient-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientForm {
  private readonly formBuilder = inject(FormBuilder);

  /** True once the list holds as many ingredients as the workflow accepts. */
  readonly isFull = input(false);

  /** Emits a validated ingredient once the user adds it. */
  readonly save = output<RequestIngredient>();

  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly suggestionListId = SUGGESTION_LIST_ID;
  protected readonly maxNameLength = MAX_INGREDIENT_NAME_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: [
      '',
      [Validators.required, blankNameValidator, Validators.maxLength(MAX_INGREDIENT_NAME_LENGTH)],
    ],
    amount: ['', [Validators.required, positiveAmountValidator]],
    unit: ['g' as IngredientUnit],
  });

  private readonly nameTerm = signal('');
  private readonly isOpen = signal(false);

  /** Index of the keyboard-highlighted suggestion, -1 when none is active. */
  protected readonly activeIndex = signal(-1);

  /** Names matching the current input value, capped by the suggestion limit. */
  protected readonly suggestions = computed(() => findIngredientSuggestions(this.nameTerm()));

  /** True while the suggestion listbox is visible. */
  protected readonly isListboxOpen = computed(() => this.isOpen() && this.suggestions().length > 0);

  /**
   * True once the name field has been touched and is rejected. Drives
   * aria-invalid, so the message is tied to the field it belongs to.
   * @returns Whether the name currently violates a rule.
   */
  protected isNameInvalid(): boolean {
    const { name } = this.form.controls;
    return name.touched && name.invalid;
  }

  /**
   * True once the amount field has been touched and is rejected.
   * @returns Whether the amount currently violates a rule.
   */
  protected isAmountInvalid(): boolean {
    const { amount } = this.form.controls;
    return amount.touched && amount.invalid;
  }

  /** Refreshes the autocomplete term and reopens the listbox while typing. */
  protected onNameInput(): void {
    this.nameTerm.set(this.form.controls.name.value);
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  /**
   * Handles combobox keyboard navigation on the ingredient input.
   * @param event Keydown event coming from the name field.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Escape') return this.closeSuggestions();
    const active = this.activeSuggestion();
    if (event.key === 'Enter' && active) {
      event.preventDefault();
      this.pickSuggestion(active);
    }
  }

  /**
   * Moves the highlight through the suggestion list, wrapping at both ends.
   * @param step 1 to move down, -1 to move up.
   */
  private moveActive(step: number): void {
    const count = this.suggestions().length;
    if (!count) return;
    this.isOpen.set(true);
    const current = this.activeIndex();
    const next = current < 0 && step < 0 ? count - 1 : current + step;
    this.activeIndex.set(((next % count) + count) % count);
  }

  /** Currently highlighted suggestion, or null when the listbox is closed. */
  private activeSuggestion(): string | null {
    if (!this.isListboxOpen()) return null;
    return this.suggestions()[this.activeIndex()] ?? null;
  }

  /**
   * Applies a suggestion to the name field and closes the listbox.
   * @param name Ingredient name the user picked.
   */
  protected pickSuggestion(name: string): void {
    this.form.controls.name.setValue(name);
    this.nameTerm.set(name);
    this.closeSuggestions();
  }

  /** Closes the suggestion listbox and clears the keyboard highlight. */
  protected closeSuggestions(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  /**
   * Builds the DOM id of the active option for aria-activedescendant.
   * @returns Element id of the highlighted option, or null when none is active.
   */
  protected activeOptionId(): string | null {
    return this.activeSuggestion() ? buildSuggestionId(this.activeIndex()) : null;
  }

  /**
   * Returns the message for the first violated rule once the user interacted.
   * @returns Error text, or an empty string while the form is acceptable.
   */
  protected errorMessage(): string {
    const { name } = this.form.controls;
    if (this.isNameInvalid() && name.errors?.['maxlength'])
      return `Please use at most ${this.maxNameLength} characters.`;
    if (this.isNameInvalid()) return 'Please enter an ingredient.';
    if (this.isAmountInvalid()) return AMOUNT_ERROR_MESSAGE;
    return '';
  }

  /**
   * Message below the form: the first violated rule, or the limit hint once
   * the list is full, so the disabled add button explains itself.
   * @returns Text to display, or an empty string when there is nothing to say.
   */
  protected noticeText(): string {
    const error = this.errorMessage();
    if (error !== '') return error;
    if (!this.isFull()) return '';
    return 'The ingredient list is full. Remove one to add another.';
  }

  /** Validates the form and emits the ingredient, then returns to a clean state. */
  protected submit(): void {
    this.closeSuggestions();
    if (this.isFull()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { name, amount, unit } = this.form.getRawValue();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) return;
    this.save.emit({ name: name.trim(), amount: parsedAmount, unit });
    this.resetForm();
  }

  /** Clears all fields back to their initial values. */
  private resetForm(): void {
    this.form.reset({ name: '', amount: '', unit: 'g' });
    this.nameTerm.set('');
    this.closeSuggestions();
  }
}
