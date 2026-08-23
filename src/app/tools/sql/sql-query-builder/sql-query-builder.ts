import { Component, Input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  condition: string;
}

interface WhereClause {
  conjunction: 'AND' | 'OR';
  column: string;
  operator: string;
  value: string;
}

interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

interface DataPair {
  column: string;
  value: string;
}

@Component({
  selector: 'app-sql-query-builder',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './sql-query-builder.html',
  styleUrls: ['./sql-query-builder.css']
})
export class SqlQueryBuilder {
  @Input({ required: true }) instanceId!: string;

  queryType = signal<'select' | 'insert' | 'update' | 'delete'>('select');
  tableName = signal('users');
  dialect = signal<'standard' | 'mysql' | 'tsql' | 'sqlite'>('standard');

  // SELECT configurations
  columns = signal('*');
  joins = signal<JoinClause[]>([]);
  wheres = signal<WhereClause[]>([]);
  orderBys = signal<OrderByClause[]>([]);
  limit = signal('');
  offset = signal('');

  // INSERT / UPDATE configurations
  dataPairs = signal<DataPair[]>([
    { column: 'name', value: 'Ada Lovelace' },
    { column: 'email', value: 'ada@example.com' }
  ]);

  setQueryType(type: 'select' | 'insert' | 'update' | 'delete') {
    this.queryType.set(type);
    // Auto populate sample where query if empty for better usability
    if ((type === 'update' || type === 'delete') && this.wheres().length === 0) {
      this.wheres.set([{ conjunction: 'AND', column: 'id', operator: '=', value: '1' }]);
    }
  }

  setDialect(dial: 'standard' | 'mysql' | 'tsql' | 'sqlite') {
    this.dialect.set(dial);
  }

  // JOINS management
  addJoin() {
    this.joins.update(list => [...list, { type: 'INNER', table: '', condition: '' }]);
  }

  removeJoin(index: number) {
    this.joins.update(list => list.filter((_, i) => i !== index));
  }

  // WHERES management
  addWhere() {
    this.wheres.update(list => [...list, { conjunction: 'AND', column: '', operator: '=', value: '' }]);
  }

  removeWhere(index: number) {
    this.wheres.update(list => list.filter((_, i) => i !== index));
  }

  // ORDER BY management
  addOrderBy() {
    this.orderBys.update(list => [...list, { column: '', direction: 'ASC' }]);
  }

  removeOrderBy(index: number) {
    this.orderBys.update(list => list.filter((_, i) => i !== index));
  }

  // DATA PAIRS management
  addPair() {
    this.dataPairs.update(list => [...list, { column: '', value: '' }]);
  }

  removePair(index: number) {
    this.dataPairs.update(list => list.filter((_, i) => i !== index));
  }

  // Copy compiled SQL to clipboard
  copySql() {
    const sql = this.generatedSql();
    if (sql) {
      navigator.clipboard.writeText(sql);
    }
  }

  // Reset to default sample
  reset() {
    this.queryType.set('select');
    this.tableName.set('users');
    this.dialect.set('standard');
    this.columns.set('*');
    this.joins.set([]);
    this.wheres.set([]);
    this.orderBys.set([]);
    this.limit.set('');
    this.offset.set('');
    this.dataPairs.set([
      { column: 'name', value: 'Ada Lovelace' },
      { column: 'email', value: 'ada@example.com' }
    ]);
  }

