// Guard node — server-side request validation and the daily cost cap
// (Kostenairbag). Runs once for all items. Emits either a "route: ok" item
// carrying the sanitised request plus the ready-to-send Gemini body, or a
// "route: error" item carrying the error envelope from the JSON contract.

const ALLOWED_ORIGINS = ['http://localhost:4200', 'http://localhost:4300'];
// TODO(prod): add the deployed frontend origin here once it is known.

const TIME_CATEGORIES = ['quick', 'medium', 'complex'];
const CUISINES = ['german', 'italian', 'japanese', 'indian', 'gourmet', 'fusion'];
const DIETS = ['vegetarian', 'vegan', 'keto', 'none'];
const UNITS = ['g', 'ml', 'piece'];

// Cost cap: how many recipes one IP and the whole system may generate per day.
const PER_IP_LIMIT = 3;
const SYSTEM_LIMIT = 12;

// Generous output budget: three full recipes plus the model's internal
// reasoning would otherwise hit finishReason MAX_TOKENS mid-answer.
const MAX_OUTPUT_TOKENS = 32000;

// Every field a GeneratedRecipe must carry; drives the responseSchema below.
const RECIPE_FIELDS = [
  'title',
  'cookingTimeMinutes',
  'timeCategory',
  'cuisine',
  'diet',
  'portions',
  'cooks',
  'yourIngredients',
  'extraIngredients',
  'steps',
  'nutrition',
];

const webhook = $input.first().json;
const body = webhook.body || {};
const headers = webhook.headers || {};

/** Reflects the request origin when it is allow-listed, else the first entry. */
function resolveCorsOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

/** Wraps an error envelope (JSON contract) into a single n8n item. */
function fail(code, message, retryAfter) {
  const envelope = { status: 'error', code, message, retryAfter: retryAfter || null };
  return [{ json: { route: 'error', __error: envelope } }];
}

/** Collects human-readable problems with the incoming payload. */
function collectValidationErrors(input) {
  const errors = [];
  validateIngredients(input.ingredients, errors);
  if (!Number.isInteger(input.portions) || input.portions < 1 || input.portions > 12) {
    errors.push('portions must be a whole number between 1 and 12');
  }
  if (!Number.isInteger(input.cooks) || input.cooks < 1 || input.cooks > 3) {
    errors.push('cooks must be a whole number between 1 and 3');
  }
  if (!TIME_CATEGORIES.includes(input.timeCategory)) errors.push('time category is invalid');
  if (!CUISINES.includes(input.cuisine)) errors.push('cuisine is invalid');
  if (!DIETS.includes(input.diet)) errors.push('diet is invalid');
  return errors;
}

/** Validates the ingredient list: at least one, each with name/amount/unit. */
function validateIngredients(ingredients, errors) {
  if (!Array.isArray(ingredients) || ingredients.length < 1) {
    errors.push('at least one ingredient is required');
    return;
  }
  ingredients.forEach((ingredient, index) => {
    const label = 'ingredient ' + (index + 1);
    const item = ingredient || {};
    if (typeof item.name !== 'string' || item.name.trim() === '')
      errors.push(label + ' needs a name');
    if (typeof item.amount !== 'number' || !isFinite(item.amount) || item.amount <= 0) {
      errors.push(label + ' needs a positive amount');
    }
    if (!UNITS.includes(item.unit)) errors.push(label + ' has an invalid unit');
  });
}

/** Normalises the client IP so IPv4 and IPv6 map to a stable quota key. */
function resolveIpKey(requestHeaders) {
  const forwarded = String(requestHeaders['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  let ip = (forwarded || requestHeaders['x-real-ip'] || '').trim();
  if (!ip) return 'unknown';
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];
  ip = ip.replace(/%.*$/, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return 'v4:' + ip;
  return 'v6:' + ip.toLowerCase().split(':').slice(0, 4).join(':');
}

/** ISO timestamp of the next UTC midnight — when the daily quota resets. */
function nextUtcMidnight(now) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

// Counter file on the n8n data volume. A plain JSON file is used on purpose:
// n8n's workflow static data does not persist reliably for webhook runs, and a
// hard cost cap must not depend on that. Requires NODE_FUNCTION_ALLOW_BUILTIN
// to include `fs` (set in ~/n8n/docker-compose.yml).
const fs = require('fs');
const QUOTA_FILE = '/home/node/.n8n/quota-state.json';

/** Reads the counter file, returning a fresh state when it is missing. */
function readQuotaState() {
  try {
    return JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
  } catch (error) {
    return { day: null, system: 0, perIp: {} };
  }
}

/** Persists the counter file. */
function writeQuotaState(state) {
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(state));
}

/**
 * Checks and reserves one quota slot. A request about to reach the LLM counts
 * against the cap even if the model later fails, so repeated failures cannot
 * drain the budget. Returns an error envelope on overrun, otherwise null.
 */
function reserveQuota(requestHeaders) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const state = readQuotaState();
  if (state.day !== day) {
    state.day = day;
    state.system = 0;
    state.perIp = {};
  }
  const ipKey = resolveIpKey(requestHeaders);
  const ipCount = (state.perIp && state.perIp[ipKey]) || 0;
  const retryAfter = nextUtcMidnight(now);
  if (state.system >= SYSTEM_LIMIT) {
    return fail(
      'quota_system_exceeded',
      'The daily recipe limit for everyone has been reached. Please try again tomorrow.',
      retryAfter,
    );
  }
  if (ipCount >= PER_IP_LIMIT) {
    return fail('quota_ip_exceeded', 'You have used all 3 recipes for today.', retryAfter);
  }
  state.system += 1;
  state.perIp[ipKey] = ipCount + 1;
  writeQuotaState(state);
  return null;
}

