import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';
import { formatJson, validateJson } from '../../../core/engines/json-engine';

@Component({
  selector: 'app-json-formatter',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './json-formatter.html',
  styleUrls: ['./json-formatter.css'],
})
export class JsonFormatter implements OnInit {
  @Input({ required: true }) instanceId!: string;

  private toolState = signal<ToolState | null>(null);
  input = computed(() => this.toolState()?.state().input['document'] ?? '');
  result = computed(() => this.toolState()?.state().output['document'] ?? '');
  copied = signal(false);
  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
  status = signal('');
  constructor(private instanceService: InstanceService) {}

  ngOnInit(): void {
    this.toolState.set(new ToolState(this.instanceService, this.instanceId));
    this.format();
  }

  onInputChange(value: string): void {
    this.toolState()?.updateInput({ document: value });
  }

  clear(): void {
    this.onInputChange('');
  }

  options = computed(() => this.toolState()?.state().options ?? {});

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
      this.toolState()?.updateOutput({ document: '' });
    } catch (e) {
      this.status.set('Invalid JSON: ' + (e as Error).message);
    }
  }

  private transform(compact: boolean) {
    try {
      const indent = this.options()['indent'] === '4 spaces' ? 4 : 2;
      this.toolState()?.updateOutput({
        document: formatJson(this.input(), {
          indent,
          sortKeys: Boolean(this.options()['sortKeys']),
          compact,
        }),
      });
      this.status.set('');
    } catch (e) {
      this.status.set('Invalid JSON: ' + (e as Error).message);
      this.toolState()?.updateOutput({ document: '' });
    }
  }
}
