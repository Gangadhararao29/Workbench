import { describe, it, expect } from 'vitest';
import {
  generateApiClient,
  FRAMEWORK_OPTIONS,
  ApiGeneratorConfig
} from './api-client-generator-engine';

describe('API Client Generator Engine', () => {
  it('should list all framework options', () => {
    expect(FRAMEWORK_OPTIONS.length).toBe(6);
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('angular');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('react');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('vue');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('svelte');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('axios');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('fetch');
  });

  describe('Option Checkboxes verification', () => {
    const baseConfig: ApiGeneratorConfig = {
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

    it('Option 1: Error Handling checkbox toggles error handling code', () => {
      const withErr = generateApiClient({ ...baseConfig, includeErrorHandling: true });
      expect(withErr.clientCode).toContain('catchError(this.handleError)');
      expect(withErr.clientCode).toContain('handleError(error: HttpErrorResponse)');

      const withoutErr = generateApiClient({ ...baseConfig, includeErrorHandling: false });
      expect(withoutErr.clientCode).not.toContain('catchError(this.handleError)');
      expect(withoutErr.clientCode).not.toContain('handleError(error: HttpErrorResponse)');
    });

    it('Option 2: Cancellation (Abort) checkbox toggles abort controller / signal in Vue and React', () => {
      const vueWithCancel = generateApiClient({
        ...baseConfig,
        framework: 'vue',
        pattern: 'composable',
        includeCancellation: true
      });
      expect(vueWithCancel.clientCode).toContain('abortController');
      expect(vueWithCancel.clientCode).toContain('signal: abortController.signal');

      const vueWithoutCancel = generateApiClient({
        ...baseConfig,
        framework: 'vue',
        pattern: 'composable',
        includeCancellation: false
      });
      expect(vueWithoutCancel.clientCode).not.toContain('abortController');
      expect(vueWithoutCancel.clientCode).not.toContain('signal: abortController.signal');
    });

    it('Option 3: Auth Bearer Header checkbox toggles authorization header in code', () => {
      const withAuth = generateApiClient({
        ...baseConfig,
        framework: 'fetch',
        pattern: 'modern-fetch',
        includeAuth: true
      });
      expect(withAuth.clientCode).toContain('Authorization');
      expect(withAuth.clientCode).toContain('Bearer');

      const withoutAuth = generateApiClient({
        ...baseConfig,
        framework: 'fetch',
        pattern: 'modern-fetch',
        includeAuth: false
      });
      expect(withoutAuth.clientCode).not.toContain('Authorization');
      expect(withoutAuth.clientCode).not.toContain('Bearer');
    });

    it('Option 4: Pagination & Filters checkbox toggles query parameters & DTO interfaces', () => {
      const withPagination = generateApiClient({ ...baseConfig, includePagination: true });
      expect(withPagination.clientCode).toContain('ProductQueryParams');
      expect(withPagination.clientCode).toContain('PaginatedResult');
      expect(withPagination.dtosCode).toContain('export interface ProductQueryParams');
      expect(withPagination.dtosCode).toContain('export interface PaginatedResult');

      const withoutPagination = generateApiClient({ ...baseConfig, includePagination: false });
      expect(withoutPagination.clientCode).not.toContain('ProductQueryParams');
      expect(withoutPagination.dtosCode).not.toContain('export interface ProductQueryParams');
      expect(withoutPagination.dtosCode).not.toContain('export interface PaginatedResult');
    });

    it('Option 5: TSDoc Comments checkbox toggles JSDoc documentation comments', () => {
      const withDocs = generateApiClient({ ...baseConfig, includeTsDoc: true });
      expect(withDocs.clientCode).toContain('/**');
      expect(withDocs.clientCode).toContain('*/');

      const withoutDocs = generateApiClient({ ...baseConfig, includeTsDoc: false });
      expect(withoutDocs.clientCode).not.toContain('/**');
      expect(withoutDocs.clientCode).not.toContain('*/');
    });
  });

  it('should generate Vue 3 Composition API Composable for full CRUD', () => {
    const config: ApiGeneratorConfig = {
      framework: 'vue',
      pattern: 'composable',
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
    expect(res.clientCode).toContain('export function useProductApi()');
    expect(res.clientCode).toContain('const items = ref<ProductDto[]>([])');
    expect(res.clientCode).toContain('const fetchAll = async');
    expect(res.clientCode).toContain('const fetchById = async');
    expect(res.clientCode).toContain('const create = async');
    expect(res.clientCode).toContain('const update = async');
    expect(res.clientCode).toContain('const remove = async');
    expect(res.clientCode).toContain('onMounted(() => {');
    expect(res.usageCode).toContain('useProductApi');
  });

  it('should generate Vue 3 Composable for single endpoint with path parameter', () => {
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
    expect(res.clientCode).toContain('export function useCustomer(id?: string | number)');
    expect(res.clientCode).toContain('const data = ref<CustomerDto | null>(null);');
    expect(res.clientCode).toContain('onMounted(fetchData);');
    expect(res.clientCode).toContain('/api/customers/${id}');
    expect(res.usageCode).toContain('<script setup lang="ts">');
  });

  it('should generate Vue 3 Mutation Composable for single POST endpoint', () => {
    const config: ApiGeneratorConfig = {
      framework: 'vue',
      pattern: 'composable',
      mode: 'single',
      method: 'POST',
      endpoint: '/api/auth/login',
      responseType: 'AuthResponseDto',
      requestBodyType: 'LoginRequestDto',
      resourceName: 'Auth',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: false,
      includeAuth: false,
      includeTsDoc: true,
      includePagination: false
    };

    const res = generateApiClient(config);
    expect(res.clientCode).toContain('export function useAuthMutation()');
    expect(res.clientCode).toContain('const execute = async (payload: LoginRequestDto)');
    expect(res.clientCode).toContain('method: \'POST\'');
    expect(res.usageCode).toContain('useAuthMutation');
  });
});
