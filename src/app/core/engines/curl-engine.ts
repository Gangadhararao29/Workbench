export interface ParsedHeader {
  name: string;
  value: string;
}

export interface ParsedFormData {
  key: string;
  value: string;
  isFile?: boolean;
}

export interface ParsedCurlRequest {
  raw: string;
  method: string;
  url: string;
  host: string;
  pathname: string;
  queryParams: Array<{ key: string; value: string }>;
  headers: ParsedHeader[];
  body: string;
  bodyType: 'json' | 'form-urlencoded' | 'multipart' | 'raw' | 'none';
  formData: ParsedFormData[];
  basicAuth?: { username: string; password?: string };
  insecure?: boolean;
  followRedirects?: boolean;
  compressed?: boolean;
}

export type CurlTargetLanguage =
  | 'csharp'
  | 'restsharp'
  | 'fetch'
  | 'axios'
  | 'angular'
  | 'python-requests'
  | 'python-httpx'
  | 'go'
  | 'rust'
  | 'java'
  | 'php'
  | 'dart';

export interface TargetOption {
  id: CurlTargetLanguage;
  name: string;
  group: string;
  editorLanguage: string;
}

export const TARGET_OPTIONS: TargetOption[] = [
  { id: 'csharp', name: 'C# HttpClient', group: '.NET', editorLanguage: 'csharp' },
  { id: 'restsharp', name: 'C# RestSharp', group: '.NET', editorLanguage: 'csharp' },
  { id: 'fetch', name: 'JavaScript Fetch (Browser / Node)', group: 'JavaScript / TypeScript', editorLanguage: 'javascript' },
  { id: 'axios', name: 'Axios (JS / TS)', group: 'JavaScript / TypeScript', editorLanguage: 'javascript' },
  { id: 'angular', name: 'Angular HttpClient', group: 'JavaScript / TypeScript', editorLanguage: 'typescript' },
  { id: 'python-requests', name: 'Python Requests', group: 'Python', editorLanguage: 'python' },
  { id: 'python-httpx', name: 'Python HTTPX (Async)', group: 'Python', editorLanguage: 'python' },
  { id: 'go', name: 'Go (net/http)', group: 'Go', editorLanguage: 'go' },
  { id: 'rust', name: 'Rust (reqwest)', group: 'Rust', editorLanguage: 'rust' },
  { id: 'java', name: 'Java (java.net.http)', group: 'Java', editorLanguage: 'java' },
  { id: 'php', name: 'PHP (cURL)', group: 'PHP', editorLanguage: 'php' },
  { id: 'dart', name: 'Dart / Flutter (http)', group: 'Mobile / Dart', editorLanguage: 'dart' }
];

export interface CurlPreset {
  name: string;
  curl: string;
}

export const CURL_PRESETS: CurlPreset[] = [
  {
    name: 'GET with Bearer Auth',
    curl: `curl -X GET "https://api.example.com/v1/users?page=1&limit=10" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample" \\
  -H "Accept: application/json"`
  },
  {
    name: 'POST JSON Payload',
    curl: `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token_secret_123" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "Administrator",
    "isActive": true
  }'`
  },
  {
    name: 'POST Form URL-Encoded',
    curl: `curl -X POST "https://auth.example.com/oauth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&client_id=app123&client_secret=secret456"`
  },
  {
    name: 'PUT with Custom Headers',
    curl: `curl -X PUT "https://api.example.com/v1/settings/theme" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Version: 2.4.0" \\
  -H "X-Correlation-ID: 7b39a48f-8461-419b" \\
  -d '{"mode": "dark", "accentColor": "#6366f1"}'`
  },
  {
    name: 'Basic Authentication',
    curl: `curl -u "admin:SuperSecretPassword!" "https://api.example.com/v1/admin/metrics" \\
  -H "Accept: application/json"`
  },
  {
    name: 'Multipart Form Upload',
    curl: `curl -X POST "https://api.example.com/v1/documents/upload" \\
  -H "Authorization: Bearer token_123" \\
  -F "title=Monthly Report" \\
  -F "file=@/docs/financials.pdf;type=application/pdf"`
  },
  {
    name: 'GraphQL Query',
    curl: `curl -X POST "https://api.example.com/graphql" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "query GetUser($id: ID!) { user(id: $id) { id name email } }",
    "variables": { "id": "42" }
  }'`
  }
];

