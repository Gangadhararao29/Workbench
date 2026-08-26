export type SupportedFramework = 'angular' | 'react' | 'vue' | 'axios' | 'fetch';

export type AngularPattern = 'signals-resource' | 'full-service' | 'service-method';
export type ReactPattern = 'tanstack-query' | 'custom-hook' | 'rtk-query';
export type VuePattern = 'composable' | 'vue-query' | 'pinia-store';
export type AxiosPattern = 'axios-client';
export type FetchPattern = 'modern-fetch';

export type AnyPattern = AngularPattern | ReactPattern | VuePattern | AxiosPattern | FetchPattern;

export type GenerationMode = 'single' | 'crud';
export type BaseUrlStrategy = 'relative' | 'env' | 'parameterized';

export interface ApiGeneratorConfig {
  framework: SupportedFramework;
  pattern: AnyPattern;
  mode: GenerationMode;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  responseType?: string;
  requestBodyType?: string;
  resourceName?: string;
  baseUrlStrategy?: BaseUrlStrategy;
  includeErrorHandling?: boolean;
  includeCancellation?: boolean;
  includeAuth?: boolean;
  includeTsDoc?: boolean;
  includePagination?: boolean;
}

export interface GenerationResult {
  clientCode: string;
  dtosCode: string;
  testCode: string;
  usageCode: string;
  language: 'typescript' | 'javascript';
}

export interface FrameworkOption {
  id: SupportedFramework;
  label: string;
  icon: string;
  patterns: { id: AnyPattern; label: string; description: string }[];
}

export const FRAMEWORK_OPTIONS: FrameworkOption[] = [
  {
    id: 'angular',
    label: 'Angular',
    icon: 'code',
    patterns: [
      {
        id: 'signals-resource',
        label: 'Signals Resource (rxResource / httpResource)',
        description: 'Modern Angular 18/19 reactive signal resource',
      },
      {
        id: 'full-service',
        label: 'Injectable Service (HttpClient + RxJS)',
        description: 'Standard typed Angular Service with Observables',
      },
      {
        id: 'service-method',
        label: 'Single Service Method Snippet',
        description: 'Quick method snippet for existing services',
      },
    ],
  },
  {
    id: 'react',
    label: 'React',
    icon: 'devices',
    patterns: [
      {
        id: 'tanstack-query',
        label: 'TanStack Query (React Query v5)',
        description: 'useQuery / useMutation with typed Query Key factory',
      },
      {
        id: 'custom-hook',
        label: 'Custom React Hook (useFetch / useResource)',
        description: 'useState + useEffect with AbortController cancellation',
      },
      {
        id: 'rtk-query',
        label: 'RTK Query (Redux Toolkit)',
        description: 'createApi with fetchBaseQuery and cache tags',
      },
    ],
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: 'web',
    patterns: [
      {
        id: 'composable',
        label: 'Composition API Composable (useResource)',
        description: 'Reactive ref & computed composable with refetch',
      },
      {
        id: 'vue-query',
        label: 'TanStack Vue Query v5',
        description: 'useQuery / useMutation for Vue 3',
      },
      {
        id: 'pinia-store',
        label: 'Pinia Store Action',
        description: 'defineStore setup store with typed actions & state',
      },
    ],
  },
  {
    id: 'axios',
    label: 'Axios',
    icon: 'http',
    patterns: [
      {
        id: 'axios-client',
        label: 'Typed Axios Client Class',
        description: 'Configurable singleton client with interceptors',
      },
    ],
  },
  {
    id: 'fetch',
    label: 'Vanilla Fetch',
    icon: 'api',
    patterns: [
      {
        id: 'modern-fetch',
        label: 'Typed Fetch Client / Helper',
        description: 'Zero-dependency typed modern fetch client',
      },
    ],
  },
];

export function generateApiClient(config: ApiGeneratorConfig): GenerationResult {
  const norm = normalizeConfig(config);

  let clientCode = '';
  switch (norm.framework) {
    case 'angular':
      clientCode = generateAngularClient(norm);
      break;
    case 'react':
      clientCode = generateReactClient(norm);
      break;
    case 'vue':
      clientCode = generateVueClient(norm);
      break;
    case 'axios':
      clientCode = generateAxiosClient(norm);
      break;
    case 'fetch':
    default:
      clientCode = generateFetchClient(norm);
      break;
  }

  const dtosCode = generateTypeScriptDtos(norm);
  const testCode = generateUnitTestSpec(norm);
  const usageCode = generateComponentUsage(norm);

  return {
    clientCode,
    dtosCode,
    testCode,
    usageCode,
    language: 'typescript',
  };
}

export function normalizeConfig(config: ApiGeneratorConfig): ApiGeneratorConfig & {
  resourceCamel: string;
  resourcePascal: string;
  resourcePluralCamel: string;
  resourcePluralPascal: string;
  baseItemType: string;
  isListResponse: boolean;
  cleanEndpoint: string;
  baseEndpointUrl: string;
  pathParams: string[];
} {
  const endpoint = config.endpoint?.trim() || '/api/resource';
  const pathParts = endpoint.split('?')[0].split('/').filter(Boolean);

  const pathParams: string[] = [];
  const cleanParts = pathParts.map((p) => {
    if (p.startsWith('{') && p.endsWith('}')) {
      const param = p.slice(1, -1);
      pathParams.push(param);
      return `\${${param}}`;
    }
    if (p.startsWith(':')) {
      const param = p.slice(1);
      pathParams.push(param);
      return `\${${param}}`;
    }
    return p;
  });

  const lastStaticPart =
    pathParts.filter((p) => !p.startsWith('{') && !p.startsWith(':')).pop() || 'resource';
  const rawResource = config.resourceName?.trim() || lastStaticPart;

  const resourceCamel = toCamelCase(rawResource.replace(/Dto$/i, ''));
  const resourcePascal = capitalize(resourceCamel);

  const resourcePluralCamel = pluralize(resourceCamel);
  const resourcePluralPascal = capitalize(resourcePluralCamel);

  const cleanResponseType = config.responseType?.trim() || `${resourcePascal}Dto`;
  const isListResponse = cleanResponseType.endsWith('[]') || cleanResponseType.startsWith('Array<');
  const baseItemType =
    cleanResponseType
      .replace(/\[\]$/, '')
      .replace(/^Array<(.+)>$/, '$1')
      .trim() || `${resourcePascal}Dto`;

  const cleanRequestBodyType =
    config.requestBodyType?.trim() ||
    (config.method === 'POST' ? `Create${resourcePascal}Dto` : `Update${resourcePascal}Dto`);

  let baseEndpointUrl = endpoint
    .split('?')[0]
    .replace(/\/\{[^}]+\}/g, '')
    .replace(/\/:[^/]+/g, '');
  if (!baseEndpointUrl.startsWith('/')) baseEndpointUrl = '/' + baseEndpointUrl;

  return {
    ...config,
    baseUrlStrategy: config.baseUrlStrategy || 'relative',
    includeErrorHandling: config.includeErrorHandling ?? true,
    includeCancellation: config.includeCancellation ?? true,
    includeAuth: config.includeAuth ?? true,
    includeTsDoc: config.includeTsDoc ?? true,
    includePagination: config.includePagination ?? true,
    endpoint,
    responseType: cleanResponseType,
    requestBodyType: cleanRequestBodyType,
    resourceCamel,
    resourcePascal,
    resourcePluralCamel,
    resourcePluralPascal,
    baseItemType,
    isListResponse,
    cleanEndpoint: '/' + cleanParts.join('/'),
    baseEndpointUrl,
    pathParams,
  };
}

