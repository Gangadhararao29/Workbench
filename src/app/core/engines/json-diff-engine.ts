import * as jsondiffpatch from 'jsondiffpatch';
import type { Delta } from 'jsondiffpatch';

export interface JsonDiffOptions {
  arrayMode?: 'index' | 'key';
  arrayKeyField?: string;
}

export interface JsonDiffResult {
  changes: string[];
  summary: string;
  delta?: Delta;
  formattedDelta: string;
  changeCount: number;
}

const COMMON_KEY_FIELDS = ['id', '_id', 'key', 'name', 'code', 'uuid', 'guid', 'slug'];

function findItemKey(item: any, preferredKey?: string): { keyName: string; keyValue: string } | undefined {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined;
  if (preferredKey && item[preferredKey] !== undefined && item[preferredKey] !== null) {
    return { keyName: preferredKey, keyValue: String(item[preferredKey]) };
  }
  for (const field of COMMON_KEY_FIELDS) {
    if (item[field] !== undefined && item[field] !== null) {
      return { keyName: field, keyValue: String(item[field]) };
    }
  }
  return undefined;
}

/**
 * Compare two JSON values using jsondiffpatch and produce semantic delta,
 * formatted delta, and structured human-readable change lines.
 */
export function diffJson(
  leftSource: string | unknown,
  rightSource: string | unknown,
  options: JsonDiffOptions = {}
): JsonDiffResult {
  const left = typeof leftSource === 'string' ? JSON.parse(leftSource) : leftSource;
  const right = typeof rightSource === 'string' ? JSON.parse(rightSource) : rightSource;

  const arrayMode = options.arrayMode ?? 'key';
  const preferredKey = options.arrayKeyField?.trim();

  const patcher =
    arrayMode === 'key'
      ? jsondiffpatch.create({
          objectHash: (item: any) => {
            const match = findItemKey(item, preferredKey);
            return match ? `${match.keyName}:${match.keyValue}` : undefined;
          },
        })
      : jsondiffpatch.create({
          matchByPosition: true,
        });

  const delta = patcher.diff(left, right);

  if (!delta) {
    return {
      changes: [],
      summary: 'No differences found.',
      delta: undefined,
      formattedDelta: '{\n  "status": "identical"\n}',
      changeCount: 0,
    };
  }

  const changes = deltaToChanges(delta, '', left, right, arrayMode, preferredKey);
  const summary = changes.length > 0 ? changes.join('\n') : 'No differences found. JSON documents are identical.';
  const formattedDelta = JSON.stringify(delta, null, 2);

  return {
    changes,
    summary,
    delta,
    formattedDelta,
    changeCount: changes.length,
  };
}

/**
 * Normalizes JSON by recursively sorting all object keys and indenting with 2 spaces.
 * Useful for visual diffing where key order differences should not cause false text diffs.
 */
