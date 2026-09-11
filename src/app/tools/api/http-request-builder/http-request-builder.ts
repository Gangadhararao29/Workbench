import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { formatJson } from '../../../core/engines/json-engine';

export interface KeyValueItem {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestHistoryItem {
  id: string;
  method: string;
  url: string;
  timestamp: Date;
  status?: number;
  timeMs?: number;
}

export interface PresetTemplate {
  name: string;
  description: string;
  method: string;
  url: string;
  headers?: Array<{ key: string; value: string }>;
  body?: string;
}

@Component({
  selector: 'app-http-request-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './http-request-builder.html',
  styleUrls: ['./http-request-builder.css']
})
export class HttpRequestBuilder implements OnInit {
  @Input({ required: true }) instanceId!: string;

  // Request State
  method = 'GET';
  url = 'https://jsonplaceholder.typicode.com/users/1';
  methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  // Tabs & Views
  activeRequestTab: 'params' | 'headers' | 'auth' | 'body' = 'params';
  activeResponseTab: 'body' | 'headers' | 'raw' = 'body';

  // Request Parameters & Headers
  params: KeyValueItem[] = [];
  headers: KeyValueItem[] = [
    { key: 'Accept', value: 'application/json', enabled: true },
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ];

  // Auth Configuration
  authType: 'none' | 'bearer' | 'basic' | 'apikey' = 'none';
  authToken = '';
  authUsername = '';
  authPassword = '';
  authApiKeyName = 'X-API-Key';
  authApiKeyValue = '';
  authApiKeyLocation: 'header' | 'query' = 'header';

  // Body Configuration
  bodyType: 'json' | 'text' | 'xml' | 'form' = 'json';
  bodyContent = '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}';

  // Response State
  hasResponse = signal(false);
  statusCode = signal<number | null>(null);
  statusText = signal('');
  responseTimeMs = signal<number | null>(null);
  responseSize = signal('');
  responseHeaders = signal<Array<{ key: string; value: string }>>([]);
  responseBody = signal('');
  rawResponse = signal('');
  responseLanguage = signal<'json' | 'xml' | 'html' | 'plaintext'>('json');
  resultStatus = signal<'success' | 'error' | ''>('');
  errorMessage = signal('');
  loading = signal(false);

  // Quick Utilities & Feedback
  copiedCurl = signal(false);
  copiedResponse = signal(false);
  showImportModal = signal(false);
  curlImportInput = '';
  showHistoryDrawer = signal(false);
  history = signal<RequestHistoryItem[]>([]);

  // Presets
  presets: PresetTemplate[] = [
    {
      name: 'Get User (JSONPlaceholder)',
      description: 'Fetch single user details',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1',
      headers: [{ key: 'Accept', value: 'application/json' }]
    },
    {
      name: 'List Posts (JSONPlaceholder)',
      description: 'Query posts with query params',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts?userId=1',
      headers: [{ key: 'Accept', value: 'application/json' }]
    },
    {
      name: 'Create Post (JSONPlaceholder)',
      description: 'POST request with JSON payload',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: [
        { key: 'Content-Type', value: 'application/json; charset=UTF-8' },
        { key: 'Accept', value: 'application/json' }
      ],
      body: '{\n  "title": "New Workbench Post",\n  "body": "Built with Angular and Monaco Editor",\n  "userId": 1\n}'
    },
    {
      name: 'HTTPBin Echo Headers',
      description: 'Inspect request headers returned by server',
      method: 'GET',
      url: 'https://httpbin.org/headers',
      headers: [
        { key: 'Accept', value: 'application/json' },
        { key: 'X-Workbench-Client', value: 'Antigravity-IDE' }
      ]
    },
    {
      name: 'HTTPBin POST JSON',
      description: 'Echo back transmitted JSON payload',
      method: 'POST',
      url: 'https://httpbin.org/post',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Accept', value: 'application/json' }
      ],
      body: '{\n  "message": "Hello from HTTP Request Builder!",\n  "timestamp": ' + Date.now() + '\n}'
    }
  ];

  ngOnInit() {
    this.extractParamsFromUrl();
  }

  // --- Parameter Management ---
  onUrlInput() {
    this.extractParamsFromUrl();
  }

  extractParamsFromUrl() {
    try {
      const urlObj = new URL(this.url);
      const newParams: KeyValueItem[] = [];
      urlObj.searchParams.forEach((val, key) => {
        newParams.push({ key, value: val, enabled: true });
      });
      if (newParams.length > 0 || this.params.length > 0) {
        this.params = newParams;
      }
    } catch {
      // Invalid URL while typing, ignore
    }
  }

  syncParamsToUrl() {
    try {
      const base = this.url.split('?')[0];
      const searchParams = new URLSearchParams();
      for (const p of this.params) {
        if (p.enabled && p.key.trim()) {
          searchParams.append(p.key.trim(), p.value);
        }
      }
      const qs = searchParams.toString();
      this.url = qs ? `${base}?${qs}` : base;
    } catch {
      // Ignore
    }
  }

