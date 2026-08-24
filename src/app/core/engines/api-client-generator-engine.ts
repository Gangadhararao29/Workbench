import { parseCurlCommand } from './curl-engine';

export type SupportedFramework = 'angular' | 'react' | 'vue' | 'svelte' | 'axios' | 'fetch';

export type AngularPattern = 'signals-resource' | 'full-service' | 'signals-store' | 'service-method';
export type ReactPattern = 'tanstack-query' | 'custom-hook' | 'rtk-query' | 'redux-thunk' | 'swr';
export type VuePattern = 'composable' | 'vue-query' | 'pinia-store' | 'nuxt-fetch' | 'context-provider';
export type SveltePattern = 'svelte-runes';
export type AxiosPattern = 'axios-client';
export type FetchPattern = 'modern-fetch';

export type AnyPattern = AngularPattern | ReactPattern | VuePattern | SveltePattern | AxiosPattern | FetchPattern;

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
      { id: 'signals-resource', label: 'Signals Resource (rxResource / httpResource)', description: 'Modern Angular 18/19 reactive signal resource' },
      { id: 'full-service', label: 'Injectable Service (HttpClient + RxJS)', description: 'Standard typed Angular Service with Observables' },
      { id: 'signals-store', label: 'Signals State Service (Signal Store)', description: 'Service managing signal state with async/await' },
      { id: 'service-method', label: 'Single Service Method Snippet', description: 'Quick method snippet for existing services' }
    ]
  },
  {
    id: 'react',
    label: 'React',
    icon: 'devices',
    patterns: [
      { id: 'tanstack-query', label: 'TanStack Query (React Query v5)', description: 'useQuery / useMutation with typed Query Key factory' },
      { id: 'custom-hook', label: 'Custom React Hook (useFetch / useResource)', description: 'useState + useEffect with AbortController cancellation' },
      { id: 'rtk-query', label: 'RTK Query (Redux Toolkit)', description: 'createApi with fetchBaseQuery and cache tags' },
      { id: 'redux-thunk', label: 'Redux Toolkit Thunk (createAsyncThunk)', description: 'Async thunk actions and typed slice state' },
      { id: 'swr', label: 'SWR Hook (stale-while-revalidate)', description: 'useSWR and useSWRMutation data fetching' }
    ]
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: 'web',
    patterns: [
      { id: 'composable', label: 'Composition API Composable (useResource)', description: 'Reactive ref & computed composable with refetch' },
      { id: 'vue-query', label: 'TanStack Vue Query v5', description: 'useQuery / useMutation for Vue 3' },
      { id: 'pinia-store', label: 'Pinia Store Action', description: 'defineStore setup store with typed actions & state' },
      { id: 'nuxt-fetch', label: 'Nuxt 3 ($fetch / useAsyncData)', description: 'Nuxt 3 universal data fetching wrapper' },
      { id: 'context-provider', label: 'Provide / Inject Service Client', description: 'Dependency-injected typed client class' }
    ]
  },
  {
    id: 'svelte',
    label: 'Svelte',
    icon: 'bolt',
    patterns: [
      { id: 'svelte-runes', label: 'Svelte 5 Runes ($state & $derived)', description: 'Modern Svelte 5 reactive client with runes' }
    ]
  },
  {
    id: 'axios',
    label: 'Axios',
    icon: 'http',
    patterns: [
      { id: 'axios-client', label: 'Typed Axios Client Class', description: 'Configurable singleton client with interceptors' }
    ]
  },
  {
    id: 'fetch',
    label: 'Vanilla Fetch',
    icon: 'api',
    patterns: [
      { id: 'modern-fetch', label: 'Typed Fetch Client / Helper', description: 'Zero-dependency typed modern fetch client' }
    ]
  }
];

export interface PresetOption {
  name: string;
  description: string;
  config: Partial<ApiGeneratorConfig>;
}

