import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type Query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { FIRESTORE } from '../firebase/firestore.provider';
import type { CuisineStyle } from '../models/recipe-filters.types';
import type { GeneratedRecipe, Recipe } from '../models/recipe.interface';
import { buildRecipeDocument, toRecipe } from './recipe-document';

/** Recipes per page of the cookbook list (User Story 12). */
export const RECIPES_PER_PAGE = 20;

/** Entries of the "Most liked recipes" row of the cookbook header. */
export const MOST_LIKED_COUNT = 10;

/**
 * Position of the last loaded recipe. The cookbook treats it as an opaque
 * value and only hands it back to load the following page.
 */
export type RecipeCursor = QueryDocumentSnapshot<DocumentData>;

/** One page of the cookbook list. */
export interface RecipePage {
  recipes: Recipe[];
  /** Start of the next page, null once the end of the list is reached. */
  cursor: RecipeCursor | null;
}

/** Filter and paging options of a cookbook query. */
export interface RecipeListOptions {
  /** Category filter (User Story 13); undefined lists every cuisine. */
  cuisine?: CuisineStyle;
  /** Cursor of the previous page, null or undefined for the first one. */
  cursor?: RecipeCursor | null;
}

/**
 * Single entry point to the recipe library in Firestore. Owns every read and
 * write on the 'recipes' collection so no component talks to Firestore
 * directly, mirroring how RecipeApiService owns the n8n webhook.
 */
@Injectable({ providedIn: 'root' })
export class RecipeLibraryService {
  private readonly firestore = inject(FIRESTORE);
  private readonly recipes = collection(this.firestore, 'recipes');

  /**
   * Stores a confirmed recipe in the library.
   * @param recipe Recipe as returned by the n8n workflow.
   * @returns Id of the created document.
   */
  async saveRecipe(recipe: GeneratedRecipe): Promise<string> {
    const created = await addDoc(this.recipes, buildRecipeDocument(recipe));
    return created.id;
  }

  /**
   * Reads a single recipe of the library.
   * @param id Document id, usually taken from the route.
   * @returns The recipe, or null when no document carries that id.
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    const snapshot = await getDoc(doc(this.recipes, id));
    return snapshot.exists() ? toRecipe(snapshot) : null;
  }

  /**
   * Lists the library newest first, optionally filtered by cuisine.
   * @param options Category filter and cursor of the previous page.
   * @returns One page of recipes plus the cursor of the next one.
   */
  async listRecipes(options: RecipeListOptions = {}): Promise<RecipePage> {
    const snapshot = await getDocs(this.buildListQuery(options));
    const recipes = snapshot.docs.map(toRecipe);
    const isLastPage = recipes.length < RECIPES_PER_PAGE;
    return { recipes, cursor: isLastPage ? null : snapshot.docs[recipes.length - 1] };
  }

  /**
   * Reads the most liked recipes for the cookbook header.
   * @param count Number of entries, defaults to MOST_LIKED_COUNT.
   * @returns Recipes sorted by like count, highest first.
   */
  async listMostLiked(count = MOST_LIKED_COUNT): Promise<Recipe[]> {
    const snapshot = await getDocs(query(this.recipes, orderBy('likeCount', 'desc'), limit(count)));
    return snapshot.docs.map(toRecipe);
  }

  /**
   * Adds one like to a recipe. The counter lives on the server, so parallel
   * likes from different visitors add up instead of overwriting each other.
   * @param id Document id of the liked recipe.
   */
  async incrementLike(id: string): Promise<void> {
    await updateDoc(doc(this.recipes, id), { likeCount: increment(1) });
  }

  /**
   * Assembles the paginated list query.
   * @param options Category filter and cursor of the previous page.
   * @returns Query for one page of the library.
   */
  private buildListQuery(options: RecipeListOptions): Query<DocumentData> {
    const constraints: QueryConstraint[] = [];
    if (options.cuisine !== undefined) constraints.push(where('cuisine', '==', options.cuisine));
    constraints.push(orderBy('createdAt', 'desc'));
    if (options.cursor) constraints.push(startAfter(options.cursor));
    return query(this.recipes, ...constraints, limit(RECIPES_PER_PAGE));
  }
}
