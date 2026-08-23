import { Component, Input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { InstanceService } from '../../../core/instance-service';
import { pascalCase } from '../../../core/engines/code-naming';

interface SqlColumn { name: string; type: string; nullable: boolean; }

@Component({
  selector: 'app-sql-to-csharp', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './sql-to-csharp.html', styleUrls: ['./sql-to-csharp.css']
})
export class SqlToCsharp {
  @Input({ required: true }) instanceId!: string;
  readonly toolName = 'SQL to C#';
  input = signal('CREATE TABLE Users (\n  Id INT NOT NULL,\n  Name NVARCHAR(200) NULL,\n  CreatedAt DATETIME2 NOT NULL\n);');
  result = signal('');
  constructor(private instanceService: InstanceService) {}
  config = computed(() => this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {});
  convert() {
    const source = this.input();
    const table = source.match(/CREATE\s+TABLE\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(([\s\S]+)\)/i);
    const columns = table ? parseColumns(table[2]) : parseSelect(source);
    if (!columns.length) { this.result.set('No SQL columns found. Use CREATE TABLE or SELECT column syntax.'); return; }
    const name = table?.[1] ?? this.config()['className'] ?? 'QueryResult';
    this.result.set(render(name, columns, this.config()));
  }
}
function parseColumns(body: string): SqlColumn[] {
  return body.split(',').map(line => line.trim()).map(line => {
    const match = line.match(/^\[?(\w+)\]?\s+([\w]+(?:\s*\([^)]*\))?)(.*)$/i);
    if (!match || /^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|INDEX|KEY)$/i.test(match[1])) return null;
    return { name: match[1], type: match[2], nullable: !/NOT\s+NULL/i.test(match[3]) };
  }).filter((column): column is SqlColumn => column !== null);
}
function parseSelect(source: string): SqlColumn[] {
  const match = source.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!match) return [];
  return match[1].split(',').map(value => value.trim().split(/\s+AS\s+/i)).map(parts => ({ name: parts[1] ?? parts[0].split('.').pop() ?? 'Value', type: 'nvarchar', nullable: true }));
}
function render(name: string, columns: SqlColumn[], config: Record<string, any>): string {
  const kind = config['outputType'] ?? 'class';
  const properties = columns.map(column => `    public ${mapType(column.type)} ${pascalCase(column.name, 'Value')} { get; set; }${column.nullable ? ' //' : ''}`).join('\n');
  if (kind === 'record') return `public record ${pascalCase(name, 'GeneratedModel')}(\n${columns.map(column => `    ${mapType(column.type)} ${pascalCase(column.name, 'Value')},`).join('\n')}\n);`;
  const suffix = kind === 'ef' ? '\n\n// Add EF Core configuration and keys here.' : '';
  return `public class ${pascalCase(name, 'GeneratedModel')}\n{\n${properties}\n}${suffix}`;
}
function mapType(type: string): string {
  const base = type.toLowerCase().replace(/\s*\(.+\)/, '');
  const map: Record<string, string> = { int: 'int', bigint: 'long', smallint: 'short', tinyint: 'byte', bit: 'bool', decimal: 'decimal', numeric: 'decimal', money: 'decimal', float: 'double', real: 'float', datetime: 'DateTime', datetime2: 'DateTime', date: 'DateTime', uniqueidentifier: 'Guid', nvarchar: 'string', varchar: 'string', text: 'string' };
  return map[base] ?? 'object';
}
