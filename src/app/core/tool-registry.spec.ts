import { describe, it, expect } from 'vitest';
import {
  TOOL_GROUPS,
  toolLabelFor,
  isValidToolType,
  findToolDefinition,
} from './tool-registry';

describe('tool-registry', () => {
  it('should have predefined tool groups', () => {
    expect(TOOL_GROUPS.length).toBeGreaterThan(0);
  });

  it('toolLabelFor returns correct label for existing tool', () => {
    expect(toolLabelFor('json-formatter')).toBe('Formatter');
    expect(toolLabelFor('csharp-to-typescript')).toBe('C# → TypeScript');
  });

  it('toolLabelFor falls back to toolType if unknown', () => {
    expect(toolLabelFor('custom-unknown-tool')).toBe('custom-unknown-tool');
  });

  it('isValidToolType correctly identifies valid and invalid tool types', () => {
    expect(isValidToolType('json-formatter')).toBe(true);
    expect(isValidToolType('sql-formatter')).toBe(true);
    expect(isValidToolType('csharp-to-typescript')).toBe(true);
    expect(isValidToolType('non-existent-tool')).toBe(false);
    expect(isValidToolType('')).toBe(false);
  });

  it('findToolDefinition returns tool and group definitions for valid tool type', () => {
    const res = findToolDefinition('json-formatter');
    expect(res).not.toBeNull();
    expect(res?.tool.type).toBe('json-formatter');
    expect(res?.group.id).toBe('json');
  });

  it('findToolDefinition returns null for invalid tool type', () => {
    const res = findToolDefinition('unknown-tool');
    expect(res).toBeNull();
  });
});
