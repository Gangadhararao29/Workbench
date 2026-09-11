import { describe, it, expect } from 'vitest';
import { convertJsonToTypescript } from './json-typescript-engine';
import { convertJsonToCsharp } from './json-csharp-engine';

describe('JSON to TypeScript & C# Engines with QuickType', () => {
  const sampleJson = JSON.stringify({
    id: 101,
    name: 'Ada Lovelace',
    active: true,
    roles: ['admin', 'researcher'],
    profile: {
      bio: 'Mathematician',
      age: 36
    }
  });

  describe('JSON to TypeScript', () => {
    it('generates TypeScript interfaces with root name', async () => {
      const output = await convertJsonToTypescript('User', sampleJson, false);
      expect(output).toContain('export interface User {');
      expect(output).toContain('id: number;');
      expect(output).toContain('name: string;');
      expect(output).toContain('active: boolean;');
      expect(output).toContain('roles: string[];');
      expect(output).toContain('profile: Profile;');
      expect(output).toContain('export interface Profile {');
    });

    it('generates TypeScript type aliases when asType is true', async () => {
      const output = await convertJsonToTypescript('User', sampleJson, true);
      expect(output).toContain('export type User = {');
      expect(output).toContain('id: number;');
      expect(output).toContain('profile: Profile;');
      expect(output).toContain('export type Profile = {');
    });

    it('handles union types accurately', async () => {
      const mixedJson = JSON.stringify({
        items: [1, 'text', false]
      });
      const output = await convertJsonToTypescript('MixedData', mixedJson, false);
      expect(output).toContain('export interface MixedData {');
      expect(output).toMatch(/items:\s*(Array<boolean \| number \| string>|\(boolean \| number \| string\)\[\]);?/);
    });

    it('accepts parsed object as value', async () => {
      const output = await convertJsonToTypescript('Simple', { count: 42 }, false);
      expect(output).toContain('export interface Simple {');
      expect(output).toContain('count: number;');
    });
  });

  describe('JSON to C#', () => {
    it('generates C# class models with proper types and PascalCase properties', async () => {
      const output = await convertJsonToCsharp({ rootName: 'User', namespace: 'App.Models', arrayType: 'list' }, sampleJson);
      expect(output).toContain('namespace App.Models');
      expect(output).toContain('public partial class User');
      expect(output).toContain('public long Id { get; set; }');
      expect(output).toContain('public string Name { get; set; }');
      expect(output).toContain('public bool Active { get; set; }');
      expect(output).toContain('public List<string> Roles { get; set; }');
      expect(output).toContain('public Profile Profile { get; set; }');
      expect(output).toContain('public partial class Profile');
    });

    it('supports array collection type', async () => {
      const output = await convertJsonToCsharp({ rootName: 'User', namespace: 'App.Models', arrayType: 'array' }, sampleJson);
      expect(output).toContain('public string[] Roles { get; set; }');
    });

    it('supports legacy string name argument', async () => {
      const output = await convertJsonToCsharp('Simple', JSON.stringify({ title: 'Engineer' }));
      expect(output).toContain('public partial class Simple');
      expect(output).toContain('public string Title { get; set; }');
    });
  });
});