// ----------------------------------------------------------------------------
// 1. ANGULAR CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateAngularClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const {
    resourcePascal,
    resourceCamel,
    resourcePluralCamel,
    resourcePluralPascal,
    baseItemType,
    cleanEndpoint,
    baseEndpointUrl,
    pathParams,
  } = cfg;

  const doc = (text: string) => (cfg.includeTsDoc ? `  /**\n   * ${text}\n   */\n` : '');

  if (cfg.pattern === 'service-method') {
    const methodLower = cfg.method.toLowerCase();
    const isMutation = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
    const paramSignature = [
      ...pathParams.map((p) => `${p}: string | number`),
      ...(isMutation ? [`payload: ${cfg.requestBodyType}`] : []),
      ...(cfg.includePagination && cfg.method === 'GET'
        ? [`params?: ${resourcePascal}QueryParams`]
        : []),
    ].join(', ');

    const httpOptionsEntries = [
      ...(cfg.includePagination && cfg.method === 'GET'
        ? ['params: this.buildParams(params)']
        : []),
      ...(cfg.includeAuth ? ['headers: this.buildAuthHeaders()'] : []),
    ];
    const httpOptionsArg = httpOptionsEntries.length ? `{ ${httpOptionsEntries.join(', ')} }` : '';

    const httpCallArgs = [
      pathParams.length ? `\`${cleanEndpoint}\`` : `'${cfg.endpoint}'`,
      ...(isMutation ? ['payload'] : []),
      httpOptionsArg,
    ]
      .filter(Boolean)
      .join(', ');

    const cancelPipe = cfg.includeCancellation ? `.pipe(takeUntil(this.cancel$))` : '';

    const setupNotes = [
      ...(cfg.includeCancellation
        ? [
            `  // Add to the host service: private readonly cancel$ = new Subject<void>();\n  // Call cancelPending${resourcePascal}() to abort an in-flight call.\n  cancelPending${resourcePascal}(): void {\n    this.cancel$.next();\n  }\n`,
          ]
        : []),
      ...(cfg.includeAuth
        ? [
            `  // Add to the host service to read the current auth token, e.g. from a TokenService.\n  private buildAuthHeaders(): HttpHeaders {\n    const token = localStorage.getItem('access_token');\n    return new HttpHeaders(token ? { Authorization: \`Bearer \${token}\` } : {});\n  }\n`,
          ]
        : []),
    ].join('\n');

    return `${doc(`Executes ${cfg.method} request against ${cfg.endpoint}${cfg.includeCancellation ? '. Cancels any previous in-flight call via `cancel$`.' : ''}`)}  ${methodLower}${resourcePascal}(${paramSignature}): Observable<${cfg.responseType}> {\n    return this.http.${methodLower}<${cfg.responseType}>(${httpCallArgs})${cancelPipe};\n  }\n${setupNotes}`;
  }

  if (cfg.pattern === 'signals-resource') {
    if (cfg.mode === 'single' && cfg.method !== 'GET') {
      const isMutation = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
      const paramSignature = [
        ...pathParams.map((p) => `${p}: string | number`),
        ...(isMutation ? [`payload: ${cfg.requestBodyType}`] : []),
      ].join(', ');

      const httpCallOptions = [
        ...(isMutation ? [] : []),
        ...(cfg.includeAuth ? ['{ headers: this.buildAuthHeaders() }'] : []),
      ];

      return `import { Injectable, inject, signal } from '@angular/core';
import { HttpClient${cfg.includeErrorHandling ? ', HttpErrorResponse' : ''}${cfg.includeAuth ? ', HttpHeaders' : ''} } from '@angular/common/http';
import { firstValueFrom${cfg.includeCancellation ? ', Subject, takeUntil' : ''} } from 'rxjs';
import { ${baseItemType}${isMutation ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}ActionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';
${cfg.includeCancellation ? `  private readonly cancel$ = new Subject<void>();\n` : ''}
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<${cfg.responseType} | null>(null);
${
  cfg.includeAuth
    ? `
  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders(token ? { Authorization: \`Bearer \${token}\` } : {});
  }
`
    : ''
}
${doc(`Execute ${cfg.method} ${cfg.endpoint}${cfg.includeCancellation ? '. Calling execute() again, or cancel(), aborts the previous in-flight call.' : ''}`)}  async execute(${paramSignature}): Promise<${cfg.responseType}> {
    ${cfg.includeCancellation ? 'this.cancel$.next();\n    ' : ''}this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.${cfg.method.toLowerCase()}<${cfg.responseType}>(
          ${pathParams.length ? `\`\${this.baseUrl}${cleanEndpoint}\`` : 'this.baseUrl'}${isMutation ? ', payload' : ''}${httpCallOptions.length ? `, ${httpCallOptions.join(', ')}` : ''}
        )${cfg.includeCancellation ? '.pipe(takeUntil(this.cancel$))' : ''}
      );
      this.result.set(res);
      return res;
    } catch (err: any) {
      ${
        cfg.includeErrorHandling
          ? `const msg = err instanceof HttpErrorResponse ? err.message : 'Request failed';
      this.error.set(msg);`
          : `this.error.set(err.message || 'Request failed');`
      }
      throw err;
    } finally {
      this.loading.set(false);
    }
  }
${
  cfg.includeCancellation
    ? `
  /** Cancels the in-flight request, if any. */
  cancel(): void {
    this.cancel$.next();
  }
`
    : ''
}
  reset(): void {
    this.result.set(null);
    this.error.set(null);
    this.loading.set(false);
  }
}`;
    }

    return `import { Injectable, inject, signal } from '@angular/core';
import { HttpClient${cfg.includePagination ? ', HttpParams' : ''}${cfg.includeAuth ? ', HttpHeaders' : ''} } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { ${baseItemType}${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}ResourceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';
${
  cfg.includeAuth
    ? `
  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders(token ? { Authorization: \`Bearer \${token}\` } : {});
  }
`
    : ''
}
  ${
    cfg.includePagination
      ? `// Reactive filter / query state
  readonly queryParams = signal<${resourcePascal}QueryParams>({ page: 1, pageSize: 20 });\n`
      : ''
  }${doc(`Angular Signal Resource for ${resourcePascal}. Auto-refetches when dependencies change${cfg.includeCancellation ? ', automatically aborting the previous in-flight request (rxResource cancels on re-run)' : ''}.`)}  readonly ${resourceCamel}Resource = rxResource({
    request: () => (${cfg.includePagination ? 'this.queryParams()' : '{}'}),
    loader: (${cfg.includePagination ? '{ request }' : ''}) => {
      ${
        cfg.includePagination
          ? `let params = new HttpParams();
      if (request.page) params = params.set('page', request.page.toString());
      if (request.pageSize) params = params.set('pageSize', request.pageSize.toString());
      if (request.search) params = params.set('search', request.search);
      return this.http.get<${cfg.responseType}>(this.baseUrl, { params${cfg.includeAuth ? ', headers: this.buildAuthHeaders()' : ''} });`
          : `return this.http.get<${cfg.responseType}>(this.baseUrl${cfg.includeAuth ? ', { headers: this.buildAuthHeaders() }' : ''});`
      }
    }
  });

  readonly items = this.${resourceCamel}Resource.value;
  readonly isLoading = this.${resourceCamel}Resource.isLoading;
  readonly error = this.${resourceCamel}Resource.error;

${doc('Reload resource manually')}  reload(): void {
    this.${resourceCamel}Resource.reload();
  }
}`;
  }

  // full-service (Default Angular)
  if (cfg.mode === 'crud') {
    const errorHandlingImports = cfg.includeErrorHandling ? `, HttpErrorResponse` : '';
    const rxjsErrorImports = cfg.includeErrorHandling ? `, throwError` : '';
    const cancelImports = cfg.includeCancellation ? `, Subject, takeUntil` : '';
    const rxjsOpImports =
      cfg.includeErrorHandling || cfg.includeCancellation
        ? `import { ${[cfg.includeErrorHandling ? 'catchError, retry' : '', cfg.includeCancellation ? 'takeUntil' : ''].filter(Boolean).join(', ')} } from 'rxjs/operators';\n`
        : '';
    const cancelPipe = cfg.includeCancellation ? `\n      takeUntil(this.cancel$)` : '';
    const authHeadersArg = cfg.includeAuth ? 'this.buildAuthHeaders()' : '';

    return `import { Injectable, inject } from '@angular/core';
