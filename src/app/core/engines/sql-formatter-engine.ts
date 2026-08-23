import { format } from 'sql-formatter';

export interface SqlFormatterOptions {
  dialect?: string;
  indent?: string;
  uppercaseKeywords?: boolean;
  breakOnCommas?: boolean;
}

export function formatSql(source: string, options: SqlFormatterOptions = {}): string {
  return format(source, {
    language: dialectFor(options.dialect),
    keywordCase: options.uppercaseKeywords ? 'upper' : 'preserve',
    useTabs: options.indent === 'Tab',
    tabWidth: options.indent === '4 spaces' ? 4 : 2,
    logicalOperatorNewline: 'before',
    expressionWidth: options.breakOnCommas ? 50 : 1000
  });
}

export function minifySql(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

function dialectFor(dialect: string | undefined): 'sql' | 'postgresql' | 'mysql' | 'sqlite' {
  switch (dialect) {
    case 'PostgreSQL': return 'postgresql';
    case 'MySQL': return 'mysql';
    case 'SQLite': return 'sqlite';
    default: return 'sql';
  }
}
