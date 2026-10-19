import { Component, Injector, Input, OnInit, computed, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { generateCSharpModelFromSql, SqlToCSharpOptions } from '../../../core/engines/sql-to-csharp-engine';
import { ToolState } from '../../../core/tool/tool-state';

@Component({
  selector: 'app-sql-to-csharp',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './sql-to-csharp.html',
  styleUrls: ['./sql-to-csharp.css'],
})
export class SqlToCsharp implements OnInit {
  @Input({ required: true }) instanceId!: string;
  input = signal(
    'CREATE TABLE Users (\n  Id INT NOT NULL PRIMARY KEY,\n  Name NVARCHAR(200) NULL,\n  Balance DECIMAL(18, 2) NOT NULL,\n  CreatedAt DATETIME2 NOT NULL\n);',
  );
  result = signal('');
  copied = signal(false);
  errorMessage = signal<string | null>(null);
  private toolState = signal<ToolState | null>(null);
  private lastConversionSignature: string | null = null;

  constructor(private instanceService: InstanceService, private injector: Injector) {
    effect(() => {
      this.input();
      this.options();
      untracked(() => this.convert());
    });
  }

  ngOnInit(): void {
    const toolState = new ToolState(this.instanceService, this.instanceId, 'sql-to-csharp');
    this.toolState.set(toolState);
    toolState.connect(
      () => ({
        input: { document: this.input() },
        output: { document: this.result(), errorMessage: this.errorMessage() },
        options: this.options(),
      }),
      (state) => {
        this.input.set(state.input['document']);
        this.result.set(state.output['document']);
        this.errorMessage.set(state.output['errorMessage']);
      },
      this.injector,
    );
  }

  options = computed(
    () =>
      (this.toolState()?.state().options ?? {}) as SqlToCSharpOptions,
  );

  copyResult() {
    const text = this.result();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      })
      .catch(() => {});
  }

  convert(): void {
    const raw = this.input().trim();
    const options = this.options();
    const signature = JSON.stringify([raw, options]);
    if (signature === this.lastConversionSignature) return;
    this.lastConversionSignature = signature;

    if (!raw) {
      this.result.set('');
      this.errorMessage.set(null);
      return;
    }

    const res = generateCSharpModelFromSql(raw, options);
    if (res.error) {
      this.errorMessage.set(res.error);
      this.result.set(`// Error: ${res.error}`);
    } else {
      this.errorMessage.set(null);
      this.result.set(res.code);
    }
  }
}
