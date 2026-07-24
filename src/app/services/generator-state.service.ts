import { Injectable, computed, signal } from '@angular/core';
import type { CuisineStyle, Diet, TimeCategory } from '../models/recipe-filters.types';
import type { RequestIngredient } from '../models/recipe-request.interface';

/** Inclusive range of servings a recipe may be generated for (Lastenheft). */
export const PORTIONS_RANGE = { min: 1, max: 12 } as const;

/** Inclusive range of people cooking together (Lastenheft). */
export const COOKS_RANGE = { min: 1, max: 3 } as const;

/**
 * Keeps a value inside an inclusive range.
 * @param value Raw value coming from a stepper control.
 * @param range Inclusive minimum and maximum.
 * @returns The value clamped to the range bounds.
 */
function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(Math.max(Math.round(value), range.min), range.max);
}

/**
 * Holds the recipe request the user is assembling in the generator wizard.
 * The state is session-only by design: it survives step navigation but not a
 * reload, so no stale ingredient list can be replayed against the webhook.
 */
@Injectable({ providedIn: 'root' })
export class GeneratorStateService {
  private readonly ingredientList = signal<RequestIngredient[]>([]);
  private readonly portionCount = signal(2);
  private readonly cookCount = signal(1);
  private readonly timeCategoryChoice = signal<TimeCategory | null>(null);
  private readonly cuisineChoice = signal<CuisineStyle | null>(null);
  private readonly dietChoice = signal<Diet | null>(null);
  private readonly generationFlag = signal(false);

  /** Ingredients collected in step 1, in insertion order. */
  readonly ingredients = this.ingredientList.asReadonly();

  /** Number of servings, defaults to 2. */
  readonly portions = this.portionCount.asReadonly();

  /** Number of people cooking, defaults to 1. */
  readonly cooks = this.cookCount.asReadonly();

  /** Chosen cooking time category, null until the user picks one. */
  readonly timeCategory = this.timeCategoryChoice.asReadonly();

  /** Chosen cuisine style, null until the user picks one. */
  readonly cuisine = this.cuisineChoice.asReadonly();

  /** Chosen diet, null until the user picks one. */
  readonly diet = this.dietChoice.asReadonly();

  /**
   * Placeholder until the n8n call ships: flipped by the generate button so the
   * UI can react without the webhook being wired up yet.
   */
  readonly generationRequested = this.generationFlag.asReadonly();

  /** True as soon as the request holds at least one ingredient. */
  readonly hasIngredients = computed(() => this.ingredientList().length > 0);

  /** True once cooking time, cuisine and diet are all chosen. */
  readonly hasAllPreferences = computed(
    () =>
      this.timeCategoryChoice() !== null &&
      this.cuisineChoice() !== null &&
      this.dietChoice() !== null,
  );

  /** True when the request is complete enough to be generated. */
  readonly canGenerate = computed(() => this.hasIngredients() && this.hasAllPreferences());

  /**
   * Appends an ingredient to the end of the list.
   * @param ingredient Validated ingredient from the input form.
   */
  addIngredient(ingredient: RequestIngredient): void {
    this.ingredientList.update((list) => [...list, ingredient]);
  }

  /**
   * Replaces the ingredient at the given position.
   * @param index Zero-based position in the list.
   * @param ingredient Validated ingredient that replaces the current entry.
   */
  updateIngredient(index: number, ingredient: RequestIngredient): void {
    this.ingredientList.update((list) =>
      list.map((entry, position) => (position === index ? ingredient : entry)),
    );
  }

  /**
   * Removes the ingredient at the given position.
   * @param index Zero-based position in the list.
   */
  removeIngredient(index: number): void {
    this.ingredientList.update((list) => list.filter((_, position) => position !== index));
  }

  /**
   * Sets the serving count, clamped to the allowed range.
   * @param value Requested number of servings.
   */
  setPortions(value: number): void {
    this.portionCount.set(clamp(value, PORTIONS_RANGE));
  }

  /**
   * Sets the number of people cooking, clamped to the allowed range.
   * @param value Requested number of cooks.
   */
  setCooks(value: number): void {
    this.cookCount.set(clamp(value, COOKS_RANGE));
  }

  /**
   * Selects the cooking time category.
   * @param value Category picked in the preferences step.
   */
  setTimeCategory(value: TimeCategory): void {
    this.timeCategoryChoice.set(value);
  }

  /**
   * Selects the cuisine style.
   * @param value Cuisine picked in the preferences step.
   */
  setCuisine(value: CuisineStyle): void {
    this.cuisineChoice.set(value);
  }

  /**
   * Selects the diet.
   * @param value Diet picked in the preferences step.
   */
  setDiet(value: Diet): void {
    this.dietChoice.set(value);
  }

  /** Marks the request as submitted; the webhook call follows in phase 3.5. */
  requestGeneration(): void {
    if (this.canGenerate()) this.generationFlag.set(true);
  }
}
