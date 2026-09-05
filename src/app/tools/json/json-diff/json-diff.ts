import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { diffJson } from '../../../core/engines/json-diff-engine';

@Component({
  selector: 'app-json-diff',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './json-diff.html',
  styleUrls: ['./json-diff.css']
})
export class JsonDiff {
  @Input({ required: true }) instanceId!: string;
  left = signal('[\n  { "id": 1, "name": "Ada", "role": "admin" },\n  { "id": 2, "name": "Bob", "role": "user" }\n]');
  right = signal('[\n  { "id": 2, "name": "Bob", "role": "manager" },\n  { "id": 1, "name": "Ada", "role": "admin" },\n  { "id": 3, "name": "Charlie", "role": "guest" }\n]');
  result = signal('');

  arrayMode = signal<'index' | 'key'>('key');
  arrayKeyField = signal('id');

  setArrayMode(mode: 'index' | 'key') {
    this.arrayMode.set(mode);
    this.compare();
  }

  compare() {
    try {
      const { summary } = diffJson(this.left(), this.right(), {
        arrayMode: this.arrayMode(),
        arrayKeyField: this.arrayKeyField().trim() || 'id',
      });
      this.result.set(summary);
    } catch (error) {
      this.result.set(`Invalid JSON: ${(error as Error).message}`);
    }
  }
}
