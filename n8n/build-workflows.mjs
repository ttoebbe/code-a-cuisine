// Builds the two importable n8n workflow JSON files from the Code-node scripts
// in n8n/src/. Run with `node n8n/build-workflows.mjs`. Keeping the node code
// in real .js files avoids hand-escaping multi-line scripts inside JSON.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Normalises CRLF away so the generated JSON is identical on every platform.
const read = (name) => readFileSync(join(here, 'src', name), 'utf8').replace(/\r\n/g, '\n');

const WEBHOOK = 'Receive recipe request';
const ERROR_WORKFLOW_ID = 'codeacuisine-error-handler';
const MAIN_WORKFLOW_ID = 'codeacuisine-generate-recipe';

// LLM endpoint. The model sits in the URL (not in the body) on the Gemini API.
const LLM_NODE = 'Generate recipes (Gemini)';
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
// Header-auth credential holding x-goog-api-key, created by hand in the n8n UI.
const GEMINI_CREDENTIAL = {
  id: 'jzEzCDSaQv6klLvF',
  name: 'Google Gemini API key (x-goog-api-key)',
};

// Failure notification. The SMTP credential is only referenced here; host,
// user and password are typed into the n8n UI and never live in this repo.
// Sending runs over Gmail, so the sender must be the authenticated Gmail
// account; the alerts themselves land in the regular Outlook mailbox.
const ALERT_SENDER = 'toebbe.thomas@googlemail.com';
const ALERT_MAILBOX = 'toebbe.thomas@outlook.de';
const SMTP_CREDENTIAL = {
  id: 'ds4bY5C06AWQroWz',
  name: 'Code a Cuisine SMTP (error mails)',
};

// Plain-text body of the alert. The fields come from log-error.js, which runs
// right before and flattens the Error Trigger payload.
const ALERT_MAIL_BODY = [
  '={{ "A workflow of Code a Cuisine stopped with an unhandled error.\\n\\n"',
  '+ "Workflow:     " + $json.workflow + "\\n"',
  '+ "Failed node:  " + $json.node + "\\n"',
  '+ "Error:        " + $json.error + "\\n"',
  '+ "Execution:    " + $json.executionId + " (" + $json.mode + ")\\n"',
  '+ "Time (UTC):   " + $json.failedAt + "\\n"',
  '+ "Open in n8n:  " + $json.executionUrl + "\\n\\n"',
  '+ "Stack trace:\\n" + ($json.stack || "not reported") }}',
].join('\n  ');

// Reflects the caller origin when allow-listed, else falls back to :4200.
const CORS_ORIGIN =
  "={{ ['http://localhost:4200','http://localhost:4300']" +
  `.includes($('${WEBHOOK}').item.json.headers.origin) ? ` +
  `$('${WEBHOOK}').item.json.headers.origin : 'http://localhost:4200' }}`;

const corsHeaders = () => ({
  entries: [
    { name: 'Access-Control-Allow-Origin', value: CORS_ORIGIN },
    { name: 'Vary', value: 'Origin' },
  ],
});

const routeIsOk = () => ({
  options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
  conditions: [
    {
      id: 'route-ok',
      leftValue: '={{ $json.route }}',
      rightValue: 'ok',
      operator: { type: 'string', operation: 'equals' },
    },
  ],
  combinator: 'and',
});

const node = (name, type, typeVersion, position, parameters, extra = {}) => ({
  parameters,
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  type,
  typeVersion,
  position,
  ...extra,
});

