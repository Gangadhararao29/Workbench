import { pascalCase } from './code-naming';

export interface SqlColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  maxLength?: number | string;
  precision?: number;
  scale?: number;
}

export interface SqlToCSharpOptions {
  outputType?: 'class' | 'record' | 'ef';
  className?: string;
  namespace?: string;
  nullableRefTypes?: boolean;
}

/**
 * Strips single-line and multi-line SQL comments while preserving strings.
 */
export function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\r\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Finds the index of the matching closing parenthesis for an opening parenthesis at openIndex.
 */
function findMatchingCloseParen(sql: string, openIndex: number): number {
  let depth = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBracket = false;

  for (let i = openIndex + 1; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDoubleQuote && !inBracket) {
      if (sql[i + 1] === "'") {
        i++; // skip escaped single quote
      } else {
        inSingleQuote = !inSingleQuote;
      }
    } else if (ch === '"' && !inSingleQuote && !inBracket) {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === '[' && !inSingleQuote && !inDoubleQuote) {
      inBracket = true;
    } else if (ch === ']' && inBracket) {
      inBracket = false;
    } else if (!inSingleQuote && !inDoubleQuote && !inBracket) {
      if (ch === '(') {
        depth++;
      } else if (ch === ')') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
  }
  return -1;
}

/**
 * Splits comma-separated items inside a table body or SELECT clause while
 * respecting nested parentheses (e.g. DECIMAL(18, 2)), brackets, and strings.
 */
