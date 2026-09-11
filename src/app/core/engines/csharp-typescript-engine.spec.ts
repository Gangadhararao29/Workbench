import { describe, it, expect } from 'vitest';
import { convertCsharpToTypescript } from './csharp-typescript-engine';

describe('csharp-typescript-engine', () => {
  it('converts C# class to TypeScript interface', async () => {
    const cs = `
      public class CustomerDto
      {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public List<string> Tags { get; set; }
      }
    `;

    const ts = await convertCsharpToTypescript(cs);
    expect(ts).toContain('export interface CustomerDto {');
    expect(ts).toContain('id: number;');
    expect(ts).toContain('name: string;');
    expect(ts).toContain('isActive: boolean;');
    expect(ts).toContain('tags: string[];');
  });

  it('supports type alias outputType and optional nullable', async () => {
    const cs = `
      public class User
      {
        public int Id { get; set; }
        public string? Email { get; set; }
      }
    `;

    const ts = await convertCsharpToTypescript(cs, {
      outputType: 'type',
      nullable: 'optional',
    });

    expect(ts).toContain('export type User = {');
    expect(ts).toContain('id: number;');
    expect(ts).toContain('email?: string;');
  });

  it('supports enums as enum and union', async () => {
    const cs = `
      public enum Status
      {
        Active,
        Inactive
      }
    `;

    const asEnum = await convertCsharpToTypescript(cs, { enumOutput: 'enum' });
    expect(asEnum).toContain('export enum Status {');
    expect(asEnum).toContain('Active,');
    expect(asEnum).toContain('Inactive,');

    const asUnion = await convertCsharpToTypescript(cs, { enumOutput: 'union' });
    expect(asUnion).toContain('export type Status =');
    expect(asUnion).toContain("'Active'");
    expect(asUnion).toContain("'Inactive'");
  });

  it('supports positional records and Dictionary mapping', async () => {
    const cs = 'public record OrderDto(int Id, Dictionary<string, int> Metadata);';
    const ts = await convertCsharpToTypescript(cs);
    expect(ts).toContain('export interface OrderDto {');
    expect(ts).toContain('id: number;');
    expect(ts).toContain('metadata: Record<string, number>;');
  });

  it('respects JsonPropertyName attribute', async () => {
    const cs = `
      public class User
      {
        [JsonPropertyName("user_id")]
        public int Id { get; set; }
      }
    `;
    const ts = await convertCsharpToTypescript(cs);
    expect(ts).toContain('user_id: number;');
  });

  it('returns empty string for invalid or empty input', async () => {
    expect(await convertCsharpToTypescript('')).toBe('');
    expect(await convertCsharpToTypescript('invalid without class')).toBe('');
  });
});
