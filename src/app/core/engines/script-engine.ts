const RESULT_SOURCE = 'workbench-script-result';
const DEFAULT_TIMEOUT_MS = 3000;

export function runScript(script: string, inputs: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
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
      if (event.source !== frame.contentWindow || event.data?.source !== RESULT_SOURCE || event.data.id !== id) return;
      event.data.error ? finish(new Error(event.data.error)) : finish(undefined, event.data.value);
    };

    window.addEventListener('message', handleMessage);
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.display = 'none';
    frame.srcdoc = `<!doctype html><script>
      window.addEventListener('message', function (event) {
        if (event.source !== parent) return;
        try {
          var execute = new Function('inputs', '\"use strict\";\\n' + event.data.script);
          var value = execute(event.data.inputs);
          parent.postMessage({ source: '${RESULT_SOURCE}', id: event.data.id, value: value }, '*');
        } catch (error) {
          parent.postMessage({ source: '${RESULT_SOURCE}', id: event.data.id, error: String(error && error.message || error) }, '*');
        }
      });
    <\/script>`;
    document.body.appendChild(frame);
    frame.addEventListener('load', () => frame.contentWindow?.postMessage({ id, script, inputs }, '*'), { once: true });
  });
}
