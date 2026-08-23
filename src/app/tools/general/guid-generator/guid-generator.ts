import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-guid-generator',
  standalone: true,
  imports: [FormsModule, MatButtonModule],
  templateUrl: './guid-generator.html',
  styleUrls: ['./guid-generator.css']
})
export class GuidGenerator {
  @Input({ required: true }) instanceId!: string;
  count = 1;
  casing: 'lower' | 'upper' = 'lower';
  format: 'plain' | 'sql' | 'csharp' | 'json' | 'typescript' = 'plain';
  result = signal('');

  generate() {
    const values = Array.from({ length: Math.max(1, Math.min(1000, Number(this.count) || 1)) }, () => crypto.randomUUID());
    const normalized = this.casing === 'upper' ? values.map(value => value.toUpperCase()) : values;
    const quoted = normalized.map(value => `'${value}'`);
    switch (this.format) {
      case 'sql': this.result.set(`IN (\n  ${quoted.join(',\n  ')}\n)`); break;
      case 'csharp': this.result.set(`new[]\n{\n${normalized.map(value => `  Guid.Parse("${value}"),`).join('\n')}\n}`); break;
      case 'json': this.result.set(JSON.stringify(normalized, null, 2)); break;
      case 'typescript': this.result.set(`[\n${quoted.map(value => `  ${value},`).join('\n')}\n]`); break;
      default: this.result.set(normalized.join('\n'));
    }
  }
}
