// Map node — turns the Anthropic tool-use answer into the RecipeResponse
// success envelope, sanitising every field so it satisfies the GeneratedRecipe
// shape and the Firestore rules. On any unusable answer it emits an ai_failed
// error envelope instead. Runs once for all items.

const TIME_CATEGORIES = ['quick', 'medium', 'complex'];
const CUISINES = ['german', 'italian', 'japanese', 'indian', 'gourmet', 'fusion'];
const DIETS = ['vegetarian', 'vegan', 'keto', 'none'];
const UNITS = ['g', 'ml', 'piece'];

const answer = $input.first().json;

/** ai_failed envelope — the frontend offers a retry for this code. */
function fail() {
  const envelope = {
    status: 'error',
    code: 'ai_failed',
    message: 'The kitchen AI could not produce a recipe right now. Please try again.',
    retryAfter: null,
  };
  return [{ json: { route: 'error', __error: envelope } }];
}

/**
 * Digs the recipe array out of a tool input. Claude sometimes wraps the value:
 * the input can already be the array, a { recipes } object, or a JSON string of
 * either — and it has been observed double-wrapped as { recipes: "<json>" }.
 * Unwraps strings and { recipes } layers until an array turns up.
 */
function coerceRecipes(value, depth) {
  if (depth > 6) return null;
  if (typeof value === 'string') {
    try {
      return coerceRecipes(JSON.parse(value), depth + 1);
    } catch (error) {
      return null;
    }
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && value.recipes !== undefined) {
    return coerceRecipes(value.recipes, depth + 1);
  }
  return null;
}

/** Extracts the recipes array from the forced tool_use block, or null. */
function extractRecipes(response) {
  const content = Array.isArray(response.content) ? response.content : [];
  const tool = content.find(
    (block) =>
      block.type === 'tool_use' && block.name === 'emit_recipes' && block.input !== undefined,
  );
  return tool ? coerceRecipes(tool.input, 0) : null;
}

/** Coerces one ingredient to the RecipeIngredient shape (amount/unit nullable). */
function cleanIngredient(raw) {
  const source = raw || {};
  const amount =
    typeof source.amount === 'number' && isFinite(source.amount) ? source.amount : null;
  const unit = UNITS.includes(source.unit) ? source.unit : null;
  const note = source.note === null || source.note === undefined ? null : String(source.note);
  return { name: String(source.name || '').trim(), amount, unit, note };
}

/** Coerces one step, clamping the chef into the 1..cooks range. */
function cleanStep(raw, index, cooks) {
  const source = raw || {};
  const chef = Math.min(Math.max(Number(source.assignedChef) || 1, 1), cooks);
  const group = Number.isInteger(source.parallelGroupId) ? source.parallelGroupId : null;
  return {
    order: index + 1,
    title: String(source.title || ''),
    description: String(source.description || ''),
    assignedChef: chef,
    parallelGroupId: group,
  };
}

/** Rebuilds one recipe from raw model output into the GeneratedRecipe shape. */
function cleanRecipe(raw) {
  const cooks = clampInt(raw.cooks, 1, 3, 1);
  return {
    title: String(raw.title || '').trim(),
    cookingTimeMinutes: Math.round(Number(raw.cookingTimeMinutes)),
    timeCategory: raw.timeCategory,
    cuisine: raw.cuisine,
    diet: raw.diet,
    portions: clampInt(raw.portions, 1, 12, 1),
    cooks,
    yourIngredients: asArray(raw.yourIngredients).map(cleanIngredient),
    extraIngredients: asArray(raw.extraIngredients).slice(0, 3).map(cleanIngredient),
    steps: asArray(raw.steps).map((step, index) => cleanStep(step, index, cooks)),
    nutrition: raw.nutrition,
  };
}

/** Confirms a cleaned recipe carries every field the contract requires. */
function isValidRecipe(recipe) {
  return (
    typeof recipe.title === 'string' &&
    recipe.title.length > 0 &&
    Number.isFinite(recipe.cookingTimeMinutes) &&
    recipe.cookingTimeMinutes > 0 &&
    TIME_CATEGORIES.includes(recipe.timeCategory) &&
    CUISINES.includes(recipe.cuisine) &&
    DIETS.includes(recipe.diet) &&
    recipe.yourIngredients.length > 0 &&
    recipe.steps.length > 0 &&
    hasNutrition(recipe.nutrition)
  );
}

/** Both per-portion and total scopes must be present (User Story 10). */
function hasNutrition(nutrition) {
  return Boolean(nutrition && nutrition.perPortion && nutrition.total);
}

function clampInt(value, min, max, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// --- main -------------------------------------------------------------------
const rawRecipes = extractRecipes(answer);
if (!rawRecipes) return fail();

const recipes = rawRecipes.slice(0, 3).map(cleanRecipe);
if (recipes.length !== 3 || !recipes.every(isValidRecipe)) return fail();

return [{ json: { route: 'ok', status: 'ok', recipes } }];
