import { formatTypescript } from './typescript-formatter';

export async function convertJsonToTypescript(name: string, value: Record<string, unknown>, asType: boolean): Promise<string> {
  const nested: string[] = [];
  const properties = Object.entries(value).map(([key, item]) => {
    const type = inferType(toTypeName(key), item, nested);
    return `  ${safePropertyName(key)}: ${type};`;
  });
  const declaration = asType ? `export type ${name} = {` : `export interface ${name} {`;
  const closing = asType ? '};' : '}';
  return formatTypescript([...nested, `${declaration}\n${properties.join('\n')}\n${closing}`].join('\n\n'));
}

function inferType(name: string, value: unknown, nested: string[]): string {
  if (value === null) return 'unknown | null';
  if (Array.isArray(value)) {
    if (!value.length) return 'unknown[]';
    const types = [...new Set(value.map(item => inferType(name + 'Item', item, nested)))];
    return types.length === 1 ? `${types[0]}[]` : `(${types.join(' | ')})[]`;
  }
  if (typeof value === 'object') {
    const typeName = name || 'NestedObject';
    if (!nested.some(item => item.startsWith(`export interface ${typeName} `))) {
      const properties = Object.entries(value as Record<string, unknown>).map(([key, item]) =>
        `  ${safePropertyName(key)}: ${inferType(toTypeName(key), item, nested)};`
      );
      nested.push(`export interface ${typeName} {\n${properties.join('\n')}\n}`);
    }
    return typeName;
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

function toTypeName(value: string): string {
  const name = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  return name || 'NestedObject';
}

function safePropertyName(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : `'${value.replace(/'/g, "\\'")}'`;
}