import { HttpClient${cfg.includePagination ? ', HttpParams' : ''}${cfg.includeAuth ? ', HttpHeaders' : ''}${errorHandlingImports} } from '@angular/common/http';
import { Observable${rxjsErrorImports}${cfg.includeCancellation ? ', Subject' : ''} } from 'rxjs';
${rxjsOpImports}import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams, PaginatedResult` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';
${cfg.includeCancellation ? `  private readonly cancel$ = new Subject<void>();\n` : ''}${
      cfg.includeAuth
        ? `
  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders(token ? { Authorization: \`Bearer \${token}\` } : {});
  }
`
        : ''
    }
${doc(`Get all ${resourcePluralCamel} with optional filtering and pagination${cfg.includeCancellation ? '. Cancels any previous in-flight list request.' : ''}`)}  getAll(${cfg.includePagination ? `params?: ${resourcePascal}QueryParams` : ''}): Observable<${cfg.includePagination ? `PaginatedResult<${baseItemType}>` : `${baseItemType}[]`}> {
    ${
      cfg.includePagination
        ? `let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) httpParams = httpParams.set(key, val.toString());
      });
    }`
        : ''
    }
    return this.http.get<${cfg.includePagination ? `PaginatedResult<${baseItemType}>` : `${baseItemType}[]`}>(this.baseUrl${
      cfg.includePagination || cfg.includeAuth
        ? `, {${cfg.includePagination ? ' params: httpParams,' : ''}${cfg.includeAuth ? ` headers: ${authHeadersArg},` : ''}
    }`
        : ''
    })${
      cfg.includeErrorHandling || cfg.includeCancellation
        ? `.pipe(${cfg.includeErrorHandling ? '\n      retry(1),' : ''}${cancelPipe}${cfg.includeErrorHandling ? ',\n      catchError(this.handleError)' : ''}
    )`
        : ''
    };
  }

${doc(`Get single ${resourceCamel} by ID`)}  getById(id: string | number): Observable<${baseItemType}> {
    return this.http.get<${baseItemType}>(\`\${this.baseUrl}/\${id}\`${cfg.includeAuth ? `, { headers: ${authHeadersArg} }` : ''})${
      cfg.includeErrorHandling
        ? `.pipe(
      catchError(this.handleError)
    )`
        : ''
    };
  }

${doc(`Create new ${resourceCamel}`)}  create(payload: Create${resourcePascal}Dto): Observable<${baseItemType}> {
    return this.http.post<${baseItemType}>(this.baseUrl, payload${cfg.includeAuth ? `, { headers: ${authHeadersArg} }` : ''})${
      cfg.includeErrorHandling
        ? `.pipe(
      catchError(this.handleError)
    )`
        : ''
    };
  }

${doc(`Update entire ${resourceCamel}`)}  update(id: string | number, payload: Update${resourcePascal}Dto): Observable<${baseItemType}> {
    return this.http.put<${baseItemType}>(\`\${this.baseUrl}/\${id}\`, payload${cfg.includeAuth ? `, { headers: ${authHeadersArg} }` : ''})${
      cfg.includeErrorHandling
        ? `.pipe(
      catchError(this.handleError)
    )`
        : ''
    };
  }

${doc(`Delete ${resourceCamel} by ID`)}  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(\`\${this.baseUrl}/\${id}\`${cfg.includeAuth ? `, { headers: ${authHeadersArg} }` : ''})${
      cfg.includeErrorHandling
        ? `.pipe(
      catchError(this.handleError)
    )`
        : ''
    };
  }
${
  cfg.includeCancellation
    ? `
  /** Cancels any in-flight cancellable requests (e.g. the pending getAll() list request). */
  cancelPendingRequests(): void {
    this.cancel$.next();
  }
`
    : ''
}${
      cfg.includeErrorHandling
        ? `\n  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown API error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = \`Client error: \${error.error.message}\`;
    } else {
      errorMessage = \`Server returned code \${error.status}: \${error.message}\`;
    }
    return throwError(() => new Error(errorMessage));
  }`
        : ''
    }
}`;
  }

  // Single Endpoint Full Service
  const methodLower = cfg.method.toLowerCase();
  const isMutation = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
  const paramSignature = [
    ...pathParams.map((p) => `${p}: string | number`),
    ...(isMutation ? [`payload: ${cfg.requestBodyType}`] : []),
    ...(cfg.includePagination && cfg.method === 'GET'
      ? [`params?: ${resourcePascal}QueryParams`]
      : []),
  ].join(', ');

  const optionsEntries = [
    ...(cfg.includePagination && cfg.method === 'GET' ? ['params: this.buildParams(params)'] : []),
    ...(cfg.includeAuth ? ['headers: this.buildAuthHeaders()'] : []),
  ];
  const optionsArg = optionsEntries.length ? `{ ${optionsEntries.join(', ')} }` : '';

  const httpCallArgs = [
    pathParams.length ? `\`\${this.baseUrl}${cleanEndpoint}\`` : `this.baseUrl`,
    ...(isMutation ? ['payload'] : []),
    optionsArg,
  ]
    .filter(Boolean)
    .join(', ');

  return `import { Injectable, inject } from '@angular/core';
import { HttpClient${cfg.includePagination ? ', HttpParams' : ''}${cfg.includeAuth ? ', HttpHeaders' : ''}${cfg.includeErrorHandling ? ', HttpErrorResponse' : ''} } from '@angular/common/http';
import { Observable${cfg.includeErrorHandling ? ', throwError' : ''}${cfg.includeCancellation ? ', Subject' : ''} } from 'rxjs';
${cfg.includeErrorHandling || cfg.includeCancellation ? `import { ${[cfg.includeErrorHandling ? 'catchError' : '', cfg.includeCancellation ? 'takeUntil' : ''].filter(Boolean).join(', ')} } from 'rxjs/operators';\n` : ''}import { ${baseItemType}${isMutation ? `, ${cfg.requestBodyType}` : ''}${cfg.includePagination && cfg.method === 'GET' ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';
${cfg.includeCancellation ? `  private readonly cancel$ = new Subject<void>();\n` : ''}${
    cfg.includeAuth
      ? `
  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders(token ? { Authorization: \`Bearer \${token}\` } : {});
  }
`
      : ''
  }
${doc(`${cfg.method} request to ${cfg.endpoint}${cfg.includeCancellation ? '. Cancels any previous in-flight call.' : ''}`)}  ${methodLower}${resourcePascal}(${paramSignature}): Observable<${cfg.responseType}> {
    return this.http.${methodLower}<${cfg.responseType}>(${httpCallArgs})${
      cfg.includeErrorHandling || cfg.includeCancellation
        ? `.pipe(${cfg.includeCancellation ? '\n      takeUntil(this.cancel$)' : ''}${cfg.includeCancellation && cfg.includeErrorHandling ? ',' : ''}${cfg.includeErrorHandling ? '\n      catchError(this.handleError)' : ''}
    )`
        : ''
    };
  }
${
  cfg.includeCancellation
    ? `
  /** Cancels the in-flight request, if any. */
  cancelPending(): void {
    this.cancel$.next();
  }
`
    : ''
}
  ${
    cfg.includePagination && cfg.method === 'GET'
      ? `private buildParams(params?: ${resourcePascal}QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) httpParams = httpParams.set(key, val.toString());
    });
    return httpParams;
  }\n`
      : ''
  }${
    cfg.includeErrorHandling
      ? `  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.message || error.message || 'API request failed';
    return throwError(() => new Error(message));
  }`
      : ''
  }
}`;
}

// ----------------------------------------------------------------------------
// 2. REACT CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateReactClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const {
    resourcePascal,
    resourceCamel,
    resourcePluralCamel,
    resourcePluralPascal,
    baseItemType,
    cleanEndpoint,
    baseEndpointUrl,
    pathParams,
  } = cfg;
  const doc = (text: string) => (cfg.includeTsDoc ? `/** ${text} */\n` : '');

  if (cfg.pattern === 'tanstack-query') {
    if (cfg.mode === 'single') {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);

      if (isMutation) {
        const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
        const mutationParamType = pathParams.length
          ? `{ ${pathParams.map((p) => `${p}: string | number`).join('; ')}${hasBody ? `; payload: ${cfg.requestBodyType}` : ''} }`
          : hasBody
            ? cfg.requestBodyType
            : 'void';

        return `import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

async function execute${resourcePascal}(params: ${mutationParamType}): Promise<${cfg.responseType}> {
  ${pathParams.length ? `const url = \`\${BASE_URL}${cleanEndpoint.replace(/\${([^}]+)}/g, 'params.$1')}\`;` : `const url = BASE_URL;`}
  const res = await fetch(url, {
    method: '${cfg.method}',
    headers: {
      'Content-Type': 'application/json',
      ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
    },
    ${hasBody ? `body: JSON.stringify(${pathParams.length ? 'params.payload' : 'params'}),` : ''}
  });

  ${
    cfg.includeErrorHandling
      ? `if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Request failed with status ' + res.status);
  }`
      : ''
  }

  ${cfg.method === 'DELETE' || cfg.responseType === 'void' ? 'return {} as any;' : 'return res.json();'}
}

${doc(`Mutation Hook for ${cfg.method} ${cfg.endpoint}`)}export function use${resourcePascal}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: execute${resourcePascal},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${resourceCamel}'] });
    }
  });
}`;
      }

      // Single GET query
      return `import { useQuery } from '@tanstack/react-query';
import { ${baseItemType}${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

export const ${resourceCamel}Keys = {
  all: ['${resourceCamel}'] as const,
  detail: (${pathParams.map((p) => `${p}: string | number`).join(', ')}) => [...${resourceCamel}Keys.all, 'detail', ${pathParams.join(', ')}] as const,
};

async function fetch${resourcePascal}(${[...pathParams.map((p) => `${p}: string | number`), ...(cfg.includePagination ? [`params?: ${resourcePascal}QueryParams`] : []), ...(cfg.includeCancellation ? ['signal?: AbortSignal'] : [])].join(', ')}): Promise<${cfg.responseType}> {
  ${pathParams.length ? `const url = new URL(\`\${BASE_URL}${cleanEndpoint}\`, window.location.origin);` : `const url = new URL(BASE_URL, window.location.origin);`}
  ${
    cfg.includePagination
      ? `if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }`
      : ''
  }
  const res = await fetch(url.toString(), {
    ${cfg.includeCancellation ? 'signal,' : ''}
    headers: {
      'Content-Type': 'application/json',
      ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
    }
  });
  ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`Failed to fetch ${resourceCamel}: \${res.statusText}\`);` : ''}
  return res.json();
}

${doc(`Hook to fetch ${resourcePascal}${cfg.includeCancellation ? '. TanStack Query aborts the fetch automatically via the injected signal when the query is cancelled or unmounted.' : ''}`)}export function use${resourcePascal}(${pathParams.map((p) => `${p}: string | number`).join(', ')}${pathParams.length ? ', ' : ''}enabled = true) {
  return useQuery({
    queryKey: ${pathParams.length ? `${resourceCamel}Keys.detail(${pathParams.join(', ')})` : `['${resourceCamel}']`},
    queryFn: (${cfg.includeCancellation ? '{ signal }' : ''}) => fetch${resourcePascal}(${[...pathParams, ...(cfg.includePagination ? ['undefined'] : []), ...(cfg.includeCancellation ? ['signal'] : [])].join(', ')}),
    enabled: ${pathParams.length ? pathParams.map((p) => `Boolean(${p})`).join(' && ') + ' && enabled' : 'enabled'},
  });
}`;
    }

    // CRUD TanStack Query
    return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

${doc(`Query Keys Factory for ${resourcePascal}`)}export const ${resourceCamel}Keys = {
  all: ['${resourceCamel}'] as const,
  lists: () => [...${resourceCamel}Keys.all, 'list'] as const,
  list: (params?: ${resourcePascal}QueryParams) => [...${resourceCamel}Keys.lists(), { params }] as const,
  details: () => [...${resourceCamel}Keys.all, 'detail'] as const,
  detail: (id: string | number) => [...${resourceCamel}Keys.details(), id] as const,
};

// API Fetch Helpers
async function fetch${resourcePluralPascal}(params?: ${resourcePascal}QueryParams${cfg.includeCancellation ? ', signal?: AbortSignal' : ''}): Promise<${cfg.responseType}> {
  const url = new URL(BASE_URL, window.location.origin);
  ${
    cfg.includePagination
      ? `if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }`
      : ''
  }
  const res = await fetch(url.toString(), {
    ${cfg.includeCancellation ? 'signal,' : ''}
    headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} }
  });
  ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`Failed to fetch ${resourcePluralCamel}: \${res.statusText}\`);` : ''}
  return res.json();
}

