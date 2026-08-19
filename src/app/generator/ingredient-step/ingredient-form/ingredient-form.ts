import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { IngredientUnit } from '../../../models/recipe-filters.types';
import type { RequestIngredient } from '../../../models/recipe-request.interface';
import { RecentIngredientsService } from '../../../services/recent-ingredients.service';
import { findClosestIngredient, isKnownIngredient } from '../ingredient-matching';
import { UNIT_OPTIONS, findIngredientSuggestions } from '../ingredient-options';
import {
  IngredientSuggestions,
  SUGGESTION_LIST_ID,
  buildSuggestionId,
} from '../ingredient-suggestions/ingredient-suggestions';
import {
  MAX_INGREDIENT_NAME_LENGTH,
  NAME_CHARSET_MESSAGE,
  NAME_INEDIBLE_MESSAGE,
  NAME_LANGUAGE_MESSAGE,
  NAME_SUBSTANCE_MESSAGE,
  amountUnitValidator,
  blankNameValidator,
  buildAmountMessage,
  edibleNameValidator,
  englishNameValidator,
  hasAmountError,
  nameCharsetValidator,
  nameSubstanceValidator,
  parseAmount,
  positiveAmountValidator,
} from '../ingredient-validators';

/**
 * Builds the hint for a name that closely resembles a known ingredient. Never
 * blocks adding: the point of the generator is whatever is in the kitchen, so
 * an unlisted speciality must stay addable exactly as typed.
 * @param match Known ingredient the typed name most likely meant.
 * @returns Hint text naming the suggestion.
 */
function buildSpellingHint(match: string): string {
  return `Did you mean "${match}"?`;
}

/**
 * Hint for a name no known ingredient comes close to. States the consequence
 * instead of doubting the name: the list is a helper, not a menu, so a regional
 * speciality gets the same neutral note as a typo nothing can be guessed from.
 */