export function splitArguments(cmd: string): string[] {
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

    // Line continuation characters in Unix (\), Windows CMD (^), PowerShell (`)
    if ((char === '\\' || char === '^' || char === '`') && !inSingleQuotes && !inDoubleQuotes) {
      if (cmd[i + 1] === '\n') {
        i++;
        continue;
      }
      if (cmd[i + 1] === '\r' && cmd[i + 2] === '\n') {
        i += 2;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
    }

    if (char === '\\' && inDoubleQuotes) {
      // Escaped quote or backslash inside double quotes
      if (cmd[i + 1] === '"' || cmd[i + 1] === '\\') {
        current += cmd[i + 1];
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

  if (current) {
    args.push(current);
  }

  return args;
}

export function parseCurlCommand(rawCommand: string): ParsedCurlRequest {
  const trimmed = rawCommand.trim();
  if (!trimmed) {
    throw new Error('Please enter a cURL command.');
  }

  // Remove comment lines starting with #
  const cleaned = trimmed
    .split('\n')
    .filter(line => !line.trim().startsWith('#'))
    .join('\n');

  const args = splitArguments(cleaned);
  if (!args.length) {
    throw new Error('Please enter a valid cURL command.');
  }

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
  const headers: ParsedHeader[] = [];
  const bodyParts: string[] = [];
  const formData: ParsedFormData[] = [];
  let isGetWithData = false;
  let basicAuth: { username: string; password?: string } | undefined;
  let insecure = false;
  let followRedirects = false;
  let compressed = false;

  const parseHeader = (headerStr: string) => {
    const colonIndex = headerStr.indexOf(':');
    if (colonIndex !== -1) {
      const name = headerStr.substring(0, colonIndex).trim();
      const value = headerStr.substring(colonIndex + 1).trim();
      headers.push({ name, value });
    } else {
      headers.push({ name: headerStr.trim(), value: '' });
    }
  };

  const parseAuth = (authStr: string) => {
    const colonIndex = authStr.indexOf(':');
    if (colonIndex !== -1) {
      basicAuth = {
        username: authStr.substring(0, colonIndex),
        password: authStr.substring(colonIndex + 1)
      };
    } else {
      basicAuth = { username: authStr, password: '' };
    }
  };

  const parseFormField = (formStr: string) => {
    const equalIndex = formStr.indexOf('=');
    if (equalIndex !== -1) {
      const key = formStr.substring(0, equalIndex).trim();
      const val = formStr.substring(equalIndex + 1).trim();
      const isFile = val.startsWith('@');
      formData.push({ key, value: val, isFile });
    } else {
      formData.push({ key: formStr.trim(), value: '' });
    }
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Skip leading shell prompts or curl executable names
    if (i === 0 && (arg.toLowerCase() === 'curl' || arg.toLowerCase() === 'curl.exe' || arg === '$')) {
      continue;
    }
    if (i === 1 && args[0] === '$' && (arg.toLowerCase() === 'curl' || arg.toLowerCase() === 'curl.exe')) {
      continue;
    }

    // Method flags
    if (arg === '-X' || arg === '--request') {
      method = (args[++i] || '').toUpperCase();
    } else if (arg.startsWith('-X')) {
      method = arg.substring(2).toUpperCase();
    } else if (arg.startsWith('--request=')) {
      method = arg.substring(10).toUpperCase();
    }
    // Header flags
    else if (arg === '-H' || arg === '--header') {
      const val = args[++i];
      if (val) parseHeader(val);
    } else if (arg.startsWith('--header=')) {
      parseHeader(arg.substring(9));
    }
    // Data / Body flags
    else if (
      arg === '-d' ||
      arg === '--data' ||
      arg === '--data-raw' ||
      arg === '--data-binary' ||
      arg === '--data-ascii' ||
      arg === '--data-urlencode'
    ) {
      const val = args[++i] || '';
      bodyParts.push(val);
    } else if (arg.startsWith('--data=')) {
      bodyParts.push(arg.substring(7));
    } else if (arg.startsWith('--data-raw=')) {
      bodyParts.push(arg.substring(11));
    } else if (arg.startsWith('--data-binary=')) {
      bodyParts.push(arg.substring(14));
    } else if (arg.startsWith('--data-urlencode=')) {
      bodyParts.push(arg.substring(17));
    }
    // Form data flags
    else if (arg === '-F' || arg === '--form') {
      const val = args[++i];
      if (val) parseFormField(val);
    } else if (arg.startsWith('--form=')) {
      parseFormField(arg.substring(7));
    }
    // Basic Auth
    else if (arg === '-u' || arg === '--user') {
      const val = args[++i];
      if (val) parseAuth(val);
    } else if (arg.startsWith('--user=')) {
      parseAuth(arg.substring(7));
    }
    // User Agent
    else if (arg === '-A' || arg === '--user-agent') {
      const val = args[++i];
      if (val) headers.push({ name: 'User-Agent', value: val });
    } else if (arg.startsWith('--user-agent=')) {
      headers.push({ name: 'User-Agent', value: arg.substring(13) });
    }
    // Referer
    else if (arg === '-e' || arg === '--referer') {
      const val = args[++i];
      if (val) headers.push({ name: 'Referer', value: val });
    } else if (arg.startsWith('--referer=')) {
      headers.push({ name: 'Referer', value: arg.substring(10) });
    }
    // Cookie
    else if (arg === '-b' || arg === '--cookie') {
      const val = args[++i];
      if (val) headers.push({ name: 'Cookie', value: val });
    } else if (arg.startsWith('--cookie=')) {
      headers.push({ name: 'Cookie', value: arg.substring(9) });
    }
    // URL flag
    else if (arg === '--url') {
      url = args[++i] || '';
    } else if (arg.startsWith('--url=')) {
      url = arg.substring(6);
    }
    // Boolean flags
    else if (arg === '-G' || arg === '--get') {
      isGetWithData = true;
    } else if (arg === '-I' || arg === '--head') {
      method = 'HEAD';
    } else if (arg === '-k' || arg === '--insecure') {
      insecure = true;
    } else if (arg === '-L' || arg === '--location') {
      followRedirects = true;
    } else if (arg === '--compressed') {
      compressed = true;
    } else if (optionsWithArgs.has(arg)) {
      i++; // skip unrecognized option argument
    }
  }

  // URL fallback resolution
  if (!url) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (i === 0 && (arg.toLowerCase() === 'curl' || arg.toLowerCase() === 'curl.exe' || arg === '$')) continue;
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        url = arg;
        break;
      }
    }
  }

  if (!url) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (i === 0 && (arg.toLowerCase() === 'curl' || arg.toLowerCase() === 'curl.exe' || arg === '$')) continue;
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
    throw new Error('No target URL found in cURL command. Please specify a valid URL.');
  }

  // Ensure URL has protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  let body = bodyParts.join('&');

  // Handle -G / --get with data
  if (isGetWithData && body) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}${body}`;
    body = '';
  }

  // Method resolution
  if (!method) {
    if (formData.length > 0 || body) {
      method = 'POST';
    } else {
      method = 'GET';
    }
  }

  // Basic auth header addition if not already set
  if (basicAuth && !headers.some(h => h.name.toLowerCase() === 'authorization')) {
    try {
      const creds = `${basicAuth.username}:${basicAuth.password || ''}`;
      const encoded = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(creds))) : '';
      if (encoded) {
        headers.push({ name: 'Authorization', value: `Basic ${encoded}` });
      }
    } catch {
      // ignore base64 encoding error
    }
  }

  // Determine body type
  let bodyType: 'json' | 'form-urlencoded' | 'multipart' | 'raw' | 'none' = 'none';
  if (formData.length > 0) {
    bodyType = 'multipart';
  } else if (body) {
    const contentTypeHeader = headers.find(h => h.name.toLowerCase() === 'content-type')?.value.toLowerCase() || '';
    if (contentTypeHeader.includes('application/json')) {
      bodyType = 'json';
    } else if (contentTypeHeader.includes('application/x-www-form-urlencoded')) {
      bodyType = 'form-urlencoded';
    } else {
      try {
        JSON.parse(body);
        bodyType = 'json';
      } catch {
        if (body.includes('=') && !body.includes('{') && !body.includes('\n')) {
          bodyType = 'form-urlencoded';
        } else {
          bodyType = 'raw';
        }
      }
    }
  }

  // Parse URL breakdown
  let host = '';
  let pathname = '';
  const queryParams: Array<{ key: string; value: string }> = [];

  try {
    const parsedUrl = new URL(url);
    host = parsedUrl.host;
    pathname = parsedUrl.pathname;
    parsedUrl.searchParams.forEach((value, key) => {
      queryParams.push({ key, value });
    });
  } catch {
    host = url;
  }

  return {
    raw: trimmed,
    method,
    url,
    host,
    pathname,
    queryParams,
    headers,
    body,
    bodyType,
    formData,
    basicAuth,
    insecure,
    followRedirects,
    compressed
  };
}

export function formatCurlCommand(req: ParsedCurlRequest): string {
  const lines: string[] = [`curl -X ${req.method} "${req.url}"`];

  for (const header of req.headers) {
    lines.push(`  -H "${header.name}: ${header.value}"`);
  }

  if (req.formData.length > 0) {
    for (const f of req.formData) {
      lines.push(`  -F "${f.key}=${f.value}"`);
    }
  } else if (req.body) {
    if (req.bodyType === 'json') {
      try {
        const pretty = JSON.stringify(JSON.parse(req.body), null, 2);
        lines.push(`  -d '${pretty}'`);
      } catch {
        lines.push(`  -d '${req.body}'`);
      }
    } else {
      lines.push(`  -d '${req.body}'`);
    }
  }

  if (req.followRedirects) lines.push('  --location');
  if (req.insecure) lines.push('  --insecure');
  if (req.compressed) lines.push('  --compressed');

  return lines.join(' \\\n');
}

// ---------------------------------------------------------------------------
// Target Code Generators
// ---------------------------------------------------------------------------

export function convertCurl(rawCommand: string, target: CurlTargetLanguage): string {
  const req = parseCurlCommand(rawCommand);

  switch (target) {
    case 'csharp':
      return generateCsharp(req);
    case 'restsharp':
      return generateRestSharp(req);
    case 'fetch':
      return generateFetch(req);
    case 'axios':
      return generateAxios(req);
    case 'angular':
      return generateAngular(req);
    case 'python-requests':
      return generatePythonRequests(req);
    case 'python-httpx':
      return generatePythonHttpx(req);
    case 'go':
      return generateGo(req);
    case 'rust':
      return generateRust(req);
    case 'java':
      return generateJava(req);
    case 'php':
      return generatePhp(req);
    case 'dart':
      return generateDart(req);
    default:
      return generateCsharp(req);
  }
}

function headersToMap(headers: ParsedHeader[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    map[h.name] = h.value;
  }
  return map;
}

function formatJsonBody(body: string): { isJson: boolean; formatted: string } {
  try {
    const parsed = JSON.parse(body);
    return { isJson: true, formatted: JSON.stringify(parsed, null, 2) };
  } catch {
    return { isJson: false, formatted: body };
  }
}

// 1. C# HttpClient
export function generateCsharp(req: ParsedCurlRequest): string {
  const methodPascal = req.method[0].toUpperCase() + req.method.slice(1).toLowerCase();
  const lines: string[] = [
    `using System.Net.Http;`,
    `using System.Text;`,
    `using System.Text.Json;`,
    ``,
    `using var httpClient = new HttpClient();`,
    `using var request = new HttpRequestMessage(HttpMethod.${methodPascal}, "${req.url}");`,
    ``
  ];

  // Headers (separating standard request headers from content headers)
  for (const h of req.headers) {
    if (h.name.toLowerCase() === 'content-type') continue; // handled by StringContent
    lines.push(`request.Headers.TryAddWithoutValidation("${h.name}", "${h.value}");`);
  }

  if (req.formData.length > 0) {
    lines.push(``, `var content = new MultipartFormDataContent();`);
    for (const f of req.formData) {
      if (f.isFile) {
        lines.push(`// Add file payload for ${f.key}: ${f.value}`);
        lines.push(`content.Add(new ByteArrayContent(await File.ReadAllBytesAsync("path/to/file")), "${f.key}", "filename");`);
      } else {
        lines.push(`content.Add(new StringContent("${f.value}"), "${f.key}");`);
      }
    }
    lines.push(`request.Content = content;`);
  } else if (req.body) {
    const contentTypeHeader = req.headers.find(h => h.name.toLowerCase() === 'content-type')?.value || 'application/json';
    const jsonCheck = formatJsonBody(req.body);
    if (jsonCheck.isJson) {
      lines.push(``, `var jsonBody = """`);
      lines.push(jsonCheck.formatted);
      lines.push(`""";`);
      lines.push(`request.Content = new StringContent(jsonBody, Encoding.UTF8, "${contentTypeHeader}");`);
    } else {
      lines.push(``, `request.Content = new StringContent(${JSON.stringify(req.body)}, Encoding.UTF8, "${contentTypeHeader}");`);
    }
  }

  lines.push(``, `using var response = await httpClient.SendAsync(request);`);
  lines.push(`response.EnsureSuccessStatusCode();`);
  lines.push(`var responseBody = await response.Content.ReadAsStringAsync();`);
  lines.push(`Console.WriteLine(responseBody);`);

  return lines.join('\n');
}

