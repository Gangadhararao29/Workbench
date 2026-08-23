import { type Parser, type Language, type Node } from 'web-tree-sitter';

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
// Parser — tree-sitter CST walk
// ---------------------------------------------------------------------------

async function parseTypes(source: string): Promise<CSharpType[]> {
  const parser = await getParser();
  const tree = parser.parse(source);
  if (!tree) return [];
  const types: CSharpType[] = [];
  walkNode(tree.rootNode, types);
  return types;
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
          if (attrName?.text === 'JsonPropertyName') {
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
