export function evaluateJsonPath(source: string, path: string): string {
  const value = JSON.parse(source);
  const parts = path
    .replace(/^\$\.?/, '')
    .replace(/\[([0-9]+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current: any = value;
  for (const part of parts) current = current?.[part];
  return current === undefined ? 'No value found.' : JSON.stringify(current, null, 2);
}
