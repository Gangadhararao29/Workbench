import { Component, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { convertJsonToCsharp } from '../../../core/engines/json-csharp-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-json-to-csharp', standalone: true, imports: [MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './json-to-csharp.html', styleUrls: ['./json-to-csharp.css']
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
  convert() {
    try {
      const value = JSON.parse(this.input());
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The root JSON value must be an object.');
      this.result.set(convertJsonToCsharp(this.instanceService.instances().find(i => i.id === this.instanceId)?.config['rootName'] || 'Root', value));
    } catch (error) { this.result.set(`Invalid JSON: ${(error as Error).message}`); }
  }
}
