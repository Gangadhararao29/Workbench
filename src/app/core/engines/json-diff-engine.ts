export interface JsonDiffOptions {
  arrayMode?: 'index' | 'key';
  arrayKeyField?: string;
}

export interface JsonDiffResult {
  changes: string[];
  summary: string;
}

/**
 * Pure engine for comparing two JSON values (strings or objects) and reporting differences.
 */
export function diffJson(
  leftSource: string | unknown,
  rightSource: string | unknown,
  options: JsonDiffOptions = {}
): JsonDiffResult {
  const left = typeof leftSource === 'string' ? JSON.parse(leftSource) : leftSource;
  const right = typeof rightSource === 'string' ? JSON.parse(rightSource) : rightSource;

  const arrayMode = options.arrayMode ?? 'key';
  const keyField = options.arrayKeyField?.trim() || 'id';
  const changes: string[] = [];

  diffValue('', left, right, changes, arrayMode, keyField);

  const summary = changes.length > 0 ? changes.join('\n') : 'No differences found.';
  return { changes, summary };
}

function diffValue(
  path: string,
  left: any,
  right: any,
  changes: string[],
  arrayMode: 'index' | 'key',
  arrayKey: string
): void {
  if (JSON.stringify(left) === JSON.stringify(right)) return;

  if (left === undefined) {
    changes.push(`+ Added ${path || 'root'}: ${JSON.stringify(right)}`);
    return;
  }
  if (right === undefined) {
    changes.push(`- Removed ${path || 'root'}: ${JSON.stringify(left)}`);
    return;
  }

  // Handle Arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    if (arrayMode === 'key') {
      const leftMap = new Map<string, any>();
      const leftUnkeyed: Array<{ item: any; index: number }> = [];
      left.forEach((item, idx) => {
        if (item && typeof item === 'object' && !Array.isArray(item) && item[arrayKey] !== undefined) {
          leftMap.set(String(item[arrayKey]), item);
        } else {
          leftUnkeyed.push({ item, index: idx });
        }
      });

      const rightMap = new Map<string, any>();
      const rightUnkeyed: Array<{ item: any; index: number }> = [];
      right.forEach((item, idx) => {
        if (item && typeof item === 'object' && !Array.isArray(item) && item[arrayKey] !== undefined) {
          rightMap.set(String(item[arrayKey]), item);
        } else {
          rightUnkeyed.push({ item, index: idx });
        }
      });

      const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);
      for (const key of allKeys) {
        const leftItem = leftMap.get(key);
        const rightItem = rightMap.get(key);
        const itemPath = path ? `${path}[${arrayKey}=${key}]` : `[${arrayKey}=${key}]`;

        if (leftItem === undefined) {
          changes.push(`+ Added ${itemPath}: ${JSON.stringify(rightItem)}`);
        } else if (rightItem === undefined) {
          changes.push(`- Removed ${itemPath}: ${JSON.stringify(leftItem)}`);
        } else {
          diffValue(itemPath, leftItem, rightItem, changes, arrayMode, arrayKey);
        }
      }

      // Handle unkeyed items
      const maxUnkeyed = Math.max(leftUnkeyed.length, rightUnkeyed.length);
      for (let i = 0; i < maxUnkeyed; i++) {
        const leftU = leftUnkeyed[i]?.item;
        const rightU = rightUnkeyed[i]?.item;
        const itemPath = path ? `${path}[unkeyed_${i}]` : `[unkeyed_${i}]`;
        diffValue(itemPath, leftU, rightU, changes, arrayMode, arrayKey);
      }
      return;
    }

    // Index-based array comparison
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      diffValue(itemPath, left[i], right[i], changes, arrayMode, arrayKey);
    }
    return;
  }

  // Handle plain objects
  if (
    left &&
    right &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    keys.forEach((key) =>
      diffValue(path ? `${path}.${key}` : key, left[key], right[key], changes, arrayMode, arrayKey)
    );
    return;
  }

  // Value changed
  changes.push(`~ Changed ${path || 'root'}: ${JSON.stringify(left)} -> ${JSON.stringify(right)}`);
}
