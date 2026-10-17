import { Component, Injector, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { convertCsharpToJson } from '../../../core/engines/csharp-json-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';

@Component({
  selector: 'app-csharp-to-json',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, CodeEditor],
  templateUrl: './csharp-to-json.html',
  styleUrls: ['./csharp-to-json.css']
})
export class CsharpToJson implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal('public class UserDto\n{\n  public int Id { get; set; }\n  public string Name { get; set; }\n  public DateTime CreatedAt { get; set; }\n  public bool IsActive { get; set; }\n}');
  result = signal('');
  error = signal('');
  copied = signal(false);
  private toolState!: ToolState;

  constructor(private instanceService: InstanceService, private injector: Injector) {}

  ngOnInit() {
    this.toolState = new ToolState(this.instanceService, this.instanceId, 'csharp-to-json');
    this.toolState.connect(
      () => ({
        input: { document: this.input() },
        output: { document: this.result(), error: this.error() },
        options: {},
      }),
      (state) => {
        this.input.set(state.input['document']);
        this.result.set(state.output['document']);
        this.error.set(state.output['error']);
      },
      this.injector,
    );
    this.convert();
  }

  onInputChange(value: string) {
    this.input.set(value);
    this.convert();
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

  convert() {
    const raw = this.input().trim();
    if (!raw) {
      this.result.set('');
      this.error.set('');
      return;
    }

    try {
      this.result.set(convertCsharpToJson(raw));
      this.error.set('');
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }
}
