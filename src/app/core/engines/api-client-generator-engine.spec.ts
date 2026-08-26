import { describe, it, expect } from 'vitest';
import {
  generateApiClient,
  FRAMEWORK_OPTIONS,
  ApiGeneratorConfig
} from './api-client-generator-engine';

describe('API Client Generator Engine', () => {
  it('should list all framework options', () => {
    expect(FRAMEWORK_OPTIONS.length).toBe(5);
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('angular');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('react');
    expect(FRAMEWORK_OPTIONS.map(f => f.id)).toContain('vue');
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
      const withDocs = generateApiClient({ ...baseConfig, includeCancellation: false, includeTsDoc: true });
      expect(withDocs.clientCode).toContain('/**');
      expect(withDocs.clientCode).toContain('*/');

      const withoutDocs = generateApiClient({ ...baseConfig, includeCancellation: false, includeTsDoc: false });
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

    const result = generateApiClient(config);

    expect(result.clientCode).toContain('export function useProductApi');
    expect(result.clientCode).toContain('const items = ref<ProductDto[]>([])');
    expect(result.clientCode).toContain('const fetchAll = async');
    expect(result.clientCode).toContain('const create = async');
    expect(result.clientCode).toContain('const update = async');
    expect(result.clientCode).toContain('const remove = async');

    expect(result.dtosCode).toContain('export interface ProductDto');
    expect(result.dtosCode).toContain('export interface CreateProductDto');
    expect(result.dtosCode).toContain('export interface UpdateProductDto');
    expect(result.dtosCode).toContain('export interface ProductQueryParams');

    expect(result.testCode).toContain("describe('Product Client'");
    expect(result.usageCode).toContain('<script setup lang="ts">');
  });

  it('should generate Vue 3 Composable for single endpoint with path parameter', () => {
    const config: ApiGeneratorConfig = {
      framework: 'vue',
      pattern: 'composable',
      mode: 'single',
      method: 'GET',
      endpoint: '/api/orders/{orderId}/items/{itemId}',
      responseType: 'OrderItemDto',
      requestBodyType: 'void',
      resourceName: 'OrderItem',
      baseUrlStrategy: 'relative',
      includeErrorHandling: true,
      includeCancellation: true,
      includeAuth: false,
      includeTsDoc: true,
      includePagination: false
    };

    const result = generateApiClient(config);

    expect(result.clientCode).toContain('export function useOrderItem(orderId?: string | number, itemId?: string | number)');
    expect(result.clientCode).toContain('const fetchData = async ()');
    expect(result.clientCode).toContain('/api/orders/${orderId}/items/${itemId}');
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

    const result = generateApiClient(config);

    expect(result.clientCode).toContain('export function useAuthMutation()');
    expect(result.clientCode).toContain('const execute = async (payload: LoginRequestDto)');
    expect(result.clientCode).toContain("method: 'POST'");
  });
});