// 2. C# RestSharp
export function generateRestSharp(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `using RestSharp;`,
    ``,
    `var options = new RestClientOptions("${req.url}");`,
    `var client = new RestClient(options);`,
    `var request = new RestRequest("", Method.${req.method});`,
    ``
  ];

  for (const h of req.headers) {
    lines.push(`request.AddHeader("${h.name}", "${h.value}");`);
  }

  if (req.formData.length > 0) {
    for (const f of req.formData) {
      if (f.isFile) {
        lines.push(`request.AddFile("${f.key}", "path/to/file");`);
      } else {
        lines.push(`request.AddParameter("${f.key}", "${f.value}");`);
      }
    }
  } else if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    if (jsonCheck.isJson) {
      lines.push(`request.AddStringBody(${JSON.stringify(req.body)}, DataFormat.Json);`);
    } else {
      lines.push(`request.AddStringBody(${JSON.stringify(req.body)}, DataFormat.None);`);
    }
  }

  lines.push(``, `var response = await client.ExecuteAsync(request);`);
  lines.push(`Console.WriteLine(response.Content);`);

  return lines.join('\n');
}

// 3. JavaScript / TypeScript Fetch
export function generateFetch(req: ParsedCurlRequest): string {
  const optionsObj: string[] = [`method: '${req.method}'`];

  if (req.headers.length > 0) {
    const headerObj = headersToMap(req.headers);
    optionsObj.push(`headers: ${JSON.stringify(headerObj, null, 2).replace(/\n/g, '\n  ')}`);
  }

  if (req.formData.length > 0) {
    const formLines = [
      `const formData = new FormData();`,
      ...req.formData.map(f =>
        f.isFile
          ? `// formData.append('${f.key}', fileBlob, 'filename');`
          : `formData.append('${f.key}', '${f.value}');`
      )
    ];
    return `${formLines.join('\n')}\n\nconst response = await fetch('${req.url}', {\n  ${optionsObj.join(',\n  ')},\n  body: formData\n});\n\nif (!response.ok) {\n  throw new Error(\`HTTP error! status: \${response.status}\`);\n}\nconst data = await response.json();\nconsole.log(data);`;
  }

  if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    if (jsonCheck.isJson) {
      optionsObj.push(`body: JSON.stringify(${jsonCheck.formatted.replace(/\n/g, '\n  ')})`);
    } else {
      optionsObj.push(`body: ${JSON.stringify(req.body)}`);
    }
  }

  return `const response = await fetch('${req.url}', {\n  ${optionsObj.join(',\n  ')}\n});\n\nif (!response.ok) {\n  throw new Error(\`HTTP error! status: \${response.status}\`);\n}\nconst data = await response.json();\nconsole.log(data);`;
}

