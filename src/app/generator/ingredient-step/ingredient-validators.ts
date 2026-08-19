import type { AbstractControl, ValidationErrors } from '@angular/forms';
import type { IngredientUnit } from '../../models/recipe-filters.types';
import { isInedibleIngredient, isNonEnglishIngredient } from './ingredient-blocklist';

/**
 * Longest ingredient name the workflow accepts. Mirrors MAX_NAME_LENGTH in the
 * guard node of n8n/generate-recipe.workflow.json, which rejects the request
 * outright when a name exceeds it.
 */
export const MAX_INGREDIENT_NAME_LENGTH = 60;

/** Shortest name that still carries meaning. Single letters are typing slips. */
const MIN_INGREDIENT_NAME_LENGTH = 2;

/**
 * Characters an ingredient name may consist of. Mirrors the allowlist of
 * sanitiseName() in the guard node of n8n/generate-recipe.workflow.json, which
 * replaces every other character with a space — silently, so the same rule has
 * to reject the name here where the user can still correct it.
 */
const NAME_PATTERN = /^[\p{L}\p{N} .,'-]+$/u;

/** Matches any letter, in any script. A name without one is not a word. */
const LETTER_PATTERN = /\p{L}/u;

/**
 * Largest amount per unit. Bounds what one request can ask the model to cook
 * with and keeps obvious typos ("1000" instead of "100") out of the prompt.
 */
const AMOUNT_LIMITS: Record<IngredientUnit, number> = {
  g: 10000,
  ml: 10000,
  piece: 100,
};

/** Message for an amount that is missing, not numeric, or not above zero. */
const AMOUNT_ERROR_MESSAGE = 'Please enter an amount greater than zero.';

/** Message for a name carrying characters outside the allowlist. */
export const NAME_CHARSET_MESSAGE = "Please use letters, digits, spaces and . , ' - only.";

/** Message for a name that is too short or holds no letter at all. */
export const NAME_SUBSTANCE_MESSAGE = `Please use at least ${MIN_INGREDIENT_NAME_LENGTH} characters, including a letter.`;

/** Message for a name that does not describe something edible. */
export const NAME_INEDIBLE_MESSAGE = 'Please name an ingredient we can actually cook with.';

/** Message for a name written in another language. */
export const NAME_LANGUAGE_MESSAGE = 'Please write the ingredient in English.';

/** Message for a fractional amount on a unit that only counts whole items. */
const FRACTIONAL_PIECE_MESSAGE = 'Please enter whole pieces, for example 2.';

/**
 * Parses the raw amount input into a number. Kept separate from the validator
 * so the form can reuse the exact same interpretation when emitting a result.
 * @param value Raw control value, may contain a comma as decimal separator.
 * @returns The parsed number, or null when the value is not numeric.
 */
export function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized || !/^\d*\.?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Rejects names that consist of whitespace only. Complements Validators.required,
 * which already accepts a single space.
 * @param control Control holding the ingredient name.
 * @returns A blankName error, or null when the name has content.
 */
export function blankNameValidator(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { blankName: true };
}

/**
 * Rejects names holding characters the workflow would strip out.
 * @param control Control holding the ingredient name.
 * @returns An invalidNameChars error, or null when every character is allowed.
 */
export function nameCharsetValidator(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();
  if (!name) return null;
  return NAME_PATTERN.test(name) ? null : { invalidNameChars: true };
}

/**
 * Rejects names too thin to be an ingredient, such as "a", "123" or "---".
 * An empty name stays untouched here, that case belongs to blankNameValidator.
 * @param control Control holding the ingredient name.
 * @returns A weakName error, or null when the name carries enough substance.
 */
export function nameSubstanceValidator(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();
  if (!name) return null;
  const isSubstantial = name.length >= MIN_INGREDIENT_NAME_LENGTH && LETTER_PATTERN.test(name);
  return isSubstantial ? null : { weakName: true };
}

/**
 * Rejects names that are not food, so no joke recipe is generated from them and
 * none ever reaches the public library.
 * @param control Control holding the ingredient name.
 * @returns An inedibleName error, or null when the name may be cooked with.
 */
export function edibleNameValidator(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();
  if (!name) return null;
  return isInedibleIngredient(name) ? { inedibleName: true } : null;
}

/**
 * Rejects names written in another language. The name travels verbatim into the
 * prompt and comes back inside the recipe, so a German name here is what makes
 * a stored recipe bilingual.
 * @param control Control holding the ingredient name.
 * @returns A nonEnglishName error, or null when the name is English.
 */
export function englishNameValidator(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();
  if (!name) return null;
  return isNonEnglishIngredient(name) ? { nonEnglishName: true } : null;
}

/**
 * Requires a numeric amount greater than zero. Replaces the native number input
 * and its browser validation, which the project rules exclude.
 * @param control Control holding the raw amount string.
 * @returns A notPositiveAmount error, or null when the amount is valid.
 */
export function positiveAmountValidator(control: AbstractControl): ValidationErrors | null {
  const parsed = parseAmount(String(control.value ?? ''));
  return parsed !== null && parsed > 0 ? null : { notPositiveAmount: true };
}

/**
 * Checks the amount against the rules of its unit. Sits on the group because it
 * reads both controls: Angular reruns group validators on every child change,
 * so switching the unit revalidates the amount without further typing.
 * A missing or non-positive amount is left to positiveAmountValidator, so one
 * typo never produces two messages.
 * @param group Group holding an amount and a unit control.
 * @returns A fractionalPiece or amountTooLarge error, or null when acceptable.
 */
export function amountUnitValidator(group: AbstractControl): ValidationErrors | null {
  const parsed = parseAmount(String(group.get('amount')?.value ?? ''));
  if (parsed === null || parsed <= 0) return null;
  const unit = readUnit(group);
  if (unit === 'piece' && !Number.isInteger(parsed)) return { fractionalPiece: true };
  return parsed > AMOUNT_LIMITS[unit] ? { amountTooLarge: true } : null;
}

/**
 * Reads the unit of an amount group without trusting the untyped control value.
 * @param group Group holding a unit control.
 * @returns The selected unit, falling back to grams for anything unexpected.
 */
function readUnit(group: AbstractControl): IngredientUnit {
  const unit: unknown = group.get('unit')?.value;
  return unit === 'ml' || unit === 'piece' ? unit : 'g';
}

/**
 * True once the amount was touched and violates a control or group rule.
 * Shared so the input form and the list row judge the amount identically.
 * @param group Group holding an amount and a unit control.
 * @returns Whether the amount currently has a message to show.
 */
export function hasAmountError(group: AbstractControl): boolean {
  const amount = group.get('amount');
  if (!amount?.touched) return false;
  return amount.invalid || group.hasError('fractionalPiece') || group.hasError('amountTooLarge');
}

/**
 * Message for the first violated amount rule, most specific one first.
 * @param group Group holding an amount and a unit control.
 * @returns Text describing why the amount was rejected.
 */
export function buildAmountMessage(group: AbstractControl): string {
  if (group.hasError('fractionalPiece')) return FRACTIONAL_PIECE_MESSAGE;
  if (group.hasError('amountTooLarge')) return buildAmountLimitMessage(readUnit(group));
  return AMOUNT_ERROR_MESSAGE;
}

/**
 * Names the upper bound of a unit in the wording of that unit.
 * @param unit Unit the amount was entered with.
 * @returns Text naming the largest accepted amount, e.g. "at most 10000g".
 */
function buildAmountLimitMessage(unit: IngredientUnit): string {
  const limit = AMOUNT_LIMITS[unit];
  if (unit === 'piece') return `Please enter at most ${limit} pieces.`;
  return `Please enter at most ${limit}${unit}.`;
}
