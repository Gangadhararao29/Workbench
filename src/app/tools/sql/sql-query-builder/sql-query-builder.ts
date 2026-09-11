import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { formatSql, compactSql, minifySql } from '../../../core/engines/sql-formatter-engine';

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  table: string;
  condition: string;
}

export interface WhereClause {
  conjunction: 'AND' | 'OR' | 'AND NOT' | 'OR NOT';
  column: string;
  operator: '=' | '!=' | '<>' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' | 'BETWEEN' | 'IS NULL' | 'IS NOT NULL';
  value: string;
}

export interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
  nulls: '' | 'NULLS FIRST' | 'NULLS LAST';
}

export interface DataPair {
  column: string;
  value: string;
  isRaw?: boolean;
}

export type SqlDialect = 'standard' | 'mysql' | 'tsql' | 'sqlite' | 'oracle';
export type SqlOutputFormat = 'formatted' | 'compact' | 'minified';

@Component({
  selector: 'app-sql-query-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './sql-query-builder.html',
  styleUrls: ['./sql-query-builder.css']
})
export class SqlQueryBuilder {
  @Input({ required: true }) instanceId!: string;

  queryType = signal<'select' | 'insert' | 'update' | 'delete'>('select');
  tableName = signal('users');
  dialect = signal<SqlDialect>('standard');
  outputFormat = signal<SqlOutputFormat>('formatted');

  // SELECT configurations
  distinct = signal(false);
  columns = signal('*');
  joins = signal<JoinClause[]>([]);
  wheres = signal<WhereClause[]>([]);
  groupBy = signal('');
  having = signal('');
  orderBys = signal<OrderByClause[]>([]);
  limit = signal('');
  offset = signal('');

  // INSERT / UPDATE configurations
  dataPairs = signal<DataPair[]>([
    { column: 'name', value: 'Ada Lovelace' },
    { column: 'email', value: 'ada@example.com' },
    { column: 'role', value: 'admin' },
    { column: 'status', value: 'active' }
  ]);

  // UI States
  isRegenerating = signal(false);
  copied = signal(false);
  generationCounter = signal(0);

  // Unsafe query check (UPDATE / DELETE with no WHERE condition)
  isUnsafeQuery = computed(() => {
    const type = this.queryType();
    if (type !== 'update' && type !== 'delete') return false;
    const activeFilters = this.wheres().filter(w => w.column.trim().length > 0);
    return activeFilters.length === 0;
  });

  setQueryType(type: 'select' | 'insert' | 'update' | 'delete') {
    this.queryType.set(type);
    // Auto populate sample where query if empty for safety and convenience
    if ((type === 'update' || type === 'delete') && this.wheres().length === 0) {
      this.wheres.set([{ conjunction: 'AND', column: 'id', operator: '=', value: '1' }]);
    }
  }

  setDialect(dial: SqlDialect) {
    this.dialect.set(dial);
  }

  setOutputFormat(format: SqlOutputFormat) {
    this.outputFormat.set(format);
  }

  // Quick column helper
  setColumns(colString: string) {
    this.columns.set(colString);
  }

  // JOINS management
  addJoin() {
    this.joins.update(list => [...list, { type: 'INNER', table: '', condition: '' }]);
  }

  updateJoin<K extends keyof JoinClause>(index: number, key: K, val: JoinClause[K]) {
    this.joins.update(list => list.map((item, i) => i === index ? { ...item, [key]: val } : item));
  }

  removeJoin(index: number) {
    this.joins.update(list => list.filter((_, i) => i !== index));
  }

  // WHERES management
  addWhere() {
    this.wheres.update(list => [...list, { conjunction: 'AND', column: '', operator: '=', value: '' }]);
  }

  updateWhere<K extends keyof WhereClause>(index: number, key: K, val: WhereClause[K]) {
    this.wheres.update(list => list.map((item, i) => i === index ? { ...item, [key]: val } : item));
  }

  removeWhere(index: number) {
    this.wheres.update(list => list.filter((_, i) => i !== index));
  }

  // ORDER BY management
  addOrderBy() {
    this.orderBys.update(list => [...list, { column: '', direction: 'ASC', nulls: '' }]);
  }