// 4. Axios
export function generateAxios(req: ParsedCurlRequest): string {
  const configObj: { headers?: Record<string, string> } = {};
  if (req.headers.length > 0) {
    configObj.headers = headersToMap(req.headers);
  }

  const configStr = Object.keys(configObj).length > 0 ? `, ${JSON.stringify(configObj, null, 2)}` : '';
  const methodLower = req.method.toLowerCase();

  if (req.formData.length > 0) {
    return `import axios from 'axios';\n\nconst formData = new FormData();\n${req.formData
      .map(f => (f.isFile ? `// formData.append('${f.key}', fileBlob);` : `formData.append('${f.key}', '${f.value}');`))
      .join('\n')}\n\nconst response = await axios.post('${req.url}', formData${configStr});\nconsole.log(response.data);`;
  }

  if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    const bodyStr = jsonCheck.isJson ? jsonCheck.formatted : JSON.stringify(req.body);
    if (['post', 'put', 'patch'].includes(methodLower)) {
      return `import axios from 'axios';\n\nconst response = await axios.${methodLower}('${req.url}', ${bodyStr}${configStr});\nconsole.log(response.data);`;
    }
    return `import axios from 'axios';\n\nconst response = await axios({\n  method: '${methodLower}',\n  url: '${req.url}',\n  data: ${bodyStr}${configStr ? `,\n  ...${JSON.stringify(configObj)}` : ''}\n});\nconsole.log(response.data);`;
  }

  if (['get', 'delete', 'head', 'options'].includes(methodLower)) {
    return `import axios from 'axios';\n\nconst response = await axios.${methodLower}('${req.url}'${configStr});\nconsole.log(response.data);`;
  }

  return `import axios from 'axios';\n\nconst response = await axios({\n  method: '${methodLower}',\n  url: '${req.url}'${configStr ? `,\n  ...${JSON.stringify(configObj)}` : ''}\n});\nconsole.log(response.data);`;
}

// 5. Angular HttpClient
export function generateAngular(req: ParsedCurlRequest): string {
  const methodLower = req.method.toLowerCase();
  const headerMap = headersToMap(req.headers);
  const hasHeaders = req.headers.length > 0;
  const headerCode = hasHeaders
    ? `const headers = new HttpHeaders(${JSON.stringify(headerMap, null, 2)});\n`
    : '';

  const optionsStr = hasHeaders ? `, { headers }` : '';

  if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    const bodyVal = jsonCheck.isJson ? jsonCheck.formatted : JSON.stringify(req.body);
    return `// In your Angular Service / Component:\nimport { HttpClient, HttpHeaders } from '@angular/common/http';\nimport { inject } from '@angular/core';\n\nconst http = inject(HttpClient);\n${headerCode}\nhttp.${methodLower}<any>('${req.url}', ${bodyVal}${optionsStr})\n  .subscribe({\n    next: (data) => console.log('Success:', data),\n    error: (err) => console.error('Error:', err)\n  });`;
  }

  return `// In your Angular Service / Component:\nimport { HttpClient, HttpHeaders } from '@angular/common/http';\nimport { inject } from '@angular/core';\n\nconst http = inject(HttpClient);\n${headerCode}\nhttp.${methodLower}<any>('${req.url}'${optionsStr})\n  .subscribe({\n    next: (data) => console.log('Success:', data),\n    error: (err) => console.error('Error:', err)\n  });`;
}

