import {
  serverTimestamp,
  type DocumentData,
  type FieldValue,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import type { GeneratedRecipe, Recipe } from '../models/recipe.interface';

/**
 * A recipe as it lives in Firestore: without the id, which is the document id,
 * and with a native timestamp so the sort order follows the server clock.
 * See src/app/models/firebase-schema.md.
 */
export type RecipeDocument = Omit<Recipe, 'id' | 'createdAt'> & { createdAt: Timestamp };

/** Payload of a new document; the server fills in createdAt on write. */
export type NewRecipeDocument = Omit<RecipeDocument, 'createdAt'> & { createdAt: FieldValue };

/**
 * Turns a generated recipe into the payload of a new library document.
 * @param recipe Recipe as returned by the n8n workflow.
 * @returns Document payload with server timestamp and an empty like counter.
 */
export function buildRecipeDocument(recipe: GeneratedRecipe): NewRecipeDocument {
  return { ...recipe, createdAt: serverTimestamp(), likeCount: 0 };
}

/**
 * Maps a Firestore snapshot onto the Recipe model the UI works with.
 * @param snapshot Document of the 'recipes' collection.
 * @returns Recipe including its document id.
 */
export function toRecipe(snapshot: QueryDocumentSnapshot<DocumentData>): Recipe {
  const data = snapshot.data() as RecipeDocument;
  return { ...data, id: snapshot.id, createdAt: toIsoString(data.createdAt) };
}

/**
 * Converts the stored timestamp into the ISO string of the Recipe model.
 * A document read straight after its write can still carry a pending null.
 * @param createdAt Timestamp of the document.
 * @returns ISO 8601 string.
 */
function toIsoString(createdAt: Timestamp | null): string {
  return createdAt === null ? new Date().toISOString() : createdAt.toDate().toISOString();
}
