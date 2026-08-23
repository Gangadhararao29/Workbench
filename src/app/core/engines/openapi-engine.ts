import type { OpenAPIObject, OperationObject } from 'openapi3-ts/oas30';

export interface OpenApiEndpoint {
  method: string;
  path: string;
  summary: string;
}

export interface OpenApiInspection {
  endpoints: OpenApiEndpoint[];
  schemas: string[];
}

export function inspectOpenApi(source: string): OpenApiInspection {
  const document = JSON.parse(source) as OpenAPIObject;
  const endpoints = Object.entries(document.paths ?? {}).flatMap(([path, pathItem]) =>
    Object.entries(pathItem).filter(isOperation).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      summary: operation.summary ?? operation.description ?? ''
    }))
  );

  return {
    endpoints,
    schemas: Object.keys(document.components?.schemas ?? {})
  };
}

function isOperation(entry: [string, unknown]): entry is [string, OperationObject] {
  return ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(entry[0]);
}