// 6. Python Requests
export function generatePythonRequests(req: ParsedCurlRequest): string {
  const lines: string[] = [`import requests`, ``];
  const methodLower = req.method.toLowerCase();

  const headerLines: string[] = [];
  if (req.headers.length > 0) {
    headerLines.push(`headers = {`);
    for (const h of req.headers) {
      headerLines.push(`    "${h.name}": "${h.value}",`);
    }
    headerLines.push(`}`);
  }

  const callArgs: string[] = [`"${req.url}"`];
  if (req.headers.length > 0) {
    callArgs.push(`headers=headers`);
  }

  if (req.formData.length > 0) {
    lines.push(`files = {`);
    for (const f of req.formData) {
      if (f.isFile) {
        lines.push(`    "${f.key}": open("path/to/file", "rb"),`);
      } else {
        lines.push(`    "${f.key}": (None, "${f.value}"),`);
      }
    }
    lines.push(`}`);
    callArgs.push(`files=files`);
  } else if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    if (jsonCheck.isJson) {
      lines.push(`payload = ${jsonCheck.formatted}`);
      callArgs.push(`json=payload`);
    } else {
      lines.push(`payload = """${req.body}"""`);
      callArgs.push(`data=payload`);
    }
  }

  if (headerLines.length > 0) {
    lines.push(headerLines.join('\n'));
  }

  lines.push(``, `response = requests.${methodLower}(${callArgs.join(', ')})`);
  lines.push(`response.raise_for_status()`);
  lines.push(`print(response.json())`);

  return lines.join('\n');
}

