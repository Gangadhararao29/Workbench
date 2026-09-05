import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { formatSql, compactSql, minifySql } from '../../../core/engines/sql-formatter-engine';

export interface SqlColumn {
  name: string;
  type: string;
  fullType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  sampleValue?: string;
  selectedInSelect: boolean;
  selectedInInsert: boolean;
  selectedInUpdate: boolean;
  isWhereKey: boolean;
}

export type SqlDialect = 'tsql' | 'postgres' | 'mysql' | 'sqlite';
export type GuardCondition = 'none' | 'if_not_exists' | 'if_exists_else' | 'merge';
export type OutputTab = 'all' | 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'ssms_batch';
export type OutputFormat = 'formatted' | 'compact' | 'minified';

const SAMPLE_DDL_USERS = `CREATE TABLE [dbo].[Users] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Username] NVARCHAR(50) NOT NULL,
    [Email] NVARCHAR(255) NOT NULL,
    [PasswordHash] NVARCHAR(500) NOT NULL,
    [FirstName] NVARCHAR(100) NULL,
    [LastName] NVARCHAR(100) NULL,
    [PhoneNumber] VARCHAR(20) NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT (1),
    [Role] NVARCHAR(50) NOT NULL DEFAULT ('Member'),
    [FailedLoginAttempts] INT NOT NULL DEFAULT (0),
    [LastLoginAt] DATETIME2(7) NULL,
    [CreatedAt] DATETIME2(7) NOT NULL DEFAULT (GETUTCDATE()),
    [UpdatedAt] DATETIME2(7) NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
);`;

const SAMPLE_DDL_ORDERS = `CREATE TABLE [dbo].[Orders] (
    [OrderId] BIGINT IDENTITY(1000,1) NOT NULL,
    [OrderNumber] NVARCHAR(50) NOT NULL,
    [CustomerId] INT NOT NULL,
    [TotalAmount] DECIMAL(18, 2) NOT NULL,
    [TaxAmount] DECIMAL(18, 2) NOT NULL DEFAULT (0.00),
    [DiscountAmount] DECIMAL(18, 2) NOT NULL DEFAULT (0.00),
    [CurrencyCode] CHAR(3) NOT NULL DEFAULT ('USD'),
    [OrderStatus] VARCHAR(30) NOT NULL DEFAULT ('Pending'),
    [PaymentStatus] VARCHAR(30) NOT NULL DEFAULT ('Unpaid'),
    [ShippingAddress] NVARCHAR(500) NULL,
    [OrderNotes] NVARCHAR(MAX) NULL,
    [OrderedAt] DATETIME2 NOT NULL DEFAULT (GETUTCDATE()),
    [ShippedAt] DATETIME2 NULL,
    CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED ([OrderId] ASC)
);`;

const SAMPLE_SSMS_DATA = `Id\tUsername\tEmail\tFirstName\tLastName\tIsActive\tRole\tCreatedAt
1\talan_turing\talan@enigma.org\tAlan\tTuring\t1\tAdmin\t2026-01-01 08:30:00
2\tada_lovelace\tada@analytical.io\tAda\tLovelace\t1\tDeveloper\t2026-01-02 09:15:00
3\tgrace_hopper\tgrace@navy.mil\tGrace\tHopper\t1\tLead\t2026-01-03 10:00:00
4\tkath_johnson\tkath@nasa.gov\tKatherine\tJohnson\t0\tAnalyst\t2026-01-04 11:45:00`;

@Component({
  selector: 'app-sql-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './sql-generator.html',
  styleUrls: ['./sql-generator.css']
})
export class SqlGenerator implements OnInit {
  @Input({ required: true }) instanceId!: string;

  // Mode and Inputs
  activeInputTab = signal<'ddl' | 'ssms'>('ddl');
  ddlInput = signal<string>(SAMPLE_DDL_USERS);
  ssmsInput = signal<string>(SAMPLE_SSMS_DATA);

