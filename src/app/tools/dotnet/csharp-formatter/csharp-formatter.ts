import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-csharp-formatter', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './csharp-formatter.html', styleUrls: ['./csharp-formatter.css']
})
export class CsharpFormatter {
  @Input({ required: true }) instanceId!: string;
  input = signal('public class User { public int Id { get; set; } public string Name { get; set; } }');
  result = signal('');
  format() {
    let depth = 0;
    const output: string[] = [];
    this.input().replace(/\s*(\{|\}|;|\n)\s*/g, '$1\n').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
      if (line.startsWith('}')) depth = Math.max(0, depth - 1);
      output.push(`${'    '.repeat(depth)}${line}`);
      if (line.endsWith('{')) depth++;
    });
    this.result.set(output.join('\n'));
  }
}
