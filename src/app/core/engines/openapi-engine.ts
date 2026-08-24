import type { OpenAPIObject, OperationObject, ParameterObject, RequestBodyObject, ResponseObject, SchemaObject, ServerObject, TagObject } from 'openapi3-ts/oas30';

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  type?: string;
  format?: string;
  defaultValue?: unknown;
  example?: unknown;
  enum?: string[];
}

export interface OpenApiRequestBody {
  description?: string;
  required: boolean;
  contentTypes: string[];
  schema?: unknown;
  example?: unknown;
  sampleJson?: string;
}

export interface OpenApiResponse {
  statusCode: string;
  description: string;
  contentTypes: string[];
  schema?: unknown;
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiSchemaProperty {
  name: string;
  type: string;
  format?: string;
  description?: string;
  required: boolean;
  example?: unknown;
}

export interface OpenApiSchemaDetail {
  name: string;
  type: string;
  description?: string;
  required: string[];
  properties: OpenApiSchemaProperty[];
  sampleJson: string;
}

export interface OpenApiEndpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated: boolean;
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: OpenApiResponse[];
  security: string[];
  curl: string;
}

export interface OpenApiInspection {
  title: string;
  version: string;
  description?: string;
  servers: OpenApiServer[];
  tags: OpenApiTag[];
  endpoints: OpenApiEndpoint[];
  schemas: OpenApiSchemaDetail[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;

/**
 * Parse and inspect an OpenAPI 3.x / Swagger 2.x JSON document.
 * Resolves inline $refs locally without external network or file requests.
 */
export function inspectOpenApi(source: string, defaultServerUrl?: string): OpenApiInspection {
  const document = JSON.parse(source) as OpenAPIObject;

  // Resolve inline $refs locally
  const resolved = resolveInlineRefs(document) as OpenAPIObject;

  const info = (resolved as unknown as Record<string, Record<string, string>>)['info'] ?? {};
  const title = info['title'] ?? 'OpenAPI Specification';
  const version = info['version'] ?? '1.0.0';
  const description = info['description'] ?? '';

  // Extract servers
  let servers: OpenApiServer[] = [];
  if (Array.isArray(resolved.servers) && resolved.servers.length > 0) {
    servers = resolved.servers.map((s: ServerObject) => ({
      url: s.url || '/',
      description: s.description,
    }));
  } else if ((resolved as unknown as Record<string, unknown>)['host']) {
    // Swagger 2.0 fallback
    const host = (resolved as unknown as Record<string, string>)['host'];
    const basePath = (resolved as unknown as Record<string, string>)['basePath'] || '';
    const schemes = (resolved as unknown as Record<string, string[]>)['schemes'] || ['https'];
    servers = [{ url: `${schemes[0]}://${host}${basePath}`, description: 'Swagger 2.0 Host' }];
  } else {
    servers = [{ url: 'https://api.example.com/v1', description: 'Default Server' }];
  }

  const activeServerUrl = defaultServerUrl || servers[0]?.url || 'https://api.example.com';

  // Extract tags
  const definedTags: OpenApiTag[] = Array.isArray(resolved.tags)
    ? resolved.tags.map((t: TagObject) => ({
        name: t.name,
        description: t.description,
      }))
    : [];

  // Extract schemas
  const schemasObj =
    (resolved as unknown as Record<string, Record<string, Record<string, SchemaObject>>>)['components']?.['schemas'] ??
    (resolved as unknown as Record<string, Record<string, SchemaObject>>)['definitions'] ??
    {};

  const schemas: OpenApiSchemaDetail[] = Object.entries(schemasObj).map(([name, schema]) => {
    const requiredList = Array.isArray(schema.required) ? schema.required : [];
    const props: OpenApiSchemaProperty[] = Object.entries(schema.properties ?? {}).map(([propName, propSchema]) => {
      const p = propSchema as SchemaObject;
      const propTypeStr = Array.isArray(p.type)
        ? p.type.join(', ')
        : (p.type ?? (p.items ? `array<${Array.isArray((p.items as SchemaObject).type) ? ((p.items as SchemaObject).type as string[]).join(', ') : ((p.items as SchemaObject).type ?? 'object')}>` : 'object'));

      return {
        name: propName,
        type: propTypeStr,
        format: p.format,
        description: p.description,
        required: requiredList.includes(propName),
        example: p.example ?? (p as unknown as Record<string, unknown>)['default'],
      };
    });

    const schemaTypeStr = Array.isArray(schema.type) ? schema.type.join(', ') : (schema.type ?? 'object');

    return {
      name,
      type: schemaTypeStr,
      description: schema.description,
      required: requiredList,
      properties: props,
      sampleJson: JSON.stringify(generateSampleFromSchema(schema), null, 2),
    };
  });

  // Extract endpoints
  const endpoints: OpenApiEndpoint[] = Object.entries(resolved.paths ?? {}).flatMap(([path, pathItem]) => {
    const item = pathItem as Record<string, unknown>;
    const commonParameters = Array.isArray(item['parameters']) ? (item['parameters'] as ParameterObject[]) : [];

    return HTTP_METHODS.filter(method => method in item).map(method => {
      const operation = (item as Record<string, OperationObject>)[method] || {};
      const methodUpper = method.toUpperCase();
      const operationParameters = Array.isArray(operation.parameters) ? (operation.parameters as ParameterObject[]) : [];

      // Combine path-level and operation-level parameters (operation overrides path)
      const allParamsMap = new Map<string, ParameterObject>();
      for (const p of commonParameters) {
        if (p && p.name && p.in) allParamsMap.set(`${p.in}:${p.name}`, p);
      }
      for (const p of operationParameters) {
        if (p && p.name && p.in) allParamsMap.set(`${p.in}:${p.name}`, p);
      }

      const parameters: OpenApiParameter[] = Array.from(allParamsMap.values()).map(p => {
        const schema = (p.schema as SchemaObject) || {};
        const pRecord = p as unknown as Record<string, unknown>;
        const pType = schema.type !== undefined
          ? (Array.isArray(schema.type) ? schema.type.join(', ') : String(schema.type))
          : (pRecord['type'] ? String(pRecord['type']) : undefined);

        return {
          name: p.name,
          in: p.in as 'path' | 'query' | 'header' | 'cookie',
          required: Boolean(p.required || p.in === 'path'),
          description: p.description,
          type: pType,
          format: schema.format,
          defaultValue: pRecord['default'] ?? schema.default,
          example: p.example ?? schema.example,
          enum: schema.enum as string[] | undefined,
        };
      });

      // Request Body
      let requestBody: OpenApiRequestBody | undefined;
      const rawBody = operation.requestBody as RequestBodyObject | undefined;
      if (rawBody) {
        const content = rawBody.content || {};
        const contentTypes = Object.keys(content);
        const firstContentType = contentTypes[0];
        const mediaObj = firstContentType ? content[firstContentType] : undefined;
        const bodySchema = mediaObj?.schema as SchemaObject | undefined;
        const sample = mediaObj?.example ?? (bodySchema ? generateSampleFromSchema(bodySchema) : undefined);

        requestBody = {
          description: rawBody.description,
          required: Boolean(rawBody.required),
          contentTypes,
          schema: bodySchema,
          example: sample,
          sampleJson: sample ? JSON.stringify(sample, null, 2) : undefined,
        };
      }

      // Responses
      const responses: OpenApiResponse[] = Object.entries(operation.responses ?? {}).map(([statusCode, resp]) => {
        const resObj = resp as ResponseObject;
        const content = resObj.content || {};
        return {
          statusCode,
          description: resObj.description ?? '',
          contentTypes: Object.keys(content),
          schema: (content['application/json']?.schema || Object.values(content)[0]?.schema) as SchemaObject | undefined,
        };
      });

      // Security
      const securityList: string[] = [];
      if (Array.isArray(operation.security)) {
        for (const sec of operation.security) {
          securityList.push(...Object.keys(sec));
        }
      } else if (Array.isArray(resolved.security)) {
        for (const sec of resolved.security) {
          securityList.push(...Object.keys(sec));
        }
      }

      const tags = Array.isArray(operation.tags) && operation.tags.length > 0 ? operation.tags : ['General'];

      const endpointObj: OpenApiEndpoint = {
        id: `${methodUpper}-${path}`,
        method: methodUpper,
        path,
        summary: operation.summary ?? operation.description ?? '',
        description: operation.description,
        operationId: operation.operationId,
        tags,
        deprecated: Boolean(operation.deprecated),
        parameters,
        requestBody,
        responses,
        security: securityList,
        curl: '',
      };

      endpointObj.curl = generateCurlCommand(endpointObj, activeServerUrl, { multiline: true });
      return endpointObj;
    });
  });

  return {
    title,
    version,
    description,
    servers,
    tags: definedTags,
    endpoints,
    schemas,
  };
}

/**
 * Generate a ready-to-use cURL command for an endpoint.
 */
export function generateCurlCommand(
  endpoint: OpenApiEndpoint,
  serverUrl: string = 'https://api.example.com',
  options: { multiline?: boolean; token?: string } = { multiline: true }
): string {
  const multiline = options.multiline ?? true;
  const sep = multiline ? ' \\\n  ' : ' ';

  // Sanitize server URL (remove trailing slash)
  const cleanServerUrl = serverUrl.replace(/\/+$/, '');

  // Replace path parameters: e.g. /users/{id} -> /users/1
  let resolvedPath = endpoint.path;
  const pathParams = endpoint.parameters.filter(p => p.in === 'path');
  for (const p of pathParams) {
    const val = p.example ?? p.defaultValue ?? (p.type === 'integer' || p.type === 'number' ? '1' : 'sample_id');
    resolvedPath = resolvedPath.replace(`{${p.name}}`, encodeURIComponent(String(val)));
  }

  // Handle Query Parameters
  const queryParams = endpoint.parameters.filter(p => p.in === 'query');
  const queryParts: string[] = [];
  for (const q of queryParams) {
    const val = q.example ?? q.defaultValue ?? (q.type === 'integer' ? '1' : q.type === 'boolean' ? 'true' : 'value');
    queryParts.push(`${encodeURIComponent(q.name)}=${encodeURIComponent(String(val))}`);
  }

  const fullUrl = queryParts.length > 0
    ? `${cleanServerUrl}${resolvedPath}?${queryParts.join('&')}`
    : `${cleanServerUrl}${resolvedPath}`;

  const parts: string[] = [`curl -X ${endpoint.method} "${fullUrl}"`];

  // Headers
  if (endpoint.requestBody && (!endpoint.requestBody.contentTypes.length || endpoint.requestBody.contentTypes.includes('application/json'))) {
    parts.push(`-H "Content-Type: application/json"`);
  } else if (endpoint.requestBody?.contentTypes[0]) {
    parts.push(`-H "Content-Type: ${endpoint.requestBody.contentTypes[0]}"`);
  }

  // Header parameters
  const headerParams = endpoint.parameters.filter(p => p.in === 'header');
  for (const h of headerParams) {
    const val = h.example ?? h.defaultValue ?? 'example-header-value';
    parts.push(`-H "${h.name}: ${val}"`);
  }

  // Security Headers
  if (endpoint.security.length > 0) {
    const hasBearer = endpoint.security.some(s => s.toLowerCase().includes('bearer') || s.toLowerCase().includes('jwt') || s.toLowerCase().includes('token'));
    const hasApiKey = endpoint.security.some(s => s.toLowerCase().includes('api') || s.toLowerCase().includes('key'));

    if (hasBearer) {
      parts.push(`-H "Authorization: Bearer ${options.token || 'YOUR_ACCESS_TOKEN'}"`);
    } else if (hasApiKey) {
      parts.push(`-H "X-API-KEY: YOUR_API_KEY"`);
    } else {
      parts.push(`-H "Authorization: Bearer ${options.token || 'YOUR_ACCESS_TOKEN'}"`);
    }
  }

  // Request Body
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody?.sampleJson) {
    const jsonStr = endpoint.requestBody.sampleJson.replace(/\r?\n\s*/g, ' ');
    parts.push(`-d '${jsonStr}'`);
  }

  return parts.join(sep);
}

/**
 * Generate a realistic sample JavaScript object from a SchemaObject.
 */
export function generateSampleFromSchema(schema: SchemaObject, depth = 0): unknown {
  if (depth > 5 || !schema) return {};

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  const rawType = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : 'string');
  const type = String(Array.isArray(rawType) ? rawType[0] : rawType);