async function fetch${resourcePascal}ById(id: string | number): Promise<${baseItemType}> {
  const res = await fetch(\`\${BASE_URL}/\${id}\`);
  ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`Failed to fetch ${resourceCamel}: \${res.statusText}\`);` : ''}
  return res.json();
}

async function create${resourcePascal}(payload: Create${resourcePascal}Dto): Promise<${baseItemType}> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} },
    body: JSON.stringify(payload)
  });
  ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to create ${resourceCamel}');` : ''}
  return res.json();
}

async function update${resourcePascal}({ id, payload }: { id: string | number; payload: Update${resourcePascal}Dto }): Promise<${baseItemType}> {
  const res = await fetch(\`\${BASE_URL}/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} },
    body: JSON.stringify(payload)
  });
  ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to update ${resourceCamel}');` : ''}
  return res.json();
}

async function delete${resourcePascal}(id: string | number): Promise<void> {
  const res = await fetch(\`\${BASE_URL}/\${id}\`, { method: 'DELETE' });
  ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to delete ${resourceCamel}');` : ''}
}

${doc(`Hook to fetch ${resourcePluralPascal} list${cfg.includeCancellation ? '. TanStack Query aborts the previous fetch automatically via the injected signal when params change or the component unmounts.' : ''}`)}export function use${resourcePluralPascal}(params?: ${resourcePascal}QueryParams) {
  return useQuery({
    queryKey: ${resourceCamel}Keys.list(params),
    queryFn: (${cfg.includeCancellation ? '{ signal }' : ''}) => fetch${resourcePluralPascal}(params${cfg.includeCancellation ? ', signal' : ''}),
    staleTime: 1000 * 60 * 5,
  });
}

${doc(`Hook to fetch single ${resourceCamel} by ID`)}export function use${resourcePascal}(id: string | number, enabled = true) {
  return useQuery({
    queryKey: ${resourceCamel}Keys.detail(id),
    queryFn: () => fetch${resourcePascal}ById(id),
    enabled: Boolean(id) && enabled,
  });
}

${doc(`Hook to create ${resourceCamel}`)}export function useCreate${resourcePascal}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create${resourcePascal},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    },
  });
}

${doc(`Hook to update ${resourcePascal}`)}export function useUpdate${resourcePascal}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: update${resourcePascal},
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    },
  });
}

${doc(`Hook to delete ${resourcePascal}`)}export function useDelete${resourcePascal}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: delete${resourcePascal},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    },
  });
}`;
  }

  if (cfg.pattern === 'rtk-query') {
    if (cfg.mode === 'single') {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
      return `import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ${baseItemType}${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? `, ${cfg.requestBodyType}` : ''}${!isMutation && cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

export const ${resourceCamel}Api = createApi({
  reducerPath: '${resourceCamel}Api',
  baseQuery: fetchBaseQuery({
    baseUrl: '${baseEndpointUrl}',
    prepareHeaders: (headers) => {
      ${
        cfg.includeAuth
          ? `const token = localStorage.getItem('token');
      if (token) headers.set('authorization', \`Bearer \${token}\`);`
          : ''
      }
      return headers;
    }
  }),
  // Note: RTK Query aborts the underlying fetch automatically once the last subscriber
  // unmounts or the cache entry is removed, so no manual AbortController wiring is needed.
  tagTypes: ['${resourcePascal}'],
  endpoints: (builder) => ({
    ${
      isMutation
        ? `${resourceCamel}Action: builder.mutation<${cfg.responseType}, ${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? cfg.requestBodyType : 'void'}>({
      query: (body) => ({
        url: '${cleanEndpoint.replace(baseEndpointUrl, '') || ''}',
        method: '${cfg.method}',
        ${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? 'body,' : ''}
      }),
      invalidatesTags: ['${resourcePascal}'],
    })`
        : `${
            cfg.includePagination
              ? `get${resourcePascal}: builder.query<${cfg.responseType}, ${resourcePascal}QueryParams | void>({
      query: (params) => ({ url: '${cleanEndpoint.replace(baseEndpointUrl, '') || ''}', params: params ?? undefined }),
      providesTags: ['${resourcePascal}'],
    })`
              : `get${resourcePascal}: builder.query<${cfg.responseType}, void>({
      query: () => '${cleanEndpoint.replace(baseEndpointUrl, '') || ''}',
      providesTags: ['${resourcePascal}'],
    })`
          }`
    },
  }),
});

export const {
  ${isMutation ? `use${resourcePascal}ActionMutation` : `useGet${resourcePascal}Query`}
} = ${resourceCamel}Api;`;
    }

    return `import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

export const ${resourceCamel}Api = createApi({
  reducerPath: '${resourceCamel}Api',
  baseQuery: fetchBaseQuery({
    baseUrl: '${baseEndpointUrl}',
    prepareHeaders: (headers) => {
      ${
        cfg.includeAuth
          ? `const token = localStorage.getItem('token');
      if (token) headers.set('authorization', \`Bearer \${token}\`);`
          : ''
      }
      return headers;
    }
  }),
  // Note: RTK Query aborts the underlying fetch automatically once the last subscriber
  // unmounts or the cache entry is removed, so no manual AbortController wiring is needed.
  tagTypes: ['${resourcePascal}'],
  endpoints: (builder) => ({
    get${resourcePluralPascal}: builder.query<${cfg.responseType}, ${cfg.includePagination ? `${resourcePascal}QueryParams | void` : 'void'}>({
      query: (${cfg.includePagination ? 'params' : ''}) => (${cfg.includePagination ? `{ url: '', params: params ?? undefined }` : `''`}),
      providesTags: (result) =>
        result
          ? [...(Array.isArray(result) ? result : []).map(({ id }: any) => ({ type: '${resourcePascal}' as const, id })), { type: '${resourcePascal}', id: 'LIST' }]
          : [{ type: '${resourcePascal}', id: 'LIST' }],
    }),
    get${resourcePascal}ById: builder.query<${baseItemType}, string | number>({
      query: (id) => \`/\${id}\`,
      providesTags: (_res, _err, id) => [{ type: '${resourcePascal}', id }],
    }),
    create${resourcePascal}: builder.mutation<${baseItemType}, Create${resourcePascal}Dto>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: '${resourcePascal}', id: 'LIST' }],
    }),
    update${resourcePascal}: builder.mutation<${baseItemType}, { id: string | number; data: Update${resourcePascal}Dto }>({
      query: ({ id, data }) => ({
        url: \`/\${id}\`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: '${resourcePascal}', id }],
    }),
    delete${resourcePascal}: builder.mutation<void, string | number>({
      query: (id) => ({
        url: \`/\${id}\`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: '${resourcePascal}', id: 'LIST' }],
    }),
  }),
});

export const {
  useGet${resourcePluralPascal}Query,
  useGet${resourcePascal}ByIdQuery,
  useCreate${resourcePascal}Mutation,
  useUpdate${resourcePascal}Mutation,
  useDelete${resourcePascal}Mutation,
} = ${resourceCamel}Api;`;
  }

  // React custom-hook
  if (cfg.mode === 'single' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method)) {
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
    return `import { useState, useCallback } from 'react';
import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

export interface Use${resourcePascal}MutationResult {
  data: ${cfg.responseType} | null;
  loading: boolean;
  error: Error | null;
  execute: (${hasBody ? `payload: ${cfg.requestBodyType}` : ''}) => Promise<${cfg.responseType}>;
  reset: () => void;
}

export function use${resourcePascal}Mutation(): Use${resourcePascal}MutationResult {
  const [data, setData] = useState<${cfg.responseType} | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (${hasBody ? `payload: ${cfg.requestBodyType}` : ''}): Promise<${cfg.responseType}> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('${cfg.endpoint}', {
        method: '${cfg.method}',
        headers: {
          'Content-Type': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        },
        ${hasBody ? 'body: JSON.stringify(payload),' : ''}
      });

      ${
        cfg.includeErrorHandling
          ? `if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }`
          : ''
      }

      const json = await response.json();
      setData(json);
      return json;
    } catch (err: any) {
      ${
        cfg.includeErrorHandling
          ? `const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj);
      throw errObj;`
          : `throw err;`
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}`;
  }

  // React custom-hook for GET / CRUD
  return `import { useState, useEffect, useCallback${cfg.includeCancellation ? ', useRef' : ''} } from 'react';
import { ${baseItemType} } from './${resourceCamel}.models';

export interface Use${resourcePascal}Result {
  data: ${cfg.responseType} | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function use${resourcePascal}(): Use${resourcePascal}Result {
  const [data, setData] = useState<${cfg.responseType} | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  ${cfg.includeCancellation ? 'const abortControllerRef = useRef<AbortController | null>(null);\n' : ''}  const fetchData = useCallback(async () => {
    ${
      cfg.includeCancellation
        ? `abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;`
        : ''
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('${cfg.endpoint}', {
        ${cfg.includeCancellation ? 'signal: controller.signal,' : ''}
        ${cfg.includeAuth ? `headers: { 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\` }` : ''}
      });
      ${
        cfg.includeErrorHandling
          ? `if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }`
          : ''
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `${cfg.includeCancellation ? `if (err.name !== 'AbortError') {\n        setError(err instanceof Error ? err : new Error(String(err)));\n      }` : `setError(err instanceof Error ? err : new Error(String(err)));`}` : ''}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    ${cfg.includeCancellation ? `return () => abortControllerRef.current?.abort();` : ''}
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}`;
}

// ----------------------------------------------------------------------------
// 3. VUE CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateVueClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const {
    resourcePascal,
    resourceCamel,
    resourcePluralCamel,
    resourcePluralPascal,
    baseItemType,
    cleanEndpoint,
    baseEndpointUrl,
    pathParams,
  } = cfg;
  const doc = (text: string) => (cfg.includeTsDoc ? `/** ${text} */\n` : '');

  if (cfg.pattern === 'vue-query') {
    if (cfg.mode === 'single') {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
      if (isMutation) {
        const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
        return `import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

