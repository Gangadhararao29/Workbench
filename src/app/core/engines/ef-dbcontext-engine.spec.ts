import { describe, it, expect } from 'vitest';
import { generateEfDbContext, parseEntityNames } from './ef-dbcontext-engine';

describe('ef-dbcontext-engine', () => {
  it('should parse entity names from comma separated text or class definitions', () => {
    expect(parseEntityNames('Customer, Order, Product')).toEqual(['Customer', 'Order', 'Product']);
    expect(parseEntityNames('public class Invoice { } public record Item { }')).toEqual(['Invoice', 'Item']);
  });

  it('should generate DbContext class with DbSets and assembly configuration', () => {
    const code = generateEfDbContext('Customer, Order', {
      contextName: 'ShopDbContext',
      namespace: 'Shop.Data',
      provider: 'PostgreSql',
    });

    expect(code).toContain('public class ShopDbContext : DbContext');
    expect(code).toContain('public DbSet<Customer> Customers => Set<Customer>();');
    expect(code).toContain('public DbSet<Order> Orders => Set<Order>();');
    expect(code).toContain('options.UseNpgsql(connectionString');
    expect(code).toContain('public class ShopDbContextFactory : IDesignTimeDbContextFactory<ShopDbContext>');
  });

  it('should generate auditable stamping and soft delete filters when enabled', () => {
    const code = generateEfDbContext('User', {
      includeAuditInterceptor: true,
      includeSoftDeleteFilter: true,
    });

    expect(code).toContain('public interface IAuditableEntity');
    expect(code).toContain('public interface ISoftDeletable');
    expect(code).toContain('entry.Entity.CreatedAtUtc = now;');
    expect(code).toContain('entry.Entity.IsDeleted = true;');
  });
});
