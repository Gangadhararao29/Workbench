import { describe, it, expect } from 'vitest';
import { convertCsharpToJson } from './csharp-json-engine';

describe('csharp-json-engine', () => {
  it('converts a simple C# class to JSON with sample values', () => {
    const cs = `
      public class CustomerDto
      {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public decimal Balance { get; set; }
        public Guid TenantId { get; set; }
      }
    `;

    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(0);
    expect(parsed.name).toBe('string');
    expect(parsed.isActive).toBe(true);
    expect(parsed.balance).toBe(0);
    expect(parsed.tenantId).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('handles nullable types and collections', () => {
    const cs = `
      public record OrderDto
      {
        public int? OptionalId { get; init; }
        public List<string> Tags { get; init; }
        public int[] Numbers { get; init; }
      }
    `;

    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.optionalId).toBeNull();
    expect(parsed.tags).toEqual(['string']);
    expect(parsed.numbers).toEqual([0]);
  });

  it('throws when no class or record is found', () => {
    expect(() => convertCsharpToJson('invalid input without class')).toThrow('No C# class or record found.');
  });
});