  switch (type) {
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'date') return new Date().toISOString().split('T')[0];
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
      return 'string_value';

    case 'number':
    case 'float':
    case 'double':
      return 19.99;

    case 'integer':
    case 'int32':
    case 'int64':
      return 1;

    case 'boolean':
      return true;

    case 'array':
      if (schema.items) {
        return [generateSampleFromSchema(schema.items as SchemaObject, depth + 1)];
      }
      return [];

    case 'object': {
      const obj: Record<string, unknown> = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateSampleFromSchema(propSchema as SchemaObject, depth + 1);
        }
      }
      return obj;
    }

    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Inline $ref resolver — only resolves #/... local references safely
// External http:// or file:// $refs are left unresolved (blocked by design).
// ---------------------------------------------------------------------------

function resolveInlineRefs(doc: unknown, root?: unknown): unknown {
  const rootDoc = root ?? doc;
  if (Array.isArray(doc)) {
    return doc.map(item => resolveInlineRefs(item, rootDoc));
  }
  if (doc !== null && typeof doc === 'object') {
    const obj = doc as Record<string, unknown>;
    if (typeof obj['$ref'] === 'string') {
      const ref = obj['$ref'] as string;
      if (ref.startsWith('#/')) {
        return resolveInlineRefs(resolvePointer(rootDoc, ref.slice(2)), rootDoc);
      }
      return doc;
    }
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, resolveInlineRefs(v, rootDoc)])
    );
  }
  return doc;
}

