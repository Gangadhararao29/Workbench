import { describe, it, expect } from 'vitest';
import { generateFeatureFiles, formatFeatureBundle } from './feature-generator-engine';

describe('feature-generator-engine', () => {
  it('should generate all core C# artifacts for a feature', () => {
    const files = generateFeatureFiles('Order', 'CommerceApp', {
      includeEntity: true,
      includeDto: true,
      includeRepository: true,
      includeService: true,
      includeController: true,
      includeConfiguration: true,
      includeFrontend: true,
      frontendFramework: 'angular',
    });

    const fileNames = files.map((f) => f.fileName);
    expect(fileNames).toContain('Order.cs');
    expect(fileNames).toContain('OrderDto.cs');
    expect(fileNames).toContain('IOrderRepository.cs');
    expect(fileNames).toContain('OrderRepository.cs');
    expect(fileNames).toContain('OrderService.cs');
    expect(fileNames).toContain('OrderController.cs');
    expect(fileNames).toContain('OrderConfiguration.cs');
    expect(fileNames).toContain('order.model.ts');
    expect(fileNames).toContain('order.service.ts');

    const repoInterface = files.find((f) => f.fileName === 'IOrderRepository.cs')!;
    expect(repoInterface.content).not.toContain('using CommerceApp.Domain;');
    expect(repoInterface.content).toContain('Task<bool> DeleteAsync(int id');

    const controller = files.find((f) => f.fileName === 'OrderController.cs')!;
    expect(controller.content).toContain('[Route("api/orders")]');
    expect(controller.content).toContain('public sealed class OrderController');
  });

  it('should format multi-word feature routes using kebab-case', () => {
    const files = generateFeatureFiles('OrderItem', 'CommerceApp', {
      includeEntity: false,
      includeDto: false,
      includeRepository: false,
      includeService: false,
      includeController: true,
      includeConfiguration: false,
      includeFrontend: true,
      frontendFramework: 'angular',
    });

    const controller = files.find((f) => f.fileName === 'OrderItemController.cs')!;
    expect(controller.content).toContain('[Route("api/order-items")]');

    const service = files.find((f) => f.fileName === 'orderitem.service.ts')!;
    expect(service.content).toContain("private readonly url = '/api/order-items';");
  });

  it('should generate React Query frontend client when react is selected', () => {
    const files = generateFeatureFiles('Customer', 'MyApp', {
      includeEntity: false,
      includeDto: false,
      includeRepository: false,
      includeService: false,
      includeController: false,
      includeConfiguration: false,
      includeFrontend: true,
      frontendFramework: 'react',
    });

    const fileNames = files.map((f) => f.fileName);
    expect(fileNames).toContain('customer.model.ts');
    expect(fileNames).toContain('customer.api.ts');
    expect(fileNames).toContain('useCustomers.ts');

    const hook = files.find((f) => f.fileName === 'useCustomers.ts')!;
    expect(hook.content).toContain("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'");
    expect(hook.content).toContain('export function useCustomers()');
  });

  it('should bundle files with header separators', () => {
    const files = [{ fileName: 'Test.cs', content: 'class Test {}' }];
    const bundle = formatFeatureBundle(files);
    expect(bundle).toContain('// ==========================================');
    expect(bundle).toContain('// Test.cs');
    expect(bundle).toContain('class Test {}');
  });
});