${doc(`Mutation hook for ${cfg.method} ${cfg.endpoint}`)}export function use${resourcePascal}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (${hasBody ? `payload: ${cfg.requestBodyType}` : ''}): Promise<${cfg.responseType}> => {
      const res = await fetch(BASE_URL, {
        method: '${cfg.method}',
        headers: {
          'Content-Type': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        },
        ${hasBody ? 'body: JSON.stringify(payload),' : ''}
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`API request failed with status \${res.status}\`);` : ''}
      ${cfg.method === 'DELETE' || cfg.responseType === 'void' ? 'return {} as any;' : 'return res.json();'}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${resourceCamel}'] });
    }
  });
}`;
      }

      return `import { useQuery } from '@tanstack/vue-query';
import { ${baseItemType}${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

${doc(`Query hook for fetching ${resourcePascal}${cfg.includeCancellation ? '. TanStack Query aborts the fetch automatically via the injected signal when cancelled or unmounted.' : ''}`)}export function use${resourcePascal}Query(${cfg.includePagination ? `params?: ${resourcePascal}QueryParams` : ''}) {
  return useQuery({
    queryKey: ['${resourceCamel}', ${cfg.includePagination ? 'params' : "'single'"}],
    queryFn: async (${cfg.includeCancellation ? '{ signal }' : ''}): Promise<${cfg.responseType}> => {
      ${
        cfg.includePagination
          ? `const url = new URL(BASE_URL, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
        });
      }`
          : ''
      }
      const res = await fetch(${cfg.includePagination ? 'url.toString()' : 'BASE_URL'}, {
        ${cfg.includeCancellation ? 'signal,' : ''}
        ${cfg.includeAuth ? `headers: { 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\` }` : ''}
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to fetch ${resourceCamel}');` : ''}
      return res.json();
    }
  });
}`;
    }

    // Full REST CRUD Vue Query
    return `import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

${doc(`Query keys factory for ${resourcePascal}`)}export const ${resourceCamel}Keys = {
  all: ['${resourceCamel}'] as const,
  lists: () => [...${resourceCamel}Keys.all, 'list'] as const,
  list: (params?: ${resourcePascal}QueryParams) => [...${resourceCamel}Keys.lists(), { params }] as const,
  details: () => [...${resourceCamel}Keys.all, 'detail'] as const,
  detail: (id: string | number) => [...${resourceCamel}Keys.details(), id] as const,
};

${doc(`Query hook for ${resourcePluralCamel} list${cfg.includeCancellation ? '. TanStack Query aborts the previous fetch automatically via the injected signal when params change or the component unmounts.' : ''}`)}export function use${resourcePluralPascal}Query(params?: ${resourcePascal}QueryParams) {
  return useQuery({
    queryKey: ${resourceCamel}Keys.list(params),
    queryFn: async (${cfg.includeCancellation ? '{ signal }' : ''}): Promise<${cfg.responseType}> => {
      const url = new URL(BASE_URL, window.location.origin);
      ${
        cfg.includePagination
          ? `if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
        });
      }`
          : ''
      }
      const res = await fetch(url.toString(), {
        ${cfg.includeCancellation ? 'signal,' : ''}
        ${cfg.includeAuth ? `headers: { 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\` }` : ''}
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to fetch ${resourcePluralCamel}');` : ''}
      return res.json();
    }
  });
}

${doc(`Query hook for single ${resourceCamel} by ID`)}export function use${resourcePascal}ByIdQuery(id: string | number) {
  return useQuery({
    queryKey: ${resourceCamel}Keys.detail(id),
    queryFn: async (): Promise<${baseItemType}> => {
      const res = await fetch(\`\${BASE_URL}/\${id}\`);
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to fetch ${resourceCamel}');` : ''}
      return res.json();
    },
    enabled: Boolean(id)
  });
}

${doc(`Mutation hook for creating ${resourceCamel}`)}export function useCreate${resourcePascal}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Create${resourcePascal}Dto): Promise<${baseItemType}> => {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} },
        body: JSON.stringify(payload)
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to create ${resourceCamel}');` : ''}
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    }
  });
}

${doc(`Mutation hook for updating ${resourceCamel}`)}export function useUpdate${resourcePascal}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string | number; payload: Update${resourcePascal}Dto }): Promise<${baseItemType}> => {
      const res = await fetch(\`\${BASE_URL}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} },
        body: JSON.stringify(payload)
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to update ${resourceCamel}');` : ''}
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    }
  });
}

${doc(`Mutation hook for deleting ${resourceCamel}`)}export function useDelete${resourcePascal}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number): Promise<void> => {
      const res = await fetch(\`\${BASE_URL}/\${id}\`, { method: 'DELETE' });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to delete ${resourceCamel}');` : ''}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    }
  });
}`;
  }

  if (cfg.pattern === 'pinia-store') {
    if (cfg.mode === 'single') {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
      return `import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

${doc(`Pinia store for ${resourcePascal}`)}export const use${resourcePascal}Store = defineStore('${resourceCamel}', () => {
  const data = ref<${cfg.responseType} | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function execute(${hasBody ? `payload: ${cfg.requestBodyType}` : ''}) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('${cfg.endpoint}', {
        method: '${cfg.method}',
        headers: {
          'Content-Type': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        },
        ${hasBody ? 'body: JSON.stringify(payload),' : ''}
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`Request failed with status \${res.status}\`);` : ''}
      ${cfg.method === 'DELETE' || cfg.responseType === 'void' ? 'data.value = null;' : 'data.value = await res.json();'}
      return data.value;
    } catch (err: any) {
      error.value = err.message || 'Request failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    data.value = null;
    error.value = null;
    loading.value = false;
  }

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
});`;
    }

    return `import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