  updateOrderBy<K extends keyof OrderByClause>(index: number, key: K, val: OrderByClause[K]) {
    this.orderBys.update(list => list.map((item, i) => i === index ? { ...item, [key]: val } : item));
  }

  removeOrderBy(index: number) {
    this.orderBys.update(list => list.filter((_, i) => i !== index));
  }

  // DATA PAIRS management
  addPair() {
    this.dataPairs.update(list => [...list, { column: '', value: '', isRaw: false }]);
  }

  updatePair<K extends keyof DataPair>(index: number, key: K, val: DataPair[K]) {
    this.dataPairs.update(list => list.map((item, i) => i === index ? { ...item, [key]: val } : item));
  }

  removePair(index: number) {
    this.dataPairs.update(list => list.filter((_, i) => i !== index));
  }

  // Manual regenerate action with feedback
  regenerate() {
    this.isRegenerating.set(true);
    this.generationCounter.update(c => c + 1);
    setTimeout(() => {
      this.isRegenerating.set(false);
    }, 350);
  }

  // Copy compiled SQL to clipboard
  copySql() {
    const sql = this.generatedSql();
    if (sql) {
      navigator.clipboard.writeText(sql);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  // Reset to default sample
  reset() {
    this.queryType.set('select');
    this.tableName.set('users');
    this.dialect.set('standard');
    this.distinct.set(false);
    this.columns.set('*');
    this.joins.set([]);
    this.wheres.set([]);
    this.groupBy.set('');
    this.having.set('');
    this.orderBys.set([]);
    this.limit.set('');
    this.offset.set('');
    this.dataPairs.set([
      { column: 'name', value: 'Ada Lovelace' },
      { column: 'email', value: 'ada@example.com' },
      { column: 'role', value: 'admin' },
      { column: 'status', value: 'active' }
    ]);
  }

  // Apply quick presets
  applyPreset(preset: 'select-complex' | 'select-aggregation' | 'insert' | 'update' | 'delete') {
    switch (preset) {
      case 'select-complex':
        this.queryType.set('select');
        this.tableName.set('users u');
        this.distinct.set(false);
        this.columns.set('u.id, u.name, u.email, COUNT(o.id) AS total_orders');
        this.joins.set([
          { type: 'LEFT', table: 'orders o', condition: 'o.user_id = u.id' }
        ]);
        this.wheres.set([
          { conjunction: 'AND', column: 'u.status', operator: '=', value: 'active' },
          { conjunction: 'AND', column: 'u.created_at', operator: '>=', value: '2025-01-01' }
        ]);
        this.groupBy.set('u.id, u.name, u.email');
        this.having.set('COUNT(o.id) > 0');
        this.orderBys.set([
          { column: 'total_orders', direction: 'DESC', nulls: '' },
          { column: 'u.name', direction: 'ASC', nulls: '' }
        ]);
        this.limit.set('25');
        this.offset.set('0');
        break;

      case 'select-aggregation':
        this.queryType.set('select');
        this.tableName.set('orders');
        this.distinct.set(false);
        this.columns.set('status, COUNT(*) AS count, SUM(amount) AS total_revenue, AVG(amount) AS avg_revenue');
        this.joins.set([]);
        this.wheres.set([
          { conjunction: 'AND', column: 'created_at', operator: '>=', value: '2025-01-01' }
        ]);
        this.groupBy.set('status');
        this.having.set('COUNT(*) >= 5');
        this.orderBys.set([{ column: 'total_revenue', direction: 'DESC', nulls: '' }]);
        this.limit.set('10');
        this.offset.set('');
        break;

      case 'insert':
        this.queryType.set('insert');
        this.tableName.set('users');
        this.dataPairs.set([
          { column: 'name', value: 'Alan Turing' },
          { column: 'email', value: 'alan@enigma.org' },
          { column: 'role', value: 'analyst' },
          { column: 'is_verified', value: 'true' },
          { column: 'created_at', value: 'NOW()', isRaw: true }
        ]);
        break;

      case 'update':
        this.queryType.set('update');
        this.tableName.set('users');
        this.dataPairs.set([
          { column: 'status', value: 'suspended' },
          { column: 'updated_at', value: 'NOW()', isRaw: true }
        ]);
        this.wheres.set([
          { conjunction: 'AND', column: 'failed_logins', operator: '>=', value: '5' },
          { conjunction: 'AND', column: 'is_admin', operator: '=', value: 'false' }
        ]);
        break;

      case 'delete':
        this.queryType.set('delete');
        this.tableName.set('audit_logs');
        this.wheres.set([
          { conjunction: 'AND', column: 'created_at', operator: '<', value: '2024-01-01' },
          { conjunction: 'AND', column: 'archived', operator: '=', value: 'true' }
        ]);
        break;
    }
  }

  // Format value based on SQL typing rules
  private formatValue(val: string, isRaw?: boolean, operator?: string): string {
    if (isRaw) return val;
    const trimmed = val.trim();

    if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
      return '';
    }

    if (operator === 'IN' || operator === 'NOT IN') {
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return trimmed;
      }
      const parts = trimmed.split(',').map(p => {
        const item = p.trim();
        if (item === '') return "''";
        if (this.isNumericOrKeyword(item)) return item;
        if (item.startsWith("'") && item.endsWith("'")) return item;
        return `'${item}'`;
      });
      return `(${parts.join(', ')})`;
    }

    if (operator === 'BETWEEN') {
      return trimmed;
    }

    if (trimmed === '') {
      return "''";
    }

    if (this.isNumericOrKeyword(trimmed)) {
      return trimmed;
    }

    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed;
    }

