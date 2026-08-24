import { describe, it, expect } from 'vitest';
import { inspectOpenApi, generateCurlCommand, SAMPLE_OPENAPI_SPEC } from './openapi-engine';

describe('OpenAPI Engine', () => {
  it('should inspect sample Petstore OpenAPI spec correctly', () => {
    const inspection = inspectOpenApi(SAMPLE_OPENAPI_SPEC);

    expect(inspection.title).toBe('Petstore API');
    expect(inspection.version).toBe('1.0.0');
    expect(inspection.servers.length).toBeGreaterThanOrEqual(1);
    expect(inspection.endpoints.length).toBeGreaterThan(0);
    expect(inspection.schemas.length).toBeGreaterThan(0);

    // Verify endpoints
    const listPets = inspection.endpoints.find(e => e.path === '/pets' && e.method === 'GET');
    expect(listPets).toBeDefined();
    expect(listPets?.tags).toContain('pets');
    expect(listPets?.parameters.some(p => p.name === 'limit')).toBe(true);

    const createPet = inspection.endpoints.find(e => e.path === '/pets' && e.method === 'POST');
    expect(createPet).toBeDefined();
    expect(createPet?.requestBody).toBeDefined();
    expect(createPet?.security.length).toBeGreaterThan(0);
  });

  it('should generate accurate cURL commands', () => {
    const inspection = inspectOpenApi(SAMPLE_OPENAPI_SPEC);
    const getPet = inspection.endpoints.find(e => e.path === '/pets/{petId}' && e.method === 'GET');
    expect(getPet).toBeDefined();

    const curl = generateCurlCommand(getPet!, 'https://api.petstore.io/v1', { multiline: false });
    expect(curl).toContain('curl -X GET');
    expect(curl).toContain('https://api.petstore.io/v1/pets/10');

    const postPet = inspection.endpoints.find(e => e.path === '/pets' && e.method === 'POST');
    expect(postPet).toBeDefined();
    const postCurl = generateCurlCommand(postPet!, 'https://api.petstore.io/v1', { multiline: false });
    expect(postCurl).toContain('curl -X POST');
    expect(postCurl).toContain('-H "Content-Type: application/json"');
    expect(postCurl).toContain('-H "Authorization: Bearer');
    expect(postCurl).toContain('-d \'');
  });

  it('should extract schemas and property types', () => {
    const inspection = inspectOpenApi(SAMPLE_OPENAPI_SPEC);
    const petSchema = inspection.schemas.find(s => s.name === 'Pet');
    expect(petSchema).toBeDefined();
    expect(petSchema?.properties.some(p => p.name === 'name' && p.required)).toBe(true);
    expect(petSchema?.sampleJson).toContain('"name"');
  });

  it('should handle Swagger 2.0 specs with host and basePath', () => {
    const swaggerDoc = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Legacy Swagger API', version: '1.0' },
      host: 'legacy.api.com',
      basePath: '/api/v1',
      schemes: ['https'],
      paths: {
        '/status': {
          get: {
            summary: 'Health check',
            responses: { '200': { description: 'OK' } }
          }
        }
      }
    });

    const result = inspectOpenApi(swaggerDoc);
    expect(result.title).toBe('Legacy Swagger API');
    expect(result.servers[0].url).toBe('https://legacy.api.com/api/v1');
    expect(result.endpoints.length).toBe(1);
    expect(result.endpoints[0].path).toBe('/status');
  });
});
