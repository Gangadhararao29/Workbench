import { Component, Input, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { InstanceService } from '../../../core/instance-service';
import { convertJsonToTypescript } from '../../../core/engines/json-typescript-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-json-to-typescript',
  standalone: true,
  imports: [MatButtonModule, CodeEditor],
  templateUrl: './json-to-typescript.html',
  styleUrls: ['./json-to-typescript.css']
})
export class JsonToTypescript {
  @Input({ required: true }) instanceId!: string;
  input = signal('{"id":1,"name":"Ada","active":true,"roles":["admin"]}');
  result = signal('');

  constructor(private instanceService: InstanceService) {}

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  async convert() {
    try {
      const value: unknown = JSON.parse(this.input());
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        this.result.set('The root JSON value must be an object.');
        return;
      }
      this.result.set(await convertJsonToTypescript(this.config()['rootName'] || 'Root', value as Record<string, unknown>, this.config()['outputType'] === 'type'));
    } catch (error) {
      this.result.set(`Invalid JSON: ${(error as Error).message}`);
    }
  }
}