${doc(`Pinia store for ${resourcePascal} management`)}export const use${resourcePascal}Store = defineStore('${resourceCamel}', () => {
  const items = ref<${baseItemType}[]>([]);
  const currentItem = ref<${baseItemType} | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  ${cfg.includeCancellation ? 'let abortController: AbortController | null = null;\n' : ''}
  const itemCount = computed(() => items.value.length);
  const getItemById = computed(() => (id: string | number) => items.value.find(i => (i as any).id === id));

${doc(`Fetch all ${resourcePluralCamel}${cfg.includeCancellation ? '. Cancels any previous in-flight fetchAll() call.' : ''}`)}  async function fetchAll(params?: ${resourcePascal}QueryParams) {
    ${
      cfg.includeCancellation
        ? `if (abortController) abortController.abort();
    abortController = new AbortController();`
        : ''
    }
    loading.value = true;
    error.value = null;
    try {
      const url = new URL('${baseEndpointUrl}', window.location.origin);
      ${
        cfg.includePagination
          ? `if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
        });
      }`
          : ''
      }
      const res = await fetch(url.toString(), {
        ${cfg.includeCancellation ? 'signal: abortController.signal,' : ''}
        ${cfg.includeAuth ? `headers: { 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\` }` : ''}
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to fetch ${resourcePluralCamel}');` : ''}
      const data = await res.json();
      items.value = Array.isArray(data) ? data : data.items || [];
    } catch (err: any) {
      ${
        cfg.includeCancellation
          ? `if (err.name !== 'AbortError') {
        error.value = err.message || 'Unknown error';
      }`
          : `error.value = err.message || 'Unknown error';`
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchById(id: string | number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(\`${baseEndpointUrl}/\${id}\`);
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to fetch ${resourceCamel}');` : ''}
      currentItem.value = await res.json();
      return currentItem.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createItem(dto: Create${resourcePascal}Dto) {
    loading.value = true;
    try {
      const res = await fetch('${baseEndpointUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} },
        body: JSON.stringify(dto)
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to create item');` : ''}
      const created = await res.json();
      items.value.push(created);
      return created;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateItem(id: string | number, dto: Update${resourcePascal}Dto) {
    loading.value = true;
    try {
      const res = await fetch(\`${baseEndpointUrl}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`` : ''} },
        body: JSON.stringify(dto)
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to update item');` : ''}
      const updated = await res.json();
      const idx = items.value.findIndex(i => (i as any).id === id);
      if (idx !== -1) items.value[idx] = updated;
      return updated;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteItem(id: string | number) {
    loading.value = true;
    try {
      const res = await fetch(\`${baseEndpointUrl}/\${id}\`, { method: 'DELETE' });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Failed to delete item');` : ''}
      items.value = items.value.filter(i => (i as any).id !== id);
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    items,
    currentItem,
    loading,
    error,
    itemCount,
    getItemById,
    fetchAll,
    fetchById,
    createItem,
    updateItem,
    deleteItem,
    clearError
  };
});`;
  }

  // composable (Default Vue 3 Composition API Composable)
  if (cfg.mode === 'single') {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);

    if (isMutation) {
      return `import { ref, readonly } from 'vue';
import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

export function use${resourcePascal}Mutation() {
  const data = ref<${cfg.responseType} | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const execute = async (${hasBody ? `payload: ${cfg.requestBodyType}` : ''}): Promise<${cfg.responseType}> => {
    loading.value = true;
    error.value = null;

    try {
      const res = await fetch('${cfg.endpoint}', {
        method: '${cfg.method}',
        headers: {
          'Content-Type': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        },
        ${hasBody ? 'body: JSON.stringify(payload),' : ''}
      });

      ${
        cfg.includeErrorHandling
          ? `if (!res.ok) {
        throw new Error(\`HTTP error! status: \${res.status}\`);
      }`
          : ''
      }

      ${cfg.method === 'DELETE' || cfg.responseType === 'void' ? 'data.value = {} as any;' : 'data.value = await res.json();'}
      return data.value as ${cfg.responseType};
    } catch (err: any) {
      ${
        cfg.includeErrorHandling
          ? `const errObj = err instanceof Error ? err : new Error(String(err));
      error.value = errObj;
      throw errObj;`
          : `throw err;`
      }
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    data.value = null;
    error.value = null;
    loading.value = false;
  };

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    execute,
    reset
  };
}`;
    }

    // Single Endpoint GET Composable
    const urlExpr = pathParams.length ? `\`${cleanEndpoint}\`` : `'${cfg.endpoint}'`;
    const signature = pathParams.length
      ? pathParams.map((p) => `${p}?: string | number`).join(', ')
      : '';

    return `import { ref, onMounted${cfg.includeCancellation ? ', onUnmounted' : ''}, readonly } from 'vue';
import { ${baseItemType}${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

export function use${resourcePascal}(${signature}) {
  const data = ref<${cfg.responseType} | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  ${cfg.includeCancellation ? 'let abortController: AbortController | null = null;\n' : ''}  const fetchData = async () => {
    ${
      cfg.includeCancellation
        ? `if (abortController) abortController.abort();
    abortController = new AbortController();`
        : ''
    }

    loading.value = true;
    error.value = null;

    try {
      const res = await fetch(${urlExpr}, {
        ${cfg.includeCancellation ? 'signal: abortController.signal,' : ''}
        ${cfg.includeAuth ? `headers: { 'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\` }` : ''}
      });

      ${
        cfg.includeErrorHandling
          ? `if (!res.ok) {
        throw new Error(\`HTTP error! status: \${res.status}\`);
      }`
          : ''
      }

      data.value = await res.json();
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `${cfg.includeCancellation ? `if (err.name !== 'AbortError') {\n        error.value = err instanceof Error ? err : new Error(String(err));\n      }` : `error.value = err instanceof Error ? err : new Error(String(err));`}` : ''}
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchData);

  ${
    cfg.includeCancellation
      ? `onUnmounted(() => {
    if (abortController) abortController.abort();
  });\n`
      : ''
  }  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    refetch: fetchData
  };
}`;
  }

  // Full REST CRUD Vue Composable
  return `import { ref, onMounted${cfg.includeCancellation ? ', onUnmounted' : ''}, readonly } from 'vue';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

export function use${resourcePascal}Api() {
  const items = ref<${baseItemType}[]>([]);
  const currentItem = ref<${baseItemType} | null>(null);
  const loading = ref(false);
  const isSubmitting = ref(false);
  const error = ref<Error | null>(null);
  ${cfg.includeCancellation ? 'let abortController: AbortController | null = null;\n' : ''}  const baseUrl = '${baseEndpointUrl}';

${doc(`Fetch all ${resourcePluralCamel}`)}  const fetchAll = async (${cfg.includePagination ? `params?: ${resourcePascal}QueryParams` : ''}) => {
    ${
      cfg.includeCancellation
        ? `if (abortController) abortController.abort();
    abortController = new AbortController();`
        : ''
    }

    loading.value = true;
    error.value = null;

    try {
      const url = new URL(baseUrl, window.location.origin);
      ${
        cfg.includePagination
          ? `if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
        });
      }`
          : ''
      }

      const res = await fetch(url.toString(), {
        ${cfg.includeCancellation ? 'signal: abortController.signal,' : ''}
        headers: {
          'Accept': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        }
      });

      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`Failed to fetch \${res.statusText}\`);` : ''}
      const data = await res.json();
      items.value = Array.isArray(data) ? data : data.items || [];
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `${cfg.includeCancellation ? `if (err.name !== 'AbortError') {\n        error.value = err instanceof Error ? err : new Error(String(err));\n      }` : `error.value = err instanceof Error ? err : new Error(String(err));`}` : ''}
    } finally {
      loading.value = false;
    }
  };

${doc(`Fetch single ${resourceCamel} by ID`)}  const fetchById = async (id: string | number) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(\`\${baseUrl}/\${id}\`);
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error(\`Failed to fetch ${resourceCamel} #\${id}\`);` : ''}
      currentItem.value = await res.json();
      return currentItem.value;
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `error.value = err instanceof Error ? err : new Error(String(err));\n      throw error.value;` : `throw err;`}
    } finally {
      loading.value = false;
    }
  };

${doc(`Create a new ${resourceCamel}`)}  const create = async (payload: Create${resourcePascal}Dto): Promise<${baseItemType}> => {
    isSubmitting.value = true;
    error.value = null;
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        },
        body: JSON.stringify(payload)
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Create request failed');` : ''}
      const created = await res.json();
      items.value.push(created);
      return created;
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `error.value = err instanceof Error ? err : new Error(String(err));\n      throw error.value;` : `throw err;`}
    } finally {
      isSubmitting.value = false;
    }
  };

${doc(`Update ${resourceCamel} by ID`)}  const update = async (id: string | number, payload: Update${resourcePascal}Dto): Promise<${baseItemType}> => {
    isSubmitting.value = true;
    error.value = null;
    try {
      const res = await fetch(\`\${baseUrl}/\${id}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ${cfg.includeAuth ? `'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`,` : ''}
        },
        body: JSON.stringify(payload)
      });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Update request failed');` : ''}
      const updated = await res.json();
      const idx = items.value.findIndex(i => (i as any).id === id);
      if (idx !== -1) items.value[idx] = updated;
      return updated;
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `error.value = err instanceof Error ? err : new Error(String(err));\n      throw error.value;` : `throw err;`}
    } finally {
      isSubmitting.value = false;
    }
  };

${doc(`Delete ${resourceCamel} by ID`)}  const remove = async (id: string | number): Promise<void> => {
    isSubmitting.value = true;
    error.value = null;
    try {
      const res = await fetch(\`\${baseUrl}/\${id}\`, { method: 'DELETE' });
      ${cfg.includeErrorHandling ? `if (!res.ok) throw new Error('Delete request failed');` : ''}
      items.value = items.value.filter(i => (i as any).id !== id);
    } catch (err: any) {
      ${cfg.includeErrorHandling ? `error.value = err instanceof Error ? err : new Error(String(err));\n      throw error.value;` : `throw err;`}
    } finally {
      isSubmitting.value = false;
    }
  };

  onMounted(() => {
    fetchAll();
  });

  ${
    cfg.includeCancellation
      ? `onUnmounted(() => {
    if (abortController) abortController.abort();
  });\n`
      : ''
  }  return {
    items: readonly(items),
    currentItem: readonly(currentItem),
    loading: readonly(loading),
    isSubmitting: readonly(isSubmitting),
    error: readonly(error),
    fetchAll,
    fetchById,
    create,
    update,
    remove
  };
}`;
}

// ----------------------------------------------------------------------------
// 4. AXIOS CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateAxiosClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const {
    resourcePascal,
    resourceCamel,
    baseItemType,
    cleanEndpoint,
    baseEndpointUrl,
    pathParams,
  } = cfg;

  if (cfg.mode === 'single') {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
    const methodLower = cfg.method.toLowerCase();

    return `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

export class ${resourcePascal}ApiClient {
  private readonly client: AxiosInstance;

  constructor(baseURL: string = '${baseEndpointUrl}') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    ${
      cfg.includeAuth
        ? `this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && config.headers) {
        config.headers.Authorization = \`Bearer \${token}\`;
      }
      return config;
    });`
        : ''
    }

    ${
      cfg.includeErrorHandling
        ? `this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const customError = new Error(error.response?.data?.message || error.message || 'API request failed');
        return Promise.reject(customError);
      }
    );`
        : ''
    }
  }

  ${cfg.includeCancellation ? `/**\n   * Pass \`{ signal }\` from an AbortController via \`config\` to cancel this request, e.g.\n   * const controller = new AbortController();\n   * client.execute(${[...pathParams, ...(hasBody ? ['payload'] : [])].join(', ')}${pathParams.length || hasBody ? ', ' : ''}{ signal: controller.signal });\n   */\n  ` : ''}async execute(${[...pathParams.map((p) => `${p}: string | number`), ...(hasBody ? [`payload: ${cfg.requestBodyType}`] : []), 'config?: AxiosRequestConfig'].join(', ')}): Promise<${cfg.responseType}> {
    ${pathParams.length ? `const url = \`${cleanEndpoint.replace(baseEndpointUrl, '')}\`;` : `const url = '';`}
    const res: AxiosResponse<${cfg.responseType}> = await this.client.${methodLower}(url${hasBody ? ', payload' : ''}, config);
    return res.data;
  }
}

export const ${resourceCamel}ApiClient = new ${resourcePascal}ApiClient();`;
  }

  return `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

export class ${resourcePascal}ApiClient {
  private readonly client: AxiosInstance;

  constructor(baseURL: string = '${baseEndpointUrl}') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    ${
      cfg.includeAuth
        ? `// Attach authorization interceptor
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && config.headers) {
        config.headers.Authorization = \`Bearer \${token}\`;
      }
      return config;
    });`
        : ''
    }

