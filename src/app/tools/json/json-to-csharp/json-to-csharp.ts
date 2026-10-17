import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { convertJsonToCsharp } from '../../../core/engines/json-csharp-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

const DEFAULT_STATE = defaultToolStateFor('json-to-csharp')!;

@Component({
  selector: 'app-json-to-csharp',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './json-to-csharp.html',
  styleUrls: ['./json-to-csharp.css']
})
export class JsonToCsharp implements OnInit {
  @Input({ required: true }) instanceId!: string;
  private toolState = signal<ToolState | null>(null);
  input = computed(() => this.toolState()?.state().input['document'] ?? DEFAULT_STATE.input['document']);
  result = computed(() => this.toolState()?.state().output['document'] ?? '');
  copied = signal(false);

  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  constructor(private instanceService: InstanceService) {}

  ngOnInit(): void {
    this.toolState.set(new ToolState(this.instanceService, this.instanceId));
  }

  options = computed(() => this.toolState()?.state().options ?? DEFAULT_STATE.options);

  onInputChange(value: string): void {
    this.toolState()?.updateInput({ document: value });
  }

  async convert() {
    try {
      const raw = this.input().trim();
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') {
        this.toolState()?.updateOutput({ document: 'The root JSON value must be an object or array.' });
        return;
      }
      const rootName = this.options()['rootName'] || 'Root';
      const namespace = this.options()['namespace'] || 'Workbench.Models';
      const arrayType = this.options()['arrayType'] || 'list';
      const output = await convertJsonToCsharp({ rootName, namespace, arrayType }, raw);
      this.toolState()?.updateOutput({ document: output });
    } catch (error) {
      this.toolState()?.updateOutput({ document: `Invalid JSON: ${(error as Error).message}` });
    }
  }
}
