import type { AbstractControl, ValidationErrors } from '@angular/forms';

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
 * Requires a numeric amount greater than zero. Replaces the native number input
 * and its browser validation, which the project rules exclude.
 * @param control Control holding the raw amount string.
 * @returns A notPositiveAmount error, or null when the amount is valid.
 */
export function positiveAmountValidator(control: AbstractControl): ValidationErrors | null {
  const parsed = parseAmount(String(control.value ?? ''));
  return parsed !== null && parsed > 0 ? null : { notPositiveAmount: true };
}