export function sortAndFormatJson(source: string | unknown): string {
  if (typeof source === 'string' && !source.trim()) return '';
  const parsed = typeof source === 'string' ? JSON.parse(source) : source;
  return JSON.stringify(sortKeys(parsed), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sortedObj[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sortedObj;
  }
  return value;
}

function deltaToChanges(
  delta: Delta | unknown,
  path: string,
  left: any,
  right: any,
  arrayMode: 'index' | 'key',
  preferredKey?: string
): string[] {
  const changes: string[] = [];
  if (!delta || typeof delta !== 'object') return changes;

  // Handle value-level deltas (arrays of 1, 2, or 3 elements)
  if (Array.isArray(delta)) {
    if (delta.length === 1) {
      changes.push(`+ Added ${path || 'root'}: ${JSON.stringify(delta[0])}`);
    } else if (delta.length === 2) {
      changes.push(`~ Changed ${path || 'root'}: ${JSON.stringify(delta[0])} -> ${JSON.stringify(delta[1])}`);
    } else if (delta.length === 3 && delta[1] === 0 && delta[2] === 0) {
      changes.push(`- Removed ${path || 'root'}: ${JSON.stringify(delta[0])}`);
    } else if (delta.length === 3 && delta[2] === 3) {
      changes.push(`⇄ Moved ${path || 'root'} from index ${delta[1]}`);
    }
    return changes;
  }

  const objDelta = delta as Record<string, any>;

  // Handle Array Delta (_t === 'a')
  if (objDelta['_t'] === 'a') {
    const removedKeys = new Map<string, any>();
    const addedKeys = new Map<string, any>();
    const modifiedKeys = new Map<string, any>();

    for (const key of Object.keys(objDelta)) {
      if (key === '_t') continue;
      const val = objDelta[key];
      if (key.startsWith('_')) {
        removedKeys.set(key.slice(1), val);
      } else if (Array.isArray(val) && val.length === 1) {
        addedKeys.set(key, val);
      } else {
        modifiedKeys.set(key, val);
      }
    }

    // In position matching or replacement, an index present in both removed and added represents a modification
    if (arrayMode === 'index') {
      const allIndices = new Set([...removedKeys.keys(), ...addedKeys.keys()]);
      for (const idx of allIndices) {
        if (removedKeys.has(idx) && addedKeys.has(idx)) {
          const oldVal = removedKeys.get(idx)[0];
          const newVal = addedKeys.get(idx)[0];
          const itemPath = path ? `${path}[${idx}]` : `[${idx}]`;
          changes.push(`~ Changed ${itemPath}: ${JSON.stringify(oldVal)} -> ${JSON.stringify(newVal)}`);
          removedKeys.delete(idx);
          addedKeys.delete(idx);
        }
      }
    }

    // Remaining removed items
    for (const [idx, val] of removedKeys.entries()) {
      if (Array.isArray(val) && val.length === 3 && val[2] === 0) {
        const itemVal = val[0];
        const keyInfo = arrayMode === 'key' ? findItemKey(itemVal, preferredKey) : undefined;
        const label = keyInfo ? `[${keyInfo.keyName}=${keyInfo.keyValue}]` : `[${idx}]`;
        const itemPath = path ? `${path}${label}` : label;
        changes.push(`- Removed ${itemPath}: ${JSON.stringify(itemVal)}`);
      } else if (Array.isArray(val) && val.length === 3 && val[2] === 3) {
        const itemPath = path ? `${path}[${idx}]` : `[${idx}]`;
        changes.push(`⇄ Moved ${itemPath} to index ${val[1]}`);
      }
    }

    // Remaining added items
    for (const [idx, val] of addedKeys.entries()) {
      const itemVal = val[0];
      const keyInfo = arrayMode === 'key' ? findItemKey(itemVal, preferredKey) : undefined;
      const label = keyInfo ? `[${keyInfo.keyName}=${keyInfo.keyValue}]` : `[${idx}]`;
      const itemPath = path ? `${path}${label}` : label;
      changes.push(`+ Added ${itemPath}: ${JSON.stringify(itemVal)}`);
    }

    // Modified array items
    for (const [idx, val] of modifiedKeys.entries()) {
      const numIdx = parseInt(idx, 10);
      const rightItem = Array.isArray(right) ? right[numIdx] : undefined;
      const leftItem = Array.isArray(left) ? left[numIdx] : undefined;
      const keyInfo = arrayMode === 'key' ? findItemKey(rightItem ?? leftItem, preferredKey) : undefined;
      const label = keyInfo ? `[${keyInfo.keyName}=${keyInfo.keyValue}]` : `[${idx}]`;
      const itemPath = path ? `${path}${label}` : label;
      changes.push(...deltaToChanges(val, itemPath, leftItem, rightItem, arrayMode, preferredKey));
    }

    return changes;
  }

  // Handle Object Delta
  for (const [key, val] of Object.entries(objDelta)) {
    const keyPath = path ? `${path}.${key}` : key;
    const nextLeft = left && typeof left === 'object' ? left[key] : undefined;
    const nextRight = right && typeof right === 'object' ? right[key] : undefined;
    changes.push(...deltaToChanges(val, keyPath, nextLeft, nextRight, arrayMode, preferredKey));
  }

  return changes;
}
