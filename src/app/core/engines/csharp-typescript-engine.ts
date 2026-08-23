export interface CSharpConversionOptions {
  outputType?: string;
  naming?: string;
  nullable?: string;
  enumOutput?: string;
}

interface CSharpProperty {
  name: string;
  type: string;
  nullable: boolean;
  jsonName?: string;
}

interface CSharpType {
  name: string;
  kind: 'class' | 'record' | 'enum';
  properties: CSharpProperty[];
  values: string[];
}

export function convertCsharpToTypescript(source: string, config: CSharpConversionOptions = {}): string {
  const types = parseTypes(source);
  return types.length
    ? types.map(type => renderType(type, config)).join('\n\n') + '\n'
    : '';
}

function parseTypes(source: string): CSharpType[] {
  const types: CSharpType[] = [];
  const typePattern = /(?:public\s+)?(?:(?:partial|sealed|abstract)\s+)*(class|record(?:\s+class)?|enum)\s+(\w+)(?:\s*<[^>]+>)?[^\{]*\{([\s\S]*?)\n?\}/g;
  let match: RegExpExecArray | null;
  while ((match = typePattern.exec(source))) {
    const kind = match[1].startsWith('enum') ? 'enum' : match[1].startsWith('record') ? 'record' : 'class';
    const body = match[3];
    if (kind === 'enum') {
      types.push({ name: match[2], kind, properties: [], values: body.split(',').map(value => value.trim()).filter(Boolean) });
      continue;
    }
    const properties: CSharpProperty[] = [];
    const propertyPattern = /(?:\[JsonPropertyName\("([^"]+)"\)\]\s*)?(?:public|private|protected|internal)?\s*(?:required\s+|static\s+|virtual\s+|override\s+)*(\w+(?:<[^>]+>)?(?:\[\])?)(\?)?\s+(\w+)\s*(?:\{|;)/g;
    let property: RegExpExecArray | null;
    while ((property = propertyPattern.exec(body))) {
      properties.push({ name: property[4], type: property[2], nullable: Boolean(property[3]), jsonName: property[1] });
    }
    types.push({ name: match[2], kind, properties, values: [] });
  }
  return types;
}

function renderType(type: CSharpType, config: CSharpConversionOptions): string {
  if (type.kind === 'enum') {
    const values = type.values.map(value => {
      const [name, explicitValue] = value.split('=').map(part => part.trim());
      return `${name}${explicitValue ? ` = ${explicitValue}` : ''}`;
    });
    return config.enumOutput === 'union'
      ? `export type ${type.name} =\n${values.map(value => `  | '${value.split(' = ')[0]}'`).join('\n')};`
      : `export enum ${type.name} {\n${values.map(value => `  ${value},`).join('\n')}\n}`;
  }

  const declaration = config.outputType === 'type' ? 'type' : 'interface';
  const properties = type.properties.map(property => {
    const name = property.jsonName ?? propertyName(property.name, config.naming);
    const optional = config.nullable === 'optional' && property.nullable ? '?' : '';
    const nullable = property.nullable && config.nullable !== 'optional' ? ' | null' : '';
    return `  ${name}${optional}: ${mapType(property.type)}${nullable};`;
  });
  return `export ${declaration} ${type.name} {\n${properties.join('\n')}\n}`;
}

function propertyName(name: string, naming: string | undefined): string {
  if (naming === 'preserve' || naming === 'pascal') return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function mapType(type: string): string {
  const collection = type.match(/^(?:List|IList|ICollection|IEnumerable|IReadOnlyCollection|IReadOnlyList)<(.+)>$/);
  if (collection) return `${mapType(collection[1])}[]`;
  if (type.endsWith('[]')) return `${mapType(type.slice(0, -2))}[]`;
  const dictionary = type.match(/^Dictionary<([^,]+),\s*(.+)>$/);
  if (dictionary) return `Record<${mapType(dictionary[1])}, ${mapType(dictionary[2])}>`;
  const mappings: Record<string, string> = {
    string: 'string', char: 'string', bool: 'boolean', boolean: 'boolean',
    byte: 'number', short: 'number', int: 'number', long: 'number',
    float: 'number', double: 'number', decimal: 'number',
    Guid: 'string', DateTime: 'Date', DateTimeOffset: 'Date', TimeSpan: 'string',
    object: 'unknown', dynamic: 'unknown'
  };
  return mappings[type] ?? type;
}
