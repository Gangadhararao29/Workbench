import { Component, signal, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService } from './core/instance-service';
import { ToolSidebar } from './shell/tool-sidebar/tool-sidebar';
import { InstanceTabs } from './shell/instance-tabs/instance-tabs';
import { OptionsPanel } from './shell/options-panel/options-panel';
import { SqlFormatter } from './tools/sql/sql-formatter/sql-formatter';
import { JsonFormatter } from './tools/json/json-formatter/json-formatter';
import { CsharpToTypescript } from './tools/dotnet/csharp-to-typescript/csharp-to-typescript';
import { CsharpToJson } from './tools/dotnet/csharp-to-json/csharp-to-json';
import { CsharpFormatter } from './tools/dotnet/csharp-formatter/csharp-formatter';
import { SqlSearch } from './tools/sql/sql-search/sql-search';
import { JsonPath } from './tools/json/json-path/json-path';
import { JwtInspector } from './tools/api/jwt-inspector/jwt-inspector';
import { GuidGenerator } from './tools/general/guid-generator/guid-generator';
import { JsonToTypescript } from './tools/json/json-to-typescript/json-to-typescript';
import { JsonToCsharp } from './tools/json/json-to-csharp/json-to-csharp';
import { SqlToCsharp } from './tools/sql/sql-to-csharp/sql-to-csharp';
import { SqlGenerator } from './tools/sql/sql-generator/sql-generator';
import { JsonDiff } from './tools/json/json-diff/json-diff';
import { CurlConverter } from './tools/api/curl-converter/curl-converter';
import { TimestampConverter } from './tools/general/timestamp-converter/timestamp-converter';
import { RegexTester } from './tools/general/regex-tester/regex-tester';
import { ScriptRunner } from './tools/general/script-runner/script-runner';
import { HttpRequestBuilder } from './tools/api/http-request-builder/http-request-builder';
import { OpenapiInspector } from './tools/api/openapi-inspector/openapi-inspector';
import { EfConfiguration } from './tools/ef/ef-configuration/ef-configuration';
import { ApiGenerator } from './tools/frontend/api-generator/api-generator';
import { FeatureGenerator } from './tools/dotnet/feature-generator/feature-generator';
import { DocumentationHub } from './tools/general/documentation-hub/documentation-hub';

const THEME_KEY = 'workbench.theme';

@Component({
  standalone: true,
  selector: 'app-root',
  host: { class: 'block h-screen' },
  imports: [
    CommonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    ToolSidebar,
    InstanceTabs,
    OptionsPanel,
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
    ApiGenerator,
    FeatureGenerator,
    DocumentationHub
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  @ViewChild('leftDrawer') leftDrawer!: MatSidenav;
  @ViewChild('rightDrawer') rightDrawer!: MatSidenav;

  isDark = signal(this.loadTheme());
  searchQuery = signal('');
  activeInstance : any;
  
  constructor(public instanceService: InstanceService) {
    this.activeInstance = this.instanceService.activeInstance;
    effect(() => {
      const dark = this.isDark();
      document.body.classList.toggle('dark-theme', dark);
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  private loadTheme(): boolean {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  toggleTheme() {
    this.isDark.update(v => !v);
  }

  toggleLeft() {
    this.leftDrawer.toggle();
  }

  toggleRight() {
    this.rightDrawer.toggle();
  }

  async exportWorkspace() {
    await navigator.clipboard.writeText(this.instanceService.exportWorkspace());
  }

  importWorkspace() {
    const raw = window.prompt('Paste workspace JSON');
    if (!raw) return;
    try { this.instanceService.importWorkspace(raw); } catch { window.alert('Invalid workspace JSON.'); }
  }

  openTool(toolType: string, groupId: string) {
    this.instanceService.open(toolType, groupId);
  }

  selectTab(id: string) {
    this.instanceService.select(id);
  }

  closeTab(id: string) {
    this.instanceService.close(id);
  }

  goHome() {
    this.instanceService.goHome();
  }
}