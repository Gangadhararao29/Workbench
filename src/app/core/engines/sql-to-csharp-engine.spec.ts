import { describe, it, expect } from 'vitest';
import { generateCSharpModelFromSql, parseSqlColumns, mapSqlTypeToCSharp } from './sql-to-csharp-engine';

describe('sql-to-csharp-engine', () => {
  it('should map SQL types accurately to C# types', () => {
    expect(mapSqlTypeToCSharp('INT')).toBe('int');
    expect(mapSqlTypeToCSharp('NVARCHAR(255)')).toBe('string');
    expect(mapSqlTypeToCSharp('DATETIME2')).toBe('DateTime');
    expect(mapSqlTypeToCSharp('UNIQUEIDENTIFIER')).toBe('Guid');
    expect(mapSqlTypeToCSharp('DECIMAL(18,2)')).toBe('decimal');
  });

  it('should parse CREATE TABLE columns', () => {
    const ddl = `CREATE TABLE Users (
      Id INT NOT NULL,
      Name NVARCHAR(100) NULL,
      IsActive BIT NOT NULL
    );`;
    const { tableName, columns } = parseSqlColumns(ddl);
    expect(tableName).toBe('Users');
    expect(columns).toHaveLength(3);
    expect(columns[0]).toEqual({ name: 'Id', type: 'INT', nullable: false });
    expect(columns[1]).toEqual({ name: 'Name', type: 'NVARCHAR(100)', nullable: true });
  });

  it('should generate C# class from CREATE TABLE statement', () => {
    const ddl = 'CREATE TABLE Accounts ( Id INT NOT NULL, Balance DECIMAL(18,2) NOT NULL );';
    const result = generateCSharpModelFromSql(ddl, { outputType: 'class' });
    expect(result.code).toContain('public class Accounts');
    expect(result.code).toContain('public int Id { get; set; }');
    expect(result.code).toContain('public decimal Balance { get; set; }');
  });

  it('should generate C# record when outputType is record', () => {
    const ddl = 'CREATE TABLE Accounts ( Id INT NOT NULL );';
    const result = generateCSharpModelFromSql(ddl, { outputType: 'record' });
    expect(result.code).toContain('public record Accounts(\n    int Id,\n);');
  });

  it('should parse SELECT statements and generate model', () => {
    const query = 'SELECT u.id AS UserId, u.email AS EmailAddress FROM Users u';
    const result = generateCSharpModelFromSql(query, { className: 'UserView' });
    expect(result.code).toContain('public class UserView');
    expect(result.code).toContain('UserId');
    expect(result.code).toContain('EmailAddress');
  });
});
