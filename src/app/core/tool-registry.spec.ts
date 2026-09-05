import { describe, it, expect } from 'vitest';
import {
  TOOL_GROUPS,
  toolLabelFor,
  isValidToolType,
  findToolDefinition,
  getAllTools,
  matchesToolSearch,
  getToolSearchSnippet,
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

  describe('matchesToolSearch', () => {
    const allTools = getAllTools();

    it('returns all tools when search query is empty or whitespace', () => {
      const tool = allTools.find((t) => t.type === 'curl-converter')!;
      expect(matchesToolSearch(tool, '')).toBe(true);
      expect(matchesToolSearch(tool, '   ')).toBe(true);
    });

    it('finds all tools that accept or work with curl when searching "curl"', () => {
      const matchingTypes = allTools
        .filter((tool) => matchesToolSearch(tool, 'curl'))
        .map((t) => t.type);

      // Should include cURL converter, HTTP request builder, OpenAPI inspector, and Terminal
      expect(matchingTypes).toContain('curl-converter');
      expect(matchingTypes).toContain('http-request-builder');
      expect(matchingTypes).toContain('openapi-inspector');
      expect(matchingTypes).toContain('terminal');

      // Should NOT include tools that have nothing to do with curl
      expect(matchingTypes).not.toContain('guid-generator');
      expect(matchingTypes).not.toContain('json-formatter');
      expect(matchingTypes).not.toContain('csharp-formatter');
    });

    it('matches tools by keywords', () => {
      const postmanMatch = allTools.filter((t) => matchesToolSearch(t, 'postman'));
      expect(postmanMatch.map((t) => t.type)).toContain('http-request-builder');

      const swaggerMatch = allTools.filter((t) => matchesToolSearch(t, 'swagger'));
      expect(swaggerMatch.map((t) => t.type)).toContain('openapi-inspector');

      const uuidMatch = allTools.filter((t) => matchesToolSearch(t, 'uuid'));
      expect(uuidMatch.map((t) => t.type)).toContain('guid-generator');

      const epochMatch = allTools.filter((t) => matchesToolSearch(t, 'epoch'));
      expect(epochMatch.map((t) => t.type)).toContain('timestamp-converter');
    });

    it('matches tools by description words', () => {
      const ssmsMatch = allTools.filter((t) => matchesToolSearch(t, 'ssms'));
      expect(ssmsMatch.map((t) => t.type)).toContain('sql-generator');

      const claimsMatch = allTools.filter((t) => matchesToolSearch(t, 'claims'));
      expect(claimsMatch.map((t) => t.type)).toContain('jwt-inspector');
    });

    it('supports multi-term search queries', () => {
      const curlConvertMatch = allTools.filter((t) => matchesToolSearch(t, 'curl convert'));
      expect(curlConvertMatch.map((t) => t.type)).toContain('curl-converter');
      expect(curlConvertMatch.map((t) => t.type)).not.toContain('terminal');

      const sqlFormatMatch = allTools.filter((t) => matchesToolSearch(t, 'sql format'));
      expect(sqlFormatMatch.map((t) => t.type)).toContain('sql-formatter');
    });

    it('matches tools by group label when provided', () => {
      const tool = allTools.find((t) => t.type === 'guid-generator')!;
      expect(matchesToolSearch(tool, 'general', 'General')).toBe(true);
    });
  });

  describe('getToolSearchSnippet', () => {
    it('returns tool description when search query is empty', () => {
      const tool = getAllTools().find((t) => t.type === 'curl-converter')!;
      expect(getToolSearchSnippet(tool, '')).toBe(tool.description);
    });

    it('provides matched keyword hint when matched via keyword', () => {
      const tool = getAllTools().find((t) => t.type === 'http-request-builder')!;
      const snippet = getToolSearchSnippet(tool, 'curl');
      expect(snippet.toLowerCase()).toContain('curl');
    });
  });
});
