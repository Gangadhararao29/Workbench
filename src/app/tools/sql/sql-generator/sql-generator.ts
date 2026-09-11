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
  originalSampleValue?: string; // pristine value from parse, used by Reset Defaults
  selectedInSelect: boolean;
  selectedInInsert: boolean;
  selectedInUpdate: boolean;
  isWhereKey: boolean;
}

export type SqlDialect = 'tsql' | 'postgres' | 'mysql' | 'sqlite';
export type GuardCondition = 'none' | 'if_not_exists' | 'if_exists_else' | 'merge';
export type OutputTab = 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'ssms_batch';
export type OutputFormat = 'formatted' | 'compact' | 'minified';

@Component({
  selector: 'app-sql-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    CodeEditor,
  ],
  templateUrl: './sql-generator.html',
  styleUrls: ['./sql-generator.css'],
})
export class SqlGenerator implements OnInit {
  @Input({ required: true }) instanceId!: string;

  // Mode and Inputs
  activeInputTab = signal<'ddl' | 'ssms'>('ddl');
  ddlInput = signal<string>('');
  ssmsInput = signal<string>('');

  // Table Schema State
  tableName = signal<string>('');
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
  activeOutputTab = signal<OutputTab>('select');
  outputFormat = signal<OutputFormat>('formatted');
  copied = signal<boolean>(false);
  isRegenerating = signal<boolean>(false);

  // Debounce timer handle for DDL parsing
  private _parseTimer: ReturnType<typeof setTimeout> | null = null;

  // Header Bulk Checkbox Reactive States
  allSelectedInSelect = computed(
    () => this.columns().length > 0 && this.columns().every((c) => c.selectedInSelect),
  );
  allSelectedInInsert = computed(
    () => this.columns().length > 0 && this.columns().every((c) => c.selectedInInsert),
  );
  allSelectedInUpdate = computed(
    () => this.columns().length > 0 && this.columns().every((c) => c.selectedInUpdate),
  );
  allSelectedInWhere = computed(
    () => this.columns().length > 0 && this.columns().every((c) => c.isWhereKey),
  );

  // Default sample content shown on load so both scenarios are demoable immediately
  private static readonly SAMPLE_DDL = `CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) NOT NULL,
    Username VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT (1),
    CreatedDate DATETIME NOT NULL DEFAULT (GETDATE()),
    CONSTRAINT PK_Users PRIMARY KEY (Id)
);`;

  private static readonly SAMPLE_SSMS = `Id\tUsername\tEmail\tIsActive\tCreatedDate
1\tjohn_doe\tjohn.doe@example.com\t1\t2026-01-15 10:30:00`;

  ngOnInit() {
    // Seed one sample DDL and one sample SSMS paste (1 row) by default
    this.ddlInput.set(SqlGenerator.SAMPLE_DDL);
    this.ssmsInput.set(SqlGenerator.SAMPLE_SSMS);

    // Build the column matrix from whichever input tab is active by default (DDL)
    this.parseDdl();
  }

