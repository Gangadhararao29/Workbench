import { describe, it, expect } from 'vitest';
import {
  formatSql,
  compactSql,
  minifySql,
  normalizeSqlDialect,
} from './sql-formatter-engine';

describe('sql-formatter-engine', () => {
  describe('normalizeSqlDialect', () => {
    it('normalizes common aliases to engine language strings', () => {
      expect(normalizeSqlDialect('tsql')).toBe('transactsql');
      expect(normalizeSqlDialect('SQL Server')).toBe('transactsql');
      expect(normalizeSqlDialect('postgres')).toBe('postgresql');
      expect(normalizeSqlDialect('PostgreSQL')).toBe('postgresql');
      expect(normalizeSqlDialect('mysql')).toBe('mysql');
      expect(normalizeSqlDialect('mariadb')).toBe('mysql');
      expect(normalizeSqlDialect('sqlite')).toBe('sqlite');
      expect(normalizeSqlDialect('oracle')).toBe('plsql');
      expect(normalizeSqlDialect('standard')).toBe('sql');
      expect(normalizeSqlDialect(undefined)).toBe('sql');
    });
  });

  describe('formatSql', () => {
    it('formats a simple query with uppercase keywords and indentation', () => {
      const sql = 'select id, name from users where is_active = 1 order by id desc';
      const formatted = formatSql(sql, { uppercaseKeywords: true, indent: '2 spaces' });
      expect(formatted).toContain('SELECT');
      expect(formatted).toContain('FROM');
      expect(formatted).toContain('WHERE');
      expect(formatted).toContain('ORDER BY');
    });

    it('formats SQL Server / T-SQL dialect with square brackets', () => {
      const sql = 'SELECT [Id], [Username] FROM [dbo].[Users] WHERE [Id] = 1;';
      const formatted = formatSql(sql, { dialect: 'tsql' });
      expect(formatted).toContain('[dbo].[Users]');
    });

    it('formats PostgreSQL query', () => {
      const sql = 'select id, name from users where created_at > now() limit 10;';
      const formatted = formatSql(sql, { dialect: 'postgres' });
      expect(formatted).toContain('LIMIT');
    });
  });

  describe('compactSql', () => {
    it('splits on major SQL clauses while keeping expressions compact', () => {
      const sql = 'SELECT id, name, email FROM users WHERE active = 1 AND age > 18 ORDER BY id DESC';
      const compact = compactSql(sql, { uppercaseKeywords: true });
      expect(compact).toContain('SELECT id, name, email');
      expect(compact).toContain('FROM users');
      expect(compact).toContain('WHERE active = 1 AND age > 18');
      expect(compact).toContain('ORDER BY id DESC');
    });
  });

  describe('minifySql', () => {
    it('collapses whitespace while preserving string literal contents', () => {
      const sql = `
        SELECT
          id,
          'hello   world'   AS   msg
        FROM   users
        WHERE   id  =  1
      `;
      const minified = minifySql(sql);
      expect(minified).toBe("SELECT id, 'hello   world' AS msg FROM users WHERE id = 1");
    });
  });
});
