import { Component, Injector, Input, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';
import { formatCsharp, CsharpFormatOptions } from '../../../core/engines/csharp-formatter-engine';

export { formatCsharp, type CsharpFormatOptions };

@Component({
  selector: 'app-csharp-formatter',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, CodeEditor],
  templateUrl: './csharp-formatter.html',
  styleUrls: ['./csharp-formatter.css']
})
export class CsharpFormatter implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal('public class User { public int Id { get; set; } public string Name { get; set; } }');
  result = signal('');
  copied = signal(false);
  private toolState = signal<ToolState | null>(null);

  constructor(private instanceService: InstanceService, private injector: Injector) {
    effect(() => {
      this.options();
      this.format();
    });
  }

  options = computed<CsharpFormatOptions>(() => {
    const options = this.toolState()?.state().options ?? defaultToolStateFor('csharp-formatter')!.options;
    const style = (options['braceStyle'] as 'allman' | 'kr') || 'allman';
    const indent = options['indent'] === '2 spaces' ? 2 : 4;
    return { braceStyle: style, indentSize: indent };
  });

  ngOnInit() {
    const toolState = new ToolState(this.instanceService, this.instanceId, 'csharp-formatter');
    this.toolState.set(toolState);
    toolState.connect(
      () => ({ input: { document: this.input() }, output: { document: this.result() }, options: toolState.state().options }),
      (state) => {
        this.input.set(state.input['document']);
        this.result.set(state.output['document']);
      },
      this.injector,
    );
    this.format();
  }

  onInputChange(value: string) {
    this.input.set(value);
    this.format();
  }

  clear() {
    this.input.set('');
    this.result.set('');
  }

  copyResult() {
    const text = this.result();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      });
    }
  }

  format() {
    const raw = this.input();
    if (!raw.trim()) {
      this.result.set('');
      return;
    }
    const cfg = this.options();
    this.result.set(formatCsharp(raw, {
      braceStyle: cfg.braceStyle ?? 'allman',
      indentSize: cfg.indentSize ?? 4,
    }));
  }
}
