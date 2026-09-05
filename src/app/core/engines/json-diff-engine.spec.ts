import { describe, it, expect } from 'vitest';
import { diffJson } from './json-diff-engine';

describe('json-diff-engine', () => {
  it('detects no differences for identical inputs', () => {
    const left = { a: 1, b: 'hello' };
    const right = { a: 1, b: 'hello' };
    const result = diffJson(left, right);
    expect(result.changes).toHaveLength(0);
    expect(result.summary).toBe('No differences found.');
  });

  it('detects added, removed, and changed properties on objects', () => {
    const left = { name: 'Alice', age: 30 };
    const right = { name: 'Alice', age: 31, city: 'London' };
    const result = diffJson(left, right);

    expect(result.changes).toEqual([
      '~ Changed age: 30 -> 31',
      '+ Added city: "London"',
    ]);
  });

  it('compares arrays by key field', () => {
    const left = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    const right = [
      { id: 2, name: 'Robert' },
      { id: 3, name: 'Charlie' },
    ];

    const result = diffJson(left, right, { arrayMode: 'key', arrayKeyField: 'id' });
    expect(result.changes).toContain('+ Added [id=3]: {"id":3,"name":"Charlie"}');
    expect(result.changes).toContain('- Removed [id=1]: {"id":1,"name":"Alice"}');
    expect(result.changes).toContain('~ Changed [id=2].name: "Bob" -> "Robert"');
  });

  it('compares arrays by index', () => {
    const left = [1, 2, 3];
    const right = [1, 9, 3, 4];

    const result = diffJson(left, right, { arrayMode: 'index' });
    expect(result.changes).toContain('~ Changed [1]: 2 -> 9');
    expect(result.changes).toContain('+ Added [3]: 4');
  });
});
