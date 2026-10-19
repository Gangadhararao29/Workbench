import { Component, Input, OnInit, computed, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';
import {
  formatSql,
  compactSql,
  minifySql,
  SqlFormatterOptions,
} from '../../../core/engines/sql-formatter-engine';

export type SqlFormatMode = 'pretty' | 'compact' | 'minified';

@Component({
  selector: 'app-sql-formatter',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './sql-formatter.html',
  styleUrls: ['./sql-formatter.css'],
})
export class SqlFormatter implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal(
    "select id, name, email from users left join orders on orders.user_id = users.id where active = 1 and role = 'admin' order by name;",
  );
  result = signal('');
  mode = signal<SqlFormatMode>('pretty');
  copied = signal(false);
  private toolState?: ToolState;
  private lastTransformSignature: string | null = null;

  constructor(private instanceService: InstanceService) {
    effect(() => {
      this.options();
      untracked(() => this.transform(this.mode()));
    });
  }

  ngOnInit() {
    this.toolState = new ToolState(this.instanceService, this.instanceId);
    const savedState = this.toolState.state();
    this.input.set(savedState.input['document']);
    this.mode.set(savedState.options['mode']);
    this.result.set(savedState.output['document']);
    this.transform(this.mode());
  }

  options = computed<SqlFormatterOptions>(
    () => (this.instanceService.getState(this.instanceId)?.options ??
      defaultToolStateFor('sql-formatter')!.options) as SqlFormatterOptions,
  );

  setMode(mode: SqlFormatMode) {
    this.mode.set(mode);
    this.toolState?.updateOptions({ mode });
    this.transform(mode);
  }

  format() {
    this.setMode('pretty');
  }

  compact() {
    this.setMode('compact');
  }

  minify() {
    this.setMode('minified');
  }

  copyResult() {
    const res = this.result();
    if (res) {
      navigator.clipboard
        .writeText(res)
        .then(() => {
          this.copied.set(true);
          setTimeout(() => this.copied.set(false), 2000);
        })
        .catch(() => {});
    }
  }

  onInputChange(value: string) {
    this.input.set(value);
    this.toolState?.updateInput({ document: value });
    this.transform(this.mode());
  }

  clear() {
    this.onInputChange('');
    this.result.set('');
  }

  transform(mode: SqlFormatMode = this.mode()) {
    const raw = this.input().trim();
    const cfg = this.options();
    const signature = JSON.stringify([raw, mode, cfg]);
    if (signature === this.lastTransformSignature) return;
    this.lastTransformSignature = signature;

    if (!raw) {
      this.result.set('');
      this.toolState?.updateOutput({ document: '' });
      return;
    }

    try {
      if (mode === 'minified') {
        this.result.set(minifySql(raw));
      } else if (mode === 'compact') {
        this.result.set(compactSql(raw, cfg));
      } else {
        this.result.set(formatSql(raw, cfg));
      }
      this.toolState?.updateOutput({ document: this.result() });
    } catch {
      this.result.set(raw);
      this.toolState?.updateOutput({ document: raw });
    }
  }
}
