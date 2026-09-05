import { Component, Input, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { generateCSharpModelFromSql, SqlToCSharpOptions } from '../../../core/engines/sql-to-csharp-engine';

@Component({
  selector: 'app-sql-to-csharp',
  standalone: true,
  imports: [MatButtonModule, CodeEditor],
  templateUrl: './sql-to-csharp.html',
  styleUrls: ['./sql-to-csharp.css'],
})
export class SqlToCsharp {
  @Input({ required: true }) instanceId!: string;
  input = signal(
    'CREATE TABLE Users (\n  Id INT NOT NULL,\n  Name NVARCHAR(200) NULL,\n  CreatedAt DATETIME2 NOT NULL\n);',
  );
  result = signal('');

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
