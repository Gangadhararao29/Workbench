import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/instance-service';
import { formatSql, compactSql, minifySql, SqlFormatterOptions } from '../../../core/engines/sql-formatter-engine';

export type SqlFormatMode = 'pretty' | 'compact' | 'minified';

@Component({
  selector: 'app-sql-formatter',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './sql-formatter.html',
  styleUrls: ['./sql-formatter.css']
})
export class SqlFormatter implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal('select id, name, email from users left join orders on orders.user_id = users.id where active = 1 and role = \'admin\' order by name;');
  result = signal('');
  mode = signal<SqlFormatMode>('pretty');
  copied = signal(false);

  constructor(private instanceService: InstanceService) {}

  ngOnInit() {
    this.transform(this.mode());
  }

  config = computed<SqlFormatterOptions>(() =>
    (this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}) as SqlFormatterOptions
  );

  setMode(mode: SqlFormatMode) {
    this.mode.set(mode);
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
      navigator.clipboard.writeText(res);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  onInputChange(value: string) {
    this.input.set(value);
    this.transform(this.mode());
  }

  clear() {
    this.input.set('');
    this.result.set('');
  }

  loadSample() {
    this.input.set(`SELECT u.id, u.username, u.email, COUNT(o.id) AS order_count, SUM(o.total_amount) AS total_spent FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.status = 'ACTIVE' AND u.created_at >= '2024-01-01' GROUP BY u.id, u.username, u.email HAVING COUNT(o.id) > 2 ORDER BY total_spent DESC, u.username ASC;`);
    this.transform(this.mode());
  }

  transform(mode: SqlFormatMode = this.mode()) {
    const raw = this.input().trim();
    if (!raw) {
      this.result.set('');
      return;
    }
    const cfg = this.config();

    try {
      if (mode === 'minified') {
        this.result.set(minifySql(raw));
      } else if (mode === 'compact') {
        this.result.set(compactSql(raw, cfg));
      } else {
        this.result.set(formatSql(raw, cfg));
      }
    } catch {
      if (mode === 'minified') {
        this.result.set(minifySql(raw));
      } else if (mode === 'compact') {
        this.result.set(compactSql(raw, cfg));
      } else {
        this.result.set(raw);
      }
    }
  }
}