    // Escape single quotes inside string
    const escaped = trimmed.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  private isNumericOrKeyword(v: string): boolean {
    const lower = v.toLowerCase();
    if (lower === 'true' || lower === 'false' || lower === 'null' || lower === 'current_timestamp' || lower === 'now()') {
      return true;
    }
    if (!isNaN(Number(v)) && !v.includes(' ')) {
      return true;
    }
    return false;
  }

  // Dynamic SQL raw generation
  rawSql = computed(() => {
    // Read reactive signal values
    this.generationCounter();
    const type = this.queryType();
    const table = this.tableName().trim() || 'table_name';
    const dial = this.dialect();

    if (type === 'select') {
      let selectClause = 'SELECT';
      if (this.distinct()) {
        selectClause += ' DISTINCT';
      }

      const limitVal = this.limit().trim();
      if (dial === 'tsql' && limitVal && !this.offset().trim()) {
        selectClause += ` TOP (${limitVal})`;
      }

      const cols = this.columns().trim() || '*';
      selectClause += ` ${cols}`;

      let sql = `${selectClause}\nFROM ${table}`;

      // Add JOINS
      const joinsList = this.joins();
      for (const j of joinsList) {
        if (j.table.trim()) {
          const cond = j.condition.trim() ? ` ON ${j.condition.trim()}` : '';
          sql += `\n${j.type} JOIN ${j.table.trim()}${cond}`;
        }
      }

      // Add WHERES
      const wheresList = this.wheres().filter(w => w.column.trim());
      if (wheresList.length > 0) {
        let whereSql = '';
        for (let i = 0; i < wheresList.length; i++) {
          const w = wheresList[i];
          const conj = i === 0 ? 'WHERE' : w.conjunction;
          const op = w.operator;
          const formattedVal = this.formatValue(w.value, false, op);
          whereSql += `\n  ${conj} ${w.column.trim()} ${op}${formattedVal ? ' ' + formattedVal : ''}`;
        }
        if (whereSql) {
          sql += ` ${whereSql}`;
        }
      }

      // Add GROUP BY
      const groupByVal = this.groupBy().trim();
      if (groupByVal) {
        sql += `\nGROUP BY ${groupByVal}`;
      }

      // Add HAVING
      const havingVal = this.having().trim();
      if (havingVal) {
        sql += `\nHAVING ${havingVal}`;
      }

      // Add ORDER BY
      const orderList = this.orderBys().filter(o => o.column.trim());
      const orderClauses = orderList.map(o => {
        const nulls = o.nulls ? ` ${o.nulls}` : '';
        return `${o.column.trim()} ${o.direction}${nulls}`;
      });
      if (orderClauses.length > 0) {
        sql += `\nORDER BY ${orderClauses.join(', ')}`;
      }

      // Dialect-specific LIMIT / OFFSET / PAGINATION
      const offsetVal = this.offset().trim();
      if (dial === 'tsql') {
        if (offsetVal || limitVal) {
          if (orderClauses.length === 0) {
            sql += `\nORDER BY (SELECT NULL)`;
          }
          const actualOffset = offsetVal || '0';
          sql += `\nOFFSET ${actualOffset} ROWS`;
          if (limitVal) {
            sql += ` FETCH NEXT ${limitVal} ROWS ONLY`;
          }
        }
      } else if (dial === 'oracle') {
        if (offsetVal) {
          sql += `\nOFFSET ${offsetVal} ROWS`;
          if (limitVal) {
            sql += ` FETCH NEXT ${limitVal} ROWS ONLY`;
          }
        } else if (limitVal) {
          sql += `\nFETCH FIRST ${limitVal} ROWS ONLY`;
        }
      } else {
        if (limitVal) {
          sql += `\nLIMIT ${limitVal}`;
        }
        if (offsetVal) {
          sql += `\nOFFSET ${offsetVal}`;
        }
      }

      return sql + ';';
    }

    if (type === 'insert') {
      const pairs = this.dataPairs().filter(p => p.column.trim());
      if (pairs.length === 0) {
        if (dial === 'tsql' || dial === 'standard' || dial === 'sqlite') {
          return `INSERT INTO ${table} DEFAULT VALUES;`;
        }
        return `INSERT INTO ${table} () VALUES ();`;
      }
      const cols = pairs.map(p => p.column.trim()).join(', ');
      const vals = pairs.map(p => this.formatValue(p.value, p.isRaw)).join(', ');
      return `INSERT INTO ${table} (${cols})\nVALUES (${vals});`;
    }

    if (type === 'update') {
      const pairs = this.dataPairs().filter(p => p.column.trim());
      let setClause = 'SET ';
      if (pairs.length === 0) {
        setClause += 'column_name = value';
      } else {
        setClause += pairs.map(p => {
          const col = p.column.trim();
          const formattedVal = this.formatValue(p.value, p.isRaw);
          return `${col} = ${formattedVal}`;
        }).join(',\n    ');
      }

      let sql = `UPDATE ${table}\n${setClause}`;

      // Add WHERE filters for update
      const wheresList = this.wheres().filter(w => w.column.trim());
      if (wheresList.length > 0) {
        let whereSql = '';
        for (let i = 0; i < wheresList.length; i++) {
          const w = wheresList[i];
          const conj = i === 0 ? 'WHERE' : w.conjunction;
          const op = w.operator;
          const formattedVal = this.formatValue(w.value, false, op);
          whereSql += `\n  ${conj} ${w.column.trim()} ${op}${formattedVal ? ' ' + formattedVal : ''}`;
        }
        if (whereSql) {
          sql += ` ${whereSql}`;
        }
      }

      return sql + ';';
    }

    if (type === 'delete') {
      let sql = `DELETE FROM ${table}`;
      
      // Add WHERE filters for delete
      const wheresList = this.wheres().filter(w => w.column.trim());
      if (wheresList.length > 0) {
        let whereSql = '';
        for (let i = 0; i < wheresList.length; i++) {
          const w = wheresList[i];
          const conj = i === 0 ? 'WHERE' : w.conjunction;
          const op = w.operator;
          const formattedVal = this.formatValue(w.value, false, op);
          whereSql += `\n  ${conj} ${w.column.trim()} ${op}${formattedVal ? ' ' + formattedVal : ''}`;
        }
        if (whereSql) {
          sql += ` ${whereSql}`;
        }
      }

      return sql + ';';
    }

    return '';
  });

  // Generated SQL formatted or minified according to preference
  generatedSql = computed(() => {
    const raw = this.rawSql();
    if (!raw) return '';

    const formatMode = this.outputFormat();
    if (formatMode === 'minified') {
      return minifySql(raw);
    }

    if (formatMode === 'compact') {
      return compactSql(raw, {
        uppercaseKeywords: true
      });
    }

    // Default 'formatted' mode
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
}
