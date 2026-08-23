import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface KeyValueEntry {
  key: string;
  value: string; // JSON-serialised
}

class WorkbenchDb extends Dexie {
  settings!: Table<KeyValueEntry, string>;
  workspaces!: Table<KeyValueEntry, string>;

  constructor() {
    super('workbench');
    this.version(1).stores({
      settings: 'key',
      workspaces: 'key',
    });
  }
}

const db = new WorkbenchDb();

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Thin key/value store backed by IndexedDB via Dexie.
 *
 * Falls back to `localStorage` synchronously for the `get` convenience method
 * so that callers that cannot await still get a value on first render, while
 * the async methods provide the durable IndexedDB path.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStorage {
  // ---- Async (IndexedDB) --------------------------------------------------

  async getAsync<T>(key: string, fallback: T, table: 'settings' | 'workspaces' = 'settings'): Promise<T> {
    try {
      const entry = await db[table].get(key);
      return entry ? (JSON.parse(entry.value) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  async setAsync<T>(key: string, value: T, table: 'settings' | 'workspaces' = 'settings'): Promise<void> {
    await db[table].put({ key, value: JSON.stringify(value) });
  }

  async deleteAsync(key: string, table: 'settings' | 'workspaces' = 'settings'): Promise<void> {
    await db[table].delete(key);
  }

  async getAllAsync<T>(table: 'settings' | 'workspaces' = 'settings'): Promise<Record<string, T>> {
    const entries = await db[table].toArray();
    return Object.fromEntries(entries.map(e => [e.key, JSON.parse(e.value) as T]));
  }

  // ---- Sync convenience (localStorage — for backward compatibility) --------

  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    // Also persist to IndexedDB in the background
    this.setAsync(key, value).catch(() => void 0);
  }
}
