import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { generateCSharpModelFromSql, SqlToCSharpOptions } from '../../../core/engines/sql-to-csharp-engine';

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

  constructor(private instanceService: InstanceService) {
    effect(() => {
      // Re-run conversion reactively whenever input or sidebar options change
      this.convert();
    });
  }

  ngOnInit(): void {
    this.convert();
  }

  config = computed(
    () =>
      (this.instanceService.instances().find((i) => i.id === this.instanceId)?.config ??
        {}) as SqlToCSharpOptions,
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
    if (!raw) {
      this.result.set('');
      this.errorMessage.set(null);
      return;
    }

    const res = generateCSharpModelFromSql(raw, this.config());
    if (res.error) {
      this.errorMessage.set(res.error);
      this.result.set(`// Error: ${res.error}`);
    } else {
      this.errorMessage.set(null);
      this.result.set(res.code);
    }
  }
}