  // Table Schema State
  tableName = signal<string>('Users');
  tableSchema = signal<string>('dbo');
  columns = signal<SqlColumn[]>([]);

  // Generation Options
  dialect = signal<SqlDialect>('tsql');
  declareVarsAtTop = signal<boolean>(true);
  guardCondition = signal<GuardCondition>('if_not_exists');
  includeNolock = signal<boolean>(false);
  includePagination = signal<boolean>(false);
  pageSize = signal<number>(20);
  offsetValue = signal<string>('@Skip');
  includeOrderBy = signal<boolean>(true);
  useSquareBrackets = signal<boolean>(true);
  softDeleteColumn = signal<string>('IsActive');
  enableSoftDelete = signal<boolean>(false);

  // Output Config
  activeOutputTab = signal<OutputTab>('all');
  outputFormat = signal<OutputFormat>('formatted');
  copied = signal<boolean>(false);
  isRegenerating = signal<boolean>(false);

  ngOnInit() {
    this.parseDdl();
  }

  // Set active tabs
  setInputTab(tab: 'ddl' | 'ssms') {
    this.activeInputTab.set(tab);
  }

  setOutputTab(tab: OutputTab) {
    this.activeOutputTab.set(tab);
  }

  setDialect(dial: SqlDialect) {
    this.dialect.set(dial);
  }

  setOutputFormat(fmt: OutputFormat) {
    this.outputFormat.set(fmt);
  }

  // Load Presets
  loadPreset(preset: 'users' | 'orders' | 'ssms') {
    if (preset === 'users') {
      this.ddlInput.set(SAMPLE_DDL_USERS);
      this.activeInputTab.set('ddl');
      this.parseDdl();
    } else if (preset === 'orders') {
      this.ddlInput.set(SAMPLE_DDL_ORDERS);
      this.activeInputTab.set('ddl');
      this.parseDdl();
    } else if (preset === 'ssms') {
      this.ssmsInput.set(SAMPLE_SSMS_DATA);
      this.activeInputTab.set('ssms');
      this.activeOutputTab.set('ssms_batch');
    }
  }

