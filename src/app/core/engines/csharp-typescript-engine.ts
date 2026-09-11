import { type Parser, type Language, type Node } from 'web-tree-sitter';

export interface CSharpConversionOptions {
  outputType?: string;
  naming?: string;
  nullable?: string;
  enumOutput?: string;
}

export interface CSharpProperty {
  name: string;
  type: string;
  nullable: boolean;
  jsonName?: string;
}

export interface CSharpType {
  name: string;
  kind: 'class' | 'record' | 'enum';
  properties: CSharpProperty[];
  values: string[];
}

// ---------------------------------------------------------------------------
// Tree-sitter initialisation (lazy, single-instance)
// web-tree-sitter is an ESM browser package. Its Node.js code paths
// (fs/promises, module) are guarded by runtime checks and never execute in
// the browser — we mark them external via angular.json → externalDependencies
// so esbuild does not try to bundle them.
// ---------------------------------------------------------------------------

let parserReady: Promise<Parser> | null = null;

function getParser(): Promise<Parser> {
  if (parserReady) return parserReady;

  parserReady = (async () => {
    // Dynamic import keeps tree-sitter out of the initial bundle chunk.
    const TreeSitter = await import('web-tree-sitter');
    await TreeSitter.Parser.init({
      locateFile: () => '/assets/tree-sitter/web-tree-sitter.wasm',
    });
    const CSharp = await TreeSitter.Language.load('/assets/tree-sitter/tree-sitter-c_sharp.wasm');
    const parser = new TreeSitter.Parser();
    parser.setLanguage(CSharp);
    return parser;
  })();

  return parserReady;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function convertCsharpToTypescript(
  source: string,
  config: CSharpConversionOptions = {}
): Promise<string> {
  const types = await parseTypes(source);
  return types.length ? types.map(type => renderType(type, config)).join('\n\n') + '\n' : '';
}

// ---------------------------------------------------------------------------
// Parser — tree-sitter CST walk with fallback
// ---------------------------------------------------------------------------

export async function parseTypes(source: string): Promise<CSharpType[]> {
  try {
    const parser = await getParser();
    const tree = parser.parse(source);
    if (tree) {
      const types: CSharpType[] = [];
      walkNode(tree.rootNode, types);
      if (types.length > 0) return types;
    }
  } catch {
    // If wasm is unavailable (e.g. unit tests or network error), fallback to pure parser
  }

  return parseTypesFallback(source);
}

function walkNode(node: Node, types: CSharpType[]): void {
  for (const child of node.children) {
    if (
      child.type === 'class_declaration' ||
      child.type === 'record_declaration' ||
      child.type === 'record_struct_declaration'
    ) {
      const parsed = parseClassOrRecord(child);
      if (parsed) types.push(parsed);
    } else if (child.type === 'enum_declaration') {
      const parsed = parseEnum(child);
      if (parsed) types.push(parsed);
    } else {
      // Recurse into namespaces, file-scoped namespaces, etc.
      walkNode(child, types);
    }
  }
}

function parseClassOrRecord(node: Node): CSharpType | null {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return null;

  const kind = node.type.startsWith('record') ? 'record' : 'class';
  const properties: CSharpProperty[] = [];
  const body = node.childForFieldName('body');

  if (body) {
    for (const member of body.children) {
      if (member.type === 'property_declaration') {
        const prop = parseProperty(member);
        if (prop) properties.push(prop);
      } else if (member.type === 'field_declaration') {
        const prop = parseField(member);
        if (prop) properties.push(prop);
      }
    }
  }

  // Record primary constructor parameters are also properties
  const params = node.childForFieldName('parameters');
  if (params) {
    for (const param of params.children) {
      if (param.type === 'parameter') {
        const prop = parseParameter(param);
        if (prop) properties.push(prop);
      }
    }
  }

  return { name: nameNode.text, kind, properties, values: [] };
}

function parseProperty(node: Node): CSharpProperty | null {
  const typeNode = node.childForFieldName('type');
  const nameNode = node.childForFieldName('name');
  if (!typeNode || !nameNode) return null;

  const jsonName = findJsonPropertyName(node);
  const { typeName, nullable } = extractType(typeNode);

  return { name: nameNode.text, type: typeName, nullable, jsonName };
}

function parseField(node: Node): CSharpProperty | null {
  const typeNode = node.childForFieldName('type');
  const declarator = node.children.find((c: Node) => c.type === 'variable_declarator');
  if (!typeNode || !declarator) return null;

  const nameNode = declarator.childForFieldName('name');
  if (!nameNode) return null;

  const { typeName, nullable } = extractType(typeNode);
  return { name: nameNode.text, type: typeName, nullable };
}

function parseParameter(node: Node): CSharpProperty | null {
  const typeNode = node.childForFieldName('type');
  const nameNode = node.childForFieldName('name');
  if (!typeNode || !nameNode) return null;

  const { typeName, nullable } = extractType(typeNode);
  return { name: nameNode.text, type: typeName, nullable };
}

function parseEnum(node: Node): CSharpType | null {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return null;

  const body = node.childForFieldName('body');
  const values: string[] = [];

  if (body) {
    for (const member of body.children) {
      if (member.type === 'enum_member_declaration') {
        const memberName = member.childForFieldName('name');
        const memberValue = member.childForFieldName('value');
        if (memberName) {
          values.push(memberValue ? `${memberName.text} = ${memberValue.text}` : memberName.text);
        }
      }
    }
  }

  return { name: nameNode.text, kind: 'enum', properties: [], values };
}

function extractType(node: Node): { typeName: string; nullable: boolean } {
  if (node.type === 'nullable_type') {
    const inner = node.child(0);
    return { typeName: inner ? inner.text : node.text, nullable: true };
  }
  return { typeName: node.text, nullable: false };
}

function findJsonPropertyName(node: Node): string | undefined {
  for (const child of node.children) {
    if (child.type === 'attribute_list') {
      for (const attr of child.children) {
        if (attr.type === 'attribute') {
          const attrName = attr.childForFieldName('name');
          const text = attrName?.text;
          if (text === 'JsonPropertyName' || text === 'JsonProperty' || text === 'DataMember') {
            const args = attr.childForFieldName('argument_list');
            if (args) {
              const strNode = args.children.find(
                (c: Node) => c.type === 'string_literal' || c.type === 'verbatim_string_literal'
              );
              if (strNode) return strNode.text.replace(/^[@"']+|["']+$/g, '');
            }
          }
        }
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Pure Fallback Parser (Robust, synchronous, zero wasm dependencies)
// ---------------------------------------------------------------------------

function parseTypesFallback(source: string): CSharpType[] {
  const clean = stripComments(source);
  const found: Array<CSharpType & { index: number }> = [];

  // Positional records
  const positionalRecordRegex = /(?:public|internal|private)?\s*record\s+(?:struct\s+)?(\w+)\s*\(([^)]*)\)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = positionalRecordRegex.exec(clean))) {
    const typeName = m[1];
    const paramStr = m[2];
    const properties: CSharpProperty[] = [];

    const params = splitParameters(paramStr);
    for (const p of params) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const attrMatch = trimmed.match(/\[([^\]]+)\]/);
      const cleanParam = trimmed.replace(/\[[^\]]+\]/g, '').trim();

      const withoutDefault = cleanParam.split(/\s*=\s*/)[0].trim();
      const nameMatch = withoutDefault.match(/\b([a-zA-Z_@][a-zA-Z0-9_]*)$/);
      if (!nameMatch) continue;

      const namePart = nameMatch[1];
      let typePart = withoutDefault.slice(0, nameMatch.index).trim();
      const isNullable = typePart.endsWith('?');
      if (isNullable) typePart = typePart.slice(0, -1).trim();

      let jsonName: string | undefined;
      if (attrMatch) {
        const jsonAttr = attrMatch[1].match(/JsonProperty(?:Name)?\s*\(\s*["']([^"']+)["']\s*\)/);
        if (jsonAttr) jsonName = jsonAttr[1];
      }

      properties.push({
        name: namePart,
        type: typePart,
        nullable: isNullable,
        jsonName
      });
    }

    found.push({ index: m.index, name: typeName, kind: 'record', properties, values: [] });
  }

  // Enums
  const enumRegex = /(?:public|internal|private)?\s*enum\s+(\w+)\s*\{([^}]*)\}/g;
  while ((m = enumRegex.exec(clean))) {
    const typeName = m[1];
    const enumBody = m[2];
    const values = enumBody
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    found.push({
      index: m.index,
      name: typeName,
      kind: 'enum',
      properties: [],
      values
    });
  }

  // Body-based types
  const bodyTypeRegex = /(?:public|internal|private)?\s*(?:class|record|struct)\s+(\w+)(?:<[^>]+>)?(?:\s*:\s*[^{]+)?\s*\{/g;
  while ((m = bodyTypeRegex.exec(clean))) {
    const typeName = m[1];
    const bodyStart = m.index + m[0].length - 1;
    const bodyEnd = findMatchingBrace(clean, bodyStart);
    if (bodyEnd < 0) continue;

    const body = clean.slice(bodyStart + 1, bodyEnd);
    const properties = parsePropertiesFallback(body);

    found.push({ index: m.index, name: typeName, kind: 'class', properties, values: [] });
  }

  found.sort((a, b) => a.index - b.index);
  return found;
}

function splitParameters(paramStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < paramStr.length; i++) {
    const ch = paramStr[i];
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') depth--;

    if (ch === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}

function findMatchingBrace(source: string, openingBrace: number): number {
  let depth = 0;
  for (let index = openingBrace; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return index;
  }
  return -1;
}

function parsePropertiesFallback(body: string): CSharpProperty[] {
  const properties: CSharpProperty[] = [];
  const propRegex = /(?:\[([^\]]+)\]\s*)*(?:(?:public|internal|private|protected|required|virtual|override|readonly|static|new)\s+)*([\w<>?,\[\] ]+?)\s+(\w+)\s*(?:\{[^}]*\}|=>[^;]*;|=([^;]+);|;)/g;

  let match: RegExpExecArray | null;
  while ((match = propRegex.exec(body))) {
    const rawAttr = match[1];
    let rawType = match[2]?.trim();
    const propName = match[3]?.trim();

    if (!rawType || !propName) continue;
    if (['void', 'return', 'class', 'struct', 'record', 'enum', 'get', 'set'].includes(rawType)) continue;

    rawType = rawType.replace(/\b(public|internal|private|protected|required|virtual|override|readonly|static|new)\b\s*/g, '').trim();

    const isNullable = rawType.endsWith('?');
    if (isNullable) rawType = rawType.slice(0, -1).trim();

    let jsonName: string | undefined;
    if (rawAttr) {
      const jsonAttr = rawAttr.match(/JsonProperty(?:Name)?\s*\(\s*["']([^"']+)["']\s*\)/);
      if (jsonAttr) jsonName = jsonAttr[1];
    }

    properties.push({
      name: propName,
      type: rawType,
      nullable: isNullable,
      jsonName
    });
  }

  return properties;
}

function stripComments(source: string): string {
  return source.replace(/\/\/[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

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
  const opening = declaration === 'type' ? `export type ${type.name} = {` : `export interface ${type.name} {`;
  const closing = declaration === 'type' ? '};' : '}';
  return `${opening}\n${properties.join('\n')}\n${closing}`;
}

function propertyName(name: string, naming: string | undefined): string {
  if (naming === 'preserve' || naming === 'pascal') return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function mapType(type: string): string {
  const collection = type.match(/^(?:List|IList|ICollection|IEnumerable|IReadOnlyCollection|IReadOnlyList|ISet|HashSet)<(.+)>$/);
  if (collection) return `${mapType(collection[1].trim())}[]`;
  if (type.endsWith('[]')) return `${mapType(type.slice(0, -2).trim())}[]`;
  const dictionary = type.match(/^(?:Dictionary|IDictionary|IReadOnlyDictionary)<([^,]+),\s*(.+)>$/);
  if (dictionary) return `Record<${mapType(dictionary[1].trim())}, ${mapType(dictionary[2].trim())}>`;
  const mappings: Record<string, string> = {
    string: 'string', char: 'string', bool: 'boolean', boolean: 'boolean',
    byte: 'number', sbyte: 'number', short: 'number', ushort: 'number',
    int: 'number', uint: 'number', long: 'number', ulong: 'number',
    float: 'number', double: 'number', decimal: 'number',
    Guid: 'string', DateTime: 'Date', DateTimeOffset: 'Date', DateOnly: 'string',
    TimeSpan: 'string', TimeOnly: 'string', Uri: 'string',
    object: 'unknown', dynamic: 'unknown', JsonElement: 'unknown', JsonObject: 'Record<string, unknown>'
  };
  return mappings[type] ?? type;
}
