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
 * IndexedDB-backed persistence layer.
 *
 * Legacy localStorage state is intentionally ignored. This app starts fresh on
 * deployment and keeps IndexedDB as the only persistent source.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStorage {
  private memoryStore = new Map<string, string>();

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

  get<T>(key: string, fallback: T): T {
    const mem = this.memoryStore.get(key);
    return mem === undefined ? fallback : (JSON.parse(mem) as T);
  }

  set<T>(key: string, value: T, table: 'settings' | 'workspaces' = 'settings'): void {
    const serialized = JSON.stringify(value);
    this.memoryStore.set(key, serialized);
    this.setAsync(key, value, table).catch(() => void 0);
  }
}
