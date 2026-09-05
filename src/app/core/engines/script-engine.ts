const RESULT_SOURCE = 'workbench-script-result';
const DEFAULT_TIMEOUT_MS = 5000;
const PARENT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

export interface ScriptRunOutput {
  value: unknown;
  logs: string[];
  isUndefined: boolean;
}

export interface ScriptRunOptions {
  inputs?: unknown;
  rawInputs?: string;
  isObjectInput?: boolean;
  timeoutMs?: number;
}

export function runScript(
  script: string,
  inputsOrOptions?: unknown,
  fallbackTimeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ScriptRunOutput> {
  return new Promise((resolve, reject) => {
    let options: ScriptRunOptions;
    if (
      inputsOrOptions &&
      typeof inputsOrOptions === 'object' &&
      ('rawInputs' in inputsOrOptions || 'isObjectInput' in inputsOrOptions)
    ) {
      options = inputsOrOptions as ScriptRunOptions;
    } else {
      options = { inputs: inputsOrOptions };
    }

    const timeoutMs = options.timeoutMs ?? fallbackTimeoutMs;
    const id = crypto.randomUUID();
    const frame = document.createElement('iframe');
    const timeout = window.setTimeout(() => finish(new Error('Script timed out.')), timeoutMs);

    const finish = (error?: Error, result?: ScriptRunOutput) => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      frame.remove();
      error ? reject(error) : resolve(result!);
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== frame.contentWindow ||
        event.data?.source !== RESULT_SOURCE ||
        event.data.id !== id
      ) {
        return;
      }
      if (event.data.error) {
        const err = new Error(event.data.error);
        (err as unknown as { logs: string[] }).logs = event.data.logs || [];
        finish(err);
      } else {
        finish(undefined, {
          value: event.data.value,
          logs: event.data.logs || [],
          isUndefined: Boolean(event.data.isUndefined),
        });
      }
    };

    window.addEventListener('message', handleMessage);

    frame.addEventListener(
      'load',
      () => {
        // Use '*' because sandboxed iframes without 'allow-same-origin' have an opaque origin ('null')
        frame.contentWindow?.postMessage(
          {
            id,
            script,
            inputs: options.inputs,
            rawInputs: options.rawInputs,
            isObjectInput: Boolean(options.isObjectInput),
          },
          '*',
        );
      },
      { once: true },
    );

    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.display = 'none';

    frame.srcdoc = `<!doctype html><script>
      window.addEventListener('message', function (event) {
        if (event.source !== parent) return;
        var parentOrigin = '${PARENT_ORIGIN}';
        if (parentOrigin && parentOrigin !== 'null' && event.origin !== parentOrigin) return;

        var logs = [];
        function formatArg(arg) {
          if (arg === undefined) return 'undefined';
          if (arg === null) return 'null';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }

        function capture(prefix, args) {
          var line = Array.prototype.slice.call(args).map(formatArg).join(' ');
          logs.push(prefix ? '[' + prefix + '] ' + line : line);
        }

        var origLog = console.log;
        var origInfo = console.info;
        var origWarn = console.warn;
        var origError = console.error;

        console.log = function () { capture('', arguments); origLog && origLog.apply(console, arguments); };
        console.info = function () { capture('INFO', arguments); origInfo && origInfo.apply(console, arguments); };
        console.warn = function () { capture('WARN', arguments); origWarn && origWarn.apply(console, arguments); };
        console.error = function () { capture('ERROR', arguments); origError && origError.apply(console, arguments); };

        var targetOrigin = (parentOrigin && parentOrigin !== 'null') ? parentOrigin : '*';

        function sendResponse(payload) {
          payload.source = '${RESULT_SOURCE}';
          payload.id = event.data.id;
          payload.logs = logs;
          try {
            parent.postMessage(payload, targetOrigin);
          } catch (cloneErr) {
            parent.postMessage({
              source: '${RESULT_SOURCE}',
              id: event.data.id,
              logs: logs,
              error: 'Result could not be cloned: ' + String(cloneErr && cloneErr.message || cloneErr)
            }, targetOrigin);
          }
        }

        try {
          var inputs = event.data.inputs;
          if (event.data.isObjectInput && typeof event.data.rawInputs === 'string') {
            var cleanInputs = event.data.rawInputs.trim();
            if (cleanInputs) {
              // Evaluated strictly inside the isolated sandbox with null origin
              var parseInputsFn = new Function('"use strict";\\nreturn (' + cleanInputs + ');');
              inputs = parseInputsFn();
            } else {
              inputs = {};
            }
          }

          var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          var execute = new AsyncFunction('inputs', '"use strict";\\n' + event.data.script);
          Promise.resolve(execute(inputs))
            .then(function (value) {
              sendResponse({ value: value, isUndefined: value === undefined });
            })
            .catch(function (error) {
              sendResponse({ error: String(error && error.message || error) });
            });
        } catch (error) {
          sendResponse({ error: String(error && error.message || error) });
        }
      });
    <\/script>`;

    document.body.appendChild(frame);
  });
}
