import { describe, it, expect } from 'vitest';
import {
  generateCSharpModelFromSql,
  parseSqlColumns,
  mapSqlTypeToCSharp,
  splitSqlItems,
  stripSqlComments,
} from './sql-to-csharp-engine';

describe('sql-to-csharp-engine', () => {
  it('should map SQL types accurately to C# types', () => {
    expect(mapSqlTypeToCSharp('INT')).toBe('int');
    expect(mapSqlTypeToCSharp('NVARCHAR(255)')).toBe('string');
    expect(mapSqlTypeToCSharp('DATETIME2')).toBe('DateTime');
    expect(mapSqlTypeToCSharp('UNIQUEIDENTIFIER')).toBe('Guid');
    expect(mapSqlTypeToCSharp('DECIMAL(18,2)')).toBe('decimal');
    expect(mapSqlTypeToCSharp('DECIMAL(18, 2)')).toBe('decimal');
    expect(mapSqlTypeToCSharp('UUID')).toBe('Guid');
    expect(mapSqlTypeToCSharp('TIMESTAMPTZ')).toBe('DateTimeOffset');
    expect(mapSqlTypeToCSharp('BOOLEAN')).toBe('bool');
    expect(mapSqlTypeToCSharp('BYTEA')).toBe('byte[]');
    expect(mapSqlTypeToCSharp('BIGSERIAL')).toBe('long');
    expect(mapSqlTypeToCSharp('DOUBLE PRECISION')).toBe('double');
  });

  it('should strip comments correctly', () => {
    const sql = `
      -- Header comment
      CREATE TABLE Test (
        /* Multi-line
           comment */
        Id INT NOT NULL -- inline comment
      );
    `;
    const clean = stripSqlComments(sql);
    expect(clean).not.toContain('Header comment');
    expect(clean).not.toContain('Multi-line');
    expect(clean).not.toContain('inline comment');
    expect(clean).toContain('CREATE TABLE Test');
  });

  it('should split SQL items respecting nested parentheses and strings', () => {
    const body = `Id INT NOT NULL, Price DECIMAL(18, 2) NOT NULL, Name VARCHAR(100) DEFAULT 'hello, world'`;
    const items = splitSqlItems(body);
    expect(items).toHaveLength(3);
    expect(items[0]).toBe('Id INT NOT NULL');
    expect(items[1]).toBe('Price DECIMAL(18, 2) NOT NULL');
    expect(items[2]).toBe("Name VARCHAR(100) DEFAULT 'hello, world'");
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
    expect(columns[1]).toEqual({ name: 'Name', type: 'NVARCHAR(100)', nullable: true, maxLength: 100 });
  });

  it('should handle DECIMAL(18, 2) and schema brackets without breaking', () => {
    const ddl = `CREATE TABLE [dbo].[Orders] (
      [OrderId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      [TotalAmount] DECIMAL(18, 2) NOT NULL,
      [Notes] NVARCHAR(MAX) NULL
    );`;
    const { tableName, columns } = parseSqlColumns(ddl);
    expect(tableName).toBe('Orders');
    expect(columns).toHaveLength(3);
    expect(columns[0].name).toBe('OrderId');
    expect(columns[0].isPrimaryKey).toBe(true);
    expect(columns[0].nullable).toBe(false);

    expect(columns[1].name).toBe('TotalAmount');
    expect(columns[1].type).toBe('DECIMAL(18, 2)');
    expect(columns[1].precision).toBe(18);
    expect(columns[1].scale).toBe(2);

    expect(columns[2].name).toBe('Notes');
    expect(columns[2].maxLength).toBe('max');
    expect(columns[2].nullable).toBe(true);
  });

  it('should detect table-level PRIMARY KEY constraint', () => {
    const ddl = `CREATE TABLE UserRoles (
      UserId INT NOT NULL,
      RoleId INT NOT NULL,
      AssignedAt DATETIME2 NOT NULL,
      CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId)
    );`;
    const { tableName, columns } = parseSqlColumns(ddl);
    expect(tableName).toBe('UserRoles');
    expect(columns).toHaveLength(3);
    expect(columns[0].isPrimaryKey).toBe(true);
    expect(columns[1].isPrimaryKey).toBe(true);
    expect(columns[2].isPrimaryKey).toBeUndefined();
  });

  it('should generate C# class from CREATE TABLE statement', () => {
    const ddl = 'CREATE TABLE Accounts ( Id INT NOT NULL, Balance DECIMAL(18,2) NOT NULL );';
    const result = generateCSharpModelFromSql(ddl, { outputType: 'class' });
    expect(result.code).toContain('public class Accounts');
    expect(result.code).toContain('public int Id { get; set; }');
    expect(result.code).toContain('public decimal Balance { get; set; }');
  });

  it('should generate C# class with nullable types properly', () => {
    const ddl = `CREATE TABLE Customers (
      Id INT NOT NULL,
      Email NVARCHAR(200) NOT NULL,
      PhoneNumber NVARCHAR(50) NULL,
      LastLoginDate DATETIME2 NULL
    );`;
    const result = generateCSharpModelFromSql(ddl, { outputType: 'class' });
    expect(result.code).toContain('public int Id { get; set; }');
    expect(result.code).toContain('public string Email { get; set; } = string.Empty;');
    expect(result.code).toContain('public string? PhoneNumber { get; set; }');
    expect(result.code).toContain('public DateTime? LastLoginDate { get; set; }');
  });

  it('should generate C# record when outputType is record', () => {
    const ddl = 'CREATE TABLE Accounts ( Id INT NOT NULL );';
    const result = generateCSharpModelFromSql(ddl, { outputType: 'record' });
    expect(result.code).toContain('public record Accounts(\n    int Id,\n);');
  });

  it('should generate C# record with nullable types', () => {
    const ddl = `CREATE TABLE Products (
      Id INT NOT NULL,
      Description NVARCHAR(500) NULL,
      Price DECIMAL(18, 2) NOT NULL
    );`;
    const result = generateCSharpModelFromSql(ddl, { outputType: 'record' });
    expect(result.code).toContain('public record Products(');
    expect(result.code).toContain('    int Id,');
    expect(result.code).toContain('    string? Description,');
    expect(result.code).toContain('    decimal Price,');
  });

  it('should generate EF entity with data annotations', () => {
    const ddl = `CREATE TABLE [Users] (
      [Id] INT NOT NULL PRIMARY KEY,
      [user_name] NVARCHAR(150) NOT NULL,
      [Balance] DECIMAL(18, 2) NOT NULL,
      [CreatedAt] DATETIME2 NOT NULL
    );`;
    const result = generateCSharpModelFromSql(ddl, { outputType: 'ef' });
    expect(result.code).toContain('using System.ComponentModel.DataAnnotations;');
    expect(result.code).toContain('using System.ComponentModel.DataAnnotations.Schema;');
    expect(result.code).toContain('[Table("Users")]');
    expect(result.code).toContain('[Key]');
    expect(result.code).toContain('[Required]');
    expect(result.code).toContain('[MaxLength(150)]');
    expect(result.code).toContain('[Column("user_name")]');
    expect(result.code).toContain('[Column(TypeName = "decimal(18, 2)")]');
    expect(result.code).toContain('public int Id { get; set; }');
    expect(result.code).toContain('public string UserName { get; set; } = string.Empty;');
  });

  it('should parse SELECT statements and generate model', () => {
    const query = 'SELECT u.id AS UserId, u.email AS EmailAddress FROM Users u';
    const result = generateCSharpModelFromSql(query, { className: 'UserView' });
    expect(result.code).toContain('public class UserView');
    expect(result.code).toContain('UserId');
    expect(result.code).toContain('EmailAddress');
  });

  it('should parse SELECT with functions without splitting arguments', () => {
    const query = 'SELECT CONCAT(u.first_name, u.last_name) AS FullName, u.email FROM Users u';
    const result = generateCSharpModelFromSql(query, { className: 'UserSummary' });
    expect(result.code).toContain('public class UserSummary');
    expect(result.code).toContain('FullName');
    expect(result.code).toContain('Email');
  });
});
