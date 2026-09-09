import { describe, it, expect } from 'vitest';
import {
  evaluateJsonPath,
  evaluateJsonPathDetailed,
  segmentsToJsonPath,
  getJsonPathAtOffset,
} from './json-path-engine';

describe('json-path-engine', () => {
  const sampleJson = JSON.stringify(
    {
      store: {
        book: [
          { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
          { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
          { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', price: 8.99 },
        ],
      },
    },
    null,
    2
  );

  it('evaluates basic single property access', () => {
    const result = evaluateJsonPath(sampleJson, '$.store.book[0].author');
    expect(result).toBe('"Nigel Rees"');
  });

  it('evaluates wildcard array queries', () => {
    const result = evaluateJsonPath(sampleJson, '$.store.book[*].author');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(['Nigel Rees', 'Evelyn Waugh', 'Herman Melville']);
  });

  it('evaluates recursive descent ($..)', () => {
    const result = evaluateJsonPath(sampleJson, '$..author');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(['Nigel Rees', 'Evelyn Waugh', 'Herman Melville']);
  });

  it('evaluates filter expressions', () => {
    const result = evaluateJsonPath(sampleJson, '$.store.book[?(@.price < 10)].title');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(['Sayings of the Century', 'Moby Dick']);
  });

  it('supports path mode returning normalized JSONPaths', () => {
    const result = evaluateJsonPath(sampleJson, '$.store.book[*].category', { resultType: 'path' });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([
      "$['store']['book'][0]['category']",
      "$['store']['book'][1]['category']",
      "$['store']['book'][2]['category']",
    ]);
  });

  it('supports pointer mode returning RFC 6901 pointers', () => {
    const result = evaluateJsonPath(sampleJson, '$.store.book[0].title', { resultType: 'pointer' });
    expect(result).toBe('"/store/book/0/title"');
  });

  it('returns friendly message on empty result', () => {
    const result = evaluateJsonPath(sampleJson, '$.store.nonexistent');
    expect(result).toBe('No match found.');
  });

  it('handles invalid JSON gracefully', () => {
    expect(() => evaluateJsonPath('{ invalid json }', '$.a')).toThrow('Invalid JSON source');
  });

  it('reports match count in evaluateJsonPathDetailed', () => {
    const detailed = evaluateJsonPathDetailed(sampleJson, '$..price');
    expect(detailed.count).toBe(3);
    expect(detailed.results).toEqual([8.95, 12.99, 8.99]);
  });

  describe('segmentsToJsonPath', () => {
    it('formats empty segments as root $', () => {
      expect(segmentsToJsonPath([])).toBe('$');
    });

    it('formats alphanumeric keys with dot notation', () => {
      expect(segmentsToJsonPath(['store', 'book', 'author'])).toBe('$.store.book.author');
    });

    it('formats numeric indices with brackets', () => {
      expect(segmentsToJsonPath(['users', 0, 'name'])).toBe('$.users[0].name');
    });

    it('formats keys with special characters or spaces with brackets', () => {
      expect(segmentsToJsonPath(['order-items', 'first name'])).toBe("$['order-items']['first name']");
    });
  });

  describe('getJsonPathAtOffset', () => {
    it('detects correct path at cursor character offset', () => {
      const json = JSON.stringify({
        users: [
          { name: 'Ada', age: 36 },
          { name: 'Grace', age: 85 },
        ],
      }, null, 2);

      const adaOffset = json.indexOf('Ada');
      expect(getJsonPathAtOffset(json, adaOffset)).toBe('$.users[0].name');

      const graceAgeOffset = json.indexOf('85');
      expect(getJsonPathAtOffset(json, graceAgeOffset)).toBe('$.users[1].age');
    });
  });
});
