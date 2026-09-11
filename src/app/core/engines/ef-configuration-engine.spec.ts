import { describe, it, expect } from 'vitest';
import {
  parseCSharpEntities,
  generateEfConfiguration,
  PRESET_CUSTOMER_ORDERS,
  PRESET_BLOG_POST,
} from './ef-configuration-engine';

describe('ef-configuration-engine', () => {
  it('should parse entities and navigation relationships from C# code', () => {
    const { entities, enums } = parseCSharpEntities(PRESET_CUSTOMER_ORDERS);
    expect(entities.length).toBeGreaterThanOrEqual(2);
    expect(enums).toContain('CustomerStatus');

    const customer = entities.find((e) => e.name === 'Customer');
    expect(customer).toBeDefined();
    expect(customer?.keys[0].name).toBe('Id');
    expect(customer?.tableName).toBe('Customers');

    const order = entities.find((e) => e.name === 'Order');
    expect(order).toBeDefined();
    expect(order?.foreignKeys.some((fk) => fk.name === 'CustomerId')).toBe(true);
  });

  it('should generate Fluent API configuration with primary keys, indexes, and soft delete', () => {
    const config = generateEfConfiguration(
      PRESET_CUSTOMER_ORDERS,
      {
        enableSoftDelete: true,
        deleteBehavior: 'Restrict',
      },
      'fluent',
    );

    expect(config).toContain('public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>');
    expect(config).toContain('builder.ToTable("Customers");');
    expect(config).toContain('builder.HasKey(e => e.Id);');
    expect(config).toContain('builder.HasIndex(e => e.Email)');
    expect(config).toContain('.IsUnique();');
    expect(config).toContain('builder.HasQueryFilter(e => !e.IsDeleted);');
    expect(config).toContain('builder.HasOne(e => e.Customer)');
  });

  it('should generate Data Annotations when requested', () => {
    const config = generateEfConfiguration(PRESET_BLOG_POST, {}, 'annotations');
    expect(config).toContain('[Table("Blogs")]');
    expect(config).toContain('[Key]');
    expect(config).toContain('public class Blog');
    expect(config).toContain('public class Post');
  });

  it('should handle empty or invalid code gracefully', () => {
    const config = generateEfConfiguration('// just a comment');
    expect(config).toContain('No C# class or record definitions found');
  });
});
