import { describe, it, expect } from 'vitest';
import {
  generateApiClient,
  importFromCurlCommand,
  FRAMEWORK_OPTIONS,
  API_GENERATOR_PRESETS,
  ApiGeneratorConfig
} from './api-client-generator-engine';

describe('API Client Generator Engine', () => {
  it('should list all framework options and presets', () => {
    expect(FRAMEWORK_OPTIONS.length).toBe(6);
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('angular');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('react');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('vue');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('svelte');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('axios');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('fetch');

    expect(API_GENERATOR_PRESETS.length).toBeGreaterThan(0);
  });

  it('should generate Angular Injectable Service client with CRUD mode', () => {
    const config: ApiGeneratorConfig = {
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
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('export class ProductService');
    expect(res.clientCode).toContain('getAll(params?: ProductQueryParams)');
    expect(res.clientCode).toContain('getById(id: string | number)');
    expect(res.clientCode).toContain('create(payload: CreateProductDto)');
    expect(res.clientCode).toContain('update(id: string | number, payload: UpdateProductDto)');
    expect(res.clientCode).toContain('delete(id: string | number)');

    expect(res.dtosCode).toContain('export interface ProductDto');
    expect(res.dtosCode).toContain('export interface CreateProductDto');
    expect(res.testCode).toContain('ProductService');
    expect(res.usageCode).toContain('ProductListComponent');
  });

  it('should generate Angular Signals Resource client', () => {
    const config: ApiGeneratorConfig = {
      framework: 'angular',
      pattern: 'signals-resource',
      mode: 'single',
      method: 'GET',
      endpoint: '/api/users',
      responseType: 'UserDto[]',
      requestBodyType: '',
      resourceName: 'User',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: false,
      includeAuth: false,
      includeTsDoc: true,
      includePagination: true
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('rxResource');
    expect(res.clientCode).toContain('userResource');
    expect(res.clientCode).toContain('queryParams = signal<UserQueryParams>');
    expect(res.clientCode).toContain('readonly items = this.userResource.value;');
  });

  it('should generate React TanStack Query hooks and query key factory', () => {
    const config: ApiGeneratorConfig = {
      framework: 'react',
      pattern: 'tanstack-query',
      mode: 'crud',
      method: 'GET',
      endpoint: '/api/orders',
      responseType: 'OrderDto[]',
      requestBodyType: 'CreateOrderDto',
      resourceName: 'Order',
      baseUrlStrategy: 'env',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: true,
      includeTsDoc: true,
      includePagination: true
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('orderKeys');
    expect(res.clientCode).toContain('useOrders');
    expect(res.clientCode).toContain('useOrder');
    expect(res.clientCode).toContain('useCreateOrder');
    expect(res.clientCode).toContain('queryClient.invalidateQueries');
    expect(res.usageCode).toContain('OrderManager');
  });

  it('should generate Vue Composition API Composable', () => {
    const config: ApiGeneratorConfig = {
      framework: 'vue',
      pattern: 'composable',
      mode: 'single',
      method: 'GET',
      endpoint: '/api/customers/{id}',
      responseType: 'CustomerDto',
      requestBodyType: '',
      resourceName: 'Customer',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: false,
      includeTsDoc: true,
      includePagination: false
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('export function useCustomer()');
    expect(res.clientCode).toContain('const data = ref<CustomerDto | null>(null);');
    expect(res.clientCode).toContain('onMounted(fetchData);');
    expect(res.usageCode).toContain('<script setup lang="ts">');
  });

  it('should generate Svelte 5 Runes client', () => {
    const config: ApiGeneratorConfig = {
      framework: 'svelte',
      pattern: 'svelte-runes',
      mode: 'single',
      method: 'GET',
      endpoint: '/api/metrics',
      responseType: 'MetricDto[]',
      requestBodyType: '',
      resourceName: 'Metric',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: false,
      includeAuth: false,
      includeTsDoc: false,
      includePagination: false
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('createMetricClient');
    expect(res.clientCode).toContain('$state');
    expect(res.usageCode).toContain('createMetricClient');
  });

  it('should generate Axios Client Class', () => {
    const config: ApiGeneratorConfig = {
      framework: 'axios',
      pattern: 'axios-client',
      mode: 'crud',
      method: 'GET',
      endpoint: '/api/users',
      responseType: 'UserDto[]',
      requestBodyType: 'CreateUserDto',
      resourceName: 'User',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: true,
      includeTsDoc: true,
      includePagination: false
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('export class UserApiClient');
    expect(res.clientCode).toContain('this.client.interceptors.request.use');
    expect(res.clientCode).toContain('this.client.interceptors.response.use');
    expect(res.clientCode).toContain('async getAll(');
    expect(res.clientCode).toContain('async create(');
  });

  it('should parse cURL commands into generator config', () => {
    const curl = `curl -X POST "https://api.example.com/v1/auth/login" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer test_token" \\
      -d '{"username": "admin", "password": "secret"}'`;

    const imported = importFromCurlCommand(curl);
    expect(imported.method).toBe('POST');
    expect(imported.endpoint).toBe('/v1/auth/login');
    expect(imported.resourceName).toBe('Login');
    expect(imported.includeAuth).toBe(true);
    expect(imported.requestBodyType).toBe('CustomRequestDto');
  });
});
