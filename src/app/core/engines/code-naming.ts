export function pascalCase(value: string, fallback = 'Value'): string {
  const name = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return name || fallback;
}

export function camelCase(value: string, fallback = 'value'): string {
  const pascal = pascalCase(value, fallback);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function pluralize(name: string): string {
  if (!name) return name;
  if (name.endsWith('y') && !/[aeiou]y$/i.test(name)) {
    return name.slice(0, -1) + 'ies';
  }
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('z') || name.endsWith('ch') || name.endsWith('sh')) {
    return name + 'es';
  }
  return name + 's';
}
