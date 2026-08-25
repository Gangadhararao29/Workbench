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

export type TechnologyId =
  | 'csharp'
  | 'angular'
  | 'react'
  | 'vue'
  | 'vanilla-js'
  | 'python'
  | 'java';

export interface TechTypeOption {
  id: string;
  name: string;
  editorLanguage: string;
}

export interface TechnologyOption {
  id: TechnologyId;
  name: string;
  types: TechTypeOption[];
}

export const TECHNOLOGIES: TechnologyOption[] = [
  {
    id: 'csharp',
    name: 'C# (.NET)',
    types: [
      { id: 'httpclient', name: 'HttpClient', editorLanguage: 'csharp' },
      { id: 'restsharp', name: 'RestSharp', editorLanguage: 'csharp' }
    ]
  },
  {
    id: 'angular',
    name: 'Angular',
    types: [
      { id: 'httpclient', name: 'HttpClient (@angular/common/http)', editorLanguage: 'typescript' },
      { id: 'fetch', name: 'Fetch API', editorLanguage: 'typescript' },
      { id: 'axios', name: 'Axios', editorLanguage: 'typescript' }
    ]
  },
  {
    id: 'react',
    name: 'React',
    types: [
      { id: 'fetch', name: 'Fetch API (useEffect)', editorLanguage: 'typescript' },
      { id: 'axios', name: 'Axios (useEffect)', editorLanguage: 'typescript' }
    ]
  },
  {
    id: 'vue',
    name: 'Vue',
    types: [
      { id: 'axios', name: 'Axios (Composition API)', editorLanguage: 'html' },
      { id: 'fetch', name: 'Fetch API (Composition API)', editorLanguage: 'html' }
    ]
  },
  {
    id: 'vanilla-js',
    name: 'Vanilla JS',
    types: [
      { id: 'fetch', name: 'Fetch API', editorLanguage: 'javascript' },
      { id: 'axios', name: 'Axios', editorLanguage: 'javascript' },
      { id: 'xhr', name: 'XMLHttpRequest (XHR)', editorLanguage: 'javascript' }
    ]
  },
  {
    id: 'python',
    name: 'Python',
    types: [
      { id: 'requests', name: 'Requests', editorLanguage: 'python' },
      { id: 'httpx', name: 'HTTPX (Async)', editorLanguage: 'python' },
      { id: 'urllib', name: 'urllib (Standard Library)', editorLanguage: 'python' }
    ]
  },
  {
    id: 'java',
    name: 'Java',
    types: [
      { id: 'httpclient', name: 'HttpClient (java.net.http)', editorLanguage: 'java' },
      { id: 'okhttp', name: 'OkHttp', editorLanguage: 'java' }
    ]
  }
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

    if (i === 0 && (arg.toLowerCase() === 'curl' || arg.toLowerCase() === 'curl.exe' || arg === '$')) {
      continue;
    }
    if (i === 1 && args[0] === '$' && (arg.toLowerCase() === 'curl' || arg.toLowerCase() === 'curl.exe')) {
      continue;
    }

    if (arg === '-X' || arg === '--request') {
      method = (args[++i] || '').toUpperCase();
    } else if (arg.startsWith('-X')) {
      method = arg.substring(2).toUpperCase();
    } else if (arg.startsWith('--request=')) {
      method = arg.substring(10).toUpperCase();
    } else if (arg === '-H' || arg === '--header') {
      const val = args[++i];
      if (val) parseHeader(val);
    } else if (arg.startsWith('--header=')) {
      parseHeader(arg.substring(9));
    } else if (
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
    } else if (arg === '-F' || arg === '--form') {
      const val = args[++i];
      if (val) parseFormField(val);
    } else if (arg.startsWith('--form=')) {
      parseFormField(arg.substring(7));
    } else if (arg === '-u' || arg === '--user') {
      const val = args[++i];
      if (val) parseAuth(val);
    } else if (arg.startsWith('--user=')) {
      parseAuth(arg.substring(7));
    } else if (arg === '-A' || arg === '--user-agent') {
      const val = args[++i];
      if (val) headers.push({ name: 'User-Agent', value: val });
    } else if (arg.startsWith('--user-agent=')) {
      headers.push({ name: 'User-Agent', value: arg.substring(13) });
    } else if (arg === '-e' || arg === '--referer') {
      const val = args[++i];
      if (val) headers.push({ name: 'Referer', value: val });
    } else if (arg.startsWith('--referer=')) {
      headers.push({ name: 'Referer', value: arg.substring(10) });
    } else if (arg === '-b' || arg === '--cookie') {
      const val = args[++i];
      if (val) headers.push({ name: 'Cookie', value: val });
    } else if (arg.startsWith('--cookie=')) {
      headers.push({ name: 'Cookie', value: arg.substring(9) });
    } else if (arg === '--url') {
      url = args[++i] || '';
    } else if (arg.startsWith('--url=')) {
      url = arg.substring(6);
    } else if (arg === '-G' || arg === '--get') {
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
      i++;
    }
  }

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

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  let body = bodyParts.join('&');

  if (isGetWithData && body) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}${body}`;
    body = '';
  }

  if (!method) {
    if (formData.length > 0 || body) {
      method = 'POST';
    } else {
      method = 'GET';
    }
  }

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

export function convertCurl(rawCommand: string, tech: TechnologyId, typeId: string): string {
  const req = parseCurlCommand(rawCommand);

  switch (tech) {
    case 'csharp':
      return typeId === 'restsharp' ? generateRestSharp(req) : generateCsharp(req);
    case 'angular':
      if (typeId === 'fetch') return generateAngularFetch(req);
      if (typeId === 'axios') return generateAngularAxios(req);
      return generateAngular(req);
    case 'react':
      return typeId === 'axios' ? generateReactAxios(req) : generateReactFetch(req);
    case 'vue':
      return typeId === 'fetch' ? generateVueFetch(req) : generateVueAxios(req);
    case 'vanilla-js':
      if (typeId === 'axios') return generateAxios(req);
      if (typeId === 'xhr') return generateXhr(req);
      return generateFetch(req);
    case 'python':
      if (typeId === 'httpx') return generatePythonHttpx(req);
      if (typeId === 'urllib') return generatePythonUrllib(req);
      return generatePythonRequests(req);
    case 'java':
      return typeId === 'okhttp' ? generateJavaOkHttp(req) : generateJava(req);
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

  for (const h of req.headers) {
    if (h.name.toLowerCase() === 'content-type') continue;
    lines.push(`request.Headers.TryAddWithoutValidation("${h.name}", "${h.value}");`);
  }

  if (req.formData.length > 0) {
    lines.push(``, `var content = new MultipartFormDataContent();`);
    for (const f of req.formData) {
      if (f.isFile) {
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

// 3. JavaScript Fetch
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
    return `import { HttpClient, HttpHeaders } from '@angular/common/http';\nimport { inject } from '@angular/core';\n\nconst http = inject(HttpClient);\n${headerCode}\nhttp.${methodLower}<any>('${req.url}', ${bodyVal}${optionsStr})\n  .subscribe({\n    next: (data) => console.log('Response:', data),\n    error: (err) => console.error('Error:', err)\n  });`;
  }

  return `import { HttpClient, HttpHeaders } from '@angular/common/http';\nimport { inject } from '@angular/core';\n\nconst http = inject(HttpClient);\n${headerCode}\nhttp.${methodLower}<any>('${req.url}'${optionsStr})\n  .subscribe({\n    next: (data) => console.log('Response:', data),\n    error: (err) => console.error('Error:', err)\n  });`;
}

// 6. Angular Fetch
export function generateAngularFetch(req: ParsedCurlRequest): string {
  const fetchCode = generateFetch(req);
  return `import { Component, OnInit, signal } from '@angular/core';\n\n@Component({\n  selector: 'app-data',\n  standalone: true,\n  template: \`<div>{{ data() | json }}</div>\`\n})\nexport class DataComponent implements OnInit {\n  data = signal<any>(null);\n  loading = signal(false);\n  error = signal<string | null>(null);\n\n  async ngOnInit() {\n    this.loading.set(true);\n    try {\n      ${fetchCode.replace(/\n/g, '\n      ')}\n      this.data.set(data);\n    } catch (err: any) {\n      this.error.set(err.message);\n    } finally {\n      this.loading.set(false);\n    }\n  }\n}`;
}

// 7. Angular Axios
export function generateAngularAxios(req: ParsedCurlRequest): string {
  const axiosCode = generateAxios(req).replace(/import axios from 'axios';\n\n/, '');
  return `import { Component, OnInit, signal } from '@angular/core';\nimport axios from 'axios';\n\n@Component({\n  selector: 'app-data',\n  standalone: true,\n  template: \`<div>{{ data() | json }}</div>\`\n})\nexport class DataComponent implements OnInit {\n  data = signal<any>(null);\n  loading = signal(false);\n  error = signal<string | null>(null);\n\n  async ngOnInit() {\n    this.loading.set(true);\n    try {\n      ${axiosCode.replace(/\n/g, '\n      ')}\n      this.data.set(response.data);\n    } catch (err: any) {\n      this.error.set(err.message);\n    } finally {\n      this.loading.set(false);\n    }\n  }\n}`;
}

// 8. React Fetch
export function generateReactFetch(req: ParsedCurlRequest): string {
  const fetchCode = generateFetch(req);
  return `import React, { useEffect, useState } from 'react';\n\nexport function ApiComponent() {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n\n  useEffect(() => {\n    async function fetchData() {\n      try {\n        ${fetchCode.replace(/\n/g, '\n        ')}\n        setData(data);\n      } catch (err) {\n        setError(err.message);\n      } finally {\n        setLoading(false);\n      }\n    }\n\n    fetchData();\n  }, []);\n\n  if (loading) return <div>Loading...</div>;\n  if (error) return <div>Error: {error}</div>;\n  return <pre>{JSON.stringify(data, null, 2)}</pre>;\n}`;
}

// 9. React Axios
export function generateReactAxios(req: ParsedCurlRequest): string {
  const axiosCall = generateAxios(req).replace(/import axios from 'axios';\n\n/, '');
  return `import React, { useEffect, useState } from 'react';\nimport axios from 'axios';\n\nexport function ApiComponent() {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n\n  useEffect(() => {\n    async function executeRequest() {\n      try {\n        ${axiosCall.replace(/\n/g, '\n        ')}\n        setData(response.data);\n      } catch (err) {\n        setError(err.message);\n      } finally {\n        setLoading(false);\n      }\n    }\n\n    executeRequest();\n  }, []);\n\n  if (loading) return <div>Loading...</div>;\n  if (error) return <div>Error: {error}</div>;\n  return <pre>{JSON.stringify(data, null, 2)}</pre>;\n}`;
}

// 10. Vue Axios
export function generateVueAxios(req: ParsedCurlRequest): string {
  const axiosCall = generateAxios(req).replace(/import axios from 'axios';\n\n/, '');
  return `<script setup>\nimport { ref, onMounted } from 'vue';\nimport axios from 'axios';\n\nconst data = ref(null);\nconst loading = ref(true);\nconst error = ref(null);\n\nonMounted(async () => {\n  try {\n    ${axiosCall.replace(/\n/g, '\n    ')}\n    data.value = response.data;\n  } catch (err) {\n    error.value = err.message;\n  } finally {\n    loading.value = false;\n  }\n});\n</script>\n\n<template>\n  <div v-if="loading">Loading...</div>\n  <div v-else-if="error">Error: {{ error }}</div>\n  <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>\n</template>`;
}

// 11. Vue Fetch
export function generateVueFetch(req: ParsedCurlRequest): string {
  const fetchCode = generateFetch(req);
  return `<script setup>\nimport { ref, onMounted } from 'vue';\n\nconst data = ref(null);\nconst loading = ref(true);\nconst error = ref(null);\n\nonMounted(async () => {\n  try {\n    ${fetchCode.replace(/\n/g, '\n    ')}\n    data.value = data;\n  } catch (err) {\n    error.value = err.message;\n  } finally {\n    loading.value = false;\n  }\n});\n</script>\n\n<template>\n  <div v-if="loading">Loading...</div>\n  <div v-else-if="error">Error: {{ error }}</div>\n  <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>\n</template>`;
}

// 12. Vanilla JS XHR
export function generateXhr(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `const xhr = new XMLHttpRequest();`,
    `xhr.open('${req.method}', '${req.url}');`,
    ``
  ];

  for (const h of req.headers) {
    lines.push(`xhr.setRequestHeader('${h.name}', '${h.value}');`);
  }

  lines.push(
    ``,
    `xhr.onload = function() {`,
    `  if (xhr.status >= 200 && xhr.status < 300) {`,
    `    try {`,
    `      console.log(JSON.parse(xhr.responseText));`,
    `    } catch {`,
    `      console.log(xhr.responseText);`,
    `    }`,
    `  } else {`,
    `    console.error('Request failed with status:', xhr.status);`,
    `  }`,
    `};`,
    `xhr.onerror = function() {`,
    `  console.error('Network error occurred');`,
    `};`,
    ``
  );

  if (req.body) {
    lines.push(`xhr.send(${JSON.stringify(req.body)});`);
  } else {
    lines.push(`xhr.send();`);
  }

  return lines.join('\n');
}

