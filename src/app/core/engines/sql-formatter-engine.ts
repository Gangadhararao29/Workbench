import { format } from 'sql-formatter';

export type SqlDialectLanguage = 'sql' | 'transactsql' | 'postgresql' | 'mysql' | 'sqlite' | 'plsql';

export interface SqlFormatterOptions {
  dialect?: string;
  language?: string;
  indent?: string;
  tabWidth?: number;
  useTabs?: boolean;
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

export function normalizeSqlDialect(dialect?: string): SqlDialectLanguage {
  if (!dialect) return 'sql';
  const lower = dialect.toLowerCase().trim();
  if (lower === 'tsql' || lower === 'transactsql' || lower === 'sql server' || lower === 'transact-sql') {
    return 'transactsql';
  }
  if (lower === 'postgres' || lower === 'postgresql') {
    return 'postgresql';
  }
  if (lower === 'mysql' || lower === 'mariadb') {
    return 'mysql';
  }
  if (lower === 'sqlite') {
    return 'sqlite';
  }
  if (lower === 'oracle' || lower === 'plsql') {
    return 'plsql';
  }
  return 'sql';
}

export function formatSql(source: string, options: SqlFormatterOptions = {}): string {
  const lang = normalizeSqlDialect(options.language || options.dialect);
  const tabWidth = options.tabWidth ?? (options.indent === '4 spaces' ? 4 : 2);
  const useTabs = options.useTabs ?? (options.indent === 'Tab');

  return format(source, {
    language: lang,
    keywordCase: options.keywordCase ?? (options.uppercaseKeywords === false ? 'preserve' : 'upper'),
    dataTypeCase: options.dataTypeCase ?? 'preserve',
    functionCase: options.functionCase ?? 'preserve',
    identifierCase: options.identifierCase ?? 'preserve',
    useTabs,
    tabWidth,
    logicalOperatorNewline: options.logicalOperatorNewline ?? 'before',
    expressionWidth: options.expressionWidth ?? (options.breakOnCommas === false ? 1000 : 50),
    linesBetweenQueries: options.linesBetweenQueries ?? 1,
    denseOperators: options.denseOperators ?? false,
    newlineBeforeSemicolon: options.newlineBeforeSemicolon ?? false
  });
}

/**
 * Compact format: Splits by major SQL clause (SELECT, FROM, JOIN, WHERE, etc.)
 * on separate lines, but keeps column lists, conditions, and expressions compact and inline.
 */
export function compactSql(source: string, options: SqlFormatterOptions = {}): string {
  const minified = minifySql(source);
  if (!minified) return '';

  const clauseKeywords = [
    'SELECT',
    'FROM',
    'INNER JOIN',
    'LEFT OUTER JOIN',
    'RIGHT OUTER JOIN',
    'FULL OUTER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'FULL JOIN',
    'CROSS JOIN',
    'JOIN',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'FETCH FIRST',
    'FETCH NEXT',
    'INSERT INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE FROM',
    'UNION ALL',
    'UNION',
    'EXCEPT',
    'INTERSECT',
    'ON CONFLICT',
    'RETURNING',
  ];

  const clausePattern = new RegExp(
    `\\b(${clauseKeywords.map((k) => k.replace(/ /g, '\\s+')).join('|')})\\b`,
    'gi',
  );

  let formatted = transformOutsideQuotes(minified, (chunk) =>
    chunk.replace(clausePattern, (match) => `\n${match.toUpperCase()}`),
  );

  if (options.uppercaseKeywords !== false) {
    const inlineKeywords = [
      'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL',
      'BETWEEN', 'LIKE', 'ILIKE', 'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
      'ON', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'TOP', 'ROWS', 'ROW', 'ONLY',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NOW()', 'CURRENT_TIMESTAMP',
    ];
    const inlinePattern = new RegExp(
      `\\b(${inlineKeywords.map((k) => k.replace(/ /g, '\\s+')).join('|')})\\b`,
      'gi',
    );
    formatted = transformOutsideQuotes(formatted, (chunk) =>
      chunk.replace(inlinePattern, (m) => m.toUpperCase()),
    );
  }

  return formatted
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function minifySql(source: string): string {
  let result = '';
  let quote: "'" | '"' | '`' | null = null;
  let whitespacePending = false;
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      result += character;
      if (character === '\\' && index + 1 < source.length) {
        index++;
        result += source[index];
      } else if (character === quote && next === quote) {
        index++;
        result += next;
      } else if (character === quote) {
        quote = null;
      }
      index++;
      continue;
    }

    // Skip single-line SQL comments: -- ...
    if (character === '-' && next === '-') {
      index += 2;
      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') {
        index++;
      }
      whitespacePending = true;
      continue;
    }

    // Skip block comments: /* ... */
    if (character === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index++;
      }
      if (index < source.length) {
        index += 2;
      }
      whitespacePending = true;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      if (whitespacePending && result) result += ' ';
      whitespacePending = false;
      quote = character;
      result += character;
      index++;
    } else if (/\s/.test(character)) {
      whitespacePending = true;
      index++;
    } else {
      if (whitespacePending && result) result += ' ';
      whitespacePending = false;
      result += character;
      index++;
    }
  }

  return result.trim();
}

function transformOutsideQuotes(
  source: string,
  transform: (chunk: string) => string,
): string {
  let result = '';
  let inQuote: "'" | '"' | '`' | null = null;
  let buffer = '';

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (inQuote) {
      result += char;
      if (char === '\\' && i + 1 < source.length) {
        i++;
        result += source[i];
      } else if (char === inQuote && next === inQuote) {
        i++;
        result += next;
      } else if (char === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      result += transform(buffer);
      buffer = '';
      inQuote = char;
      result += char;
    } else {
      buffer += char;
    }
  }

  if (buffer) {
    result += transform(buffer);
  }

  return result;
}
