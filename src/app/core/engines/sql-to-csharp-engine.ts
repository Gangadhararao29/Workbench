import { pascalCase } from './code-naming';

export interface SqlColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SqlToCSharpOptions {
  outputType?: 'class' | 'record' | 'ef';
  className?: string;
}

export function parseSqlColumns(source: string): { tableName: string | null; columns: SqlColumn[] } {
  const tableMatch = source.match(/CREATE\s+TABLE\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(([\s\S]+)\)/i);
  if (tableMatch) {
    const tableName = tableMatch[1];
    const columns = parseCreateTableColumns(tableMatch[2]);
    return { tableName, columns };
  }

  const selectColumns = parseSelectColumns(source);
  return { tableName: null, columns: selectColumns };
}

function parseCreateTableColumns(body: string): SqlColumn[] {
  return body
    .split(',')
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^\[?(\w+)\]?\s+([\w]+(?:\s*\([^)]*\))?)(.*)$/i);
      if (!match || /^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|INDEX|KEY)$/i.test(match[1])) return null;
      return {
        name: match[1],
        type: match[2],
        nullable: !/NOT\s+NULL/i.test(match[3]),
      };
    })
    .filter((column): column is SqlColumn => column !== null);
}

function parseSelectColumns(source: string): SqlColumn[] {
  const match = source.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((value) => value.trim().split(/\s+AS\s+/i))
    .map((parts) => ({
      name: parts[1] ?? parts[0].split('.').pop() ?? 'Value',
      type: 'nvarchar',
      nullable: true,
    }));
}

export function mapSqlTypeToCSharp(type: string): string {
  const base = type.toLowerCase().replace(/\s*\(.+\)/, '');
  const map: Record<string, string> = {
    int: 'int',
    bigint: 'long',
    smallint: 'short',
    tinyint: 'byte',
    bit: 'bool',
    decimal: 'decimal',
    numeric: 'decimal',
    money: 'decimal',
    float: 'double',
    real: 'float',
    datetime: 'DateTime',
    datetime2: 'DateTime',
    date: 'DateTime',
    uniqueidentifier: 'Guid',
    nvarchar: 'string',
    varchar: 'string',
    text: 'string',
  };
  return map[base] ?? 'object';
}

export function generateCSharpModelFromSql(
  source: string,
  options: SqlToCSharpOptions = {},
): { code: string; error?: string } {
  const { tableName, columns } = parseSqlColumns(source);
  if (!columns.length) {
    return { code: '', error: 'No SQL columns found. Use CREATE TABLE or SELECT column syntax.' };
  }

  const name = tableName ?? options.className ?? 'QueryResult';
  const kind = options.outputType ?? 'class';

  if (kind === 'record') {
    const props = columns
      .map((col) => `    ${mapSqlTypeToCSharp(col.type)} ${pascalCase(col.name, 'Value')},`)
      .join('\n');
    return {
      code: `public record ${pascalCase(name, 'GeneratedModel')}(\n${props}\n);`,
    };
  }

  const properties = columns
    .map(
      (col) =>
        `    public ${mapSqlTypeToCSharp(col.type)} ${pascalCase(col.name, 'Value')} { get; set; }${col.nullable ? ' //' : ''}`,
    )
    .join('\n');

  const suffix = kind === 'ef' ? '\n\n// Add EF Core configuration and keys here.' : '';
  return {
    code: `public class ${pascalCase(name, 'GeneratedModel')}\n{\n${properties}\n}${suffix}`,
  };
}
