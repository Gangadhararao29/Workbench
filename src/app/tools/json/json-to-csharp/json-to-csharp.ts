import { Component, Input, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { convertJsonToCsharp } from '../../../core/engines/json-csharp-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-json-to-csharp',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './json-to-csharp.html',
  styleUrls: ['./json-to-csharp.css']
})
export class JsonToCsharp {
  @Input({ required: true }) instanceId!: string;
  input = signal('{"id":1,"name":"Ada","active":true}');
  result = signal('');
  copied = signal(false);

  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  constructor(private instanceService: InstanceService) {}

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  async convert() {
    try {
      const raw = this.input().trim();
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') {
        this.result.set('The root JSON value must be an object or array.');
        return;
      }
      const rootName = this.config()['rootName'] || 'Root';
      const namespace = this.config()['namespace'] || 'Workbench.Models';
      const arrayType = this.config()['arrayType'] || 'list';
      this.result.set(await convertJsonToCsharp({ rootName, namespace, arrayType }, raw));
    } catch (error) {
      this.result.set(`Invalid JSON: ${(error as Error).message}`);
    }
  }
}
