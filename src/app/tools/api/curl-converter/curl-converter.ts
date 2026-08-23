import { Component, Input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-curl-converter', standalone: true, imports: [FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './curl-converter.html', styleUrls: ['./curl-converter.css']
})
export class CurlConverter {
  @Input({ required: true }) instanceId!: string;
  input = signal("curl -X GET 'https://localhost:5001/api/users' -H 'Authorization: Bearer token'");
  target: 'csharp' | 'fetch' | 'angular' | 'axios' | 'restsharp' = 'csharp';
  result = signal('');
  outputLanguage = computed(() => {
    if (this.target === 'csharp' || this.target === 'restsharp') return 'csharp';
    if (this.target === 'angular') return 'typescript';
    return 'javascript';
  });
  convert() {
    const source = this.input().trim();
    if (!source) {
      this.result.set('Enter a valid cURL command.');
      return;
    }

    const args = splitArguments(source);
    const optionsWithArgs = new Set([
      '-X', '--request',
      '-H', '--header',
      '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '--data-ascii',
      '-u', '--user',
      '-A', '--user-agent',
      '-e', '--referer',
      '-o', '--output',
      '-F', '--form',
      '--url',
      '-m', '--max-time',
      '--connect-timeout',
      '-b', '--cookie',
      '-c', '--cookie-jar'
    ]);

    let method = '';
    let url = '';
    const headers: string[][] = [];
    let body = '';

    const parseHeader = (headerStr: string) => {
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = headerStr.substring(0, colonIndex).trim();
        const val = headerStr.substring(colonIndex + 1).trim();
        headers.push([key, val]);
      } else {
        headers.push([headerStr.trim(), '']);
      }
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (i === 0 && arg.toLowerCase() === 'curl') {
        continue;
      }

      if (arg === '-X' || arg === '--request') {
        method = args[++i] || '';
      } else if (arg.startsWith('-X')) {
        method = arg.substring(2);
      } else if (arg.startsWith('--request=')) {
        method = arg.substring(10);
      } else if (arg === '-H' || arg === '--header') {
        const headerStr = args[++i];
        if (headerStr) {
          parseHeader(headerStr);
        }
      } else if (arg.startsWith('--header=')) {
        parseHeader(arg.substring(9));
      } else if (arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary') {
        body = args[++i] || '';
      } else if (arg.startsWith('--data=')) {
        body = arg.substring(7);
      } else if (arg.startsWith('--data-raw=')) {
        body = arg.substring(11);
      } else if (arg.startsWith('--data-binary=')) {
        body = arg.substring(14);
      } else if (arg === '--url') {
        url = args[++i] || '';
      } else if (arg.startsWith('--url=')) {
        url = arg.substring(6);
      } else if (optionsWithArgs.has(arg)) {
        i++; // skip option argument
      }
    }

    if (!url) {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (i === 0 && arg.toLowerCase() === 'curl') continue;
        if (arg.startsWith('http://') || arg.startsWith('https://')) {
          url = arg;
          break;
        }
      }
    }

    if (!url) {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (i === 0 && arg.toLowerCase() === 'curl') continue;
        const prevArg = args[i - 1];
        if (prevArg && optionsWithArgs.has(prevArg)) {
          continue;
        }
        if (arg.startsWith('-')) {
          continue;
        }
        url = arg;
        break;
      }
    }

    if (!url) {
      this.result.set('Enter a valid cURL command.');
      return;
    }

    if (!method) {
      method = body ? 'POST' : 'GET';
    }
    method = method.toUpperCase();

    if (this.target === 'fetch') {
      this.result.set(renderFetch(url, method, headers, body));
    } else if (this.target === 'angular') {
      this.result.set(renderAngular(url, method, headers, body));
    } else if (this.target === 'axios') {
      const config = headers.length ? `, { headers: ${JSON.stringify(Object.fromEntries(headers))} }` : '';
      if (body) {
        this.result.set(`const response = await axios.${method.toLowerCase()}('${url}', ${formatBodyAsJs(body)}${config});`);
      } else {
        this.result.set(`const response = await axios.${method.toLowerCase()}('${url}'${config});`);
      }
    } else if (this.target === 'restsharp') {
      const lines = [
        `var options = new RestClientOptions("${url}");`,
        `var client = new RestClient(options);`,
        `var request = new RestRequest("${url}", Method.${method});`
      ];
      for (const header of headers) {
        lines.push(`request.AddHeader("${header[0]}", "${header[1]}");`);
      }
      if (body) {
        lines.push(`request.AddStringBody(${JSON.stringify(body)}, DataFormat.Json);`);
      }
      lines.push(`var response = await client.ExecuteAsync(request);`);
      this.result.set(lines.join('\n'));
    } else {
      this.result.set(renderCsharp(url, method, headers, body));
    }
  }
}

function splitArguments(cmd: string): string[] {
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
      if (cmd[i + 1] === '\n') {
        i++;
        continue;
      }
      if (cmd[i + 1] === '\r' && cmd[i + 2] === '\n') {
        i += 2;
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

  if (current) {
    args.push(current);
  }

  return args;
}

function formatBodyAsJs(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return JSON.stringify(body);
  }
}

function renderFetch(url: string, method: string, headers: string[][], body?: string) {
  const options: string[] = [`method: '${method}'`];
  if (headers.length) {
    options.push(`headers: ${JSON.stringify(Object.fromEntries(headers), null, 2).replace(/\n/g, '\n  ')}`);
  }
  if (body) {
    options.push(`body: ${JSON.stringify(body)}`);
  }
  return `const response = await fetch('${url}', {\n  ${options.join(',\n  ')}\n});\nconst data = await response.json();`;
}

function renderAngular(url: string, method: string, headers: string[][], body?: string) {
  const bodyParam = body ? `, ${formatBodyAsJs(body)}` : '';
  const headersParam = headers.length ? `, { headers: new HttpHeaders(${JSON.stringify(Object.fromEntries(headers))}) }` : '';
  return `this.http.${method.toLowerCase()}${method === 'GET' || method === 'DELETE' ? `<User[]>` : '<User>'}('${url}'${bodyParam}${headersParam});`;
}

function renderCsharp(url: string, method: string, headers: string[][], body?: string) {
  const methodPascal = method[0].toUpperCase() + method.slice(1).toLowerCase();
  const lines = [`using var request = new HttpRequestMessage(HttpMethod.${methodPascal}, "${url}");`];
  for (const header of headers) {
    lines.push(`request.Headers.TryAddWithoutValidation("${header[0]}", "${header[1]}");`);
  }
  if (body) {
    lines.push(`request.Content = new StringContent(${JSON.stringify(body)}, Encoding.UTF8, "application/json");`);
  }
  lines.push(`using var response = await httpClient.SendAsync(request);`);
  return lines.join('\n');
}

