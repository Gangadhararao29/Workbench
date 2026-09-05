import { Component, Input, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstanceService } from '../../../core/tool/tool-instance';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { generateCSharpModelFromSql, SqlToCSharpOptions } from '../../../core/engines/sql-to-csharp-engine';

@Component({
  selector: 'app-sql-to-csharp',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CodeEditor],
  templateUrl: './sql-to-csharp.html',
  styleUrls: ['./sql-to-csharp.css'],
})
export class SqlToCsharp {
  @Input({ required: true }) instanceId!: string;
  input = signal(
    'CREATE TABLE Users (\n  Id INT NOT NULL,\n  Name NVARCHAR(200) NULL,\n  CreatedAt DATETIME2 NOT NULL\n);',
  );
  result = signal('');
  copied = signal(false);
  copyResult() {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  constructor(private instanceService: InstanceService) {}

  config = computed(
    () =>
      (this.instanceService.instances().find((i) => i.id === this.instanceId)?.config ??
        {}) as SqlToCSharpOptions,
  );

  convert(): void {
    const res = generateCSharpModelFromSql(this.input(), this.config());
    if (res.error) {
      this.result.set(res.error);
    } else {
      this.result.set(res.code);
    }
  }
}
