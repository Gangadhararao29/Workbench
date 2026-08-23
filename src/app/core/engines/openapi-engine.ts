import type { OpenAPIObject, OperationObject } from 'openapi3-ts/oas30';

export interface OpenApiEndpoint {
  method: string;
  path: string;
  summary: string;
  operationId?: string;
  tags: string[];
}

export interface OpenApiInspection {
  title: string;
  version: string;
  endpoints: OpenApiEndpoint[];
  schemas: string[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;

/**
 * Parse and inspect an OpenAPI 3.x JSON document.
 *
 * @apidevtools/swagger-parser is a Node.js package and cannot be bundled
 * directly for browser use (it requires 'path', 'util', etc.).
 * This engine handles browser-safe parsing: JSON input with inline $ref
 * resolution only — no external HTTP or file $refs are followed, satisfying
 * the security requirement from the architecture review.
 *
 * When YAML support is needed, add js-yaml as a dependency and call
 * loadYaml() before passing to this function.
 */
export function inspectOpenApi(source: string): OpenApiInspection {
  const document = JSON.parse(source) as OpenAPIObject;

  // Resolve inline $refs only — walk the document and expand local references
  const resolved = resolveInlineRefs(document) as OpenAPIObject;

  const info = (resolved as unknown as Record<string, Record<string, string>>)['info'] ?? {};

  const endpoints: OpenApiEndpoint[] = Object.entries(resolved.paths ?? {}).flatMap(
    ([path, pathItem]) =>
      HTTP_METHODS.filter(method => method in pathItem).map(method => {
        const operation = (pathItem as Record<string, OperationObject>)[method];
        return {
          method: method.toUpperCase(),
          path,
          summary: operation?.summary ?? operation?.description ?? '',
          operationId: operation?.operationId,
          tags: operation?.tags ?? [],
        };
      })
  );

  return {
    title: info['title'] ?? '',
    version: info['version'] ?? '',
    endpoints,
    schemas: Object.keys((resolved as unknown as Record<string, Record<string, unknown>>)['components']?.['schemas'] ?? {}),
  };
}

// ---------------------------------------------------------------------------
// Inline $ref resolver — only resolves #/... local references
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
      // External $ref — leave as-is (not resolved, not fetched)
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
