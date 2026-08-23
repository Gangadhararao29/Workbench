import { format } from 'sql-formatter';

export interface SqlFormatterOptions {
  dialect?: string;
  indent?: string;
  uppercaseKeywords?: boolean;
  breakOnCommas?: boolean;
  keywordCase?: 'upper' | 'lower' | 'preserve';
  dataTypeCase?: 'upper' | 'lower' | 'preserve';
  functionCase?: 'upper' | 'lower' | 'preserve';
  identifierCase?: 'upper' | 'lower' | 'preserve';
  logicalOperatorNewline?: 'before' | 'after';
  expressionWidth?: number;
  linesBetweenQueries?: number;
  denseOperators?: boolean;
  newlineBeforeSemicolon?: boolean;
}

export function formatSql(source: string, options: SqlFormatterOptions = {}): string {
  return format(source, {
    language: dialectFor(options.dialect),
    keywordCase: options.keywordCase ?? (options.uppercaseKeywords === false ? 'preserve' : 'upper'),
    dataTypeCase: options.dataTypeCase ?? 'preserve',
    functionCase: options.functionCase ?? 'preserve',
    identifierCase: options.identifierCase ?? 'preserve',
    useTabs: options.indent === 'Tab',
    tabWidth: options.indent === '4 spaces' ? 4 : 2,
    logicalOperatorNewline: options.logicalOperatorNewline ?? 'before',
    expressionWidth: options.expressionWidth ?? (options.breakOnCommas === false ? 1000 : 50),
    linesBetweenQueries: options.linesBetweenQueries ?? 1,
    denseOperators: options.denseOperators ?? false,
    newlineBeforeSemicolon: options.newlineBeforeSemicolon ?? false
  });
}

export function minifySql(source: string): string {
  let result = '';
  let quote: "'" | '"' | '`' | null = null;
  let whitespacePending = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      result += character;
      if (character === quote && next === quote) {
        result += next;
        index++;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      if (whitespacePending && result) result += ' ';
      whitespacePending = false;
      quote = character;
      result += character;
    } else if (/\s/.test(character)) {
      whitespacePending = true;
    } else {
      if (whitespacePending && result) result += ' ';
      whitespacePending = false;
      result += character;
    }
  }

  return result.trim();
}

function dialectFor(
  dialect: string | undefined
): 'sql' | 'transactsql' | 'postgresql' | 'mysql' | 'sqlite' {
  switch (dialect) {
    case 'SQL Server': return 'transactsql';
    case 'Transact-SQL': return 'transactsql';
    case 'PostgreSQL': return 'postgresql';
    case 'MySQL': return 'mysql';
    case 'SQLite': return 'sqlite';
    default: return 'sql';
  }
}