// 13. Python Requests
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

// 14. Python HTTPX
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

// 15. Python urllib
export function generatePythonUrllib(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `import urllib.request`,
    `import json`,
    ``
  ];

  if (req.body) {
    lines.push(`data = ${JSON.stringify(req.body)}.encode('utf-8')`);
    lines.push(`req = urllib.request.Request('${req.url}', data=data, method='${req.method}')`);
  } else {
    lines.push(`req = urllib.request.Request('${req.url}', method='${req.method}')`);
  }

  for (const h of req.headers) {
    lines.push(`req.add_header('${h.name}', '${h.value}')`);
  }

  lines.push(
    ``,
    `try:`,
    `    with urllib.request.urlopen(req) as response:`,
    `        res_body = response.read().decode('utf-8')`,
    `        print(res_body)`,
    `except Exception as e:`,
    `    print(f"Error: {e}")`
  );

  return lines.join('\n');
}

// 16. Java HttpClient (java.net.http)
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

// 17. Java OkHttp
export function generateJavaOkHttp(req: ParsedCurlRequest): string {
  const lines: string[] = [
    `import okhttp3.OkHttpClient;`,
    `import okhttp3.Request;`,
    `import okhttp3.RequestBody;`,
    `import okhttp3.MediaType;`,
    `import okhttp3.Response;`,
    ``,
    `public class App {`,
    `    public static void main(String[] args) throws Exception {`,
    `        OkHttpClient client = new OkHttpClient();`,
    `        Request.Builder builder = new Request.Builder()`,
    `            .url("${req.url}");`
  ];

  for (const h of req.headers) {
    lines.push(`        builder.addHeader("${h.name}", "${h.value}");`);
  }

  if (req.body) {
    const contentType = req.headers.find(h => h.name.toLowerCase() === 'content-type')?.value || 'application/json';
    lines.push(`        MediaType mediaType = MediaType.parse("${contentType}");`);
    lines.push(`        RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(req.body)});`);
    lines.push(`        builder.method("${req.method}", body);`);
  } else {
    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
      lines.push(`        RequestBody body = RequestBody.create(null, new byte[0]);`);
      lines.push(`        builder.method("${req.method}", body);`);
    } else {
      lines.push(`        builder.method("${req.method}", null);`);
    }
  }

  lines.push(
    `        Request request = builder.build();`,
    `        try (Response response = client.newCall(request).execute()) {`,
    `            System.out.println(response.body().string());`,
    `        }`,
    `    }`,
    `}`
  );

  return lines.join('\n');
}
