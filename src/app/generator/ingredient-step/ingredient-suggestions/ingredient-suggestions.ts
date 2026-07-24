import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** DOM id of the suggestion listbox, referenced by the input's aria-controls. */
export const SUGGESTION_LIST_ID = 'ingredient-suggestion-list';

/**
 * Builds the DOM id of a suggestion option so the combobox input can point at
 * the active entry via aria-activedescendant.
 * @param index Zero-based position in the suggestion list.
 * @returns Unique element id for that option.
 */
export function buildSuggestionId(index: number): string {
  return `ingredient-suggestion-${index}`;
}

/**
 * Presentational listbox for the ingredient autocomplete. Keyboard handling
 * lives in the parent form; this component only renders and reports clicks.
 */
@Component({
  selector: 'app-ingredient-suggestions',
  imports: [],
  templateUrl: './ingredient-suggestions.html',
  styleUrl: './ingredient-suggestions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientSuggestions {
  /** Ingredient names matching the current input value. */
  readonly suggestions = input.required<string[]>();

  /** Index of the keyboard-highlighted entry, -1 when nothing is active. */
  readonly activeIndex = input.required<number>();

  /** Emits the picked ingredient name. */
  readonly pick = output<string>();

  protected readonly listId = SUGGESTION_LIST_ID;

  /**
   * Exposes the option id builder to the template.
   * @param index Zero-based position in the suggestion list.
   * @returns Unique element id for that option.
   */
  protected optionId(index: number): string {
    return buildSuggestionId(index);
  }
}