// --- main workflow ----------------------------------------------------------
const mainNodes = [
  node(
    WEBHOOK,
    'n8n-nodes-base.webhook',
    2,
    [-140, 300],
    {
      httpMethod: 'POST',
      path: 'generate-recipe',
      responseMode: 'responseNode',
      options: { allowedOrigins: 'http://localhost:4200,http://localhost:4300' },
    },
    {
      webhookId: 'generate-recipe',
      notes:
        'POST /webhook/generate-recipe. allowedOrigins answers the CORS preflight for the two dev origins. TODO(prod): add the deployed origin.',
    },
  ),
  node(
    'Validate & rate limit',
    'n8n-nodes-base.code',
    2,
    [80, 300],
    { jsCode: read('guard.js') },
    {
      notes:
        'Server-side validation (independent of the frontend) and the daily cost cap: 3 recipes/IP, 12 system-wide. Reserves a slot before the LLM call.',
    },
  ),
  node(
    'Passed the guard?',
    'n8n-nodes-base.if',
    2.2,
    [300, 300],
    { conditions: routeIsOk(), options: {} },
    {
      notes: 'route=ok continues to the model; route=error goes straight to the error response.',
    },
  ),
  node(
    LLM_NODE,
    'n8n-nodes-base.httpRequest',
    4.2,
    [540, 200],
    {
      method: 'POST',
      url: GEMINI_URL,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ $json.geminiBody }}',
      options: { timeout: 80000, response: { response: { neverError: true } } },
    },
    {
      credentials: { httpHeaderAuth: GEMINI_CREDENTIAL },
      notes:
        'Gemini generateContent with responseMimeType application/json plus a responseSchema for schema-valid output. neverError keeps a non-2xx answer from failing the run so the daily quota still persists; the map node turns any unusable body into ai_failed.',
    },
  ),
  node(
    'Map AI answer to recipes',
    'n8n-nodes-base.code',
    2,
    [760, 200],
    { jsCode: read('map-ai.js') },
    {
      notes:
        'Sanitises the model output into GeneratedRecipe[]; unusable output becomes an ai_failed envelope.',
    },
  ),
  node(
    'Recipes usable?',
    'n8n-nodes-base.if',
    2.2,
    [980, 200],
    { conditions: routeIsOk(), options: {} },
    {
      notes: 'route=ok returns the recipes; route=error returns the ai_failed envelope.',
    },
  ),
  node(
    'Respond: recipes',
    'n8n-nodes-base.respondToWebhook',
    1.1,
    [1220, 120],
    {
      respondWith: 'json',
      responseBody: "={{ { status: 'ok', recipes: $json.recipes } }}",
      options: { responseCode: 200, responseHeaders: corsHeaders() },
    },
    { notes: 'Success envelope (status ok, three recipes) with CORS header.' },
  ),
  node(
    'Respond: error',
    'n8n-nodes-base.respondToWebhook',
    1.1,
    [1220, 380],
    {
      respondWith: 'json',
      responseBody: '={{ $json.__error }}',
      options: { responseCode: 200, responseHeaders: corsHeaders() },
    },
    {
      notes:
        'Error envelope from the JSON contract. HTTP 200 on purpose: the frontend reads the envelope from any status.',
    },
  ),
];

const mainConnections = {
  [WEBHOOK]: { main: [[{ node: 'Validate & rate limit', type: 'main', index: 0 }]] },
  'Validate & rate limit': { main: [[{ node: 'Passed the guard?', type: 'main', index: 0 }]] },
  'Passed the guard?': {
    main: [
      [{ node: LLM_NODE, type: 'main', index: 0 }],
      [{ node: 'Respond: error', type: 'main', index: 0 }],
    ],
  },
  [LLM_NODE]: {
    main: [[{ node: 'Map AI answer to recipes', type: 'main', index: 0 }]],
  },
  'Map AI answer to recipes': { main: [[{ node: 'Recipes usable?', type: 'main', index: 0 }]] },
  'Recipes usable?': {
    main: [
      [{ node: 'Respond: recipes', type: 'main', index: 0 }],
      [{ node: 'Respond: error', type: 'main', index: 0 }],
    ],
  },
};

const mainWorkflow = {
  id: MAIN_WORKFLOW_ID,
  name: 'Code a Cuisine — Generate Recipe',
  active: false,
  nodes: mainNodes,
  connections: mainConnections,
  settings: { executionOrder: 'v1', errorWorkflow: ERROR_WORKFLOW_ID },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
  tags: [],
};

// --- error handler workflow -------------------------------------------------
const errorNodes = [
  node(
    'On workflow error',
    'n8n-nodes-base.errorTrigger',
    1,
    [0, 0],
    {},
    {
      notes: 'Fires when the recipe workflow throws an unhandled error.',
    },
  ),
  node(
    'Log the failure',
    'n8n-nodes-base.code',
    2,
    [240, 0],
    { jsCode: read('log-error.js') },
    {
      notes:
        'Writes one readable line to the n8n log and hands the single fields to the mail node.',
    },
  ),
  node(
    'Email the failure',
    'n8n-nodes-base.emailSend',
    2.1,
    [480, 0],
    {
      fromEmail: ALERT_SENDER,
      toEmail: ALERT_MAILBOX,
      subject: '={{ "[Code a Cuisine] " + $json.workflow + " failed: " + $json.error }}',
      emailFormat: 'text',
      text: ALERT_MAIL_BODY,
      options: {},
    },
    {
      credentials: { smtp: SMTP_CREDENTIAL },
      notes:
        'Sends the failure to the maintainer. The SMTP credential is filled in by hand in the n8n UI; no access data lives in the repo. The log line above stays as the fallback when the mail server is unreachable.',
      onError: 'continueRegularOutput',
    },
  ),
];

const errorWorkflow = {
  id: ERROR_WORKFLOW_ID,
  name: 'Code a Cuisine — Error Handler',
  active: false,
  nodes: errorNodes,
  connections: {
    'On workflow error': { main: [[{ node: 'Log the failure', type: 'main', index: 0 }]] },
    'Log the failure': { main: [[{ node: 'Email the failure', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
  pinData: {},
  tags: [],
};

writeFileSync(
  join(here, 'generate-recipe.workflow.json'),
  JSON.stringify(mainWorkflow, null, 2) + '\n',
);
writeFileSync(
  join(here, 'error-handler.workflow.json'),
  JSON.stringify(errorWorkflow, null, 2) + '\n',
);
console.log('Wrote generate-recipe.workflow.json and error-handler.workflow.json');
