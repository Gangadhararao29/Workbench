// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { runScript } from './script-engine';

describe('script-engine', () => {
  it('should export runScript function', () => {
    expect(typeof runScript).toBe('function');
  });

  it('should reject with timeout when iframe does not respond within timeoutMs', async () => {
    await expect(
      runScript('return 1 + 1;', {}, 50),
    ).rejects.toThrow('Script timed out.');
  });

  it('should resolve with value and logs when iframe posts back a successful result', async () => {
    const runPromise = runScript('console.log("hello"); return 42;', { a: 1 }, 1000);

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    // Intercept postMessage to get the execution ID
    let executionId = '';
    const contentWindow = iframe.contentWindow;
    if (contentWindow) {
      vi.spyOn(contentWindow, 'postMessage').mockImplementation((data: any) => {
        if (data && data.id) {
          executionId = data.id;
        }
      });
    }

    // Trigger iframe load
    iframe.dispatchEvent(new Event('load'));

    // Simulate iframe message back to window
    window.dispatchEvent(
      new MessageEvent('message', {
        source: iframe.contentWindow,
        data: {
          source: 'workbench-script-result',
          id: executionId,
          value: 42,
          logs: ['hello'],
          isUndefined: false,
        },
      }),
    );

    const result = await runPromise;
    expect(result.value).toBe(42);
    expect(result.logs).toEqual(['hello']);
    expect(result.isUndefined).toBe(false);

    // Verify iframe is cleaned up from DOM
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('should reject with error and attach logs when script execution throws in iframe', async () => {
    const runPromise = runScript('throw new Error("Boom");', {}, 1000);
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    let executionId = '';
    if (iframe.contentWindow) {
      vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation((data: any) => {
        if (data && data.id) {
          executionId = data.id;
        }
      });
    }

    iframe.dispatchEvent(new Event('load'));

    window.dispatchEvent(
      new MessageEvent('message', {
        source: iframe.contentWindow,
        data: {
          source: 'workbench-script-result',
          id: executionId,
          error: 'Error: Boom',
          logs: ['[ERROR] Boom'],
        },
      }),
    );

    await expect(runPromise).rejects.toThrow('Error: Boom');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('should handle undefined return values with isUndefined flag', async () => {
    const runPromise = runScript('console.log("no return");', {}, 1000);
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    let executionId = '';
    if (iframe.contentWindow) {
      vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation((data: any) => {
        if (data && data.id) {
          executionId = data.id;
        }
      });
    }

    iframe.dispatchEvent(new Event('load'));

    window.dispatchEvent(
      new MessageEvent('message', {
        source: iframe.contentWindow,
        data: {
          source: 'workbench-script-result',
          id: executionId,
          value: undefined,
          logs: ['no return'],
          isUndefined: true,
        },
      }),
    );

    const result = await runPromise;
    expect(result.value).toBeUndefined();
    expect(result.isUndefined).toBe(true);
    expect(result.logs).toEqual(['no return']);
  });
});
