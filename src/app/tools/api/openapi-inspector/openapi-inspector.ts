import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { inspectOpenApi, OpenApiEndpoint } from '../../../core/engines/openapi-engine';

@Component({
  selector: 'app-openapi-inspector', standalone: true, imports: [FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './openapi-inspector.html', styleUrls: ['./openapi-inspector.css']
})
export class OpenapiInspector {
  @Input({ required: true }) instanceId!: string;
  input = signal('{"openapi":"3.0.0","paths":{"/users":{"get":{"summary":"List users"}}}}');
  endpoints = signal<OpenApiEndpoint[]>([]);
  schemas = signal<string[]>([]);
  error = signal('');
  inspect() {
    try {
      const inspection = inspectOpenApi(this.input());
      this.endpoints.set(inspection.endpoints);
      this.schemas.set(inspection.schemas);
      this.error.set('');
    } catch (error) { this.error.set(`Invalid OpenAPI JSON: ${(error as Error).message}`); this.endpoints.set([]); this.schemas.set([]); }
  }
}