  // File Upload Handler
  onFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          this.ddlInput.set(text);
          this.parseDdl();
        }
      };
      reader.readAsText(file);
      target.value = '';
    }
  }

  // ==========================================
  // PARSER: DDL CREATE TABLE
  // ==========================================
  parseDdl() {
    const ddl = this.ddlInput().trim();
    if (!ddl) return;

    // 1. Extract Table and Schema Name
    const tableMatch = ddl.match(/CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]+)\)/i);
    let schema = 'dbo';
    let table = 'TableName';
    let body = '';

    if (tableMatch) {
      if (tableMatch[1]) {
        schema = tableMatch[1];
        table = tableMatch[2];
      } else {
        table = tableMatch[2];
      }
      body = tableMatch[3];
    } else {
      // Fallback simple column list or generic table
      table = 'GeneratedTable';
      body = ddl;
    }

    this.tableSchema.set(schema);
    this.tableName.set(table);

    // 2. Extract Primary Keys from table constraints (e.g. CONSTRAINT PK_x PRIMARY KEY (Id, Key2))
    const pkSet = new Set<string>();
    const pkMatches = body.matchAll(/(?:CONSTRAINT\s+\[?\w+\]?\s+)?PRIMARY\s+KEY(?:\s+CLUSTERED|\s+NONCLUSTERED)?\s*\(([^)]+)\)/gi);
    for (const match of pkMatches) {
      const cols = match[1].split(',').map(c => c.trim().replace(/^\[|\]$/g, '').split(/\s+/)[0]);
      cols.forEach(c => pkSet.add(c.toLowerCase()));
    }

    // 3. Parse Lines
    const lines = this.splitColumnLines(body);
    const parsedCols: SqlColumn[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Ignore table-level constraints
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|KEY|CHECK)\b/i.test(cleanLine)) {
        continue;
      }

      // Column pattern: [ColName] TYPE(prec) [IDENTITY(1,1)] [NOT NULL/NULL] [DEFAULT (val)] [PRIMARY KEY]
      const colMatch = cleanLine.match(/^\[?([\w@#$]+)\]?\s+([A-Za-z0-9_]+(?:\s*\([^)]*\))?)(.*)$/i);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const fullType = colMatch[2].trim();
      const rest = colMatch[3] || '';

      const isIdentity = /IDENTITY(?:\s*\([^)]*\))?/i.test(rest) || /AUTO_INCREMENT/i.test(rest) || /SERIAL/i.test(fullType);
      const isInlinePk = /PRIMARY\s+KEY/i.test(rest);
      const isPk = isInlinePk || pkSet.has(colName.toLowerCase()) || (/^id$/i.test(colName) && parsedCols.length === 0);
      const nullable = !/NOT\s+NULL/i.test(rest) && !isPk;

      // Extract Default Value if any
      let defaultValue: string | undefined;
      const defMatch = rest.match(/DEFAULT\s+(?:\(?([^)]+)\)?)/i);
      if (defMatch) {
        defaultValue = defMatch[1].trim().replace(/^\(|\)$/g, '').trim();
      }

      const baseType = fullType.replace(/\s*\(.*\)/, '').toUpperCase();
      const sampleVal = this.generateSampleValue(colName, baseType, defaultValue);

      parsedCols.push({
        name: colName,
        type: baseType,
        fullType: fullType,
        nullable: nullable,
        isPrimaryKey: isPk,
        isIdentity: isIdentity,
        defaultValue: defaultValue,
        sampleValue: sampleVal,
        selectedInSelect: true,
        // Default insert: true unless identity
        selectedInInsert: !isIdentity,
        // Default update: true unless identity or primary key
        selectedInUpdate: !isIdentity && !isPk,
        // Default where: true if primary key or Id
        isWhereKey: isPk
      });
    }

    // If no PK was detected, default the first column or Id column as WHERE filter
    if (parsedCols.length > 0 && !parsedCols.some(c => c.isWhereKey)) {
      const idCol = parsedCols.find(c => /^id$|_id$/i.test(c.name)) || parsedCols[0];
      idCol.isWhereKey = true;
    }

    this.columns.set(parsedCols);
  }

  private splitColumnLines(body: string): string[] {
    const lines: string[] = [];
    let current = '';
    let depth = 0;
    let inQuote = false;

    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      if (char === "'") {
        inQuote = !inQuote;
        current += char;
      } else if (!inQuote && char === '(') {
        depth++;
        current += char;
      } else if (!inQuote && char === ')') {
        depth--;
        current += char;
      } else if (!inQuote && depth === 0 && (char === ',' || char === '\n')) {
        if (char === ',') {
          if (current.trim()) lines.push(current.trim());
          current = '';
        } else if (current.trim()) {
          // If ends with comma or newline
          current += ' ';
        }
      } else {
        current += char;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  }

  private generateSampleValue(colName: string, type: string, def?: string): string {
    const lowerName = colName.toLowerCase();
    const lowerType = type.toLowerCase();

    if (def && !def.includes('(') && !def.includes('GETDATE') && !def.includes('NEWID')) {
      return def.replace(/^'|'$/g, '');
    }

    if (lowerName.includes('email')) return 'john.doe@example.com';
    if (lowerName.includes('username') || lowerName.includes('user_name')) return 'john_doe';
    if (lowerName.includes('firstname') || lowerName.includes('first_name')) return 'John';
    if (lowerName.includes('lastname') || lowerName.includes('last_name')) return 'Doe';
    if (lowerName.includes('phone')) return '+1-555-0199';
    if (lowerName.includes('role')) return 'Admin';
    if (lowerName.includes('status')) return 'Active';
    if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('total')) return '99.99';
    if (lowerName.includes('tax') || lowerName.includes('discount')) return '5.00';
    if (lowerName.includes('currency')) return 'USD';
    if (lowerName.includes('is') || lowerName.includes('has') || lowerType === 'bit' || lowerType === 'bool' || lowerType === 'boolean') return '1';
    if (lowerType.includes('int') || lowerType === 'bigint' || lowerType === 'smallint' || lowerType === 'tinyint') return '1';
    if (lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType.includes('money') || lowerType.includes('float') || lowerType.includes('double')) return '100.00';
    if (lowerType.includes('date') || lowerType.includes('time')) return '2026-08-28 12:00:00';
    if (lowerType.includes('uniqueidentifier') || lowerType.includes('uuid') || lowerType.includes('guid')) return 'A0E0B998-3E2A-4B6A-B6FD-89A82D201A94';

    return `Sample_${colName}`;
  }

  // ==========================================
  // BULK COLUMN ACTIONS
  // ==========================================
  toggleAllSelect(checked: boolean) {
    this.columns.update(cols => cols.map(c => ({ ...c, selectedInSelect: checked })));
  }

  toggleAllInsert(checked: boolean) {
    this.columns.update(cols => cols.map(c => ({ ...c, selectedInInsert: checked })));
  }

  toggleAllUpdate(checked: boolean) {
    this.columns.update(cols => cols.map(c => ({ ...c, selectedInUpdate: checked })));
  }

  toggleAllWhere(checked: boolean) {
    this.columns.update(cols => cols.map(c => ({ ...c, isWhereKey: checked })));
  }

  resetColumnDefaults() {
    this.columns.update(cols => cols.map(c => ({
      ...c,
      selectedInSelect: true,
      selectedInInsert: !c.isIdentity,
      selectedInUpdate: !c.isIdentity && !c.isPrimaryKey,
      isWhereKey: c.isPrimaryKey || /^id$|_id$/i.test(c.name)
    })));
  }

  updateColumnValue(index: number, field: keyof SqlColumn, value: any) {
    this.columns.update(cols => cols.map((col, i) => i === index ? { ...col, [field]: value } : col));
  }

  // ==========================================
  // FORMATTING & IDENTIFIER HELPERS
  // ==========================================
  formatIdentifier(name: string): string {
    const dial = this.dialect();
    const brackets = this.useSquareBrackets();
    if (!brackets) return name;
    if (dial === 'tsql') return `[${name}]`;
    if (dial === 'postgres') return `"${name}"`;
    if (dial === 'mysql') return `\`${name}\``;
    return `[${name}]`;
  }

  get fullTableName(): string {
    const schema = this.tableSchema().trim();
    const table = this.tableName().trim() || 'TableName';
    if (schema && schema !== 'dbo' && this.dialect() !== 'sqlite') {
      return `${this.formatIdentifier(schema)}.${this.formatIdentifier(table)}`;
    }
    if (this.dialect() === 'tsql' && schema) {
      return `${this.formatIdentifier(schema)}.${this.formatIdentifier(table)}`;
    }
    return this.formatIdentifier(table);
  }

  private formatSqlLiteral(val: string | undefined, type: string): string {
    if (val === undefined || val === null || val === '') return 'NULL';
    const trimmed = val.trim();
    if (trimmed.toUpperCase() === 'NULL') return 'NULL';

    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType === 'bigint' || lowerType === 'smallint' || lowerType === 'tinyint') {
      return isNaN(Number(trimmed)) ? '0' : trimmed;
    }
    if (lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType.includes('float') || lowerType.includes('money')) {
      return isNaN(Number(trimmed)) ? '0.00' : trimmed;
    }
    if (lowerType === 'bit' || lowerType === 'bool' || lowerType === 'boolean') {
      if (trimmed.toLowerCase() === 'true' || trimmed === '1') return this.dialect() === 'postgres' ? 'TRUE' : '1';
      if (trimmed.toLowerCase() === 'false' || trimmed === '0') return this.dialect() === 'postgres' ? 'FALSE' : '0';
      return trimmed;
    }

    const escaped = trimmed.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  // ==========================================
  // SSMS GRID / TSV / CSV PARSER
  // ==========================================
  parsedSsmsData = computed(() => {
    const raw = this.ssmsInput().trim();
    if (!raw) return { headers: [], rows: [] };

    // Auto detect separator: tab (\t) or comma (,)
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');
    const separator = isTab ? '\t' : (firstLine.includes(',') ? ',' : '\t');

    const headers = firstLine.split(separator).map(h => h.trim().replace(/^\[|\]$/g, '').replace(/^"|"$/g, ''));
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowParts = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      if (rowParts.length > 0 && rowParts.some(p => p !== '')) {
        rows.push(rowParts);
      }
    }

    return { headers, rows };
  });

  // ==========================================
  // CODE GENERATION COMPUTEDS
  // ==========================================

  // 1. SELECT QUERY
  selectSql = computed(() => {
    const cols = this.columns();
    const selCols = cols.filter(c => c.selectedInSelect);
    const whereCols = cols.filter(c => c.isWhereKey);
    const table = this.fullTableName;
    const nolock = this.includeNolock() && this.dialect() === 'tsql' ? ' WITH (NOLOCK)' : '';

    const colList = selCols.length > 0
      ? selCols.map(c => `    ${this.formatIdentifier(c.name)}`).join(',\n')
      : '    *';

    let whereClause = '';
    if (whereCols.length > 0) {
      whereClause = '\nWHERE ' + whereCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join('\n  AND ');
    }

    let orderClause = '';
    if (this.includeOrderBy()) {
      const pk = cols.find(c => c.isPrimaryKey) || cols[0];
      if (pk) {
        orderClause = `\nORDER BY ${this.formatIdentifier(pk.name)} ASC`;
      }
    }

    let pagingClause = '';
    if (this.includePagination()) {
      if (!orderClause) {
        orderClause = `\nORDER BY (SELECT NULL)`;
      }
      pagingClause = `\nOFFSET ${this.offsetValue().trim() || '0'} ROWS\nFETCH NEXT ${Math.max(1, this.pageSize())} ROWS ONLY`;
    }

    return `SELECT\n${colList}\nFROM ${table}${nolock}${whereClause}${orderClause}${pagingClause};`;
  });

  // 2. INSERT QUERY
  insertSql = computed(() => {
    const cols = this.columns();
    const insCols = cols.filter(c => c.selectedInInsert);
    const whereCols = cols.filter(c => c.isWhereKey);
    const table = this.fullTableName;
    const guard = this.guardCondition();
    const declareVars = this.declareVarsAtTop();

    if (insCols.length === 0) {
      return `-- No columns selected for INSERT.\nINSERT INTO ${table} DEFAULT VALUES;`;
    }

    // Top variable declarations
    let varDecls = '';
    if (declareVars) {
      const varsToDeclare = Array.from(new Set([...insCols, ...whereCols]));
      varDecls = '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        varsToDeclare.map(c => {
          const sample = this.formatSqlLiteral(c.sampleValue, c.type);
          return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
        }).join('\n') + '\n\n';
    }

    const colNames = insCols.map(c => `    ${this.formatIdentifier(c.name)}`).join(',\n');
    const colValues = insCols.map(c => `    @${c.name}`).join(',\n');

    let body = `INSERT INTO ${table} (\n${colNames}\n)\nVALUES (\n${colValues}\n);`;

    if (guard === 'if_not_exists') {
      const checkCols = whereCols.length > 0 ? whereCols : insCols.slice(0, 1);
      const checkCondition = checkCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join(' AND ');
      body = `IF NOT EXISTS (\n    SELECT 1 FROM ${table} WHERE ${checkCondition}\n)\nBEGIN\n    INSERT INTO ${table} (\n    ${insCols.map(c => this.formatIdentifier(c.name)).join(', ')}\n    )\n    VALUES (\n    ${insCols.map(c => `@${c.name}`).join(', ')}\n    );\nEND`;
    }

    return varDecls + body;
  });

  // 3. UPDATE QUERY
  updateSql = computed(() => {
    const cols = this.columns();
    const updCols = cols.filter(c => c.selectedInUpdate);
    const whereCols = cols.filter(c => c.isWhereKey);
    const table = this.fullTableName;
    const guard = this.guardCondition();
    const declareVars = this.declareVarsAtTop();

    if (updCols.length === 0) {
      return `-- No columns selected for UPDATE.`;
    }

    let varDecls = '';
    if (declareVars) {
      const varsToDeclare = Array.from(new Set([...updCols, ...whereCols]));
      varDecls = '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        varsToDeclare.map(c => {
          const sample = this.formatSqlLiteral(c.sampleValue, c.type);
          return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
        }).join('\n') + '\n\n';
    }

    const setClauses = updCols.map(c => `    ${this.formatIdentifier(c.name)} = @${c.name}`).join(',\n');
    const whereClause = whereCols.length > 0
      ? '\nWHERE ' + whereCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join('\n  AND ')
      : '\n-- WARNING: NO WHERE CLAUSE SPECIFIED';

    let body = `UPDATE ${table}\nSET\n${setClauses}${whereClause};`;

    if (guard === 'if_not_exists' && whereCols.length > 0) {
      const checkCondition = whereCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join(' AND ');
      body = `IF EXISTS (\n    SELECT 1 FROM ${table} WHERE ${checkCondition}\n)\nBEGIN\n    UPDATE ${table}\n    SET\n    ${setClauses}${whereClause};\nEND`;
    }

    return varDecls + body;
  });

  // 4. DELETE QUERY
  deleteSql = computed(() => {
    const cols = this.columns();
    const whereCols = cols.filter(c => c.isWhereKey);
    const table = this.fullTableName;
    const declareVars = this.declareVarsAtTop();
    const softDelCol = this.softDeleteColumn();
    const isSoft = this.enableSoftDelete();

    let varDecls = '';
    if (declareVars && whereCols.length > 0) {
      varDecls = '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        whereCols.map(c => {
          const sample = this.formatSqlLiteral(c.sampleValue, c.type);
          return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
        }).join('\n') + '\n\n';
    }

    const whereClause = whereCols.length > 0
      ? '\nWHERE ' + whereCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join('\n  AND ')
      : '\n-- WARNING: NO WHERE CLAUSE SPECIFIED';

    let body = '';
    if (isSoft) {
      body = `UPDATE ${table}\nSET ${this.formatIdentifier(softDelCol)} = 0${whereClause};`;
    } else {
      body = `DELETE FROM ${table}${whereClause};`;
    }

    return varDecls + body;
  });

  // 5. UPSERT / MERGE QUERY
  upsertSql = computed(() => {
    const cols = this.columns();
    const insCols = cols.filter(c => c.selectedInInsert);
    const updCols = cols.filter(c => c.selectedInUpdate);
    const whereCols = cols.filter(c => c.isWhereKey);
    const table = this.fullTableName;
    const declareVars = this.declareVarsAtTop();
    const guard = this.guardCondition();

    let varDecls = '';
    if (declareVars) {
      const varsToDeclare = Array.from(new Set([...insCols, ...updCols, ...whereCols]));
      varDecls = '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        varsToDeclare.map(c => {
          const sample = this.formatSqlLiteral(c.sampleValue, c.type);
          return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
        }).join('\n') + '\n\n';
    }

    if (guard === 'merge') {
      // ANSI / T-SQL MERGE statement
      const matchKey = whereCols.length > 0 ? whereCols : [cols[0]];
      const onCondition = matchKey.map(k => `Target.${this.formatIdentifier(k.name)} = Source.${this.formatIdentifier(k.name)}`).join(' AND ');
      const setClauses = updCols.map(c => `    Target.${this.formatIdentifier(c.name)} = Source.${this.formatIdentifier(c.name)}`).join(',\n');
      const insNames = insCols.map(c => this.formatIdentifier(c.name)).join(', ');
      const insValues = insCols.map(c => `Source.${this.formatIdentifier(c.name)}`).join(', ');

      const sourceCols = Array.from(new Set([...matchKey, ...insCols, ...updCols]));
      const sourceSelect = sourceCols.map(c => `@${c.name} AS ${this.formatIdentifier(c.name)}`).join(', ');

      const mergeBody = `MERGE INTO ${table} AS Target\n` +
        `USING (SELECT ${sourceSelect}) AS Source\n` +
        `ON (${onCondition})\n` +
        `WHEN MATCHED THEN\n` +
        `    UPDATE SET\n${setClauses}\n` +
        `WHEN NOT MATCHED THEN\n` +
        `    INSERT (${insNames})\n` +
        `    VALUES (${insValues});`;

      return varDecls + mergeBody;
    }

    // Classic IF EXISTS ... UPDATE ... ELSE ... INSERT ...
    const checkCols = whereCols.length > 0 ? whereCols : [cols[0]];
    const checkCondition = checkCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join(' AND ');
    const setClauses = updCols.map(c => `        ${this.formatIdentifier(c.name)} = @${c.name}`).join(',\n');
    const whereClause = checkCols.map(c => `${this.formatIdentifier(c.name)} = @${c.name}`).join(' AND ');

    const insNames = insCols.map(c => this.formatIdentifier(c.name)).join(', ');
    const insValues = insCols.map(c => `@${c.name}`).join(', ');

    const ifExistsBody = `IF EXISTS (\n    SELECT 1 FROM ${table} WHERE ${checkCondition}\n)\n` +
      `BEGIN\n` +
      `    UPDATE ${table}\n` +
      `    SET\n${setClauses}\n` +
      `    WHERE ${whereClause};\n` +
      `END\n` +
      `ELSE\n` +
      `BEGIN\n` +
      `    INSERT INTO ${table} (${insNames})\n` +
      `    VALUES (${insValues});\n` +
      `END`;

    return varDecls + ifExistsBody;
  });

  // 6. SSMS BATCH DATA QUERY (INSERT / UPDATE FROM PASTED GRID)
  ssmsBatchSql = computed(() => {
    const data = this.parsedSsmsData();
    const cols = this.columns();
    const table = this.fullTableName;
    const whereCols = cols.filter(c => c.isWhereKey);

    if (data.headers.length === 0 || data.rows.length === 0) {
      return `-- No SSMS tabular data detected.\n-- Paste rows copied with headers from SSMS grid (Tab-separated) into the SSMS Data Input box.`;
    }

    // Map headers to table columns
    const matchedHeaders = data.headers.map((h, colIdx) => {
      const cleanH = h.toLowerCase();
      const colDef = cols.find(c => c.name.toLowerCase() === cleanH) || {
        name: h,
        type: 'VARCHAR',
        fullType: 'VARCHAR(255)',
        nullable: true,
        isPrimaryKey: false,
        isIdentity: false,
        selectedInInsert: true,
        selectedInUpdate: true,
        isWhereKey: colIdx === 0
      };
      return { headerName: h, colIdx, colDef };
    });

    const insertCols = matchedHeaders.filter(h => h.colDef.selectedInInsert);
    const colNamesSql = insertCols.map(h => this.formatIdentifier(h.colDef.name)).join(', ');

    // Generate batch INSERT VALUES (...)
    const valueRows: string[] = [];
    for (const row of data.rows) {
      const rowVals = insertCols.map(h => {
        const rawVal = row[h.colIdx] !== undefined ? row[h.colIdx] : '';
        return this.formatSqlLiteral(rawVal, h.colDef.type);
      });
      valueRows.push(`    (${rowVals.join(', ')})`);
    }

    const batchInsert = `-- =============================================\n` +
      `-- Batch INSERT (${data.rows.length} rows from SSMS grid)\n` +
      `-- =============================================\n` +
      `INSERT INTO ${table} (\n    ${colNamesSql}\n)\nVALUES\n${valueRows.join(',\n')};`;

    // Also generate Batch UPDATE statements if where key is available
    const keyHeader = matchedHeaders.find(h => h.colDef.isWhereKey) || matchedHeaders[0];
    const updateCols = matchedHeaders.filter(h => h !== keyHeader && h.colDef.selectedInUpdate);

    let batchUpdate = '';
    if (keyHeader && updateCols.length > 0) {
      const updateStatements = data.rows.map(row => {
        const keyVal = this.formatSqlLiteral(row[keyHeader.colIdx], keyHeader.colDef.type);
        const setParts = updateCols.map(h => {
          const val = this.formatSqlLiteral(row[h.colIdx], h.colDef.type);
          return `${this.formatIdentifier(h.colDef.name)} = ${val}`;
        }).join(', ');
        return `UPDATE ${table} SET ${setParts} WHERE ${this.formatIdentifier(keyHeader.colDef.name)} = ${keyVal};`;
      });

      batchUpdate = `\n\n-- =============================================\n` +
        `-- Individual Batch UPDATEs (${data.rows.length} statements)\n` +
        `-- =============================================\n` +
        updateStatements.join('\n');
    }

    return batchInsert + batchUpdate;
  });

  // 7. ALL CRUD STATEMENTS COMBINED
  allCrudSql = computed(() => {
    return [
      `-- =============================================`,
      `-- SQL CRUD SCRIPT FOR: ${this.fullTableName}`,
      `-- Dialect: ${this.dialect().toUpperCase()}`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- =============================================\n`,
      `-- 1. SELECT Query`,
      this.selectSql(),
      `\n-- 2. INSERT Query`,
      this.insertSql(),
      `\n-- 3. UPDATE Query`,
      this.updateSql(),
      `\n-- 4. DELETE Query`,
      this.deleteSql(),
      `\n-- 5. UPSERT / MERGE Query`,
      this.upsertSql()
    ].join('\n');
  });

  // Raw Active SQL based on active output tab
  activeRawSql = computed(() => {
    const tab = this.activeOutputTab();
    switch (tab) {
      case 'all': return this.allCrudSql();
      case 'select': return this.selectSql();
      case 'insert': return this.insertSql();
      case 'update': return this.updateSql();
      case 'delete': return this.deleteSql();
      case 'upsert': return this.upsertSql();
      case 'ssms_batch': return this.ssmsBatchSql();
      default: return this.allCrudSql();
    }
  });

  // Formatted Output SQL
  generatedSql = computed(() => {
    const raw = this.activeRawSql();
    if (!raw) return '';

    const formatMode = this.outputFormat();
    if (formatMode === 'minified') {
      return minifySql(raw);
    }
    if (formatMode === 'compact') {
      return compactSql(raw, { uppercaseKeywords: true });
    }

    try {
      return formatSql(raw, {
        dialect: this.dialect(),
        uppercaseKeywords: true,
        breakOnCommas: true,
        indent: '2 spaces'
      });
    } catch {
      return raw;
    }
  });

  // Copy to Clipboard
  copySql() {
    const sql = this.generatedSql();
    if (sql) {
      navigator.clipboard.writeText(sql);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  // Download SQL File
  downloadSql() {
    const sql = this.generatedSql();
    if (!sql) return;
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.tableName() || 'query'}_${this.activeOutputTab()}.sql`);
    link.click();
    URL.revokeObjectURL(url);
  }
}