export const API_GENERATOR_PRESETS: PresetOption[] = [
  {
    name: 'ASP.NET Core Products CRUD',
    description: 'Full REST CRUD client for Product management (/api/products)',
    config: {
      framework: 'angular',
      pattern: 'full-service',
      mode: 'crud',
      method: 'GET',
      endpoint: '/api/products',
      responseType: 'ProductDto[]',
      requestBodyType: 'CreateProductDto',
      resourceName: 'Product',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: true,
      includeTsDoc: true,
      includePagination: true
    }
  },
  {
    name: 'User Authentication & Login',
    description: 'Single endpoint POST for JWT login (/api/auth/login)',
    config: {
      framework: 'react',
      pattern: 'tanstack-query',
      mode: 'single',
      method: 'POST',
      endpoint: '/api/auth/login',
      responseType: 'AuthResponseDto',
      requestBodyType: 'LoginRequestDto',
      resourceName: 'Auth',
      baseUrlStrategy: 'env',
      includeErrorHandling: true,
      includeCancellation: false,
      includeAuth: false,
      includeTsDoc: true,
      includePagination: false
    }
  },
  {
    name: 'Paginated Orders List',
    description: 'Paginated GET query with filtering parameters (/api/orders)',
    config: {
      framework: 'react',
      pattern: 'tanstack-query',
      mode: 'single',
      method: 'GET',
      endpoint: '/api/orders',
      responseType: 'OrderDto[]',
      requestBodyType: '',
      resourceName: 'Order',
      baseUrlStrategy: 'env',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: true,
      includeTsDoc: true,
      includePagination: true
    }
  },
  {
    name: 'Customer Detail by ID',
    description: 'GET single customer detail endpoint (/api/customers/{id})',
    config: {
      framework: 'vue',
      pattern: 'composable',
      mode: 'single',
      method: 'GET',
      endpoint: '/api/customers/{id}',
      responseType: 'CustomerDetailDto',
      requestBodyType: '',
      resourceName: 'Customer',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: true,
      includeTsDoc: true,
      includePagination: false
    }
  },
  {
    name: 'Document / File Upload',
    description: 'POST endpoint for multipart file upload (/api/documents/upload)',
    config: {
      framework: 'fetch',
      pattern: 'modern-fetch',
      mode: 'single',
      method: 'POST',
      endpoint: '/api/documents/upload',
      responseType: 'UploadResultDto',
      requestBodyType: 'FormData',
      resourceName: 'Document',
      baseUrlStrategy: 'parameterized',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: true,
      includeTsDoc: true,
      includePagination: false
    }
  }
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
    case 'svelte':
      clientCode = generateSvelteClient(norm);
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
    language: 'typescript'
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
  const endpoint = config.endpoint.trim() || '/api/resource';
  const pathParts = endpoint.split('?')[0].split('/').filter(Boolean);
  
  // Extract path params like {id} or :id
  const pathParams: string[] = [];
  const cleanParts = pathParts.map(p => {
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

  const lastStaticPart = pathParts.filter(p => !p.startsWith('{') && !p.startsWith(':')).pop() || 'resource';
  const rawResource = config.resourceName?.trim() || lastStaticPart;

  const resourceCamel = toCamelCase(rawResource.replace(/Dto$/i, ''));
  const resourcePascal = capitalize(resourceCamel);
  
  const resourcePluralCamel = pluralize(resourceCamel);
  const resourcePluralPascal = capitalize(resourcePluralCamel);

  const cleanResponseType = config.responseType?.trim() || `${resourcePascal}Dto`;
  const isListResponse = cleanResponseType.endsWith('[]') || cleanResponseType.startsWith('Array<');
  const baseItemType = cleanResponseType.replace(/\[\]$/, '').replace(/^Array<(.+)>$/, '$1').trim() || `${resourcePascal}Dto`;

  const cleanRequestBodyType = config.requestBodyType?.trim() || (config.method === 'POST' ? `Create${resourcePascal}Dto` : `Update${resourcePascal}Dto`);

  let baseEndpointUrl = endpoint.split('?')[0].replace(/\/\{[^}]+\}/g, '').replace(/\/:[^/]+/g, '');
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
    pathParams
  };
}

