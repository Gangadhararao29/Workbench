import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-http-request-builder', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './http-request-builder.html', styleUrls: ['./http-request-builder.css']
})
export class HttpRequestBuilder {
  @Input({ required: true }) instanceId!: string;
  method = 'GET';
  url = 'https://jsonplaceholder.typicode.com/users/1';
  query = '';
  headers = 'Content-Type: application/json';
  body = '';
  result = signal('');
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
      try { output = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      this.result.set(`${response.status} ${response.statusText}\n\n${output}`);
    } catch (error) { this.result.set(`Request failed: ${(error as Error).message}`); }
    finally { this.loading.set(false); }
  }
}