const UNLISTED_NAME_HINT = 'Not in our list — we pass it on exactly as typed.';

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
  private readonly recentIngredients = inject(RecentIngredientsService);

  /** True once the list holds as many ingredients as the workflow accepts. */
  readonly isFull = input(false);

  /** Names already in the list, lower-cased, so the same one is not added twice. */
  readonly takenNames = input<readonly string[]>([]);

  /** Emits a validated ingredient once the user adds it. */
  readonly save = output<RequestIngredient>();

  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly suggestionListId = SUGGESTION_LIST_ID;
  protected readonly maxNameLength = MAX_INGREDIENT_NAME_LENGTH;

  /**
   * Rejects a name the list already holds. Lives here instead of in
   * ingredient-validators because it is the only rule that needs the list.
   * @param group Group holding the name control.
   * @returns A duplicateName error, or null when the name is still free.
   */
  private readonly duplicateNameValidator = (group: AbstractControl): ValidationErrors | null => {
    const name = String(group.get('name')?.value ?? '')
      .trim()
      .toLowerCase();
    if (!name) return null;
    return this.takenNames().includes(name) ? { duplicateName: true } : null;
  };

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      name: [
        '',
        [
          Validators.required,
          blankNameValidator,
          nameCharsetValidator,
          nameSubstanceValidator,
          edibleNameValidator,
          englishNameValidator,
          Validators.maxLength(MAX_INGREDIENT_NAME_LENGTH),
        ],
      ],
      amount: ['', [Validators.required, positiveAmountValidator]],
      unit: ['g' as IngredientUnit],
    },
    { validators: [amountUnitValidator, this.duplicateNameValidator] },
  );

  private readonly nameTerm = signal('');
  private readonly isOpen = signal(false);

  /** Index of the keyboard-highlighted suggestion, -1 when none is active. */
  protected readonly activeIndex = signal(-1);

  /** Names matching the current input value, capped by the suggestion limit. */
  protected readonly suggestions = computed(() =>
    findIngredientSuggestions(this.nameTerm(), this.recentIngredients.names()),
  );

  /** True while the suggestion listbox is visible. */
  protected readonly isListboxOpen = computed(() => this.isOpen() && this.suggestions().length > 0);

  /**
   * Revalidates once the list changes, so a duplicate message disappears as
   * soon as the user deletes the row that caused it, without another keystroke.
   */
  constructor() {
    effect(() => {
      this.takenNames();
      this.form.updateValueAndValidity({ emitEvent: false });
    });
  }

  /**
   * True once the name field has been touched and is rejected. Drives
   * aria-invalid, so the message is tied to the field it belongs to. Covers the
   * duplicate rule too, which sits on the group but describes the name.
   * @returns Whether the name currently violates a rule.
   */
  protected isNameInvalid(): boolean {
    const { name } = this.form.controls;
    return name.touched && (name.invalid || this.form.hasError('duplicateName'));
  }

  /**
   * True once the amount field has been touched and is rejected.
   * @returns Whether the amount currently violates a rule.
   */
  protected isAmountInvalid(): boolean {
    return hasAmountError(this.form);
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
   * The name goes first: it is the field the user fills in first.
   * @returns Error text, or an empty string while the form is acceptable.
   */
  protected errorMessage(): string {
    const { name } = this.form.controls;
    if (!this.isNameInvalid()) return this.amountErrorMessage();
    if (name.errors?.['maxlength']) return `Please use at most ${this.maxNameLength} characters.`;
    if (name.errors?.['invalidNameChars']) return NAME_CHARSET_MESSAGE;
    if (name.errors?.['weakName']) return NAME_SUBSTANCE_MESSAGE;
    if (name.errors?.['inedibleName']) return NAME_INEDIBLE_MESSAGE;
    if (name.errors?.['nonEnglishName']) return NAME_LANGUAGE_MESSAGE;
    if (name.errors) return 'Please enter an ingredient.';
    return `${name.value.trim()} is already in your list.`;
  }

  /**
   * Message for the amount field, empty while the amount is acceptable.
   * @returns Error text describing why the amount was rejected.
   */
  private amountErrorMessage(): string {
    return this.isAmountInvalid() ? buildAmountMessage(this.form) : '';
  }

  /**
   * Hint for a name the list does not hold: the nearest known ingredient when
   * one is within a typo's reach, otherwise the neutral note that the name goes
   * out unchanged. Held back until the name field is touched, so it stays quiet
   * while a name is still half typed.
   * @returns Hint text, or an empty string for a name the list already knows.
   */
  protected nameHint(): string {
    const { name } = this.form.controls;
    if (!name.touched || name.invalid) return '';
    const match = findClosestIngredient(name.value);
    if (match !== null) return buildSpellingHint(match);
    return isKnownIngredient(name.value) ? '' : UNLISTED_NAME_HINT;
  }

  /**
   * Message below the form: the first violated rule, the spelling hint, or the
   * limit hint once the list is full, so the disabled add button explains
   * itself. Only ever one message, so the reserved height stays sufficient.
   * @returns Text to display, or an empty string when there is nothing to say.
   */
  protected noticeText(): string {
    const error = this.errorMessage();
    if (error !== '') return error;
    if (this.isHintVisible()) return this.nameHint();
    if (!this.isFull()) return '';
    return 'The ingredient list is full. Remove one to add another.';
  }

  /** True while the name hint is the message the notice actually carries. */
  private isHintVisible(): boolean {
    return this.errorMessage() === '' && this.nameHint() !== '';
  }

  /**
   * True while the notice states something other than a violated rule, so a
   * hint is not painted in the error colour.
   * @returns Whether the notice currently carries a neutral message.
   */
  protected isNoticeNeutral(): boolean {
    return this.errorMessage() === '';
  }

  /**
   * True while the notice text is about the name. Only the field the message
   * belongs to points its aria-describedby at the shared notice, so the other
   * one is never announced with a message meant for its neighbour.
   * @returns Whether the current notice describes the name.
   */
  protected describesName(): boolean {
    return this.isNameInvalid() || this.isHintVisible();
  }

  /**
   * True while the notice text is about the amount, which errorMessage() only
   * reaches once the name passes.
   * @returns Whether the current notice describes the amount.
   */
  protected describesAmount(): boolean {
    return !this.isNameInvalid() && this.isAmountInvalid();
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
    const trimmedName = name.trim();
    this.save.emit({ name: trimmedName, amount: parsedAmount, unit });
    if (!isKnownIngredient(trimmedName)) this.recentIngredients.remember(trimmedName);
    this.resetForm();
  }

  /** Clears all fields back to their initial values. */
  private resetForm(): void {
    this.form.reset({ name: '', amount: '', unit: 'g' });
    this.nameTerm.set('');
    this.closeSuggestions();
  }
}
