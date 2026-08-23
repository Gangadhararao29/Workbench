import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-http-request-builder', standalone: true, imports: [FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './http-request-builder.html', styleUrls: ['./http-request-builder.css']
})
export class HttpRequestBuilder {
  @Input({ required: true }) instanceId!: string;
  method = 'GET';
  url = 'https://jsonplaceholder.typicode.com/users/1';
  query = '';
  headers = 'Content-Type: application/json';
  body = '';
  responseStatus = signal('');
  responseBody = signal('');
  responseLanguage = signal('plaintext');
  resultStatus = signal<'success' | 'error' | ''>('');
  loading = signal(false);
  async send() {
    this.loading.set(true);
    try {
      const parsedHeaders: Record<string, string> = {};
      this.headers.split('\n').filter(Boolean).forEach(line => { const [key, ...value] = line.split(':'); if (key && value.length) parsedHeaders[key.trim()] = value.join(':').trim(); });
      const requestUrl = new URL(this.url);
      this.query.split('\n').filter(Boolean).forEach(line => { const [key, ...value] = line.split('='); if (key && value.length) requestUrl.searchParams.set(key.trim(), value.join('=').trim()); });
      const response = await fetch(requestUrl, { method: this.method, headers: parsedHeaders, body: ['GET', 'HEAD'].includes(this.method) ? undefined : this.body || undefined });
      const text = await response.text();
      let output = text;
      let isJson = false;
      try { output = JSON.stringify(JSON.parse(text), null, 2); isJson = true; } catch {}
      this.resultStatus.set(response.ok ? 'success' : 'error');
      this.responseStatus.set(`${response.status} ${response.statusText}`);
      this.responseBody.set(output);
      this.responseLanguage.set(isJson ? 'json' : 'plaintext');
    } catch (error) {
      this.resultStatus.set('error');
      this.responseStatus.set('Request failed');
      this.responseBody.set((error as Error).message);
      this.responseLanguage.set('plaintext');
    }
    finally { this.loading.set(false); }
  }
}
