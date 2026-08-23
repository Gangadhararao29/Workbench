import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-curl-converter', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './curl-converter.html', styleUrls: ['./curl-converter.css']
})
export class CurlConverter {
  @Input({ required: true }) instanceId!: string;
  input = signal("curl -X GET 'https://localhost:5001/api/users' -H 'Authorization: Bearer token'");
  target: 'csharp' | 'fetch' | 'angular' | 'axios' | 'restsharp' = 'csharp';
  result = signal('');
  convert() {
    const source = this.input().trim();
    const url = source.match(/(?:curl\s+)?['"]?([^'"\s]+)['"]?/)?.[1];
    if (!url) { this.result.set('Enter a valid cURL command.'); return; }
    const method = source.match(/(?:-X|--request)\s+([A-Z]+)/i)?.[1]?.toUpperCase() ?? (/-d\s|--data/.test(source) ? 'POST' : 'GET');
    const headers = [...source.matchAll(/(?:-H|--header)\s+['"]([^'"]+)['"]/gi)].map(match => match[1].split(/:\s*/, 2));
    const body = source.match(/(?:-d|--data|--data-raw)\s+['"]([\s\S]*?)['"]/i)?.[1];
    if (this.target === 'fetch') this.result.set(renderFetch(url, method, headers, body));
    else if (this.target === 'angular') this.result.set(renderAngular(url, method, headers, body));
    else if (this.target === 'axios') this.result.set(`const response = await axios.${method.toLowerCase()}('${url}', ${body ? body : '{'}${body ? `, { headers: ${JSON.stringify(Object.fromEntries(headers))} }` : ` headers: ${JSON.stringify(Object.fromEntries(headers))} }`});`);
    else if (this.target === 'restsharp') this.result.set(`var options = new RestClientOptions("${url}");\nvar client = new RestClient(options);\nvar request = new RestRequest("${url}", Method.${method});${headers.map(header => `\nrequest.AddHeader("${header[0]}", "${header[1]}");`).join('')}${body ? `\nrequest.AddStringBody(${JSON.stringify(body)}, DataFormat.Json);` : ''}\nvar response = await client.ExecuteAsync(request);`);
    else this.result.set(renderCsharp(url, method, headers, body));
  }
}
function renderFetch(url: string, method: string, headers: string[][], body?: string) { return `const response = await fetch('${url}', {\n  method: '${method}',\n  headers: ${JSON.stringify(Object.fromEntries(headers), null, 2)},${body ? `\n  body: ${JSON.stringify(body)},` : ''}\n});\nconst data = await response.json();`; }
function renderAngular(url: string, method: string, headers: string[][], body?: string) { return `this.http.${method.toLowerCase()}${method === 'GET' || method === 'DELETE' ? `<User[]>` : '<User>'}('${url}'${body ? `, ${body}` : ''}, { headers: new HttpHeaders(${JSON.stringify(Object.fromEntries(headers))}) });`; }
function renderCsharp(url: string, method: string, headers: string[][], body?: string) { return `using var request = new HttpRequestMessage(HttpMethod.${method[0]}${method.slice(1).toLowerCase()}, "${url}");\n${headers.map(header => `request.Headers.TryAddWithoutValidation("${header[0]}", "${header[1]}");`).join('\n')}${body ? `\nrequest.Content = new StringContent(${JSON.stringify(body)}, Encoding.UTF8, "application/json");` : ''}\nusing var response = await httpClient.SendAsync(request);`; }
