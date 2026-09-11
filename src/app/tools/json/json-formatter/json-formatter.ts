import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { formatJson, validateJson } from '../../../core/engines/json-engine';

@Component({
  selector: 'app-json-formatter',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './json-formatter.html',
  styleUrls: ['./json-formatter.css']
})
export class JsonFormatter {
  @Input({ required: true }) instanceId!: string;

  input = signal('{"id":1,"name":"admin","roles":["read","write"]}');
  result = signal('');
  copied = signal(false);
  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
  status = signal('');
  constructor(private instanceService: InstanceService) {}

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config
  );

  format() {
    this.transform(false);
  }

  minify() {
    this.transform(true);
  }

  validate() {
    try {
      validateJson(this.input());
      this.status.set('Valid JSON');
      this.result.set('');
    } catch (e) {
      this.status.set('Invalid JSON: ' + (e as Error).message);
    }
  }

  private transform(compact: boolean) {
    try {
      const indent = this.config()?.['indent'] === '4 spaces' ? 4 : 2;
      this.result.set(formatJson(this.input(), {
        indent,
        sortKeys: Boolean(this.config()?.['sortKeys']),
        compact
      }));
      this.status.set('');
    } catch (e) {
      this.status.set('Invalid JSON: ' + (e as Error).message);
      this.result.set('');
    }
  }
}