// ----------------------------------------------------------------------------
// 1. ANGULAR CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateAngularClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, resourcePluralCamel, baseItemType, cleanEndpoint, baseEndpointUrl, pathParams } = cfg;

  if (cfg.pattern === 'service-method') {
    const methodLower = cfg.method.toLowerCase();
    const isMutation = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
    const paramSignature = [
      ...pathParams.map(p => `${p}: string | number`),
      ...(isMutation ? [`payload: ${cfg.requestBodyType}`] : []),
      ...(cfg.includePagination && cfg.method === 'GET' ? [`params?: ${resourcePascal}QueryParams`] : [])
    ].join(', ');

    const httpCallArgs = [
      pathParams.length ? `\`${cleanEndpoint}\`` : `'${cfg.endpoint}'`,
      ...(isMutation ? ['payload'] : []),
      ...(cfg.includePagination && cfg.method === 'GET' ? ['{ params: this.buildParams(params) }'] : [])
    ].filter(Boolean).join(', ');

    const docStr = cfg.includeTsDoc
      ? `  /**\n   * Executes ${cfg.method} request against ${cfg.endpoint}\n   */\n`
      : '';

    return `${docStr}  ${methodLower}${resourcePascal}(${paramSignature}): Observable<${cfg.responseType}> {\n    return this.http.${methodLower}<${cfg.responseType}>(${httpCallArgs});\n  }`;
  }

  if (cfg.pattern === 'signals-resource') {
    return `import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ${baseItemType}${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}ResourceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';

  ${cfg.includePagination ? `// Reactive filter / query state
  readonly queryParams = signal<${resourcePascal}QueryParams>({ page: 1, pageSize: 20 });\n` : ''}
  /**
   * Modern Angular Signal Resource for ${resourcePascal}
   * Auto-refetches whenever reactive signal dependencies change.
   */
  readonly ${resourceCamel}Resource = rxResource({
    request: () => (${cfg.includePagination ? 'this.queryParams()' : '{}'}),
    loader: (${cfg.includePagination ? '({ request })' : '()'}) => {
      ${cfg.includePagination ? `let params = new HttpParams();
      if (request.page) params = params.set('page', request.page.toString());
      if (request.pageSize) params = params.set('pageSize', request.pageSize.toString());
      if (request.search) params = params.set('search', request.search);
      return this.http.get<${cfg.responseType}>(this.baseUrl, { params });` : `return this.http.get<${cfg.responseType}>(this.baseUrl);`}
    }
  });

  // Convenience computed signals
  readonly items = this.${resourceCamel}Resource.value;
  readonly isLoading = this.${resourceCamel}Resource.isLoading;
  readonly error = this.${resourceCamel}Resource.error;

  /** Reload resource manually */
  reload(): void {
    this.${resourceCamel}Resource.reload();
  }
}`;
  }

  if (cfg.pattern === 'signals-store') {
    return `import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto } from './${resourceCamel}.models';

export interface ${resourcePascal}State {
  items: ${baseItemType}[];
  selectedItem: ${baseItemType} | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}Store {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';

  // State Signals
  private readonly state = signal<${resourcePascal}State>({
    items: [],
    selectedItem: null,
    loading: false,
    error: null
  });

  // Public Selectors
  readonly items = computed(() => this.state().items);
  readonly selectedItem = computed(() => this.state().selectedItem);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly totalCount = computed(() => this.state().items.length);

  async loadAll(): Promise<void> {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    try {
      const items = await firstValueFrom(this.http.get<${baseItemType}[]>(this.baseUrl));
      this.state.update(s => ({ ...s, items, loading: false }));
    } catch (err) {
      const message = err instanceof HttpErrorResponse ? err.message : 'Failed to load ${resourcePluralCamel}';
      this.state.update(s => ({ ...s, error: message, loading: false }));
    }
  }

  async create(dto: Create${resourcePascal}Dto): Promise<${baseItemType}> {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    try {
      const created = await firstValueFrom(this.http.post<${baseItemType}>(this.baseUrl, dto));
      this.state.update(s => ({ ...s, items: [...s.items, created], loading: false }));
      return created;
    } catch (err) {
      const message = err instanceof HttpErrorResponse ? err.message : 'Failed to create ${resourceCamel}';
      this.state.update(s => ({ ...s, error: message, loading: false }));
      throw err;
    }
  }

  async delete(id: string | number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(\`\${this.baseUrl}/\${id}\`));
      this.state.update(s => ({
        ...s,
        items: s.items.filter(item => (item as any).id !== id)
      }));
    } catch (err) {
      const message = err instanceof HttpErrorResponse ? err.message : 'Failed to delete ${resourceCamel}';
      this.state.update(s => ({ ...s, error: message }));
      throw err;
    }
  }
}`;
  }

  // full-service (Default Angular)
  if (cfg.mode === 'crud') {
    return `import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams, PaginatedResult` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';

  /**
   * Get all ${resourcePluralCamel} with optional filtering and pagination
   */
  getAll(${cfg.includePagination ? `params?: ${resourcePascal}QueryParams` : ''}): Observable<${cfg.includePagination ? `PaginatedResult<${baseItemType}>` : `${baseItemType}[]`}> {
    ${cfg.includePagination ? `let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) httpParams = httpParams.set(key, val.toString());
      });
    }` : ''}
    return this.http.get<${cfg.includePagination ? `PaginatedResult<${baseItemType}>` : `${baseItemType}[]`}>(this.baseUrl${cfg.includePagination ? ', { params: httpParams }' : ''}).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Get single ${resourceCamel} by ID
   */
  getById(id: string | number): Observable<${baseItemType}> {
    return this.http.get<${baseItemType}>(\`\${this.baseUrl}/\${id}\`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create new ${resourceCamel}
   */
  create(payload: Create${resourcePascal}Dto): Observable<${baseItemType}> {
    return this.http.post<${baseItemType}>(this.baseUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update entire ${resourceCamel}
   */
  update(id: string | number, payload: Update${resourcePascal}Dto): Observable<${baseItemType}> {
    return this.http.put<${baseItemType}>(\`\${this.baseUrl}/\${id}\`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete ${resourceCamel} by ID
   */
  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(\`\${this.baseUrl}/\${id}\`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown API error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = \`Client error: \${error.error.message}\`;
    } else {
      errorMessage = \`Server returned code \${error.status}: \${error.message}\`;
    }
    return throwError(() => new Error(errorMessage));
  }
}`;
  }

  // Single Endpoint Full Service
  const methodLower = cfg.method.toLowerCase();
  const isMutation = ['POST', 'PUT', 'PATCH'].includes(cfg.method);
  const paramSignature = [
    ...pathParams.map(p => `${p}: string | number`),
    ...(isMutation ? [`payload: ${cfg.requestBodyType}`] : []),
    ...(cfg.includePagination && cfg.method === 'GET' ? [`params?: ${resourcePascal}QueryParams`] : [])
  ].join(', ');

  const httpCallArgs = [
    pathParams.length ? `\`\${this.baseUrl}${cleanEndpoint}\`` : `this.baseUrl`,
    ...(isMutation ? ['payload'] : []),
    ...(cfg.includePagination && cfg.method === 'GET' ? ['{ params: this.buildParams(params) }'] : [])
  ].filter(Boolean).join(', ');

  return `import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ${baseItemType}${isMutation ? `, ${cfg.requestBodyType}` : ''} } from './${resourceCamel}.models';

@Injectable({
  providedIn: 'root'
})
export class ${resourcePascal}Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '${baseEndpointUrl}';

  /**
   * ${cfg.method} request to ${cfg.endpoint}
   */
  ${methodLower}${resourcePascal}(${paramSignature}): Observable<${cfg.responseType}> {
    return this.http.${methodLower}<${cfg.responseType}>(${httpCallArgs}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.message || error.message || 'API request failed';
    return throwError(() => new Error(message));
  }
}`;
}

// ----------------------------------------------------------------------------
// 2. REACT CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateReactClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, resourcePluralCamel, resourcePluralPascal, baseItemType, cleanEndpoint, baseEndpointUrl, pathParams } = cfg;

  if (cfg.pattern === 'tanstack-query') {
    return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto${cfg.includePagination ? `, ${resourcePascal}QueryParams` : ''} } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

/** Query Keys Factory for ${resourcePascal} */
export const ${resourceCamel}Keys = {
  all: ['${resourceCamel}'] as const,
  lists: () => [...${resourceCamel}Keys.all, 'list'] as const,
  list: (params?: ${resourcePascal}QueryParams) => [...${resourceCamel}Keys.lists(), { params }] as const,
  details: () => [...${resourceCamel}Keys.all, 'detail'] as const,
  detail: (id: string | number) => [...${resourceCamel}Keys.details(), id] as const,
};

// API Fetch Helpers
async function fetch${resourcePluralPascal}(params?: ${resourcePascal}QueryParams): Promise<${cfg.responseType}> {
  const url = new URL(BASE_URL, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json'${cfg.includeAuth ? `, 'Authorization': \`Bearer \${localStorage.getItem('token')}\`` : ''} }
  });
  if (!res.ok) throw new Error(\`Failed to fetch ${resourcePluralCamel}: \${res.statusText}\`);
  return res.json();
}

async function fetch${resourcePascal}ById(id: string | number): Promise<${baseItemType}> {
  const res = await fetch(\`\${BASE_URL}/\${id}\`);
  if (!res.ok) throw new Error(\`Failed to fetch ${resourceCamel}: \${res.statusText}\`);
  return res.json();
}

async function create${resourcePascal}(payload: Create${resourcePascal}Dto): Promise<${baseItemType}> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create ${resourceCamel}');
  return res.json();
}

/** Hook to fetch ${resourcePluralPascal} list */
export function use${resourcePluralPascal}(params?: ${resourcePascal}QueryParams) {
  return useQuery({
    queryKey: ${resourceCamel}Keys.list(params),
    queryFn: () => fetch${resourcePluralPascal}(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/** Hook to fetch single ${resourceCamel} by ID */
export function use${resourcePascal}(id: string | number, enabled = true) {
  return useQuery({
    queryKey: ${resourceCamel}Keys.detail(id),
    queryFn: () => fetch${resourcePascal}ById(id),
    enabled: Boolean(id) && enabled,
  });
}

/** Hook to create ${resourceCamel} with automatic query cache invalidation */
export function useCreate${resourcePascal}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create${resourcePascal},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${resourceCamel}Keys.lists() });
    },
  });
}`;
  }

  if (cfg.pattern === 'rtk-query') {
    return `import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto } from './${resourceCamel}.models';

export const ${resourceCamel}Api = createApi({
  reducerPath: '${resourceCamel}Api',
  baseQuery: fetchBaseQuery({
    baseUrl: '${baseEndpointUrl}',
    prepareHeaders: (headers) => {
      ${cfg.includeAuth ? `const token = localStorage.getItem('token');
      if (token) headers.set('authorization', \`Bearer \${token}\`);` : ''}
      return headers;
    }
  }),
  tagTypes: ['${resourcePascal}'],
  endpoints: (builder) => ({
    get${resourcePluralPascal}: builder.query<${cfg.responseType}, void>({
      query: () => '',
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

  if (cfg.pattern === 'redux-thunk') {
    return `import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ${baseItemType}, Create${resourcePascal}Dto } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

export const fetch${resourcePluralPascal} = createAsyncThunk(
  '${resourceCamel}/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(BASE_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      return (await response.json()) as ${cfg.responseType};
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch ${resourcePluralCamel}');
    }
  }
);

export const create${resourcePascal} = createAsyncThunk(
  '${resourceCamel}/create',
  async (payload: Create${resourcePascal}Dto, { rejectWithValue }) => {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to create ${resourceCamel}');
      return (await response.json()) as ${baseItemType};
    } catch (err: any) {
      return rejectWithValue(err.message || 'Create failed');
    }
  }
);

interface ${resourcePascal}State {
  data: ${cfg.responseType} | null;
  loading: boolean;
  error: string | null;
}

const initialState: ${resourcePascal}State = {
  data: null,
  loading: false,
  error: null,
};

export const ${resourceCamel}Slice = createSlice({
  name: '${resourceCamel}',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch${resourcePluralPascal}.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetch${resourcePluralPascal}.fulfilled, (state, action: PayloadAction<${cfg.responseType}>) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetch${resourcePluralPascal}.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Unknown error';
      });
  },
});

export const { clearError } = ${resourceCamel}Slice.actions;
export default ${resourceCamel}Slice.reducer;`;
  }

  if (cfg.pattern === 'swr') {
    return `import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { ${baseItemType}, Create${resourcePascal}Dto } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API fetch error');
  return res.json();
}

async function sendRequest(url: string, { arg }: { arg: Create${resourcePascal}Dto }) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  }).then(res => res.json());
}

/** SWR Hook for fetching ${resourcePluralPascal} */
export function use${resourcePluralPascal}() {
  const { data, error, isLoading, mutate } = useSWR<${cfg.responseType}>(BASE_URL, fetcher);
  return {
    ${resourcePluralCamel}: data,
    isLoading,
    isError: Boolean(error),
    error,
    refresh: mutate,
  };
}

/** SWR Mutation Hook for creating ${resourcePascal} */
export function useCreate${resourcePascal}() {
  const { trigger, isMutating, error } = useSWRMutation(BASE_URL, sendRequest);
  return {
    create${resourcePascal}: trigger,
    isSaving: isMutating,
    error,
  };
}`;
  }

  // custom-hook (Default React)
  return `import { useState, useEffect, useCallback, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    ${cfg.includeCancellation ? `abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;` : ''}

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('${cfg.endpoint}'${cfg.includeCancellation ? ', { signal: controller.signal }' : ''});
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
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
  const { resourcePascal, resourceCamel, resourcePluralCamel, resourcePluralPascal, baseItemType, cleanEndpoint, baseEndpointUrl } = cfg;

  if (cfg.pattern === 'vue-query') {
    return `import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { ${baseItemType}, Create${resourcePascal}Dto } from './${resourceCamel}.models';

const BASE_URL = '${baseEndpointUrl}';

export function use${resourcePluralPascal}Query() {
  return useQuery({
    queryKey: ['${resourceCamel}', 'list'],
    queryFn: async (): Promise<${cfg.responseType}> => {
      const res = await fetch(BASE_URL);
      if (!res.ok) throw new Error('Failed to fetch ${resourcePluralCamel}');
      return res.json();
    }
  });
}

export function useCreate${resourcePascal}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Create${resourcePascal}Dto): Promise<${baseItemType}> => {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create ${resourceCamel}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${resourceCamel}'] });
    }
  });
}`;
  }

  if (cfg.pattern === 'pinia-store') {
    return `import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto } from './${resourceCamel}.models';