// The schema builders below speak Gemini's responseSchema dialect (an OpenAPI
// 3.0 subset): upper-case type names, `nullable: true` instead of a union with
// "null", and no `additionalProperties`. Fields and value ranges are unchanged
// from the former Anthropic input_schema.

/** One macro nutrient: grams plus its percent share of the energy. */
function buildMacroSchema() {
  return {
    type: 'OBJECT',
    required: ['grams', 'percent'],
    properties: { grams: { type: 'NUMBER' }, percent: { type: 'NUMBER' } },
  };
}

/** One nutrition scope (perPortion or total). */
function buildScopeSchema() {
  return {
    type: 'OBJECT',
    required: ['kcal', 'protein', 'carbs', 'fat'],
    properties: {
      kcal: { type: 'NUMBER' },
      protein: buildMacroSchema(),
      carbs: buildMacroSchema(),
      fat: buildMacroSchema(),
    },
  };
}

/** One ingredient; amount, unit and note stay nullable as in the contract. */
function buildIngredientSchema() {
  return {
    type: 'OBJECT',
    required: ['name', 'amount', 'unit', 'note'],
    properties: {
      name: { type: 'STRING' },
      amount: { type: 'NUMBER', nullable: true },
      unit: { type: 'STRING', nullable: true, enum: UNITS },
      note: { type: 'STRING', nullable: true },
    },
  };
}

/** One cooking step including the parallel-work fields. */
function buildStepSchema() {
  return {
    type: 'OBJECT',
    required: ['order', 'title', 'description', 'assignedChef', 'parallelGroupId'],
    properties: {
      order: { type: 'INTEGER' },
      title: { type: 'STRING' },
      description: { type: 'STRING' },
      assignedChef: { type: 'INTEGER' },
      parallelGroupId: { type: 'INTEGER', nullable: true },
    },
  };
}

/** The scalar half of a recipe: naming, timing and the requested numbers. */
function buildRecipeScalars() {
  return {
    title: { type: 'STRING' },
    cookingTimeMinutes: { type: 'INTEGER' },
    timeCategory: { type: 'STRING', enum: TIME_CATEGORIES },
    cuisine: { type: 'STRING', enum: CUISINES },
    diet: { type: 'STRING', enum: DIETS },
    portions: { type: 'INTEGER' },
    cooks: { type: 'INTEGER' },
  };
}

/** The list half of a recipe: ingredients, steps and both nutrition scopes. */
function buildRecipeLists() {
  return {
    yourIngredients: { type: 'ARRAY', minItems: 1, items: buildIngredientSchema() },
    extraIngredients: { type: 'ARRAY', maxItems: 3, items: buildIngredientSchema() },
    steps: { type: 'ARRAY', minItems: 1, items: buildStepSchema() },
    nutrition: {
      type: 'OBJECT',
      required: ['perPortion', 'total'],
      properties: { perPortion: buildScopeSchema(), total: buildScopeSchema() },
    },
  };
}

/** responseSchema: exactly three recipes as a plain GeneratedRecipe[] array. */
function buildResponseSchema() {
  return {
    type: 'ARRAY',
    minItems: 3,
    maxItems: 3,
    items: {
      type: 'OBJECT',
      required: RECIPE_FIELDS,
      properties: Object.assign(buildRecipeScalars(), buildRecipeLists()),
    },
  };
}

/** Builds the Gemini generateContent request with forced structured output. */
function buildGeminiBody(request) {
  return {
    systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPrompt(request) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema(),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };
}

/** Static instruction block that pins the model to the project rules. */
function buildSystemPrompt() {
  return [
    'You are the recipe engine of "Code a Cuisine". Produce exactly three distinct recipes that match the request.',
    'Hard rules:',
    '- Honour the diet strictly (vegetarian, vegan, keto, or none).',
    '- Use the requested cuisine and set portions and cooks to the requested numbers.',
    '- timeCategory must fit cookingTimeMinutes: quick <= 20, medium 21-45, complex > 45.',
    '- yourIngredients must reuse at least 70% of the ingredients the user provided.',
    '- extraIngredients are basics the user still has to buy: at most three of them.',
    '- When cooks > 1, split the work: assignedChef is between 1 and cooks, and steps that run at the same time share one parallelGroupId (an integer); serial steps use null.',
    '- Fill nutrition for both perPortion and total; each macro carries grams and its percent share of the energy, and total = perPortion * portions.',
    '- Write every title, step and note in English.',
    'Answer with the JSON array of exactly three recipes only — no prose, no code fences.',
  ].join('\n');
}

/** Wraps the concrete request as the user turn. */
function buildUserPrompt(request) {
  return 'Generate three recipes for this request:\n' + JSON.stringify(request, null, 2);
}

// --- main -------------------------------------------------------------------
const corsOrigin = resolveCorsOrigin(headers.origin);
const validationErrors = collectValidationErrors(body);
if (validationErrors.length > 0) {
  return fail(
    'validation_failed',
    'Your recipe request was rejected: ' + validationErrors.join('; ') + '.',
  );
}

const quotaError = reserveQuota(headers);
if (quotaError) return quotaError;

const request = {
  ingredients: body.ingredients,
  portions: body.portions,
  cooks: body.cooks,
  timeCategory: body.timeCategory,
  cuisine: body.cuisine,
  diet: body.diet,
};

return [{ json: { route: 'ok', corsOrigin, request, geminiBody: buildGeminiBody(request) } }];
