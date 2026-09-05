import { describe, it, expect } from 'vitest';
import {
  jsonToYaml,
  yamlToJson,
  detectFormat,
  YAML_PRESETS
} from './yaml-engine';

describe('YAML Engine', () => {
  describe('jsonToYaml', () => {
    it('converts simple JSON object to YAML', () => {
      const json = '{"name": "Alice", "age": 30, "admin": true}';
      const yaml = jsonToYaml(json);
      expect(yaml).toContain('name: Alice');
      expect(yaml).toContain('age: 30');
      expect(yaml).toContain('admin: true');
    });

    it('handles nested objects and arrays with custom indentation', () => {
      const json = JSON.stringify({
        server: {
          port: 8080,
          hosts: ['localhost', '127.0.0.1']
        }
      });
      const yaml4 = jsonToYaml(json, { indent: 4 });
      expect(yaml4).toContain('server:');
      expect(yaml4).toContain('    port: 8080');
      expect(yaml4).toContain('    hosts:');
      expect(yaml4).toContain('        - localhost');
    });

    it('supports sorting keys', () => {
      const json = JSON.stringify({ z: 1, a: 2, m: 3 });
      const yaml = jsonToYaml(json, { sortKeys: true });
      const lines = yaml.trim().split('\n');
      expect(lines[0]).toContain('a:');
      expect(lines[1]).toContain('m:');
      expect(lines[2]).toContain('z:');
    });

    it('supports single and double quoting styles', () => {
      const json = JSON.stringify({ greeting: 'hello world' });
      const yamlSingle = jsonToYaml(json, { quotingType: 'single', forceQuotes: true });
      expect(yamlSingle).toContain("'hello world'");

      const yamlDouble = jsonToYaml(json, { quotingType: 'double', forceQuotes: true });
      expect(yamlDouble).toContain('"hello world"');
    });

    it('throws meaningful error on invalid JSON', () => {
      expect(() => jsonToYaml('{ invalid json')).toThrow(/Invalid JSON/i);
    });

    it('returns empty string on empty input', () => {
      expect(jsonToYaml('')).toBe('');
      expect(jsonToYaml('   ')).toBe('');
    });
  });

  describe('yamlToJson', () => {
    it('converts YAML to formatted JSON', () => {
      const yaml = `
name: Bob
roles:
  - developer
  - reviewer
enabled: false
`;
      const json = yamlToJson(yaml);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Bob');
      expect(parsed.roles).toEqual(['developer', 'reviewer']);
      expect(parsed.enabled).toBe(false);
    });

    it('supports compact minification', () => {
      const yaml = `
a: 1
b: 2
`;
      const compactJson = yamlToJson(yaml, { compact: true });
      expect(compactJson).toBe('{"a":1,"b":2}');
    });

    it('supports sorting keys in JSON output', () => {
      const yaml = `
z: 10
a: 20
k:
  y: 1
  x: 2
`;
      const json = yamlToJson(yaml, { sortKeys: true });
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toEqual(['a', 'k', 'z']);
      expect(Object.keys(parsed.k)).toEqual(['x', 'y']);
    });

    it('handles multi-document YAML by aggregating documents into an array', () => {
      const multiYaml = `
---
doc: 1
---
doc: 2
`;
      const json = yamlToJson(multiYaml);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].doc).toBe(1);
      expect(parsed[1].doc).toBe(2);
    });

    it('throws meaningful error on invalid YAML', () => {
      const invalidYaml = `
key: [unterminated
`;
      expect(() => yamlToJson(invalidYaml)).toThrow(/Invalid YAML/i);
    });

    it('returns empty string on empty input', () => {
      expect(yamlToJson('')).toBe('');
      expect(yamlToJson('   ')).toBe('');
    });
  });

  describe('detectFormat', () => {
    it('detects JSON', () => {
      expect(detectFormat('{"hello": "world"}')).toBe('json');
      expect(detectFormat('[1, 2, 3]')).toBe('json');
    });

    it('detects YAML', () => {
      expect(detectFormat('key: value\nother: 123')).toBe('yaml');
    });

    it('returns unknown for empty or malformed strings', () => {
      expect(detectFormat('')).toBe('unknown');
    });
  });

  describe('presets', () => {
    it('all presets have valid JSON and YAML representations', () => {
      for (const preset of YAML_PRESETS) {
        expect(() => JSON.parse(preset.json)).not.toThrow();
        expect(() => yamlToJson(preset.yaml)).not.toThrow();
      }
    });
  });
});
