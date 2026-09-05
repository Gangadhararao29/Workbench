// Global test setup for Vitest / JSDOM environment

if (typeof document !== 'undefined' && typeof document.queryCommandSupported !== 'function') {
  document.queryCommandSupported = () => false;
}

class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  if (typeof (window as any).CSS === 'undefined') {
    (window as any).CSS = {};
  }
  if (typeof (window as any).CSS.escape !== 'function') {
    (window as any).CSS.escape = (s: string) => s;
  }
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as any);
  }
  if (typeof (window as any).ResizeObserver === 'undefined') {
    (window as any).ResizeObserver = MockObserver;
  }
  if (typeof (window as any).IntersectionObserver === 'undefined') {
    (window as any).IntersectionObserver = MockObserver;
  }
}

if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).CSS === 'undefined') {
    (globalThis as any).CSS = {};
  }
  if (typeof (globalThis as any).CSS.escape !== 'function') {
    (globalThis as any).CSS.escape = (s: string) => s;
  }
  if (typeof (globalThis as any).matchMedia !== 'function') {
    (globalThis as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as any);
  }
  if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = MockObserver;
  }
  if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
    (globalThis as any).IntersectionObserver = MockObserver;
  }
}

const createMockStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
};

try {
  if (typeof window !== 'undefined' && (!window.localStorage || typeof window.localStorage.getItem !== 'function')) {
    const mock = createMockStorage();
    Object.defineProperty(window, 'localStorage', { value: mock, configurable: true, writable: true });
  }
} catch {
  // ignore
}

try {
  if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage?.getItem !== 'function') {
    const mock = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: mock, configurable: true, writable: true });
  }
} catch {
  // ignore
}

const proc = (globalThis as any).process;
if (proc && typeof proc.on === 'function') {
  proc.on('unhandledRejection', (reason: any) => {
    if (reason && typeof reason.message === 'string' && reason.message.includes('Missing requestHandler or method')) {
      return;
    }
  });
}