// 7. Python HTTPX
export function generatePythonHttpx(req: ParsedCurlRequest): string {
  const methodLower = req.method.toLowerCase();
  const lines: string[] = [
    `import httpx`,
    `import asyncio`,
    ``,
    `async def main():`,
    `    async with httpx.AsyncClient() as client:`
  ];

  if (req.headers.length > 0) {
    lines.push(`        headers = ${JSON.stringify(headersToMap(req.headers), null, 8).trim()}`);
  }

  const callArgs: string[] = [`"${req.url}"`];
  if (req.headers.length > 0) callArgs.push(`headers=headers`);

  if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    if (jsonCheck.isJson) {
      lines.push(`        payload = ${jsonCheck.formatted.replace(/\n/g, '\n        ')}`);
      callArgs.push(`json=payload`);
    } else {
      lines.push(`        payload = ${JSON.stringify(req.body)}`);
      callArgs.push(`content=payload`);
    }
  }

  lines.push(`        response = await client.${methodLower}(${callArgs.join(', ')})`);
  lines.push(`        print(response.status_code)`);
  lines.push(`        print(response.text)`);
  lines.push(``, `asyncio.run(main())`);

  return lines.join('\n');
}

// 8. Go (net/http)
export function generateGo(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `package main`,
    ``,
    `import (`,
    `\t"fmt"`,
    `\t"io"`,
    `\t"net/http"`
  ];

  if (req.body) {
    lines.push(`\t"strings"`);
  }

  lines.push(`)`, ``, `func main() {`);

  if (req.body) {
    lines.push(`\tpayload := strings.NewReader(\`${req.body.replace(/`/g, '` + "`" + `')}\`)`);
    lines.push(`\treq, err := http.NewRequest("${req.method}", "${req.url}", payload)`);
  } else {
    lines.push(`\treq, err := http.NewRequest("${req.method}", "${req.url}", nil)`);
  }

  lines.push(`\tif err != nil {`, `\t\tpanic(err)`, `\t}`);

  for (const h of req.headers) {
    lines.push(`\treq.Header.Set("${h.name}", "${h.value}")`);
  }

  lines.push(
    ``,
    `\tclient := &http.Client{}`,
    `\tres, err := client.Do(req)`,
    `\tif err != nil {`,
    `\t\tpanic(err)`,
    `\t}`,
    `\tdefer res.Body.Close()`,
    ``,
    `\tbody, err := io.ReadAll(res.Body)`,
    `\tif err != nil {`,
    `\t\tpanic(err)`,
    `\t}`,
    `\tfmt.Println(string(body))`,
    `}`
  );

  return lines.join('\n');
}

