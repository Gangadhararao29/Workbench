import { describe, it, expect } from 'vitest';
import { generateGuids, formatGuids } from './guid-engine';

describe('guid-engine', () => {
  it('should generate the requested count of valid UUIDs', () => {
    const list = generateGuids(5);
    expect(list).toHaveLength(5);
    for (const id of list) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
  });

  it('should format guids as SQL IN clause', () => {
    const sample = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
    const formatted = formatGuids(sample, 'sql', 'upper');
    expect(formatted).toContain("IN (\n  '00000000-0000-0000-0000-000000000001',\n  '00000000-0000-0000-0000-000000000002'\n)");
  });

  it('should format guids as C# array', () => {
    const sample = ['11111111-1111-1111-1111-111111111111'];
    const formatted = formatGuids(sample, 'csharp', 'lower');
    expect(formatted).toContain('Guid.Parse("11111111-1111-1111-1111-111111111111")');
  });

  it('should format guids as JSON', () => {
    const sample = ['22222222-2222-2222-2222-222222222222'];
    const formatted = formatGuids(sample, 'json', 'lower');
    const parsed = JSON.parse(formatted);
    expect(parsed).toEqual(sample);
  });
});