  addParam() {
    this.params.push({ key: '', value: '', enabled: true });
  }

  removeParam(index: number) {
    this.params.splice(index, 1);
    this.syncParamsToUrl();
  }

  clearParams() {
    this.params = [];
    this.syncParamsToUrl();
  }

  // --- Header Management ---
  addHeader() {
    this.headers.push({ key: '', value: '', enabled: true });
  }

  removeHeader(index: number) {
    this.headers.splice(index, 1);
  }

  addStandardHeader(key: string, value: string) {
    const existing = this.headers.find(h => h.key.toLowerCase() === key.toLowerCase());
    if (existing) {
      existing.value = value;
      existing.enabled = true;
    } else {
      this.headers.push({ key, value, enabled: true });
    }
  }

  // --- Body & Formatting ---
  formatBodyJson() {
    try {
      this.bodyContent = formatJson(this.bodyContent);
    } catch (e) {
      // Do nothing if invalid JSON
    }
  }

  clearBody() {
    this.bodyContent = '';
  }

  // --- Preset Loading ---
  onPresetChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const index = parseInt(select.value, 10);
    if (!isNaN(index) && this.presets[index]) {
      this.applyPreset(this.presets[index]);
    }
    select.value = '';
  }

  applyPreset(preset: PresetTemplate) {
    this.method = preset.method;
    this.url = preset.url;
    this.headers = (preset.headers || []).map(h => ({ ...h, enabled: true }));
    if (preset.body) {
      this.bodyContent = preset.body;
      this.activeRequestTab = 'body';
    } else {
      this.activeRequestTab = 'params';
    }
    this.extractParamsFromUrl();
  }

  // --- Effective Request Calculation ---
  getEffectiveHeaders(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const h of this.headers) {
      if (h.enabled && h.key.trim()) {
        result[h.key.trim()] = h.value;
      }
    }

    // Apply Auth
    if (this.authType === 'bearer' && this.authToken.trim()) {
      result['Authorization'] = `Bearer ${this.authToken.trim()}`;
    } else if (this.authType === 'basic' && (this.authUsername || this.authPassword)) {
      const credentials = btoa(`${this.authUsername}:${this.authPassword}`);
      result['Authorization'] = `Basic ${credentials}`;
    } else if (this.authType === 'apikey' && this.authApiKeyLocation === 'header' && this.authApiKeyName.trim()) {
      result[this.authApiKeyName.trim()] = this.authApiKeyValue;
    }

    return result;
  }

  getEffectiveUrl(): string {
    try {
      const parsedUrl = new URL(this.url);
      if (this.authType === 'apikey' && this.authApiKeyLocation === 'query' && this.authApiKeyName.trim()) {
        parsedUrl.searchParams.set(this.authApiKeyName.trim(), this.authApiKeyValue);
      }
      return parsedUrl.toString();
    } catch {
      return this.url;
    }
  }

  // --- Send HTTP Request ---
  async send() {
    if (!this.url.trim()) return;

    this.loading.set(true);
    this.hasResponse.set(false);
    this.errorMessage.set('');
    this.resultStatus.set('');
    this.responseHeaders.set([]);

    const startTime = performance.now();

    try {
      const finalUrl = this.getEffectiveUrl();
      const effectiveHeaders = this.getEffectiveHeaders();

      const options: RequestInit = {
        method: this.method,
        headers: effectiveHeaders,
        body: ['GET', 'HEAD'].includes(this.method) ? undefined : (this.bodyContent || undefined)
      };

      const response = await fetch(finalUrl, options);
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const text = await response.text();
      const sizeBytes = new Blob([text]).size;

      // Extract response headers
      const resHeaders: Array<{ key: string; value: string }> = [];
      response.headers.forEach((value, key) => {
        resHeaders.push({ key, value });
      });

      let formattedBody = text;
      let language: 'json' | 'xml' | 'html' | 'plaintext' = 'plaintext';

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('json') || (text.trim().startsWith('{') || text.trim().startsWith('['))) {
        try {
          formattedBody = formatJson(text);
          language = 'json';
        } catch {
          language = 'plaintext';
        }
      } else if (contentType.includes('html') || text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
        language = 'html';
      } else if (contentType.includes('xml') || text.trim().startsWith('<?xml')) {
        language = 'xml';
      }

      this.hasResponse.set(true);
      this.statusCode.set(response.status);
      this.statusText.set(response.statusText || this.getDefaultStatusText(response.status));
      this.responseTimeMs.set(durationMs);
      this.responseSize.set(this.formatBytes(sizeBytes));
      this.responseHeaders.set(resHeaders);
      this.responseBody.set(formattedBody);
      this.rawResponse.set(text);
      this.responseLanguage.set(language);
      this.resultStatus.set(response.ok ? 'success' : 'error');

      // Record History
      this.addHistoryItem(this.method, this.url, response.status, durationMs);
    } catch (err: any) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      this.hasResponse.set(true);
      this.statusCode.set(null);
      this.statusText.set('Network / CORS Error');
      this.responseTimeMs.set(durationMs);
      this.responseSize.set('0 B');
      this.resultStatus.set('error');
      this.errorMessage.set(err?.message || 'Failed to fetch. The server may be unreachable or blocking cross-origin requests (CORS).');
      this.responseBody.set(`Error: ${err?.message || 'Network request failed.'}\n\nNote: If requesting a local or private API from the browser, ensure CORS headers (Access-Control-Allow-Origin) are enabled on the server.`);
      this.responseLanguage.set('plaintext');

      this.addHistoryItem(this.method, this.url, 0, durationMs);
    } finally {
      this.loading.set(false);
    }
  }

  private addHistoryItem(method: string, url: string, status: number, timeMs: number) {
    const newItem: RequestHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      method,
      url,
      timestamp: new Date(),
      status,
      timeMs
    };
    this.history.update(prev => [newItem, ...prev.slice(0, 19)]);
  }

  restoreFromHistory(item: RequestHistoryItem) {
    this.method = item.method;
    this.url = item.url;
    this.extractParamsFromUrl();
  }

  clearHistory() {
    this.history.set([]);
  }

  // --- cURL Export & Import ---
  copyAsCurl() {
    const finalUrl = this.getEffectiveUrl();
    const effectiveHeaders = this.getEffectiveHeaders();
    const parts: string[] = ['curl'];

    if (this.method !== 'GET') {
      parts.push(`-X ${this.method}`);
    }

    parts.push(`'${finalUrl}'`);

    for (const [k, v] of Object.entries(effectiveHeaders)) {
      parts.push(`-H '${k}: ${v}'`);
    }

    if (!['GET', 'HEAD'].includes(this.method) && this.bodyContent.trim()) {
      parts.push(`-d '${this.bodyContent.replace(/'/g, "'\\''")}'`);
    }

    const command = parts.join(' \\\n  ');
    navigator.clipboard.writeText(command);
    this.copiedCurl.set(true);
    setTimeout(() => this.copiedCurl.set(false), 2000);
  }

  importCurl() {
    const raw = this.curlImportInput.trim();
    if (!raw) return;

    try {
      const args = this.splitArguments(raw);
      let parsedMethod = '';
      let parsedUrl = '';
      const parsedHeaders: KeyValueItem[] = [];
      let parsedBody = '';

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (i === 0 && arg.toLowerCase() === 'curl') continue;

        if (arg === '-X' || arg === '--request') {
          parsedMethod = args[++i] || '';
        } else if (arg.startsWith('-X')) {
          parsedMethod = arg.substring(2);
        } else if (arg === '-H' || arg === '--header') {
          const headerStr = args[++i] || '';
          const colon = headerStr.indexOf(':');
          if (colon !== -1) {
            parsedHeaders.push({
              key: headerStr.substring(0, colon).trim(),
              value: headerStr.substring(colon + 1).trim(),
              enabled: true
            });
          }
        } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary') {
          parsedBody = args[++i] || '';
        } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
          parsedUrl = arg;
        } else if (!arg.startsWith('-') && !parsedUrl) {
          parsedUrl = arg;
        }
      }

      if (parsedUrl) this.url = parsedUrl;
      if (parsedMethod) this.method = parsedMethod.toUpperCase();
      if (parsedHeaders.length) this.headers = parsedHeaders;
      if (parsedBody) {
        this.bodyContent = parsedBody;
        this.activeRequestTab = 'body';
      }

      this.extractParamsFromUrl();
      this.showImportModal.set(false);
      this.curlImportInput = '';
    } catch {
      // Error handling
    }
  }

  private splitArguments(cmd: string): string[] {
    const args: string[] = [];
    let current = '';
    let inDoubleQuotes = false;
    let inSingleQuotes = false;
    let escaped = false;

    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === '\\' && !inSingleQuotes) {
        if (cmd[i + 1] === '\n' || cmd[i + 1] === '\r') {
          i++;
          continue;
        }
        escaped = true;
        continue;
      }
      if (char === '"' && !inSingleQuotes) {
        inDoubleQuotes = !inDoubleQuotes;
        continue;
      }
      if (char === "'" && !inDoubleQuotes) {
        inSingleQuotes = !inSingleQuotes;
        continue;
      }
      if (/\s/.test(char) && !inDoubleQuotes && !inSingleQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) args.push(current);
    return args;
  }

  // --- Copy & Download Utilities ---
  copyResponse() {
    navigator.clipboard.writeText(this.responseBody());
    this.copiedResponse.set(true);
    setTimeout(() => this.copiedResponse.set(false), 2000);
  }

  downloadResponse() {
    const ext = this.responseLanguage() === 'json' ? 'json' : this.responseLanguage() === 'html' ? 'html' : 'txt';
    const blob = new Blob([this.responseBody()], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `response-${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private getDefaultStatusText(status: number): string {
    const map: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return map[status] || '';
  }
}
