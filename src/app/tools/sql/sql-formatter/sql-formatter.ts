import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/instance-service';
import { formatSql, minifySql } from '../../../core/engines/sql-formatter-engine';

@Component({
  selector: 'app-sql-formatter',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, CodeEditor],
  templateUrl: './sql-formatter.html',
  styleUrls: ['./sql-formatter.css']
})
export class SqlFormatter {
  @Input({ required: true }) instanceId!: string;

  input = signal('select id,name,email from users where active=1 and role=\'admin\' order by name;');
  result = signal('');
  constructor(private instanceService: InstanceService) {}

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config
  );

  format() {
    this.transform(false);
  }

  minify() {
    this.transform(true);
  }

  private transform(compact: boolean) {
    const raw = this.input().trim();
    if (!raw) { this.result.set('Enter a query first'); return; }
    const cfg = this.config();
    this.result.set(compact
      ? minifySql(raw)
      : formatSql(raw, cfg));
  }
}