export function splitSqlItems(body: string): string[] {
  const items: string[] = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBracket = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'" && !inDoubleQuote && !inBracket) {
      if (body[i + 1] === "'") {
        current += "''";
        i++;
      } else {
        inSingleQuote = !inSingleQuote;
        current += ch;
      }
    } else if (ch === '"' && !inSingleQuote && !inBracket) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
    } else if (ch === '[' && !inSingleQuote && !inDoubleQuote) {
      inBracket = true;
      current += ch;
    } else if (ch === ']' && inBracket) {
      inBracket = false;
      current += ch;
    } else if (!inSingleQuote && !inDoubleQuote && !inBracket) {
      if (ch === '(') {
        depth++;
        current += ch;
      } else if (ch === ')') {
        depth = Math.max(0, depth - 1);
        current += ch;
      } else if (ch === ',' && depth === 0) {
        if (current.trim()) {
          items.push(current.trim());
        }
        current = '';
      } else {
        current += ch;
      }
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

export function parseSqlColumns(source: string): { tableName: string | null; columns: SqlColumn[] } {
  const cleanSql = stripSqlComments(source).trim();
  if (!cleanSql) {
    return { tableName: null, columns: [] };
  }

  const createTableResult = parseCreateTable(cleanSql);
  if (createTableResult) {
    return createTableResult;
  }

  const selectColumns = parseSelectColumns(cleanSql);
  return { tableName: null, columns: selectColumns };
}

function parseCreateTable(cleanSql: string): { tableName: string; columns: SqlColumn[] } | null {
  const createTableRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMPORARY\s+|TEMP\s+|GLOBAL\s+TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:[\["`]?[\w-]+[\]"`]?\.)*[\["`]?[\w-]+[\]"`]?)\s*\(/i;
  const match = cleanSql.match(createTableRegex);
  if (!match || match.index === undefined) {
    return null;
  }

  const fullTarget = match[1];
  const parts = fullTarget.split('.');
  const rawTableName = parts[parts.length - 1].replace(/[\[\]"`]/g, '').trim();

  const openParenIndex = cleanSql.indexOf('(', match.index + match[0].length - 1);
  if (openParenIndex === -1) {
    return null;
  }

  const closeParenIndex = findMatchingCloseParen(cleanSql, openParenIndex);
  const body =
    closeParenIndex !== -1
      ? cleanSql.substring(openParenIndex + 1, closeParenIndex)
      : cleanSql.substring(openParenIndex + 1);

  const columns = parseCreateTableColumns(body);
  return { tableName: rawTableName, columns };
}

function parseCreateTableColumns(body: string): SqlColumn[] {
  const items = splitSqlItems(body);

  // First pass: extract table-level primary key columns
  const pkColumnNames = new Set<string>();
  for (const item of items) {
    const pkMatch = item.match(
      /(?:CONSTRAINT\s+[\["`]?\w+[\]"`]?\s+)?PRIMARY\s+KEY(?:\s+CLUSTERED|\s+NONCLUSTERED)?\s*\(([^)]+)\)/i,
    );
    if (pkMatch) {
      const cols = pkMatch[1].split(',').map((c) =>
        c
          .trim()
          .replace(/[\[\]"`]/g, '')
          .split(/\s+/)[0]
          .toLowerCase(),
      );
      for (const col of cols) {
        if (col) pkColumnNames.add(col);
      }
    }
  }

  const columns: SqlColumn[] = [];

  for (const item of items) {
    const trimmed = item.trim();

    // Ignore standalone table constraints and indexes
    if (
      /^(CONSTRAINT\b|PRIMARY\s+KEY\b|FOREIGN\s+KEY\b|UNIQUE\b|CHECK\b|KEY\b|INDEX\b)/i.test(
        trimmed,
      )
    ) {
      continue;
    }

    // Match column name: bracketed [col name], quoted "col name", `col name`, or simple word
    const colNameMatch = trimmed.match(/^([\["`][^\]"`]+[\]"`]|\w+)\s+([\s\S]+)$/);
    if (!colNameMatch) continue;

    const rawName = colNameMatch[1].replace(/[\[\]"`]/g, '').trim();
    if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CHECK)$/i.test(rawName)) {
      continue;
    }

    const rest = colNameMatch[2].trim();

    // Match type including possible parameters like VARCHAR(255) or DECIMAL(18, 2)
    const typeMatch = rest.match(
      /^(TIMESTAMP\s+WITH(?:OUT)?\s+TIME\s+ZONE|TIME\s+WITH(?:OUT)?\s+TIME\s+ZONE|DOUBLE\s+PRECISION|CHARACTER\s+VARYING(?:\s*\([^)]*\))?|\w+(?:\s+UNSIGNED)?(?:\s*\([^)]*\))?)/i,
    );
    if (!typeMatch) continue;

    const rawType = typeMatch[1].trim();
    const afterType = rest.substring(typeMatch[0].length).trim();

    const isInlinePk = /\bPRIMARY\s+KEY\b/i.test(afterType);
    const isPk = isInlinePk || pkColumnNames.has(rawName.toLowerCase());

    let nullable = true;
    if (isPk) {
      nullable = false;
    } else if (/\bNOT\s+NULL\b/i.test(afterType)) {
      nullable = false;
    } else if (/\bNULL\b/i.test(afterType)) {
      nullable = true;
    }

    // Extract length / precision / scale if present
    let maxLength: number | string | undefined;
    let precision: number | undefined;
    let scale: number | undefined;

    const parenMatch = rawType.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const args = parenMatch[1].split(',').map((s) => s.trim());
      if (args.length === 1) {
        if (/^\d+$/.test(args[0])) {
          maxLength = parseInt(args[0], 10);
        } else if (/^max$/i.test(args[0])) {
          maxLength = 'max';
        }
      } else if (args.length >= 2) {
        precision = parseInt(args[0], 10);
        scale = parseInt(args[1], 10);
      }
    }

    const col: SqlColumn = {
      name: rawName,
      type: rawType,
      nullable,
    };

    if (isPk) col.isPrimaryKey = true;
    if (maxLength !== undefined) col.maxLength = maxLength;
    if (precision !== undefined) col.precision = precision;
    if (scale !== undefined) col.scale = scale;

    columns.push(col);
  }

  return columns;
}

function parseSelectColumns(source: string): SqlColumn[] {
  const match = source.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!match) return [];

  const rawColumns = match[1];
  const items = splitSqlItems(rawColumns);

  return items
    .map((item) => {
      const trimmed = item.trim();
      if (!trimmed || trimmed === '*') return null;

      // Extract alias: 'expr AS Alias' or 'expr Alias'
      let colName = '';
      const asMatch = trimmed.match(/\s+AS\s+([\["`]?[\w-]+[\]"`]?)$/i);
      if (asMatch) {
        colName = asMatch[1].replace(/[\[\]"`]/g, '');
      } else {
        const aliasMatch = trimmed.match(/\s+([\["`]?[\w-]+[\]"`]?)$/i);
        if (aliasMatch && !trimmed.endsWith(')')) {
          colName = aliasMatch[1].replace(/[\[\]"`]/g, '');
        } else {
          const parts = trimmed.split('.');
          const lastPart = parts[parts.length - 1].replace(/[\[\]"`]/g, '').trim();
          colName = lastPart.replace(/[^a-zA-Z0-9_]/g, '') || 'Value';
        }
      }

      return {
        name: colName || 'Value',
        type: 'nvarchar',
        nullable: true,
      };
    })
    .filter((col): col is SqlColumn => col !== null);
}

export function mapSqlTypeToCSharp(type: string): string {
  const base = type.toLowerCase().replace(/\s*\(.+\)/, '').trim();
  const map: Record<string, string> = {
    int: 'int',
    integer: 'int',
    int4: 'int',
    mediumint: 'int',
    serial: 'int',

    bigint: 'long',
    int8: 'long',
    bigserial: 'long',

    smallint: 'short',
    int2: 'short',
    smallserial: 'short',

    tinyint: 'byte',
    byte: 'byte',

    bit: 'bool',
    bool: 'bool',
    boolean: 'bool',

    decimal: 'decimal',
    numeric: 'decimal',
    money: 'decimal',
    smallmoney: 'decimal',
    number: 'decimal',

    float: 'double',
    double: 'double',
    'double precision': 'double',
    float8: 'double',
    real: 'float',
    float4: 'float',

    datetime: 'DateTime',
    datetime2: 'DateTime',
    smalldatetime: 'DateTime',
    timestamp: 'DateTime',
    date: 'DateTime',

    datetimeoffset: 'DateTimeOffset',
    timestamptz: 'DateTimeOffset',
    'timestamp with time zone': 'DateTimeOffset',
    'timestamp without time zone': 'DateTime',

    time: 'TimeSpan',
    timetz: 'TimeSpan',
    'time with time zone': 'TimeSpan',
    'time without time zone': 'TimeSpan',

    uniqueidentifier: 'Guid',
    uuid: 'Guid',

    char: 'string',
    nchar: 'string',
    varchar: 'string',
    nvarchar: 'string',
    'character varying': 'string',
    text: 'string',
    ntext: 'string',
    tinytext: 'string',
    mediumtext: 'string',
    longtext: 'string',
    clob: 'string',
    json: 'string',
    jsonb: 'string',
    xml: 'string',
    citext: 'string',

    binary: 'byte[]',
    varbinary: 'byte[]',
    image: 'byte[]',
    bytea: 'byte[]',
    blob: 'byte[]',
    tinyblob: 'byte[]',
    mediumblob: 'byte[]',
    longblob: 'byte[]',
    raw: 'byte[]',
  };

  return map[base] ?? 'object';
}

const CSHARP_VALUE_TYPES = new Set([
  'int',
  'long',
  'short',
  'byte',
  'bool',
  'decimal',
  'double',
  'float',
  'DateTime',
  'DateTimeOffset',
  'TimeSpan',
  'Guid',
]);

export function isCSharpValueType(type: string): boolean {
  return CSHARP_VALUE_TYPES.has(type);
}

export function formatCSharpType(col: SqlColumn, nullableRefTypes = true): string {
  const baseType = mapSqlTypeToCSharp(col.type);
  if (col.nullable) {
    if (isCSharpValueType(baseType)) {
      return `${baseType}?`;
    }
    if (nullableRefTypes && (baseType === 'string' || baseType === 'byte[]')) {
      return `${baseType}?`;
    }
  }
  return baseType;
}

export function generateCSharpModelFromSql(
  source: string,
  options: SqlToCSharpOptions = {},
): { code: string; error?: string } {
  const { tableName, columns } = parseSqlColumns(source);
  if (!columns.length) {
    return { code: '', error: 'No SQL columns found. Use CREATE TABLE or SELECT column syntax.' };
  }

  const rawName = tableName ?? options.className ?? 'QueryResult';
  const modelName = pascalCase(rawName, 'GeneratedModel');
  const kind = options.outputType ?? 'class';
  const nullableRefTypes = options.nullableRefTypes ?? true;

  if (kind === 'record') {
    const props = columns
      .map((col) => `    ${formatCSharpType(col, nullableRefTypes)} ${pascalCase(col.name, 'Value')},`)
      .join('\n');
    return {
      code: `public record ${modelName}(\n${props}\n);`,
    };
  }

  if (kind === 'ef') {
    const lines: string[] = [];
    lines.push('using System.ComponentModel.DataAnnotations;');
    lines.push('using System.ComponentModel.DataAnnotations.Schema;\n');

    if (tableName) {
      lines.push(`[Table("${tableName}")]`);
    }
    lines.push(`public class ${modelName}`);
    lines.push('{');

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const propName = pascalCase(col.name, 'Value');
      const csharpType = formatCSharpType(col, nullableRefTypes);
      const isString = mapSqlTypeToCSharp(col.type) === 'string';

      if (i > 0) lines.push('');

      if (col.isPrimaryKey) {
        lines.push('    [Key]');
      }

      if (col.name !== propName) {
        lines.push(`    [Column("${col.name}")]`);
      }

      if (isString && !col.nullable) {
        lines.push('    [Required]');
      }

      if (col.maxLength && typeof col.maxLength === 'number') {
        lines.push(`    [MaxLength(${col.maxLength})]`);
      } else if (col.precision !== undefined && col.scale !== undefined) {
        lines.push(`    [Column(TypeName = "decimal(${col.precision}, ${col.scale})")]`);
      }

      const initializer = isString && !col.nullable ? ' = string.Empty;' : '';
      lines.push(`    public ${csharpType} ${propName} { get; set; }${initializer}`);
    }

    lines.push('}');
    return { code: lines.join('\n') };
  }

  // Default: POCO Class
  const properties = columns
    .map((col) => {
      const propName = pascalCase(col.name, 'Value');
      const csharpType = formatCSharpType(col, nullableRefTypes);
      const isString = mapSqlTypeToCSharp(col.type) === 'string';
      const initializer = isString && !col.nullable ? ' = string.Empty;' : '';
      return `    public ${csharpType} ${propName} { get; set; }${initializer}`;
    })
    .join('\n');

  return {
    code: `public class ${modelName}\n{\n${properties}\n}`,
  };
}