  // Set active tabs
  setInputTab(tab: 'ddl' | 'ssms') {
    this.activeInputTab.set(tab);
    // Re-sync the column matrix from whichever input the user is switching to,
    // so SELECT/INSERT/UPDATE/etc. reflect @param (DDL) vs real values (SSMS).
    if (tab === 'ddl' && this.ddlInput().trim()) {
      this.parseDdl();
    } else if (tab === 'ssms' && this.ssmsInput().trim()) {
      this.onSsmsInputChange(this.ssmsInput());
    }
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

  // ==========================================
  // PARSER: DDL CREATE TABLE
  // ==========================================

  /** Debounced version: waits 150ms after last keystroke before parsing */
  parseDdlDebounced() {
    if (this._parseTimer) clearTimeout(this._parseTimer);
    this._parseTimer = setTimeout(() => {
      this._parseTimer = null;
      this.parseDdl();
    }, 150);
  }

  parseDdl() {
    const ddl = this.ddlInput().trim();
    if (!ddl) return;

    // ── 1. Extract Table Name & Schema using header-only regex ──────────────
    // We only match up to the first '(' so nested parens can't confuse it.
    const headerMatch = ddl.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?([\w$#]+)\]?\.)?\[?([\w$#]+)\]?\s*\(/i,
    );
    let schema = 'dbo';
    let table = 'TableName';

    if (headerMatch) {
      if (headerMatch[1]) schema = headerMatch[1];
      table = headerMatch[2];
    }

    this.tableSchema.set(schema);
    this.tableName.set(table);

    // ── 2. Extract Table Body via bracket-depth scan ────────────────────────
    // Find the position of the first '(' after CREATE TABLE name
    const bodyStart = headerMatch
      ? ddl.indexOf('(', headerMatch.index! + headerMatch[0].length - 1)
      : -1;

    let body = '';
    if (bodyStart !== -1) {
      let depth = 0;
      let bodyEnd = -1;
      for (let i = bodyStart; i < ddl.length; i++) {
        if (ddl[i] === '(') depth++;
        else if (ddl[i] === ')') {
          depth--;
          if (depth === 0) {
            bodyEnd = i;
            break;
          }
        }
      }
      body = bodyEnd !== -1 ? ddl.slice(bodyStart + 1, bodyEnd) : ddl.slice(bodyStart + 1);
    } else {
      // No CREATE TABLE header at all — treat entire input as column list
      body = ddl;
    }

    // ── 3. Extract Primary Key columns from table-level CONSTRAINT block ─────
    const pkSet = new Set<string>();
    const pkMatches = body.matchAll(
      /(?:CONSTRAINT\s+\[?\w+\]?\s+)?PRIMARY\s+KEY(?:\s+CLUSTERED|\s+NONCLUSTERED)?\s*\(([^)]+)\)/gi,
    );
    for (const match of pkMatches) {
      match[1].split(',').forEach((c) => {
        const col = c
          .trim()
          .replace(/^\[|\]$/g, '')
          .split(/\s+/)[0];
        if (col) pkSet.add(col.toLowerCase());
      });
    }

    // ── 4. Split body into individual column/constraint tokens ───────────────
    const lines = this.splitColumnLines(body);
    const parsedCols: SqlColumn[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Skip table-level constraints
      if (
        /^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|KEY\s+\w|CHECK)\b/i.test(cleanLine)
      ) {
        continue;
      }

      // ── Column pattern ──────────────────────────────────────────────────────
      // Captures:  [1] ColName   [2] fullType   [3] rest
      // Handles both plain types (INT, NVARCHAR(50)) and SSMS-bracketed types
      // ([int], [varchar](50), [datetime]) produced by SSMS "Script Table as".
      const colMatch = cleanLine.match(
        /^\[?([\w@#$]+)\]?\s+(\[?[A-Za-z_][\w]*\]?(?:\s*\([^)]*\))?)(\s[\s\S]*)?$/i,
      );
      if (!colMatch) continue;

      const colName = colMatch[1];
      // Normalize fullType: strip surrounding brackets from the base type name
      // e.g. [varchar](50) → varchar(50),  [int] → int
      const fullType = colMatch[2].trim().replace(/^\[([A-Za-z_][\w]*)\]/, '$1');
      const rest = colMatch[3] || '';

      // IDENTITY / SERIAL / AUTO_INCREMENT detection
      const isIdentity =
        /IDENTITY(?:\s*\([^)]*\))?/i.test(rest) ||
        /AUTO_INCREMENT/i.test(rest) ||
        /\bSERIAL\b/i.test(fullType);

      // Primary key detection: inline keyword OR table-level CONSTRAINT
      const isInlinePk = /\bPRIMARY\s+KEY\b/i.test(rest);
      const isPk = isInlinePk || pkSet.has(colName.toLowerCase());

      // Nullable — NOT NULL wins; PK columns are implicitly NOT NULL
      const nullable = !/\bNOT\s+NULL\b/i.test(rest) && !isPk;

      // ── Default value extraction ─────────────────────────────────────────
      // Handles: DEFAULT 1   DEFAULT ('USD')   DEFAULT (GETUTCDATE())
      // Strategy: find DEFAULT keyword, then collect the token or parenthesised
      // expression that follows it.
      let defaultValue: string | undefined;
      const defIdx = rest.search(/\bDEFAULT\b/i);
      if (defIdx !== -1) {
        const afterDef = rest.slice(defIdx + 7).trimStart();
        if (afterDef.startsWith('(')) {
          // Parenthesised default — walk to matching ')'
          let d = 0,
            end = 0;
          for (let k = 0; k < afterDef.length; k++) {
            if (afterDef[k] === '(') d++;
            else if (afterDef[k] === ')') {
              d--;
              if (d === 0) {
                end = k;
                break;
              }
            }
          }
          defaultValue = afterDef.slice(1, end).trim();
        } else {
          // Bare token default (e.g. DEFAULT 0, DEFAULT 'Active')
          defaultValue = afterDef.split(/[\s,)]/)[0].replace(/^'|'$/g, '');
        }
        if (defaultValue === '') defaultValue = undefined;
      }

      // Add CONSTRAINT inline default: CONSTRAINT [DF_x] DEFAULT (...)
      if (!defaultValue) {
        const constraintDef = rest.match(/CONSTRAINT\s+\[?\w+\]?\s+DEFAULT\s+\(([^)]+)\)/i);
        if (constraintDef) defaultValue = constraintDef[1].trim();
      }

      // Strip brackets + precision to get base type: [varchar](50) → VARCHAR
      const baseType = fullType
        .replace(/\s*\(.*$/, '')
        .replace(/^\[|\]$/g, '')
        .toUpperCase();
      const sampleVal = this.generateSampleValue(colName, baseType, defaultValue);

      parsedCols.push({
        name: colName,
        type: baseType,
        fullType: fullType,
        nullable,
        isPrimaryKey: isPk,
        isIdentity,
        defaultValue,
        sampleValue: sampleVal,
        originalSampleValue: sampleVal,
        selectedInSelect: true,
        selectedInInsert: !isIdentity,
        selectedInUpdate: !isIdentity && !isPk,
        isWhereKey: isPk,
      });
    }

    // If no PK detected, mark first Id-like column or first column as WHERE key
    if (parsedCols.length > 0 && !parsedCols.some((c) => c.isWhereKey)) {
      const idCol = parsedCols.find((c) => /^id$|_id$/i.test(c.name)) || parsedCols[0];
      idCol.isWhereKey = true;
    }

    this.columns.set(parsedCols);
  }

  /**
   * Splits the table body into individual column/constraint tokens.
   * Only splits on commas at bracket-depth 0 — never splits on newlines,
   * so multi-line column definitions stay intact.
   */
  private splitColumnLines(body: string): string[] {
    const lines: string[] = [];
    let current = '';
    let depth = 0;
    let inSingleQuote = false;

    for (let i = 0; i < body.length; i++) {
      const ch = body[i];

      if (ch === "'" && !inSingleQuote) {
        inSingleQuote = true;
        current += ch;
      } else if (ch === "'" && inSingleQuote) {
        // Handle escaped single quotes ('')
        if (body[i + 1] === "'") {
          current += "''";
          i++;
        } else {
          inSingleQuote = false;
          current += ch;
        }
      } else if (!inSingleQuote && ch === '(') {
        depth++;
        current += ch;
      } else if (!inSingleQuote && ch === ')') {
        depth--;
        current += ch;
      } else if (!inSingleQuote && depth === 0 && ch === ',') {
        // Top-level comma = column/constraint separator
        if (current.trim()) lines.push(current.trim());
        current = '';
      } else {
        // All other characters — including \r and \n — are part of current token
        current += ch;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  }

  /** Strips surrounding SQL parentheses and quotes from a column default definition. */
  cleanDefaultValue(def?: string): string {
    if (!def) return '';
    let val = def.trim();
    while (val.startsWith('(') && val.endsWith(')') && this.isBalancedParens(val.slice(1, -1))) {
      val = val.slice(1, -1).trim();
    }
    if (/^N?'.*'$/i.test(val)) {
      val = val.replace(/^N?'|'$/gi, '');
    }
    return val;
  }

  private isBalancedParens(s: string): boolean {
    let d = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') d++;
      else if (s[i] === ')') {
        d--;
        if (d < 0) return false;
      }
    }
    return d === 0;
  }

  private generateSampleValue(colName: string, type: string, def?: string): string {
    const lowerName = colName.toLowerCase();
    const lowerType = type.toLowerCase();

    if (def) {
      const clean = this.cleanDefaultValue(def);
      if (clean) {
        const upper = clean.toUpperCase();
        if (
          upper.includes('GETDATE') ||
          upper.includes('GETUTCDATE') ||
          upper.includes('CURRENT_TIMESTAMP') ||
          upper.includes('NOW()')
        ) {
          return '2026-08-28 12:00:00';
        }
        if (
          upper.includes('NEWID') ||
          upper.includes('UUID') ||
          upper.includes('GEN_RANDOM_UUID')
        ) {
          return 'A0E0B998-3E2A-4B6A-B6FD-89A82D201A94';
        }
        // If not a complex function call, return the parsed default value
        if (!clean.includes('(')) {
          return clean;
        }
      }
    }

    if (lowerName.includes('email')) return 'john.doe@example.com';
    if (lowerName.includes('username') || lowerName.includes('user_name')) return 'john_doe';
    if (lowerName.includes('firstname') || lowerName.includes('first_name')) return 'John';
    if (lowerName.includes('lastname') || lowerName.includes('last_name')) return 'Doe';
    if (lowerName.includes('phone')) return '+1-555-0199';
    if (lowerName.includes('role')) return 'Admin';
    if (lowerName.includes('status')) return 'Active';
    if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('total'))
      return '99.99';
    if (lowerName.includes('tax') || lowerName.includes('discount')) return '5.00';
    if (lowerName.includes('currency')) return 'USD';
    if (
      lowerName.includes('is') ||
      lowerName.includes('has') ||
      lowerType === 'bit' ||
      lowerType === 'bool' ||
      lowerType === 'boolean'
    )
      return '1';
    if (
      lowerType.includes('int') ||
      lowerType === 'bigint' ||
      lowerType === 'smallint' ||
      lowerType === 'tinyint'
    )
      return '1';
    if (
      lowerType.includes('decimal') ||
      lowerType.includes('numeric') ||
      lowerType.includes('money') ||
      lowerType.includes('float') ||
      lowerType.includes('double')
    )
      return '100.00';
    if (lowerType.includes('date') || lowerType.includes('time')) return '2026-08-28 12:00:00';
    if (
      lowerType.includes('uniqueidentifier') ||
      lowerType.includes('uuid') ||
      lowerType.includes('guid')
    )
      return 'A0E0B998-3E2A-4B6A-B6FD-89A82D201A94';

    return `Sample_${colName}`;
  }

  // ==========================================
  // BULK COLUMN ACTIONS
  // ==========================================
  toggleAllSelect(checked: boolean) {
    this.columns.update((cols) => cols.map((c) => ({ ...c, selectedInSelect: checked })));
  }

  toggleAllInsert(checked: boolean) {
    this.columns.update((cols) => cols.map((c) => ({ ...c, selectedInInsert: checked })));
  }

  toggleAllUpdate(checked: boolean) {
    this.columns.update((cols) => cols.map((c) => ({ ...c, selectedInUpdate: checked })));
  }

  toggleAllWhere(checked: boolean) {
    this.columns.update((cols) => cols.map((c) => ({ ...c, isWhereKey: checked })));
  }

  resetColumnDefaults() {
    if (this.activeInputTab() === 'ddl' && this.ddlInput().trim()) {
      // Re-parse DDL to restore true default schema, column selections, and sample/default values
      this.parseDdl();
    } else if (this.activeInputTab() === 'ssms' && this.ssmsInput().trim()) {
      // Re-parse SSMS data without altering active output tab
      const raw = this.ssmsInput().trim();
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t' : (firstLine.includes(',') ? ',' : '\t');
        const headers = firstLine
          .split(separator)
          .map((h) => h.trim().replace(/^\[|\]$/g, '').replace(/^"|"$/g, ''))
          .filter(Boolean);
        const firstDataRow = lines.length > 1 ? lines[1].split(separator).map((v) => v.trim()) : [];
        this.buildColumnsFromSsmsHeaders(headers, firstDataRow);
      }
    } else {
      // Fallback if no raw input is present
      this.columns.update((cols) => {
        const resetCols = cols.map((c) => ({
          ...c,
          selectedInSelect: true,
          selectedInInsert: !c.isIdentity,
          selectedInUpdate: !c.isIdentity && !c.isPrimaryKey,
          isWhereKey: c.isPrimaryKey,
          sampleValue: c.originalSampleValue ?? this.generateSampleValue(c.name, c.type, c.defaultValue),
        }));

        if (resetCols.length > 0 && !resetCols.some((c) => c.isWhereKey)) {
          const idCol = resetCols.find((c) => /^id$|_id$/i.test(c.name)) || resetCols[0];
          idCol.isWhereKey = true;
        }

        return resetCols;
      });
    }
  }

