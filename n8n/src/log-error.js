// Log node of the shared error handler. The Error Trigger hands over the
// failed execution; we write one readable line to the n8n log so an unexpected
// crash stays visible even when the mail server is unreachable. The node also
// hands the single fields down to the Send Email node that follows.

const trigger = $input.first().json;
const execution = trigger.execution || {};
const workflow = trigger.workflow || {};

const failure = {
  workflow: workflow.name || workflow.id || 'unknown',
  node: execution.lastNodeExecuted || 'unknown',
  error: execution.error && execution.error.message ? execution.error.message : 'unknown',
  stack: execution.error && execution.error.stack ? execution.error.stack : '',
  executionId: execution.id || 'unknown',
  executionUrl: execution.url || 'n/a',
  mode: execution.mode || 'unknown',
  failedAt: new Date().toISOString(),
};

const line = [
  '[code-a-cuisine] workflow failed',
  'workflow=' + failure.workflow,
  'node=' + failure.node,
  'error=' + failure.error,
  'url=' + failure.executionUrl,
].join(' | ');

console.error(line);

return [{ json: Object.assign({ logged: true, line }, failure) }];
