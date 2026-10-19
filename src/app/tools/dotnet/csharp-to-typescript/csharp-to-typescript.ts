import { Component, Input, Injector, OnInit, computed, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { convertCsharpToTypescript } from '../../../core/engines/csharp-typescript-engine';
import { formatTypescript } from '../../../core/engines/typescript-formatter';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';

@Component({
  selector: 'app-csharp-to-typescript',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, CodeEditor],
  templateUrl: './csharp-to-typescript.html',
  styleUrls: ['./csharp-to-typescript.css']
})
export class CsharpToTypescript implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal(`public class UserDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; }
}`);
  result = signal('');
  error = signal('');
  copied = signal(false);
  private toolState = signal<ToolState | null>(null);
  private injector: Injector;

  private runId = 0;
  private lastOptionsSignature: string | null = null;

  constructor(private instanceService: InstanceService, injector: Injector) {
    this.injector = injector;
    effect(() => {
      if (!this.toolState()) return;
      const signature = JSON.stringify(this.options());
      if (signature === this.lastOptionsSignature) return;
      this.lastOptionsSignature = signature;
      untracked(() => this.format());
    });
  }

  options = computed(() => this.toolState()?.state().options ?? {});

  ngOnInit() {
    const toolState = new ToolState(this.instanceService, this.instanceId, 'csharp-to-typescript');
    this.toolState.set(toolState);
    toolState.connect(
      () => ({
        input: { document: this.input() },
        output: { document: this.result(), error: this.error() },
        options: this.options(),
      }),
      (state) => {
        this.input.set(state.input['document']);
        this.result.set(state.output['document']);
        this.error.set(state.output['error']);
      },
      this.injector,
    );
  }

  onInputChange(value: string) {
    this.input.set(value);
    this.format();
  }

  clear() {
    this.input.set('');
    this.result.set('');
    this.error.set('');
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

  async format() {
    const raw = this.input().trim();
    if (!raw) {
      this.result.set('');
      this.error.set('');
      return;
    }

    const currentRun = ++this.runId;
    try {
      const result = await convertCsharpToTypescript(raw, this.options());
      if (currentRun !== this.runId) return;

      if (!result.trim()) {
        this.error.set('No C# classes, records, or enums found.');
        return;
      }

      this.error.set('');
      this.result.set(await formatTypescript(result));
    } catch (error) {
      if (currentRun !== this.runId) return;
      this.error.set((error as Error).message);
    }
  }
}