  updateColumnValue(index: number, field: keyof SqlColumn, value: any) {
    this.columns.update((cols) =>
      cols.map((col, i) => (i === index ? { ...col, [field]: value } : col)),
    );
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
    if (
      lowerType.includes('int') ||
      lowerType === 'bigint' ||
      lowerType === 'smallint' ||
      lowerType === 'tinyint'
    ) {
      return isNaN(Number(trimmed)) ? '0' : trimmed;
    }
    if (
      lowerType.includes('decimal') ||
      lowerType.includes('numeric') ||
      lowerType.includes('float') ||
      lowerType.includes('money')
    ) {
      return isNaN(Number(trimmed)) ? '0.00' : trimmed;
    }
    if (lowerType === 'bit' || lowerType === 'bool' || lowerType === 'boolean') {
      if (trimmed.toLowerCase() === 'true' || trimmed === '1')
        return this.dialect() === 'postgres' ? 'TRUE' : '1';
      if (trimmed.toLowerCase() === 'false' || trimmed === '0')
        return this.dialect() === 'postgres' ? 'FALSE' : '0';
      return trimmed;
    }

    const escaped = trimmed.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  /**
   * Returns the value expression to use for a column in generated SQL:
   * - DDL mode      → `@ColumnName`  (the caller/app supplies the value)
   * - SSMS paste mode → the real literal value from the pasted grid row
   * Falls back to `@ColumnName` if SSMS mode is active but no rows were parsed yet.
   */
  private valueExpr(c: SqlColumn): string {
    if (this.activeInputTab() === 'ssms' && this.parsedSsmsData().rows.length > 0) {
      return this.formatSqlLiteral(c.sampleValue, c.type);
    }
    return `@${c.name}`;
  }

  /** True when the generated SQL should use real literal values instead of @params. */
  get usingRealValues(): boolean {
    return this.activeInputTab() === 'ssms' && this.parsedSsmsData().rows.length > 0;
  }

  // ==========================================
  // SSMS GRID / TSV / CSV PARSER
  // ==========================================

  /** Called when SSMS textarea content changes.
   *  Auto-switches to ssms_batch output and updates the column matrix from headers. */
  onSsmsInputChange(value: string) {
    this.ssmsInput.set(value);
    const firstLine = value.trim().split(/\r?\n/)[0] || '';
    const isTabSep = firstLine.includes('\t');
    const isCommaSep = firstLine.split(',').length > 2;
    if (!isTabSep && !isCommaSep) return;

    this.activeOutputTab.set('ssms_batch');

    const separator = isTabSep ? '\t' : ',';
    const headers = firstLine
      .split(separator)
      .map((h) =>
        h
          .trim()
          .replace(/^\[|\]$/g, '')
          .replace(/^"|"$/g, ''),
      )
      .filter(Boolean);

    // Parse first data row to infer types
    const lines = value.trim().split(/\r?\n/).filter(Boolean);
    const firstDataRow = lines.length > 1 ? lines[1].split(separator).map((v) => v.trim()) : [];

    this.buildColumnsFromSsmsHeaders(headers, firstDataRow);
  }

  /** Builds the column matrix from pasted SSMS headers, inferring types from sample values. */
  private buildColumnsFromSsmsHeaders(headers: string[], sampleRow: string[] = []) {
    const parsedCols: SqlColumn[] = headers.map((h, i) => {
      const sampleVal = sampleRow[i] ?? '';
      const type = this.inferTypeFromValue(sampleVal, h);
      const fullType = this.typeToFullType(type);
      const isPk = i === 0 || /^id$|_id$/i.test(h);
      const resolvedSample = sampleVal || this.generateSampleValue(h, type, undefined);
      return {
        name: h,
        type,
        fullType,
        nullable: !isPk,
        isPrimaryKey: isPk,
        isIdentity: isPk && /^id$/i.test(h),
        defaultValue: undefined,
        sampleValue: resolvedSample,
        originalSampleValue: resolvedSample,
        selectedInSelect: true,
        selectedInInsert: !isPk,
        selectedInUpdate: !isPk,
        isWhereKey: isPk,
      };
    });
    this.columns.set(parsedCols);
  }

  /** Infers SQL type from a sample value string and column name hint. */
  private inferTypeFromValue(val: string, colName = ''): string {
    if (val === '' || val.toUpperCase() === 'NULL') {
      // Fall back to name-based guess
      if (/^is|^has|active|flag|bit$/i.test(colName)) return 'BIT';
      if (/date|time/i.test(colName)) return 'DATETIME';
      if (/id$|count|score|visits|qty|amount/i.test(colName)) return 'INT';
      return 'VARCHAR';
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return 'DATETIME';
    if (/^\d+\.\d+$/.test(val)) return 'DECIMAL';
    if (/^\d+$/.test(val)) {
      const n = parseInt(val, 10);
      if (n === 0 || n === 1) {
        if (/^is|^has|active|flag/i.test(colName)) return 'BIT';
      }
      return 'INT';
    }
    if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') return 'BIT';
    return 'VARCHAR';
  }

  /** Returns a default full type string for a base type. */
  private typeToFullType(type: string): string {
    switch (type) {
      case 'INT':
        return 'int';
      case 'BIGINT':
        return 'bigint';
      case 'BIT':
        return 'bit';
      case 'DECIMAL':
        return 'decimal(18,2)';
      case 'DATETIME':
        return 'datetime';
      default:
        return 'varchar(255)';
    }
  }

  parsedSsmsData = computed(() => {
    const raw = this.ssmsInput().trim();
    if (!raw) return { headers: [], rows: [] };

    // Auto-detect separator: prefer tab, then comma
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const separator = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : '\t';

    const headers = firstLine.split(separator).map((h) =>
      h
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/^"|"$/g, ''),
    );
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowParts = lines[i].split(separator).map((v) => v.trim().replace(/^"|"$/g, ''));
      if (rowParts.some((p) => p !== '')) rows.push(rowParts);
    }

    return { headers, rows };
  });