// 9. Rust (reqwest)
export function generateRust(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `use reqwest::Client;`,
    `use std::error::Error;`,
    ``,
    `#[tokio::main]`,
    `async fn main() -> Result<(), Box<dyn Error>> {`,
    `    let client = Client::new();`,
    `    let response = client`,
    `        .${req.method.toLowerCase()}("${req.url}")`
  ];

  for (const h of req.headers) {
    lines.push(`        .header("${h.name}", "${h.value}")`);
  }

  if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    if (jsonCheck.isJson) {
      lines.push(`        .header("Content-Type", "application/json")`);
      lines.push(`        .body(r#"${req.body}"#)`);
    } else {
      lines.push(`        .body(r#"${req.body}"#)`);
    }
  }

  lines.push(
    `        .send()`,
    `        .await?;`,
    ``,
    `    let body = response.text().await?;`,
    `    println!("{}", body);`,
    `    Ok(())`,
    `}`
  );

  return lines.join('\n');
}

// 10. Java (java.net.http)
export function generateJava(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `import java.net.URI;`,
    `import java.net.http.HttpClient;`,
    `import java.net.http.HttpRequest;`,
    `import java.net.http.HttpResponse;`,
    ``,
    `public class App {`,
    `    public static void main(String[] args) throws Exception {`,
    `        HttpClient client = HttpClient.newHttpClient();`,
    `        HttpRequest.Builder builder = HttpRequest.newBuilder()`,
    `            .uri(URI.create("${req.url}"));`
  ];

  for (const h of req.headers) {
    lines.push(`        builder.header("${h.name}", "${h.value}");`);
  }

  if (req.body) {
    lines.push(`        builder.method("${req.method}", HttpRequest.BodyPublishers.ofString(${JSON.stringify(req.body)}));`);
  } else {
    lines.push(`        builder.method("${req.method}", HttpRequest.BodyPublishers.noBody());`);
  }

  lines.push(
    `        HttpRequest request = builder.build();`,
    `        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`,
    `        System.out.println(response.body());`,
    `    }`,
    `}`
  );

  return lines.join('\n');
}