export const use${resourcePascal}Store = defineStore('${resourceCamel}', () => {
  const items = ref<${baseItemType}[]>([]);
  const currentItem = ref<${baseItemType} | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const itemCount = computed(() => items.value.length);

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('${baseEndpointUrl}');
      if (!res.ok) throw new Error('Failed to fetch ${resourcePluralCamel}');
      items.value = await res.json();
    } catch (err: any) {
      error.value = err.message || 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  async function createItem(dto: Create${resourcePascal}Dto) {
    loading.value = true;
    try {
      const res = await fetch('${baseEndpointUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });
      if (!res.ok) throw new Error('Failed to create item');
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

  return {
    items,
    currentItem,
    loading,
    error,
    itemCount,
    fetchAll,
    createItem
  };
});`;
  }

  if (cfg.pattern === 'nuxt-fetch') {
    return `import { ${baseItemType} } from './${resourceCamel}.models';

export function use${resourcePascal}Api() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase || '${baseEndpointUrl}';

  const getAll = () => useFetch<${cfg.responseType}>(\`\${apiBase}\`, {
    key: '${resourceCamel}-list',
    lazy: true,
  });

  const getById = (id: string | number) => useFetch<${baseItemType}>(\`\${apiBase}/\${id}\`, {
    key: \`${resourceCamel}-\${id}\`
  });

  const create = (body: any) => $fetch<${baseItemType}>(\`\${apiBase}\`, {
    method: 'POST',
    body
  });

  const remove = (id: string | number) => $fetch<void>(\`\${apiBase}/\${id}\`, {
    method: 'DELETE'
  });

  return { getAll, getById, create, remove };
}`;
  }

  if (cfg.pattern === 'context-provider') {
    return `import { inject, provide, InjectionKey } from 'vue';
import { ${baseItemType} } from './${resourceCamel}.models';

export class ${resourcePascal}ApiClient {
  private baseUrl = '${baseEndpointUrl}';

  async fetchAll(): Promise<${cfg.responseType}> {
    const res = await fetch(this.baseUrl);
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  }

  async getById(id: string | number): Promise<${baseItemType}> {
    const res = await fetch(\`\${this.baseUrl}/\${id}\`);
    if (!res.ok) throw new Error('Fetch by ID failed');
    return res.json();
  }
}

export const ${resourcePascal}ApiKey: InjectionKey<${resourcePascal}ApiClient> = Symbol('${resourcePascal}ApiClient');

export function provide${resourcePascal}Client(): ${resourcePascal}ApiClient {
  const client = new ${resourcePascal}ApiClient();
  provide(${resourcePascal}ApiKey, client);
  return client;
}

export function use${resourcePascal}Client(): ${resourcePascal}ApiClient {
  const client = inject(${resourcePascal}ApiKey);
  if (!client) throw new Error('${resourcePascal}ApiClient was not provided in component tree.');
  return client;
}`;
  }

  // composable (Default Vue)
  return `import { ref, onMounted, readonly } from 'vue';
import { ${baseItemType} } from './${resourceCamel}.models';

export function use${resourcePascal}() {
  const data = ref<${cfg.responseType} | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const fetchData = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('${cfg.endpoint}');
      if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);
      data.value = await res.json();
    } catch (err: any) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchData);

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    refetch: fetchData
  };
}`;
}

// ----------------------------------------------------------------------------
// 4. SVELTE CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateSvelteClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, baseItemType, baseEndpointUrl } = cfg;

  return `import { ${baseItemType} } from './${resourceCamel}.models';

export function create${resourcePascal}Client(baseUrl = '${baseEndpointUrl}') {
  let data = $state<${cfg.responseType} | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error(\`HTTP error \${res.status}\`);
      data = await res.json();
    } catch (e: any) {
      error = e.message || 'Failed to load ${resourceCamel}';
    } finally {
      loading = false;
    }
  }

  return {
    get data() { return data; },
    get loading() { return loading; },
    get error() { return error; },
    load
  };
}`;
}

// ----------------------------------------------------------------------------
// 5. AXIOS CLIENT GENERATORS
// ----------------------------------------------------------------------------
function generateAxiosClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, resourcePluralCamel, baseItemType, baseEndpointUrl } = cfg;

  return `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ${baseItemType}, Create${resourcePascal}Dto, Update${resourcePascal}Dto } from './${resourceCamel}.models';

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

    ${cfg.includeAuth ? `// Attach authorization interceptor
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && config.headers) {
        config.headers.Authorization = \`Bearer \${token}\`;
      }
      return config;
    });` : ''}

    ${cfg.includeErrorHandling ? `// Global response error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const customError = new Error(error.response?.data?.message || error.message || 'API request failed');
        return Promise.reject(customError);
      }
    );` : ''}
  }

  async getAll(config?: AxiosRequestConfig): Promise<${cfg.responseType}> {
    const res: AxiosResponse<${cfg.responseType}> = await this.client.get('', config);
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
// 6. MODERN FETCH CLIENT GENERATOR
// ----------------------------------------------------------------------------
function generateFetchClient(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, baseItemType, baseEndpointUrl } = cfg;

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

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(\`HTTP \${response.status} (\${response.statusText}): \${errorBody || 'Request failed'}\`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  getAll(params?: Record<string, any>): Promise<${cfg.responseType}> {
    return this.request<${cfg.responseType}>('', { method: 'GET', params });
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
// 7. TYPESCRIPT DTOS / MODELS GENERATOR
// ----------------------------------------------------------------------------
export function generateTypeScriptDtos(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, baseItemType } = cfg;

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

${cfg.includePagination ? `export interface ${resourcePascal}QueryParams {
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
}` : ''}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}`;
}

// ----------------------------------------------------------------------------
// 8. UNIT TEST SPEC GENERATOR
// ----------------------------------------------------------------------------
export function generateUnitTestSpec(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, baseItemType, baseEndpointUrl } = cfg;

  if (cfg.framework === 'angular') {
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
// 9. COMPONENT USAGE GENERATOR
// ----------------------------------------------------------------------------
export function generateComponentUsage(cfg: ReturnType<typeof normalizeConfig>): string {
  const { resourcePascal, resourceCamel, resourcePluralCamel, resourcePluralPascal, baseItemType } = cfg;

  if (cfg.framework === 'angular') {
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
    return `<script setup lang="ts">
import { onMounted } from 'vue';
import { use${resourcePascal} } from './use${resourcePascal}';

const { data, loading, error, refetch } = use${resourcePascal}();
</script>

<template>
  <div class="${resourceCamel}-view">
    <h2>${resourcePascal} List</h2>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>

    <ul v-else-if="data">
      <li v-for="item in (Array.isArray(data) ? data : (data as any).items)" :key="item.id">
        <strong>{{ item.name }}</strong> - {{ item.status }}
      </li>
    </ul>

    <button @click="refetch">Refresh</button>
  </div>
</template>`;
  }

  // Universal / Svelte fallback
  return `<script lang="ts">
  import { create${resourcePascal}Client } from './${resourceCamel}.client';

  const client = create${resourcePascal}Client();
  client.load();
</script>

<div class="${resourceCamel}-box">
  <h2>${resourcePascal} View</h2>
  {#if client.loading}
    <p>Loading...</p>
  {:else if client.error}
    <p class="error">{client.error}</p>
  {:else if client.data}
    <ul>
      {#each client.data as item}
        <li>{item.name}</li>
      {/each}
    </ul>
  {/if}
</div>`;
}

// ----------------------------------------------------------------------------
// 10. IMPORTERS (cURL & OpenAPI)
// ----------------------------------------------------------------------------
export function importFromCurlCommand(curlStr: string): Partial<ApiGeneratorConfig> {
  const req = parseCurlCommand(curlStr);

  let method: ApiGeneratorConfig['method'] = 'GET';
  const m = req.method.toUpperCase();
  if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
    method = m as ApiGeneratorConfig['method'];
  }

  let requestBodyType = '';
  if (req.body && req.bodyType === 'json') {
    try {
      const parsed = JSON.parse(req.body);
      const keys = Object.keys(parsed);
      requestBodyType = keys.length ? 'CustomRequestDto' : '';
    } catch {
      requestBodyType = 'any';
    }
  }

  const endpointPath = req.pathname || '/api/resource';
  const lastSegment = endpointPath.split('/').filter(Boolean).pop() || 'resource';
  const resourceName = capitalize(toCamelCase(lastSegment));

  return {
    method,
    endpoint: endpointPath,
    resourceName,
    responseType: `${resourceName}Dto`,
    requestBodyType: requestBodyType || (method === 'POST' ? `Create${resourceName}Dto` : `Update${resourceName}Dto`),
    includeAuth: req.headers.some(h => h.name.toLowerCase() === 'authorization')
  };
}

// Helpers
function toCamelCase(str: string): string {
  return str.replace(/[-_](\w)/g, (_, letter) => letter.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase());
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pluralize(str: string): string {
  if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
    return str + 'es';
  }
  return str + 's';
}