  // ==========================================
  // CODE GENERATION COMPUTEDS
  // ==========================================

  // 1. SELECT QUERY
  selectSql = computed(() => {
    const cols = this.columns();
    const selCols = cols.filter((c) => c.selectedInSelect);
    const whereCols = cols.filter((c) => c.isWhereKey);
    const table = this.fullTableName;
    const nolock = this.includeNolock() && this.dialect() === 'tsql' ? ' WITH (NOLOCK)' : '';

    const colList =
      selCols.length > 0
        ? selCols.map((c) => `    ${this.formatIdentifier(c.name)}`).join(',\n')
        : '    *';

    let whereClause = '';
    if (whereCols.length > 0) {
      whereClause =
        '\nWHERE ' +
        whereCols
          .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
          .join('\n  AND ');
    }

    let orderClause = '';
    if (this.includeOrderBy()) {
      const pk = cols.find((c) => c.isPrimaryKey) || cols[0];
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

  // 2. INSERT QUERY — simple parameterized @param style (no DECLARE, no SSMS data rows)
  insertSql = computed(() => {
    const cols = this.columns();
    const insCols = cols.filter((c) => c.selectedInInsert);
    const whereCols = cols.filter((c) => c.isWhereKey);
    const table = this.fullTableName;
    const guard = this.guardCondition();

    if (insCols.length === 0) {
      return `-- No columns selected for INSERT.\nINSERT INTO ${table} DEFAULT VALUES;`;
    }

    const colNames = insCols.map((c) => `    ${this.formatIdentifier(c.name)}`).join(',\n');
    const colValues = insCols.map((c) => `    ${this.valueExpr(c)}`).join(',\n');

    let body = `INSERT INTO ${table} (\n${colNames}\n)\nVALUES (\n${colValues}\n);`;

    if (guard === 'if_not_exists') {
      const checkCols = whereCols.length > 0 ? whereCols : insCols.slice(0, 1);
      const checkCondition = checkCols
        .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
        .join(' AND ');
      body =
        `IF NOT EXISTS (\n    SELECT 1 FROM ${table} WHERE ${checkCondition}\n)\n` +
        `BEGIN\n    INSERT INTO ${table} (\n    ` +
        insCols.map((c) => this.formatIdentifier(c.name)).join(', ') +
        `\n    )\n    VALUES (\n    ` +
        insCols.map((c) => this.valueExpr(c)).join(', ') +
        `\n    );\nEND`;
    }

    return body;
  });

  // 3. UPDATE QUERY
  updateSql = computed(() => {
    const cols = this.columns();
    const updCols = cols.filter((c) => c.selectedInUpdate);
    const whereCols = cols.filter((c) => c.isWhereKey);
    const table = this.fullTableName;
    const guard = this.guardCondition();
    const declareVars = this.declareVarsAtTop();

    if (updCols.length === 0) {
      return `-- No columns selected for UPDATE.`;
    }

    let varDecls = '';
    if (declareVars && this.activeInputTab() === 'ddl') {
      const varsToDeclare = Array.from(new Set([...updCols, ...whereCols]));
      varDecls =
        '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        varsToDeclare
          .map((c) => {
            const sample = this.formatSqlLiteral(c.sampleValue, c.type);
            return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
          })
          .join('\n') +
        '\n\n';
    }

    const setClauses = updCols
      .map((c) => `    ${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
      .join(',\n');
    const whereClause =
      whereCols.length > 0
        ? '\nWHERE ' +
          whereCols
            .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
            .join('\n  AND ')
        : '\n-- WARNING: NO WHERE CLAUSE SPECIFIED';

    let body = `UPDATE ${table}\nSET\n${setClauses}${whereClause};`;

    if (guard === 'if_not_exists' && whereCols.length > 0) {
      const checkCondition = whereCols
        .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
        .join(' AND ');
      body = `IF EXISTS (\n    SELECT 1 FROM ${table} WHERE ${checkCondition}\n)\nBEGIN\n    UPDATE ${table}\n    SET\n    ${setClauses}${whereClause};\nEND`;
    }

    return varDecls + body;
  });

  // 4. DELETE QUERY
  deleteSql = computed(() => {
    const cols = this.columns();
    const whereCols = cols.filter((c) => c.isWhereKey);
    const table = this.fullTableName;
    const declareVars = this.declareVarsAtTop();
    const softDelCol = this.softDeleteColumn();
    const isSoft = this.enableSoftDelete();

    let varDecls = '';
    if (declareVars && whereCols.length > 0 && this.activeInputTab() === 'ddl') {
      varDecls =
        '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        whereCols
          .map((c) => {
            const sample = this.formatSqlLiteral(c.sampleValue, c.type);
            return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
          })
          .join('\n') +
        '\n\n';
    }

    const whereClause =
      whereCols.length > 0
        ? '\nWHERE ' +
          whereCols
            .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
            .join('\n  AND ')
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
    const insCols = cols.filter((c) => c.selectedInInsert);
    const updCols = cols.filter((c) => c.selectedInUpdate);
    const whereCols = cols.filter((c) => c.isWhereKey);
    const table = this.fullTableName;
    const declareVars = this.declareVarsAtTop();
    const guard = this.guardCondition();

    let varDecls = '';
    if (declareVars && this.activeInputTab() === 'ddl') {
      const varsToDeclare = Array.from(new Set([...insCols, ...updCols, ...whereCols]));
      varDecls =
        '-- =============================================\n' +
        '-- Declare Variables\n' +
        '-- =============================================\n' +
        varsToDeclare
          .map((c) => {
            const sample = this.formatSqlLiteral(c.sampleValue, c.type);
            return `DECLARE @${c.name} ${c.fullType} = ${sample};`;
          })
          .join('\n') +
        '\n\n';
    }

    if (guard === 'merge') {
      // ANSI / T-SQL MERGE statement
      const matchKey = whereCols.length > 0 ? whereCols : [cols[0]];
      const onCondition = matchKey
        .map(
          (k) =>
            `Target.${this.formatIdentifier(k.name)} = Source.${this.formatIdentifier(k.name)}`,
        )
        .join(' AND ');
      const setClauses = updCols
        .map(
          (c) =>
            `    Target.${this.formatIdentifier(c.name)} = Source.${this.formatIdentifier(c.name)}`,
        )
        .join(',\n');
      const insNames = insCols.map((c) => this.formatIdentifier(c.name)).join(', ');
      const insValues = insCols.map((c) => `Source.${this.formatIdentifier(c.name)}`).join(', ');

      const sourceCols = Array.from(new Set([...matchKey, ...insCols, ...updCols]));
      const sourceSelect = sourceCols
        .map((c) => `${this.valueExpr(c)} AS ${this.formatIdentifier(c.name)}`)
        .join(', ');

      const mergeBody =
        `MERGE INTO ${table} AS Target\n` +
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
    const checkCondition = checkCols
      .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
      .join(' AND ');
    const setClauses = updCols
      .map((c) => `        ${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
      .join(',\n');
    const whereClause = checkCols
      .map((c) => `${this.formatIdentifier(c.name)} = ${this.valueExpr(c)}`)
      .join(' AND ');

    const insNames = insCols.map((c) => this.formatIdentifier(c.name)).join(', ');
    const insValues = insCols.map((c) => this.valueExpr(c)).join(', ');

    const ifExistsBody =
      `IF EXISTS (\n    SELECT 1 FROM ${table} WHERE ${checkCondition}\n)\n` +
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
    const whereCols = cols.filter((c) => c.isWhereKey);

    if (data.headers.length === 0 || data.rows.length === 0) {
      return `-- No SSMS tabular data detected.\n-- Paste rows copied with headers from SSMS grid (Tab-separated) into the SSMS Data Input box.`;
    }

    // Map headers to table columns
    const matchedHeaders = data.headers.map((h, colIdx) => {
      const cleanH = h.toLowerCase();
      const colDef = cols.find((c) => c.name.toLowerCase() === cleanH) || {
        name: h,
        type: 'VARCHAR',
        fullType: 'VARCHAR(255)',
        nullable: true,
        isPrimaryKey: false,
        isIdentity: false,
        selectedInInsert: true,
        selectedInUpdate: true,
        isWhereKey: colIdx === 0,
      };
      return { headerName: h, colIdx, colDef };
    });

    const insertCols = matchedHeaders.filter((h) => h.colDef.selectedInInsert);
    const colNamesSql = insertCols.map((h) => this.formatIdentifier(h.colDef.name)).join(', ');

    // Generate batch INSERT VALUES (...)
    const valueRows: string[] = [];
    for (const row of data.rows) {
      const rowVals = insertCols.map((h) => {
        const rawVal = row[h.colIdx] !== undefined ? row[h.colIdx] : '';
        return this.formatSqlLiteral(rawVal, h.colDef.type);
      });
      valueRows.push(`    (${rowVals.join(', ')})`);
    }

    const batchInsert =
      `-- =============================================\n` +
      `-- Batch INSERT (${data.rows.length} rows from SSMS grid)\n` +
      `-- =============================================\n` +
      `INSERT INTO ${table} (\n    ${colNamesSql}\n)\nVALUES\n${valueRows.join(',\n')};`;

    // Also generate Batch UPDATE statements if where key is available
    const keyHeader = matchedHeaders.find((h) => h.colDef.isWhereKey) || matchedHeaders[0];
    const updateCols = matchedHeaders.filter((h) => h !== keyHeader && h.colDef.selectedInUpdate);

    let batchUpdate = '';
    if (keyHeader && updateCols.length > 0) {
      const updateStatements = data.rows.map((row) => {
        const keyVal = this.formatSqlLiteral(row[keyHeader.colIdx], keyHeader.colDef.type);
        const setParts = updateCols
          .map((h) => {
            const val = this.formatSqlLiteral(row[h.colIdx], h.colDef.type);
            return `${this.formatIdentifier(h.colDef.name)} = ${val}`;
          })
          .join(', ');
        return `UPDATE ${table} SET ${setParts} WHERE ${this.formatIdentifier(keyHeader.colDef.name)} = ${keyVal};`;
      });

      batchUpdate =
        `\n\n-- =============================================\n` +
        `-- Individual Batch UPDATEs (${data.rows.length} statements)\n` +
        `-- =============================================\n` +
        updateStatements.join('\n');
    }

    return batchInsert + batchUpdate;
  });

  // Raw Active SQL based on active output tab
  activeRawSql = computed(() => {
    const tab = this.activeOutputTab();
    switch (tab) {
      case 'select':
        return this.selectSql();
      case 'insert':
        return this.insertSql();
      case 'update':
        return this.updateSql();
      case 'delete':
        return this.deleteSql();
      case 'upsert':
        return this.upsertSql();
      case 'ssms_batch':
        return this.ssmsBatchSql();
      default:
        return this.selectSql();
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
        indent: '2 spaces',
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
}
