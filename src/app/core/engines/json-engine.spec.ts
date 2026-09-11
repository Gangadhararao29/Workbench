import { describe, it, expect } from 'vitest';
import {
  formatJson,
  minifyJson,
  beautifyJson,
  validateJson,
  safeJsonParse,
  sortJsonKeys,
} from './json-engine';

describe('json-engine', () => {
  describe('formatJson', () => {
    it('formats a JSON string with default 2 spaces', () => {
      const input = '{"b":2,"a":1}';
      const output = formatJson(input);
      expect(output).toBe('{\n  "b": 2,\n  "a": 1\n}');
    });

    it('formats with 4 spaces when configured', () => {
      const input = '{"a":1}';
      const output = formatJson(input, { indent: '4 spaces' });
      expect(output).toBe('{\n    "a": 1\n}');
    });

    it('formats an object directly', () => {
      const obj = { name: 'Alice', age: 30 };
      const output = formatJson(obj, { indent: 2 });
      expect(output).toBe('{\n  "name": "Alice",\n  "age": 30\n}');
    });

    it('throws on invalid JSON string', () => {
      expect(() => formatJson('{ bad json }')).toThrow();
    });

    it('throws on empty string', () => {
      expect(() => formatJson('   ')).toThrow('Input is empty.');
    });
  });

  describe('minifyJson', () => {
    it('minifies multiline JSON into a single line', () => {
      const input = `{\n  "name": "Bob",\n  "role": "admin"\n}`;
      const output = minifyJson(input);
      expect(output).toBe('{"name":"Bob","role":"admin"}');
    });

    it('minifies object inputs directly', () => {
      const obj = { x: 1, y: [2, 3] };
      expect(minifyJson(obj)).toBe('{"x":1,"y":[2,3]}');
    });
  });

  describe('beautifyJson', () => {
    it('formats with given indent level', () => {
      const input = '{"key":"val"}';
      expect(beautifyJson(input, 2)).toBe('{\n  "key": "val"\n}');
    });
  });

  describe('validateJson', () => {
    it('succeeds on valid JSON', () => {
      expect(() => validateJson('{"valid":true}')).not.toThrow();
    });

    it('throws on invalid JSON', () => {
      expect(() => validateJson('{invalid}')).toThrow();
    });

    it('throws on empty string', () => {
      expect(() => validateJson('')).toThrow('JSON input is empty.');
    });
  });

  describe('safeJsonParse', () => {
    it('returns valid result with data on success', () => {
      const res = safeJsonParse<{ id: number }>('{"id": 42}');
      expect(res.valid).toBe(true);
      expect(res.data?.id).toBe(42);
    });

    it('returns invalid with error message on failure', () => {
      const res = safeJsonParse('{bad}', { id: 0 });
      expect(res.valid).toBe(false);
      expect(res.data?.id).toBe(0);
      expect(res.error).toBeDefined();
    });
  });

  describe('sortJsonKeys', () => {
    it('recursively sorts keys alphabetically at all levels', () => {
      const input = {
        z: 1,
        a: {
          d: 4,
          c: 3,
        },
        m: [
          { y: 10, x: 20 },
          { b: 2, a: 1 },
        ],
      };

      const sorted = sortJsonKeys(input);
      const keys = Object.keys(sorted);
      expect(keys).toEqual(['a', 'm', 'z']);
      expect(Object.keys(sorted.a)).toEqual(['c', 'd']);
      expect(Object.keys(sorted.m[0])).toEqual(['x', 'y']);
      expect(Object.keys(sorted.m[1])).toEqual(['a', 'b']);
    });

    it('sortKeys option in formatJson produces sorted formatted output', () => {
      const input = '{"z": 10, "a": {"b": 2, "a": 1}}';
      const output = formatJson(input, { sortKeys: true, indent: 2 });
      expect(output).toBe('{\n  "a": {\n    "a": 1,\n    "b": 2\n  },\n  "z": 10\n}');
    });
  });
});