    ${
      cfg.includeErrorHandling
        ? `// Global response error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const customError = new Error(error.response?.data?.message || error.message || 'API request failed');
        return Promise.reject(customError);
      }
    );`
        : ''
    }
  }

  ${cfg.includeCancellation ? `/** Pass \`{ signal }\` from an AbortController via \`config\` to cancel this request. */\n  ` : ''}async getAll(${cfg.includePagination ? `params?: ${resourcePascal}QueryParams, ` : ''}config?: AxiosRequestConfig): Promise<${cfg.responseType}> {
    const res: AxiosResponse<${cfg.responseType}> = await this.client.get('', { ...config${cfg.includePagination ? ', params' : ''} });
    return res.data;
  }

  async getById(id: string | number, config?: AxiosRequestConfig): Promise<${baseItemType}> {
    const res: AxiosResponse<${baseItemType}> = await this.client.get(\`/\${id}\`, config);
    return res.data;
  }

  async create(dto: Create${resourcePascal}Dto, config?: AxiosRequestConfig): Promise<${baseItemType}> {
    const res: AxiosResponse<${baseItemType}> = await this.client.post('', dto, config);
    return res.data;
  }

  async update(id: string | number, dto: Update${resourcePascal}Dto, config?: AxiosRequestConfig): Promise<${baseItemType}> {
    const res: AxiosResponse<${baseItemType}> = await this.client.put(\`/\${id}\`, dto, config);
    return res.data;
  }

  async delete(id: string | number, config?: AxiosRequestConfig): Promise<void> {
    await this.client.delete(\`/\${id}\`, config);
  }
}

export const ${resourceCamel}ApiClient = new ${resourcePascal}ApiClient();`;
}

// ----------------------------------------------------------------------------
// 5. MODERN FETCH CLIENT GENERATOR
// ----------------------------------------------------------------------------
function generateFetchClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const {
    resourcePascal,
    resourceCamel,
    baseItemType,
    cleanEndpoint,
    baseEndpointUrl,
    pathParams,
  } = cfg;

  if (cfg.mode === 'single') {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(cfg.method);

    return `import { ${baseItemType}${hasBody ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ${resourcePascal}FetchClient {
  constructor(private readonly baseUrl: string = '${baseEndpointUrl}') {}

  ${cfg.includeCancellation ? `/**\n   * \`options\` extends RequestInit, so pass \`{ signal }\` from an AbortController to cancel, e.g.\n   * const controller = new AbortController();\n   * client.execute(${[...pathParams, ...(hasBody ? ['payload'] : [])].join(', ')}${pathParams.length || hasBody ? ', ' : ''}{ signal: controller.signal });\n   */\n  ` : ''}async execute(${[...pathParams.map((p) => `${p}: string | number`), ...(hasBody ? [`payload: ${cfg.requestBodyType}`] : []), 'options: RequestOptions = {}'].join(', ')}): Promise<${cfg.responseType}> {
    const { params, headers, ...customConfig } = options;
    const url = new URL(${pathParams.length ? `\`\${this.baseUrl}${cleanEndpoint}\`` : 'this.baseUrl'}, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const config: RequestInit = {
      method: '${cfg.method}',
      ...customConfig,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ${cfg.includeAuth ? `'Authorization': typeof window !== 'undefined' ? \`Bearer \${localStorage.getItem('token') || ''}\` : '',` : ''}
        ...headers,
      },
      ${hasBody ? 'body: JSON.stringify(payload),' : ''}
    };

    const response = await fetch(url.toString(), config);

    ${
      cfg.includeErrorHandling
        ? `if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(\`HTTP \${response.status} (\${response.statusText}): \${errorBody || 'Request failed'}\`);
    }`
        : ''
    }

    if (response.status === 204 || '${cfg.method}' === 'DELETE') {
      return {} as ${cfg.responseType};
    }

    return response.json();
  }
}

export const ${resourceCamel}Client = new ${resourcePascal}FetchClient();`;
  }

  return `import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto } from './${resourceCamel}.models';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ${resourcePascal}FetchClient {
  constructor(private readonly baseUrl: string = '${baseEndpointUrl}') {}

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;
    const url = new URL(\`\${this.baseUrl}\${endpoint}\`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const config: RequestInit = {
      ...customConfig,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ${cfg.includeAuth ? `'Authorization': typeof window !== 'undefined' ? \`Bearer \${localStorage.getItem('token') || ''}\` : '',` : ''}
        ...headers,
      },
    };

    const response = await fetch(url.toString(), config);

    ${
      cfg.includeErrorHandling
        ? `if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(\`HTTP \${response.status} (\${response.statusText}): \${errorBody || 'Request failed'}\`);
    }`
        : ''
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  ${cfg.includeCancellation ? `/** Pass \`{ signal }\` from an AbortController via \`options\` to cancel this request. */\n  ` : ''}getAll(params?: Record<string, any>, options: RequestOptions = {}): Promise<${cfg.responseType}> {
    return this.request<${cfg.responseType}>('', { method: 'GET', params, ...options });
  }

  getById(id: string | number): Promise<${baseItemType}> {
    return this.request<${baseItemType}>(\`/\${id}\`, { method: 'GET' });
  }

  create(dto: Create${resourcePascal}Dto): Promise<${baseItemType}> {
    return this.request<${baseItemType}>('', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  update(id: string | number, dto: Update${resourcePascal}Dto): Promise<${baseItemType}> {
    return this.request<${baseItemType}>(\`/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  delete(id: string | number): Promise<void> {
    return this.request<void>(\`/\${id}\`, { method: 'DELETE' });
  }
}

export const ${resourceCamel}Client = new ${resourcePascal}FetchClient();`;
}

// ----------------------------------------------------------------------------
// 6. TYPESCRIPT DTOS / MODELS GENERATOR
// ----------------------------------------------------------------------------
export function generateTypeScriptDtos(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, baseItemType } = cfg;

  if (cfg.mode === 'single') {
    const hasRequestBody =
      ['POST', 'PUT', 'PATCH'].includes(cfg.method) &&
      cfg.requestBodyType &&
      cfg.requestBodyType !== 'void';
    return `/**
 * Data Transfer Objects (DTOs) for ${resourcePascal} API
 */

export interface ${baseItemType} {
  id: string | number;
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'pending';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

${
  hasRequestBody && cfg.requestBodyType !== baseItemType
    ? `export interface ${cfg.requestBodyType} {
  name: string;
  description?: string;
  [key: string]: any;
}\n`
    : ''
}
${
  cfg.includePagination && cfg.method === 'GET'
    ? `export interface ${resourcePascal}QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}\n`
    : ''
}
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}`;
  }

  return `/**
 * Data Transfer Objects (DTOs) and Models for ${resourcePascal}
 */

export interface ${baseItemType} {
  id: string | number;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt?: string;
}

export interface Create${resourcePascal}Dto {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface Update${resourcePascal}Dto extends Partial<Create${resourcePascal}Dto> {
  id?: string | number;
}

${
  cfg.includePagination
    ? `export interface ${resourcePascal}QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}`
    : ''
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}`;
}

// ----------------------------------------------------------------------------
// 7. UNIT TEST SPEC GENERATOR
// ----------------------------------------------------------------------------
export function generateUnitTestSpec(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, baseItemType, baseEndpointUrl } = cfg;

  if (cfg.framework === 'angular') {
    if (cfg.mode === 'single') {
      return `import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ${resourcePascal}Service } from './${resourceCamel}.service';
import { ${baseItemType} } from './${resourceCamel}.models';

describe('${resourcePascal}Service', () => {
  let service: ${resourcePascal}Service;
  let httpMock: HttpTestingController;

  const mockItem: ${baseItemType} = {
    id: 1,
    name: 'Sample ${resourcePascal}',
    status: 'active'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [${resourcePascal}Service]
    });
    service = TestBed.inject(${resourcePascal}Service);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should execute ${cfg.method} request against ${cfg.endpoint}', () => {
    service.${cfg.method.toLowerCase()}${resourcePascal}(${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? '{ name: "Test" } as any' : ''}).subscribe((res: any) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne((r) => r.url.includes('${baseEndpointUrl}'));
    expect(req.request.method).toBe('${cfg.method}');
    req.flush(mockItem);
  });
});`;
    }

    return `import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ${resourcePascal}Service } from './${resourceCamel}.service';
import { ${baseItemType} } from './${resourceCamel}.models';

describe('${resourcePascal}Service', () => {
  let service: ${resourcePascal}Service;
  let httpMock: HttpTestingController;

  const mockItem: ${baseItemType} = {
    id: 1,
    name: 'Sample ${resourcePascal}',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [${resourcePascal}Service]
    });
    service = TestBed.inject(${resourcePascal}Service);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all ${resourceCamel} items via GET', () => {
    service.getAll().subscribe((res: any) => {
      expect(res).toEqual([mockItem]);
    });

    const req = httpMock.expectOne('${baseEndpointUrl}');
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should create new ${resourceCamel} via POST', () => {
    const payload = { name: 'New Item' };
    service.create(payload as any).subscribe((res) => {
      expect(res).toEqual(mockItem);
    });

    const req = httpMock.expectOne('${baseEndpointUrl}');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockItem);
  });
});`;
  }

  // Vitest / Jest universal client test
  if (cfg.mode === 'single') {
    return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${resourcePascal}ApiClient } from './${resourceCamel}.client';
import { ${baseItemType} } from './${resourceCamel}.models';

