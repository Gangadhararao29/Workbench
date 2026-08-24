import { Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-sql-generator', standalone: true, imports: [FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './sql-generator.html', styleUrls: ['./sql-generator.css']
})
export class SqlGenerator implements OnInit {
  @Input({ required: true }) instanceId!: string;
  table = 'Users';
  columns = 'Id\nName\nEmail\nCreatedAt';
  whereColumn = 'Id';
  joinTable = '';
  joinColumn = 'UserId';
  pageSize = 20;
  result = signal('');

  ngOnInit() {
    this.generate();
  }
  generate() {
    const table = this.table.trim() || 'TableName';
    const names = this.columns.split(/[\n,]+/).map(value => value.trim()).filter(Boolean);
    if (!names.length) { this.result.set('Enter at least one column.'); return; }
    const list = names.join(', ');
    const values = names.map(name => `@${name}`).join(', ');
    const assignments = names.map(name => `${name} = @${name}`).join(',\n    ');
    const key = names.find(name => /^id$/i.test(name)) ?? names[0];
    const filter = this.whereColumn.trim() || key;
    const join = this.joinTable.trim() ? `\nLEFT JOIN ${this.joinTable.trim()} j ON j.${this.joinColumn.trim() || key} = ${table}.${key}` : '';
    this.result.set([
      `SELECT ${list}\nFROM ${table}${join};`,
      `INSERT INTO ${table} (${list})\nVALUES (${values});`,
      `UPDATE ${table}\nSET ${assignments}\nWHERE ${filter} = @${filter};`,
      `DELETE FROM ${table}\nWHERE ${filter} = @${filter};`,
      `SELECT ${list}\nFROM ${table}${join}\nORDER BY ${key}\nOFFSET @Skip ROWS FETCH NEXT ${Math.max(1, Number(this.pageSize) || 20)} ROWS ONLY;`
    ].join('\n\n'));
  }
}
