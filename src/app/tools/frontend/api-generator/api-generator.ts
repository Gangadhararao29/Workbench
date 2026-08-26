import { Component, Input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  generateApiClient,
  FRAMEWORK_OPTIONS,
  ApiGeneratorConfig,
  SupportedFramework,
  AnyPattern,
  GenerationMode,
  GenerationResult,
} from '../../../core/engines/api-client-generator-engine';

type OutputTab = 'client' | 'dtos' | 'tests' | 'usage';

@Component({
  selector: 'app-api-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    CodeEditor,
  ],
  templateUrl: './api-generator.html',
  styleUrls: ['./api-generator.css'],
})
export class ApiGenerator implements OnInit {
  @Input({ required: true }) instanceId!: string;

  frameworks = FRAMEWORK_OPTIONS;

  // Framework & Mode
  framework = signal<SupportedFramework>('angular');
  pattern = signal<AnyPattern>('full-service');
  mode = signal<GenerationMode>('crud');

  // Resource, Endpoint, Method
  resourceName = signal('Product');
  endpoint = signal('/api/products');
  method = signal<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');

  // Streamlined Options
  includeErrorHandling = signal(true);
  includeCancellation = signal(true);
  includeAuth = signal(true);
  includePagination = signal(true);
  includeTsDoc = signal(true);

  // Active Output Tab
  activeTab = signal<OutputTab>('client');

  readonly outputTabs: { id: OutputTab; label: string; icon: string }[] = [
    { id: 'client', label: 'Client Code', icon: 'code' },
    { id: 'dtos', label: 'TypeScript DTOs', icon: 'data_object' },
    { id: 'tests', label: 'Unit Test Spec', icon: 'fact_check' },
    { id: 'usage', label: 'Component Usage', icon: 'preview' },
  ];

  // Copy feedback state
  copied = signal(false);
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  // Available patterns for selected framework
  availablePatterns = computed(() => {
    const f = this.frameworks.find((fw) => fw.id === this.framework());
    return f ? f.patterns : [];
  });

  // Current generation result
  generation = computed<GenerationResult>(() => {
    const config: ApiGeneratorConfig = {
      framework: this.framework(),
      pattern: this.pattern(),
      mode: this.mode(),
      method: this.method(),
      endpoint: this.endpoint(),
      resourceName: this.resourceName(),
      includeErrorHandling: this.includeErrorHandling(),
      includeCancellation: this.includeCancellation(),
      includeAuth: this.includeAuth(),
      includeTsDoc: this.includeTsDoc(),
      includePagination: this.includePagination(),
    };

    return generateApiClient(config);
  });

  // Editor content for active tab
  activeCode = computed(() => {
    const res = this.generation();
    switch (this.activeTab()) {
      case 'dtos':
        return res.dtosCode;
      case 'tests':
        return res.testCode;
      case 'usage':
        return res.usageCode;
      case 'client':
      default:
        return res.clientCode;
    }
  });

  // Language for Monaco editor
  editorLanguage = computed(() => {
    if (this.activeTab() === 'usage' && this.framework() === 'vue') {
      return 'html';
    }
    return 'typescript';
  });

  ngOnInit(): void {
    const patterns = this.availablePatterns();
    if (patterns.length > 0) {
      this.pattern.set(patterns[0].id);
    }
  }

  onFrameworkChange(newFramework: SupportedFramework): void {
    this.framework.set(newFramework);
    const patterns = this.availablePatterns();
    if (patterns.length > 0) {
      this.pattern.set(patterns[0].id);
    }
  }

  setMode(newMode: GenerationMode): void {
    this.mode.set(newMode);
    if (newMode === 'single' && !this.method()) {
      this.method.set('GET');
    }
  }

  copyCode(): void {
    const code = this.activeCode();
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copied.set(false), 2000);
    });
  }

  downloadCode(): void {
    const code = this.activeCode();
    if (!code) return;

    const ext = this.getFileExtension();
    const filename = `${this.resourceName().toLowerCase() || 'api-client'}.${this.activeTab()}.${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getFileExtension(): string {
    if (this.activeTab() === 'usage') {
      if (this.framework() === 'react') return 'tsx';
      if (this.framework() === 'vue') return 'vue';
    }
    return 'ts';
  }
}
