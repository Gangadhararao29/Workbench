import { Component, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { InstanceService } from '../../../core/instance-service';
import { convertJsonToCsharp } from '../../../core/engines/json-csharp-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-json-to-csharp', standalone: true, imports: [MatButtonModule, CodeEditor],
  templateUrl: './json-to-csharp.html', styleUrls: ['./json-to-csharp.css']
})
export class JsonToCsharp {
  @Input({ required: true }) instanceId!: string;
  input = signal('{"id":1,"name":"Ada","active":true}');
  result = signal('');
  constructor(private instanceService: InstanceService) {}
  convert() {
    try {
      const value = JSON.parse(this.input());
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The root JSON value must be an object.');
      this.result.set(convertJsonToCsharp(this.instanceService.instances().find(i => i.id === this.instanceId)?.config['rootName'] || 'Root', value));
    } catch (error) { this.result.set(`Invalid JSON: ${(error as Error).message}`); }
  }
}
