import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { convertJsonToTypescript } from '../../../core/engines/json-typescript-engine';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

const DEFAULT_STATE = defaultToolStateFor('json-to-typescript')!;

@Component({
  selector: 'app-json-to-typescript',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './json-to-typescript.html',
  styleUrls: ['./json-to-typescript.css']
})
export class JsonToTypescript implements OnInit {
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
      const output = await convertJsonToTypescript(
        this.options()['rootName'] || 'Root',
        raw,
        this.options()['outputType'] === 'type',
      );
      this.toolState()?.updateOutput({ document: output });
    } catch (error) {
      this.toolState()?.updateOutput({ document: `Invalid JSON: ${(error as Error).message}` });
    }
  }
}