  // Dynamic SQL generation
  generatedSql = computed(() => {
    const type = this.queryType();
    const table = this.tableName().trim() || 'table_name';
    const dial = this.dialect();

    if (type === 'select') {
      let selectClause = 'SELECT';
      
      const limitVal = this.limit().trim();
      if (dial === 'tsql' && limitVal) {
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
      const wheresList = this.wheres();
      if (wheresList.length > 0) {
        let whereSql = '';
        for (let i = 0; i < wheresList.length; i++) {
          const w = wheresList[i];
          if (w.column.trim()) {
            const conj = i === 0 ? 'WHERE' : w.conjunction;
            const op = w.operator;
            const val = w.value.trim();
            
            let formattedVal = val;
            if (op !== 'IS NULL' && op !== 'IS NOT NULL') {
              if (val === '') {
                formattedVal = "''";
              } else if (
                isNaN(Number(val)) && 
                val.toLowerCase() !== 'true' && 
                val.toLowerCase() !== 'false' && 
                val.toLowerCase() !== 'null' && 
                !val.startsWith("'") && 
                !val.endsWith("'")
              ) {
                formattedVal = `'${val}'`;
              }
            } else {
              formattedVal = '';
            }

            whereSql += `\n  ${conj} ${w.column.trim()} ${op}${formattedVal ? ' ' + formattedVal : ''}`;
          }
        }
        if (whereSql) {
          sql += ` ${whereSql}`;
        }
      }

      // Add ORDER BY
      const orderList = this.orderBys();
      const orderClauses = orderList
        .filter(o => o.column.trim())
        .map(o => `${o.column.trim()} ${o.direction}`);
      if (orderClauses.length > 0) {
        sql += `\nORDER BY ${orderClauses.join(', ')}`;
      }

      // Add LIMIT & OFFSET (non T-SQL)
      if (dial !== 'tsql' && limitVal) {
        sql += `\nLIMIT ${limitVal}`;
      }
      const offsetVal = this.offset().trim();
      if (offsetVal) {
        if (dial === 'tsql') {
          if (orderClauses.length === 0) {
            sql += `\nORDER BY (SELECT NULL)`;
          }
          sql += `\nOFFSET ${offsetVal} ROWS`;
          if (limitVal) {
            sql += ` FETCH NEXT ${limitVal} ROWS ONLY`;
          }
        } else {
          sql += `\nOFFSET ${offsetVal}`;
        }
      }

      return sql + ';';
    }

    if (type === 'insert') {
      const pairs = this.dataPairs().filter(p => p.column.trim());
      if (pairs.length === 0) {
        return `INSERT INTO ${table} DEFAULT VALUES;`;
      }
      const cols = pairs.map(p => p.column.trim()).join(', ');
      const vals = pairs.map(p => {
        const v = p.value.trim();
        if (v === '') return "''";
        if (
          isNaN(Number(v)) && 
          v.toLowerCase() !== 'true' && 
          v.toLowerCase() !== 'false' && 
          v.toLowerCase() !== 'null' && 
          !v.startsWith("'") && 
          !v.endsWith("'")
        ) {
          return `'${v}'`;
        }
        return v;
      }).join(', ');
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
          const v = p.value.trim();
          let formattedVal = v;
          if (v === '') formattedVal = "''";
          else if (
            isNaN(Number(v)) && 
            v.toLowerCase() !== 'true' && 
            v.toLowerCase() !== 'false' && 
            v.toLowerCase() !== 'null' && 
            !v.startsWith("'") && 
            !v.endsWith("'")
          ) {
            formattedVal = `'${v}'`;
          }
          return `${col} = ${formattedVal}`;
        }).join(',\n    ');
      }

      let sql = `UPDATE ${table}\n${setClause}`;

      // Add WHERE filters for update
      const wheresList = this.wheres();
      if (wheresList.length > 0) {
        let whereSql = '';
        for (let i = 0; i < wheresList.length; i++) {
          const w = wheresList[i];
          if (w.column.trim()) {
            const conj = i === 0 ? 'WHERE' : w.conjunction;
            const op = w.operator;
            const val = w.value.trim();
            let formattedVal = val;
            if (op !== 'IS NULL' && op !== 'IS NOT NULL') {
              if (val === '') {
                formattedVal = "''";
              } else if (
                isNaN(Number(val)) && 
                val.toLowerCase() !== 'true' && 
                val.toLowerCase() !== 'false' && 
                val.toLowerCase() !== 'null' && 
                !val.startsWith("'") && 
                !val.endsWith("'")
              ) {
                formattedVal = `'${val}'`;
              }
            } else {
              formattedVal = '';
            }
            whereSql += `\n  ${conj} ${w.column.trim()} ${op}${formattedVal ? ' ' + formattedVal : ''}`;
          }
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
      const wheresList = this.wheres();
      if (wheresList.length > 0) {
        let whereSql = '';
        for (let i = 0; i < wheresList.length; i++) {
          const w = wheresList[i];
          if (w.column.trim()) {
            const conj = i === 0 ? 'WHERE' : w.conjunction;
            const op = w.operator;
            const val = w.value.trim();
            let formattedVal = val;
            if (op !== 'IS NULL' && op !== 'IS NOT NULL') {
              if (val === '') {
                formattedVal = "''";
              } else if (
                isNaN(Number(val)) && 
                val.toLowerCase() !== 'true' && 
                val.toLowerCase() !== 'false' && 
                val.toLowerCase() !== 'null' && 
                !val.startsWith("'") && 
                !val.endsWith("'")
              ) {
                formattedVal = `'${val}'`;
              }
            } else {
              formattedVal = '';
            }
            whereSql += `\n  ${conj} ${w.column.trim()} ${op}${formattedVal ? ' ' + formattedVal : ''}`;
          }
        }
        if (whereSql) {
          sql += ` ${whereSql}`;
        }
      }

      return sql + ';';
    }

    return '';
  });
}
