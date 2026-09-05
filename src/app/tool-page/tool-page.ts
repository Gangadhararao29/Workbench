import { Component, OnInit, OnDestroy, computed, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService, ToolInstance } from '../core/instance-service';
import { findToolDefinition } from '../core/tool-registry';
import { ShellStateService } from '../core/shell-state.service';

import { SqlFormatter } from '../tools/sql/sql-formatter/sql-formatter';
import { JsonFormatter } from '../tools/json/json-formatter/json-formatter';
import { CsharpToTypescript } from '../tools/dotnet/csharp-to-typescript/csharp-to-typescript';
import { CsharpToJson } from '../tools/dotnet/csharp-to-json/csharp-to-json';
import { CsharpFormatter } from '../tools/dotnet/csharp-formatter/csharp-formatter';
import { SqlSearch } from '../tools/sql/sql-search/sql-search';
import { JsonPath } from '../tools/json/json-path/json-path';
import { JwtInspector } from '../tools/api/jwt-inspector/jwt-inspector';
import { GuidGenerator } from '../tools/general/guid-generator/guid-generator';
import { JsonToTypescript } from '../tools/json/json-to-typescript/json-to-typescript';
import { JsonToCsharp } from '../tools/json/json-to-csharp/json-to-csharp';
import { JsonToYaml } from '../tools/json/json-to-yaml/json-to-yaml';
import { SqlToCsharp } from '../tools/sql/sql-to-csharp/sql-to-csharp';
import { SqlGenerator } from '../tools/sql/sql-generator/sql-generator';
import { JsonDiff } from '../tools/json/json-diff/json-diff';
import { CurlConverter } from '../tools/api/curl-converter/curl-converter';
import { TimestampConverter } from '../tools/general/timestamp-converter/timestamp-converter';
import { RegexTester } from '../tools/general/regex-tester/regex-tester';
import { ScriptRunner } from '../tools/general/script-runner/script-runner';
import { HttpRequestBuilder } from '../tools/api/http-request-builder/http-request-builder';
import { OpenapiInspector } from '../tools/api/openapi-inspector/openapi-inspector';
import { EfConfiguration } from '../tools/ef/ef-configuration/ef-configuration';
import { EfMigrations } from '../tools/ef/ef-migrations/ef-migrations';
import { EfLinq } from '../tools/ef/ef-linq/ef-linq';
import { EfDbContext } from '../tools/ef/ef-dbcontext/ef-dbcontext';
import { ApiGenerator } from '../tools/frontend/api-generator/api-generator';
import { FeatureGenerator } from '../tools/dotnet/feature-generator/feature-generator';
import { DocumentationHub } from '../tools/general/documentation-hub/documentation-hub';
import { TerminalTool } from '../tools/general/terminal/terminal';
import { LogViewer } from '../tools/general/log-viewer/log-viewer';
import { SqlQueryBuilder } from '../tools/sql/sql-query-builder/sql-query-builder';

@Component({
  selector: 'app-tool-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SqlFormatter,
    JsonFormatter,
    CsharpToTypescript,
    CsharpToJson,
    CsharpFormatter,
    SqlSearch,
    JsonPath,
    JwtInspector,
    GuidGenerator,
    JsonToTypescript,
    JsonToCsharp,
    JsonToYaml,
    SqlToCsharp,
    SqlGenerator,
    JsonDiff,
    CurlConverter,
    TimestampConverter,
    RegexTester,
    ScriptRunner,
    HttpRequestBuilder,
    OpenapiInspector,
    EfConfiguration,
    EfMigrations,
    EfLinq,
    EfDbContext,
    ApiGenerator,
    FeatureGenerator,
    DocumentationHub,
    TerminalTool,
    LogViewer,
    SqlQueryBuilder,
  ],
  templateUrl: './tool-page.html',
  styleUrls: ['./tool-page.css'],
})
export class ToolPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public instanceService = inject(InstanceService);
  public shellState = inject(ShellStateService);

  toolType = signal<string>('');
  groupId = signal<string>('general');
  selectedInstanceId = signal<string | null>(null);

  scopedInstances = computed(() =>
    this.instanceService.instances().filter((i) => i.toolType === this.toolType())
  );

  selectedInstance = computed(() => {
    const list = this.scopedInstances();
    const id = this.selectedInstanceId();
    if (!list.length) return null;
    return list.find((i) => i.id === id) ?? list[0] ?? null;
  });

  constructor() {
    effect(() => {
      const active = this.selectedInstance();
      this.shellState.selectedInstance.set(active);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const type = params.get('toolType') || '';
      this.toolType.set(type);

      const def = findToolDefinition(type);
      if (def) {
        this.groupId.set(def.group.id);
      }

      const existing = this.scopedInstances();
      if (existing.length === 0 && type) {
        const created = this.instanceService.open(type, this.groupId());
        this.selectedInstanceId.set(created.id);
      } else if (existing.length > 0) {
        if (!this.selectedInstanceId() || !existing.some((i) => i.id === this.selectedInstanceId())) {
          this.selectedInstanceId.set(existing[0].id);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.shellState.selectedInstance.set(null);
  }

  selectInstance(id: string): void {
    this.selectedInstanceId.set(id);
  }

  addInstance(): void {
    const created = this.instanceService.open(this.toolType(), this.groupId());
    this.selectedInstanceId.set(created.id);
  }

  cloneInstance(): void {
    const current = this.selectedInstance();
    if (!current) return;
    const cloned = this.instanceService.clone(current.id);
    if (cloned) {
      this.selectedInstanceId.set(cloned.id);
    }
  }

  closeInstance(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.instanceService.close(id);
    const remaining = this.scopedInstances();
    if (remaining.length === 0) {
      this.router.navigate(['/']);
    } else if (this.selectedInstanceId() === id) {
      this.selectedInstanceId.set(remaining[remaining.length - 1].id);
    }
  }
}
