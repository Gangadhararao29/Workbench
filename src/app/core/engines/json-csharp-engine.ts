import { pascalCase } from './code-naming';

export function convertJsonToCsharp(name: string, value: Record<string, unknown>): string {
  const nested: string[] = [];
  const properties = Object.entries(value).map(([key, item]) =>
    `    public ${inferType(pascalCase(key), item, nested)} ${pascalCase(key)} { get; set; }`
  );
  return [...nested, `public class ${name}\n{\n${properties.join('\n')}\n}`].join('\n\n');
}

function inferType(name: string, value: unknown, nested: string[]): string {
  if (value === null) return 'object?';
  if (Array.isArray(value)) return value.length ? `List<${inferType(name, value[0], nested)}>` : 'List<object>';
  if (typeof value === 'object') {
    nested.push(convertJsonToCsharp(name, value as Record<string, unknown>));
    return name;
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
  if (typeof value === 'boolean') return 'bool';
  return 'object';
}
