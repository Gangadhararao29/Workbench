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

  it('supports positional records', () => {
    const cs = 'public record UserDto(int Id, string Name, bool? IsAdmin);';
    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(0);
    expect(parsed.name).toBe('string');
    expect(parsed.isAdmin).toBeNull();
  });

  it('respects JsonPropertyName and JsonProperty attributes', () => {
    const cs = `
      public class User
      {
        [JsonPropertyName("user_id")]
        public int Id { get; set; }
        [JsonProperty("full_name")]
        public string Name { get; set; }
      }
    `;
    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.user_id).toBe(0);
    expect(parsed.full_name).toBe('string');
  });

  it('handles C# modifiers like required, virtual, readonly', () => {
    const cs = `
      public class Product
      {
        public required string Sku { get; set; }
        public virtual decimal Price { get; set; }
        public readonly int Stock = 10;
      }
    `;
    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.sku).toBe('string');
    expect(parsed.price).toBe(0);
  });

  it('supports Dictionary and nested DTO resolution', () => {
    const cs = `
      public class Order
      {
        public int Id { get; set; }
        public Address ShippingAddress { get; set; }
        public List<LineItem> Items { get; set; }
        public Dictionary<string, int> Attributes { get; set; }
      }

      public class Address
      {
        public string City { get; set; }
      }

      public class LineItem
      {
        public string Sku { get; set; }
        public int Qty { get; set; }
      }
    `;
    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(0);
    expect(parsed.shippingAddress).toEqual({ city: 'string' });
    expect(parsed.items).toEqual([{ sku: 'string', qty: 0 }]);
    expect(parsed.attributes).toEqual({ key: 0 });
  });

  it('supports enums defined in input', () => {
    const cs = `
      public class Ticket
      {
        public int Id { get; set; }
        public Priority Level { get; set; }
      }

      public enum Priority
      {
        Low = 1,
        Medium = 2,
        High = 3
      }
    `;
    const json = convertCsharpToJson(cs);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(0);
    expect(parsed.level).toBe('Low');
  });

  it('supports casing options', () => {
    const cs = 'public class Item { public string ItemName { get; set; } }';
    expect(JSON.parse(convertCsharpToJson(cs, { casing: 'camel' }))).toEqual({ itemName: 'string' });
    expect(JSON.parse(convertCsharpToJson(cs, { casing: 'pascal' }))).toEqual({ ItemName: 'string' });
    expect(JSON.parse(convertCsharpToJson(cs, { casing: 'snake' }))).toEqual({ item_name: 'string' });
  });

  it('throws when no class or record is found', () => {
    expect(() => convertCsharpToJson('invalid input without class')).toThrow('No C# class or record found.');
    expect(() => convertCsharpToJson('')).toThrow('No C# class or record found.');
  });
});
