export function pascalCase(value: string, fallback = 'Value'): string {
  const name = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return name || fallback;
}