// 11. PHP cURL
export function generatePhp(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `<?php`,
    `$curl = curl_init();`,
    ``,
    `curl_setopt_array($curl, [`,
    `  CURLOPT_URL => '${req.url}',`,
    `  CURLOPT_RETURNTRANSFER => true,`,
    `  CURLOPT_CUSTOMREQUEST => '${req.method}',`
  ];

  if (req.headers.length > 0) {
    const formattedHeaders = req.headers.map(h => `    '${h.name}: ${h.value}'`).join(',\n');
    lines.push(`  CURLOPT_HTTPHEADER => [\n${formattedHeaders}\n  ],`);
  }

  if (req.body) {
    lines.push(`  CURLOPT_POSTFIELDS => ${JSON.stringify(req.body)},`);
  }

  lines.push(
    `]);`,
    ``,
    `$response = curl_exec($curl);`,
    `$err = curl_error($curl);`,
    `curl_close($curl);`,
    ``,
    `if ($err) {`,
    `  echo "cURL Error #:" . $err;`,
    `} else {`,
    `  echo $response;`,
    `}`
  );

  return lines.join('\n');
}

// 12. Dart / Flutter
export function generateDart(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `import 'package:http/http.dart' as http;`,
    `import 'dart:convert';`,
    ``,
    `Future<void> makeRequest() async {`,
    `  final url = Uri.parse('${req.url}');`
  ];

  if (req.headers.length > 0) {
    lines.push(`  final headers = ${JSON.stringify(headersToMap(req.headers), null, 4).replace(/\n/g, '\n  ')};`);
  }

  const methodLower = req.method.toLowerCase();
  const headersArg = req.headers.length > 0 ? `, headers: headers` : '';

  if (req.body) {
    const jsonCheck = formatJsonBody(req.body);
    const bodyStr = jsonCheck.isJson ? `jsonEncode(${jsonCheck.formatted})` : `'${req.body}'`;
    if (['post', 'put', 'patch'].includes(methodLower)) {
      lines.push(`  final response = await http.${methodLower}(url${headersArg}, body: ${bodyStr});`);
    } else {
      lines.push(`  final request = http.Request('${req.method}', url);`);
      if (req.headers.length > 0) lines.push(`  request.headers.addAll(headers);`);
      lines.push(`  request.body = ${bodyStr};`);
      lines.push(`  final streamedResponse = await request.send();`);
      lines.push(`  final response = await http.Response.fromStream(streamedResponse);`);
    }
  } else {
    if (['get', 'post', 'put', 'delete', 'head', 'patch'].includes(methodLower)) {
      lines.push(`  final response = await http.${methodLower}(url${headersArg});`);
    } else {
      lines.push(`  final request = http.Request('${req.method}', url);`);
      if (req.headers.length > 0) lines.push(`  request.headers.addAll(headers);`);
      lines.push(`  final streamedResponse = await request.send();`);
      lines.push(`  final response = await http.Response.fromStream(streamedResponse);`);
    }
  }

  lines.push(
    `  print('Response status: \${response.statusCode}');`,
    `  print('Response body: \${response.body}');`,
    `}`
  );

  return lines.join('\n');
}
