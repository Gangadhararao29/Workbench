import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-json-diff', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './json-diff.html', styleUrls: ['./json-diff.css']
})
export class JsonDiff {
  @Input({ required: true }) instanceId!: string;
  left = signal('{"name":"Ada","age":30}');
  right = signal('{"name":"Ada","age":31,"active":true}');
  result = signal('');
  compare() {
    try {
      const a = JSON.parse(this.left());
      const b = JSON.parse(this.right());
      const changes: string[] = [];
      diffValue('', a, b, changes);
      this.result.set(changes.length ? changes.join('\n') : 'No differences found.');
    } catch (error) { this.result.set(`Invalid JSON: ${(error as Error).message}`); }
  }
}
function diffValue(path: string, left: any, right: any, changes: string[]) {
  if (JSON.stringify(left) === JSON.stringify(right)) return;
  if (left === undefined) { changes.push(`Added ${path}: ${JSON.stringify(right)}`); return; }
  if (right === undefined) { changes.push(`Removed ${path}: ${JSON.stringify(left)}`); return; }
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    keys.forEach(key => diffValue(path ? `${path}.${key}` : key, left[key], right[key], changes));
    return;
  }
  changes.push(`Changed ${path}: ${JSON.stringify(left)} -> ${JSON.stringify(right)}`);
}