function resolvePointer(root: unknown, pointer: string): unknown {
  return pointer.split('/').reduce((node: unknown, segment) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
  }, root);
}

// ---------------------------------------------------------------------------
// Built-in Simple Sample OpenAPI Specification
// ---------------------------------------------------------------------------

export const SAMPLE_OPENAPI_SPEC = JSON.stringify({
  openapi: '3.0.3',
  info: {
    title: 'Petstore API',
    description: 'A clean sample API for managing pets, inventory, and users.',
    version: '1.0.0'
  },
  servers: [
    { url: 'https://api.petstore.io/v1', description: 'Production Server' }
  ],
  tags: [
    { name: 'pets', description: 'Operations about pets' },
    { name: 'store', description: 'Store orders and inventory' },
    { name: 'user', description: 'User account management' }
  ],
  paths: {
    '/pets': {
      get: {
        tags: ['pets'],
        summary: 'List all pets',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of items to return', required: false, schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', description: 'Pet status filter', required: false, schema: { type: 'string', enum: ['available', 'pending', 'sold'], default: 'available' } }
        ],
        responses: {
          '200': {
            description: 'List of pets',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } } } }
          }
        }
      },
      post: {
        tags: ['pets'],
        summary: 'Create a new pet',
        security: [{ bearerAuth: [] }],
        requestBody: {
          description: 'Pet data to create',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
        },
        responses: {
          '201': { description: 'Pet created successfully' },
          '400': { description: 'Invalid input' }
        }
      }
    },
    '/pets/{petId}': {
      get: {
        tags: ['pets'],
        summary: 'Get pet by ID',
        parameters: [
          { name: 'petId', in: 'path', required: true, description: 'ID of the pet', schema: { type: 'integer', example: 10 } }
        ],
        responses: {
          '200': { description: 'Pet details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
          '404': { description: 'Pet not found' }
        }
      },
      delete: {
        tags: ['pets'],
        summary: 'Delete a pet',
        security: [{ apiKey: [] }],
        parameters: [
          { name: 'petId', in: 'path', required: true, description: 'ID of the pet', schema: { type: 'integer', example: 10 } }
        ],
        responses: {
          '204': { description: 'Pet deleted successfully' },
          '404': { description: 'Pet not found' }
        }
      }
    },
    '/store/inventory': {
      get: {
        tags: ['store'],
        summary: 'Get store inventory',
        responses: {
          '200': { description: 'Inventory counts by status' }
        }
      }
    },
    '/user/login': {
      get: {
        tags: ['user'],
        summary: 'Login user',
        parameters: [
          { name: 'username', in: 'query', required: true, schema: { type: 'string', example: 'johndoe' } },
          { name: 'password', in: 'query', required: true, schema: { type: 'string', example: 'secret123' } }
        ],
        responses: {
          '200': { description: 'Login successful' }
        }
      }
    }
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['name', 'category'],
        properties: {
          id: { type: 'integer', format: 'int64', example: 10 },
          name: { type: 'string', example: 'Buddy' },
          category: { type: 'string', example: 'Dogs' },
          status: { type: 'string', enum: ['available', 'pending', 'sold'], example: 'available' }
        }
      }
    }
  }
}, null, 2);