describe('${resourcePascal} Client (${cfg.method} ${cfg.endpoint})', () => {
  const mockItem: ${baseItemType} = {
    id: 1,
    name: 'Test ${resourcePascal}',
    status: 'active'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute ${cfg.method} request successfully', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockItem,
      status: 200,
    } as Response);

    const client = new ${resourcePascal}ApiClient();
    const result = await client.execute(${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? '{ name: "Test" } as any' : ''});

    expect(fetchSpy).toHaveBeenCalled();
    expect(result).toEqual(mockItem);
  });

  it('should throw error when server returns error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error',
    } as Response);

    const client = new ${resourcePascal}ApiClient();
    await expect(client.execute(${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? '{ name: "Test" } as any' : ''})).rejects.toThrow();
  });
});`;
  }

  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${resourcePascal}ApiClient } from './${resourceCamel}.client';
import { ${baseItemType} } from './${resourceCamel}.models';

describe('${resourcePascal} Client', () => {
  const mockItem: ${baseItemType} = {
    id: 1,
    name: 'Test ${resourcePascal}',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch list of ${resourceCamel} successfully', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [mockItem],
      status: 200,
    } as Response);

    const client = new ${resourcePascal}ApiClient();
    const result = await client.getAll();

    expect(fetchSpy).toHaveBeenCalled();
    expect(result).toEqual([mockItem]);
  });

  it('should throw error when server returns 500 status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Database failure',
    } as Response);

    const client = new ${resourcePascal}ApiClient();
    await expect(client.getAll()).rejects.toThrow();
  });
});`;
}

// ----------------------------------------------------------------------------
// 8. COMPONENT USAGE GENERATOR
// ----------------------------------------------------------------------------
export function generateComponentUsage(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, resourcePluralCamel, resourcePluralPascal, baseItemType } =
    cfg;

  if (cfg.framework === 'angular') {
    if (cfg.mode === 'single') {
      return `import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ${resourcePascal}Service } from './${resourceCamel}.service';
import { ${baseItemType} } from './${resourceCamel}.models';

@Component({
  selector: 'app-${resourceCamel}-view',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="${resourceCamel}-container">
      <h2>${resourcePascal} Action (${cfg.method})</h2>

      @if (loading()) {
        <p>Processing...</p>
      }

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (data()) {
        <pre>{{ data() | json }}</pre>
      }

      <button (click)="onExecute()">Execute ${cfg.method}</button>
    </div>
  \`
})
export class ${resourcePascal}ViewComponent {
  private readonly ${resourceCamel}Service = inject(${resourcePascal}Service);

  data = signal<${baseItemType} | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  onExecute(): void {
    this.loading.set(true);
    this.error.set(null);
    this.${resourceCamel}Service.${cfg.method.toLowerCase()}${resourcePascal}(${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? '{ name: "Test" } as any' : ''}).subscribe({
      next: (res: any) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }
}`;
    }

    return `import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ${resourcePascal}Service } from './${resourceCamel}.service';
import { ${baseItemType} } from './${resourceCamel}.models';

@Component({
  selector: 'app-${resourceCamel}-list',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="${resourceCamel}-container">
      <h2>${resourcePascal} Directory</h2>

      @if (loading) {
        <p>Loading ${resourcePluralCamel}...</p>
      }

      @if (error) {
        <div class="alert alert-error">{{ error }}</div>
      }

      <ul>
        @for (item of items; track item.id) {
          <li>
            <strong>{{ item.name }}</strong> ({{ item.status }})
            <button (click)="onDelete(item.id)">Delete</button>
          </li>
        }
      </ul>
    </div>
  \`
})
export class ${resourcePascal}ListComponent implements OnInit {
  private readonly ${resourceCamel}Service = inject(${resourcePascal}Service);

  items: ${baseItemType}[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.${resourceCamel}Service.getAll().subscribe({
      next: (data: any) => {
        this.items = Array.isArray(data) ? data : data.items;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  onDelete(id: string | number): void {
    this.${resourceCamel}Service.delete(id).subscribe(() => {
      this.items = this.items.filter(i => i.id !== id);
    });
  }
}`;
  }

  if (cfg.framework === 'react') {
    if (cfg.mode === 'single') {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method)) {
        return `import React from 'react';
import { use${resourcePascal}Mutation } from './${resourceCamel}.hooks';

export function ${resourcePascal}ActionComponent() {
  const mutation = use${resourcePascal}Mutation();

  const handleAction = () => {
    mutation.mutate(${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? '{ name: "New ${resourcePascal}" } as any' : ''});
  };

  return (
    <div className="${resourceCamel}-action">
      <h2>${resourcePascal} (${cfg.method})</h2>
      <button onClick={handleAction} disabled={mutation.isPending}>
        {mutation.isPending ? 'Processing...' : 'Submit ${cfg.method}'}
      </button>

      {mutation.isError && <div className="error">{(mutation.error as Error).message}</div>}
      {mutation.isSuccess && <pre>{JSON.stringify(mutation.data, null, 2)}</pre>}
    </div>
  );
}`;
      }

      return `import React from 'react';
import { use${resourcePascal} } from './${resourceCamel}.hooks';

export function ${resourcePascal}DetailComponent() {
  const { data, isLoading, error } = use${resourcePascal}();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className="${resourceCamel}-detail">
      <h2>${resourcePascal} View</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}`;
    }

    return `import React from 'react';
import { use${resourcePluralPascal}, useCreate${resourcePascal} } from './${resourceCamel}.hooks';

export function ${resourcePascal}Manager() {
  const { data, isLoading, error } = use${resourcePluralPascal}();
  const createMutation = useCreate${resourcePascal}();

  if (isLoading) return <div>Loading ${resourcePluralCamel}...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  const items = Array.isArray(data) ? data : (data as any)?.items || [];

  return (
    <div className="${resourceCamel}-page">
      <h2>${resourcePascal} Management</h2>
      <button onClick={() => createMutation.mutate({ name: 'New ${resourcePascal}' })}>
        + Add ${resourcePascal}
      </button>

      <ul>
        {items.map((item: any) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span className="badge">{item.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}`;
  }

  if (cfg.framework === 'vue') {
    if (cfg.mode === 'single') {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method)) {
        return `<script setup lang="ts">
import { use${resourcePascal}Mutation } from './use${resourcePascal}';

const { data, loading, error, execute, reset } = use${resourcePascal}Mutation();

const handleSubmit = async () => {
  await execute(${['POST', 'PUT', 'PATCH'].includes(cfg.method) ? '{ name: "Sample Item" } as any' : ''});
};
</script>

<template>
  <div class="${resourceCamel}-action-view">
    <h2>${resourcePascal} (${cfg.method})</h2>

    <button :disabled="loading" @click="handleSubmit">
      {{ loading ? 'Executing...' : 'Submit ${cfg.method}' }}
    </button>

    <div v-if="error" class="error">{{ error.message }}</div>
    <pre v-if="data">{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>`;
      }

      return `<script setup lang="ts">
import { use${resourcePascal} } from './use${resourcePascal}';

const { data, loading, error, refetch } = use${resourcePascal}();
</script>

<template>
  <div class="${resourceCamel}-detail-view">
    <h2>${resourcePascal} Detail</h2>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <pre v-else-if="data">{{ JSON.stringify(data, null, 2) }}</pre>

    <button @click="refetch">Refresh</button>
  </div>
</template>`;
    }

    // Vue CRUD usage
    return `<script setup lang="ts">
import { use${resourcePascal}Api } from './use${resourcePascal}';

const { items, loading, isSubmitting, error, fetchAll, create, remove } = use${resourcePascal}Api();

const handleCreate = async () => {
  await create({ name: 'New ${resourcePascal}', status: 'active' });
};

const handleDelete = async (id: string | number) => {
  await remove(id);
};
</script>

<template>
  <div class="${resourceCamel}-view">
    <h2>${resourcePascal} Management</h2>

    <button :disabled="isSubmitting" @click="handleCreate">+ Add ${resourcePascal}</button>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>

    <ul v-else-if="items.length">
      <li v-for="item in items" :key="item.id">
        <strong>{{ item.name }}</strong> - {{ item.status }}
        <button @click="handleDelete(item.id)">Delete</button>
      </li>
    </ul>

    <button @click="() => fetchAll()">Refresh</button>
  </div>
</template>`;
  }

  // Axios / Fetch: plain TypeScript usage example against the generated singleton client
  const clientImportName =
    cfg.framework === 'axios' ? `${resourceCamel}ApiClient` : `${resourceCamel}Client`;
  const clientModulePath = `./${resourceCamel}.client`;

  if (cfg.mode === 'single') {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method);
    return `import { ${clientImportName} } from '${clientModulePath}';

async function run${resourcePascal}Action() {
  try {
    const result = await ${clientImportName}.execute(${isMutation ? '{ name: "New ' + resourcePascal + '" } as any' : ''});
    console.log('${resourcePascal} ${cfg.method} succeeded:', result);
    return result;
  } catch (err) {
    console.error('${resourcePascal} ${cfg.method} failed:', err);
    throw err;
  }
}

run${resourcePascal}Action();`;
  }

  return `import { ${clientImportName} } from '${clientModulePath}';

async function ${resourceCamel}Demo() {
  // Fetch the full ${resourcePluralCamel} list
  const ${resourcePluralCamel} = await ${clientImportName}.getAll();
  console.log('${resourcePascal} list:', ${resourcePluralCamel});

  // Create a new ${resourceCamel}
  const created = await ${clientImportName}.create({ name: 'New ${resourcePascal}', status: 'active' } as any);
  console.log('Created:', created);

  // Delete it again
  await ${clientImportName}.delete((created as any).id);
}

${resourceCamel}Demo();`;
}

// Helpers
function toCamelCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pluralize(str: string): string {
  if (!str) return '';
  if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
    return str.slice(0, -1) + 'ies';
  }
  if (
    str.endsWith('s') ||
    str.endsWith('sh') ||
    str.endsWith('ch') ||
    str.endsWith('x') ||
    str.endsWith('z')
  ) {
    return str + 'es';
  }
  return str + 's';
}
