import { Component, Input, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { load as loadYaml } from 'js-yaml';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import {
  inspectOpenApi,
  generateCurlCommand,
  OpenApiEndpoint,
  OpenApiInspection,
  OpenApiSchemaDetail,
  SAMPLE_OPENAPI_SPEC
} from '../../../core/engines/openapi-engine';

export interface EndpointGroup {
  name: string;
  description?: string;
  endpoints: OpenApiEndpoint[];
  methodCounts: Record<string, number>;
}

export interface MethodCountStats {
  GET: number;
  POST: number;
  PUT: number;
  PATCH: number;
  DELETE: number;
  [key: string]: number;
}

@Component({
  selector: 'app-openapi-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './openapi-inspector.html',
  styleUrls: ['./openapi-inspector.css']
})
export class OpenapiInspector implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal(SAMPLE_OPENAPI_SPEC);
  inspection = signal<OpenApiInspection | null>(null);
  error = signal('');

  detectedFormat = computed<'JSON' | 'YAML'>(() => {
    const raw = this.input().trim();
    if (!raw) return 'JSON';
    if (raw.startsWith('{') || raw.startsWith('[')) return 'JSON';
    return 'YAML';
  });

  editorLanguage = computed(() => (this.detectedFormat() === 'YAML' ? 'yaml' : 'json'));

  // UI state
  activeTab = signal<'endpoints' | 'schemas' | 'overview'>('endpoints');
  groupBy = signal<'tag' | 'path' | 'method' | 'flat'>('tag');
  searchQuery = signal('');
  selectedMethod = signal('ALL');
  selectedServerUrl = signal('');
  curlMultiline = signal(true);

  // Server URL inline editing
  editingServer = signal(false);
  private previousServerUrl = signal('');

  // Expand / collapse states
  expandedEndpoints = signal<Set<string>>(new Set());
  collapsedGroups = signal<Set<string>>(new Set());

  // Copy feedback state
  copiedId = signal<string | null>(null);
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.inspect();
  }

  inspect() {
    try {
      const src = this.input().trim();
      if (!src) {
        this.inspection.set(null);
        this.error.set('');
        return;
      }

      let jsonString = src;
      const isYaml =
        !src.startsWith('{') &&
        !src.startsWith('[') &&
        (src.startsWith('openapi:') ||
          src.startsWith('swagger:') ||
          /^[a-zA-Z0-9_"-]+:\s*/m.test(src));

      if (isYaml) {
        try {
          const parsedYaml = loadYaml(src);
          if (parsedYaml && typeof parsedYaml === 'object') {
            jsonString = JSON.stringify(parsedYaml);
          }
        } catch (yamlErr) {
          throw new Error(`Invalid YAML format: ${(yamlErr as Error).message}`);
        }
      }

      const res = inspectOpenApi(jsonString, this.selectedServerUrl());
      this.inspection.set(res);
      this.error.set('');

      if (!this.selectedServerUrl() && res.servers.length > 0) {
        this.selectedServerUrl.set(res.servers[0].url);
      }
    } catch (err) {
      this.error.set(`Invalid OpenAPI Specification: ${(err as Error).message}`);
      this.inspection.set(null);
    }
  }

  loadSample() {
    this.input.set(SAMPLE_OPENAPI_SPEC);
    this.selectedServerUrl.set('');
    this.inspect();
  }

  formatJson() {
    try {
      const src = this.input().trim();
      if (!src) return;
      if (this.detectedFormat() === 'YAML') {
        const parsed = loadYaml(src);
        this.input.set(JSON.stringify(parsed, null, 2));
      } else {
        const parsed = JSON.parse(src);
        this.input.set(JSON.stringify(parsed, null, 2));
      }
      this.inspect();
    } catch (err) {
      this.error.set(`Cannot format invalid input: ${(err as Error).message}`);
    }
  }

  clearInput() {
    this.input.set('');
    this.inspection.set(null);
    this.error.set('');
  }

  startEditServer(inputEl?: HTMLInputElement) {
    this.previousServerUrl.set(this.selectedServerUrl());
    this.editingServer.set(true);
    if (inputEl) {
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 0);
    }
  }

  saveServerUrl(value: string) {
    const clean = value.trim();
    if (clean) {
      this.selectedServerUrl.set(clean);
      this.inspect();
    }
    this.editingServer.set(false);
  }

  cancelEditServer() {
    this.selectedServerUrl.set(this.previousServerUrl());
    this.editingServer.set(false);
  }

  // Filtered endpoints based on search and method
  filteredEndpoints = computed(() => {
    const insp = this.inspection();
    if (!insp) return [];

    const query = this.searchQuery().toLowerCase().trim();
    const method = this.selectedMethod().toUpperCase();

    return insp.endpoints.filter(ep => {
      // Method filter
      if (method !== 'ALL' && ep.method !== method) {
        return false;
      }

      // Search query filter
      if (query) {
        const matchesPath = ep.path.toLowerCase().includes(query);
        const matchesSummary = ep.summary.toLowerCase().includes(query);
        const matchesDesc = ep.description?.toLowerCase().includes(query) ?? false;
        const matchesTags = ep.tags.some(t => t.toLowerCase().includes(query));
        const matchesOpId = ep.operationId?.toLowerCase().includes(query) ?? false;

        if (!matchesPath && !matchesSummary && !matchesDesc && !matchesTags && !matchesOpId) {
          return false;
        }
      }

      return true;
    });
  });

  // Grouped endpoints based on groupBy mode
  groupedEndpoints = computed<EndpointGroup[]>(() => {
    const endpoints = this.filteredEndpoints();
    const mode = this.groupBy();
    const insp = this.inspection();

    if (endpoints.length === 0) return [];

    const groupMap = new Map<string, { description?: string; endpoints: OpenApiEndpoint[] }>();

    if (mode === 'tag') {
      const tagDescMap = new Map<string, string>();
      for (const t of insp?.tags ?? []) {
        if (t.description) tagDescMap.set(t.name, t.description);
      }

      for (const ep of endpoints) {
        const tags = ep.tags.length > 0 ? ep.tags : ['Untagged'];
        for (const tag of tags) {
          if (!groupMap.has(tag)) {
            groupMap.set(tag, { description: tagDescMap.get(tag), endpoints: [] });
          }
          groupMap.get(tag)!.endpoints.push(ep);
        }
      }
    } else if (mode === 'path') {
      for (const ep of endpoints) {
        const segments = ep.path.split('/').filter(Boolean);
        const rootSegment = segments.length > 0 ? `/${segments[0]}` : '/';
        if (!groupMap.has(rootSegment)) {
          groupMap.set(rootSegment, { endpoints: [] });
        }
        groupMap.get(rootSegment)!.endpoints.push(ep);
      }
    } else if (mode === 'method') {
      const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE'];
      for (const m of methodOrder) {
        const matched = endpoints.filter(e => e.method === m);
        if (matched.length > 0) {
          groupMap.set(m, { endpoints: matched });
        }
      }
    } else {
      // Flat list
      groupMap.set('All Endpoints', { endpoints });
    }

    return Array.from(groupMap.entries()).map(([name, data]) => {
      const methodCounts: Record<string, number> = {};
      for (const ep of data.endpoints) {
        methodCounts[ep.method] = (methodCounts[ep.method] || 0) + 1;
      }
      return {
        name,
        description: data.description,
        endpoints: data.endpoints,
        methodCounts,
      };
    });
  });

  // Method stats for quick badges
  methodStats = computed<MethodCountStats>(() => {
    const endpoints = this.inspection()?.endpoints ?? [];
    const counts: MethodCountStats = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
    for (const ep of endpoints) {
      if (counts[ep.method] !== undefined) {
        counts[ep.method]++;
      } else {
        counts[ep.method] = 1;
      }
    }
    return counts;
  });

  toggleEndpoint(id: string) {
    const current = new Set(this.expandedEndpoints());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedEndpoints.set(current);
  }

  isEndpointExpanded(id: string): boolean {
    return this.expandedEndpoints().has(id);
  }

  toggleGroup(groupName: string) {
    const current = new Set(this.collapsedGroups());
    if (current.has(groupName)) {
      current.delete(groupName);
    } else {
      current.add(groupName);
    }
    this.collapsedGroups.set(current);
  }

  isGroupCollapsed(groupName: string): boolean {
    return this.collapsedGroups().has(groupName);
  }

  expandAll() {
    const allEpIds = new Set<string>();
    for (const ep of this.filteredEndpoints()) {
      allEpIds.add(ep.id);
    }
    this.expandedEndpoints.set(allEpIds);
    this.collapsedGroups.set(new Set());
  }

  collapseAll() {
    this.expandedEndpoints.set(new Set());
    const allGroups = new Set<string>();
    for (const g of this.groupedEndpoints()) {
      allGroups.add(g.name);
    }
    this.collapsedGroups.set(allGroups);
  }

  // cURL Generation for specific endpoint with active settings
  getCurl(endpoint: OpenApiEndpoint): string {
    const server = this.selectedServerUrl() || this.inspection()?.servers[0]?.url || 'https://api.example.com';
    return generateCurlCommand(endpoint, server, { multiline: this.curlMultiline() });
  }

  async copyCurl(endpoint: OpenApiEndpoint, event?: MouseEvent) {
    if (event) event.stopPropagation();
    const curl = this.getCurl(endpoint);
    await this.copyText(curl, `curl-${endpoint.id}`);
  }

  async copyPath(endpoint: OpenApiEndpoint, event?: MouseEvent) {
    if (event) event.stopPropagation();
    await this.copyText(endpoint.path, `path-${endpoint.id}`);
  }

  async copySchemaJson(schema: OpenApiSchemaDetail, event?: MouseEvent) {
    if (event) event.stopPropagation();
    await this.copyText(schema.sampleJson, `schema-${schema.name}`);
  }

  async copyAllCurls() {
    const endpoints = this.filteredEndpoints();
    const server = this.selectedServerUrl() || this.inspection()?.servers[0]?.url || 'https://api.example.com';
    const allCurls = endpoints.map(ep => `# ${ep.method} ${ep.path}\n${generateCurlCommand(ep, server, { multiline: false })}\n`).join('\n');
    await this.copyText(allCurls, 'all-curls');
  }

  private async copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.setCopiedFeedback(id);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.setCopiedFeedback(id);
    }
  }

  private setCopiedFeedback(id: string) {
    this.copiedId.set(id);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => {
      this.copiedId.set(null);
    }, 2200);
  }

  isCopied(id: string): boolean {
    return this.copiedId() === id;
  }

  getMethodClass(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'PUT': return 'method-put';
      case 'PATCH': return 'method-patch';
      case 'DELETE': return 'method-delete';
      case 'OPTIONS': return 'method-options';
      case 'HEAD': return 'method-head';
      default: return 'method-default';
    }
  }
}
