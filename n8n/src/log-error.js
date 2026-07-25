// Log node of the shared error handler. The Error Trigger hands over the
// failed execution; we write one readable line to the n8n log so an unexpected
// crash in the recipe workflow is visible without a mail server. Swap this for
// an email/Slack node once a channel is available (see n8n/README.md).

const trigger = $input.first().json;
const execution = trigger.execution || {};
const workflow = trigger.workflow || {};

const line = [
  '[code-a-cuisine] workflow failed',
  'workflow=' + (workflow.name || workflow.id || 'unknown'),
  'node=' + (execution.lastNodeExecuted || 'unknown'),
  'error=' + (execution.error && execution.error.message ? execution.error.message : 'unknown'),
  'url=' + (execution.url || 'n/a'),
].join(' | ');

console.error(line);

return [{ json: { logged: true, line } }];
