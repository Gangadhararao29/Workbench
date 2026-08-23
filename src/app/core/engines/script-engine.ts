const RESULT_SOURCE = 'workbench-script-result';
const DEFAULT_TIMEOUT_MS = 5000;
const PARENT_ORIGIN = window.location.origin;

export function runScript(
  script: string,
  inputs: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const frame = document.createElement('iframe');
    const timeout = window.setTimeout(() => finish(new Error('Script timed out.')), timeoutMs);

    const finish = (error?: Error, value?: unknown) => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      frame.remove();
      error ? reject(error) : resolve(value);
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== frame.contentWindow ||
        event.data?.source !== RESULT_SOURCE ||
        event.data.id !== id
      )
        return;
      event.data.error ? finish(new Error(event.data.error)) : finish(undefined, event.data.value);
    };

    window.addEventListener('message', handleMessage);

    // Attach load listener BEFORE appending to DOM to avoid race condition with synchronous srcdoc loads
    frame.addEventListener(
      'load',
      () => {
        // Use '*' as targetOrigin because sandboxed iframes without 'allow-same-origin' have origin 'null'
        frame.contentWindow?.postMessage({ id, script, inputs }, '*');
      },
      { once: true },
    );

    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.display = 'none';
    frame.srcdoc = `<!doctype html><script>
      window.addEventListener('message', function (event) {
        if (event.origin !== '${PARENT_ORIGIN}' || event.source !== parent) return;
        try {
          var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          var execute = new AsyncFunction('inputs', '"use strict";\\n' + event.data.script);
          Promise.resolve(execute(event.data.inputs))
            .then(function (value) {
              try {
                parent.postMessage({ source: '${RESULT_SOURCE}', id: event.data.id, value: value }, '${PARENT_ORIGIN}');
              } catch (cloneError) {
                parent.postMessage({ source: '${RESULT_SOURCE}', id: event.data.id, error: 'Result could not be cloned: ' + String(cloneError.message || cloneError) }, '${PARENT_ORIGIN}');
              }
            })
            .catch(function (error) {
              parent.postMessage({ source: '${RESULT_SOURCE}', id: event.data.id, error: String(error && error.message || error) }, '${PARENT_ORIGIN}');
            });
        } catch (error) {
          parent.postMessage({ source: '${RESULT_SOURCE}', id: event.data.id, error: String(error && error.message || error) }, '${PARENT_ORIGIN}');
        }
      });
    <\/script>`;

    document.body.appendChild(frame);
  });
}
