import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

interface PropertyInfo {
  name: string;
  type: string;
  rawType: string;
  nullable: boolean;
  isCollection: boolean;
  collectionItemType?: string;
  isKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyFor?: string;
  isNavigation?: boolean;
  isEnum?: boolean;
  attributes: string[];
  comment?: string;
}

interface EntityInfo {
  name: string;
  namespace?: string;
  tableName: string;
  schema?: string;
  properties: PropertyInfo[];
  keys: PropertyInfo[];
  foreignKeys: PropertyInfo[];
  navigations: PropertyInfo[];
  collections: PropertyInfo[];
}

const PRESET_CUSTOMER_ORDERS = `public class Customer
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public decimal CreditLimit { get; set; }
    public CustomerStatus Status { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    // Navigation properties
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public Address? BillingAddress { get; set; }
}

public class Order
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public byte[]? RowVersion { get; set; }

    // Foreign Key & Navigation
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
}

public enum CustomerStatus
{
    Active = 1,
    Suspended = 2,
    Archived = 3
}

public class Address
{
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public string Country { get; set; } = string.Empty;
}`;

const PRESET_BLOG_POST = `public class Blog
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Rating { get; set; }
    public bool IsDeleted { get; set; }

    public ICollection<Post> Posts { get; set; } = new List<Post>();
}

public class Post
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime PublishedAtUtc { get; set; }
    public int BlogId { get; set; }
    public Blog Blog { get; set; } = null!;
}`;

@Component({
  selector: 'app-ef-configuration',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor],
  templateUrl: './ef-configuration.html',
  styleUrls: ['./ef-configuration.css']
})
export class EfConfiguration implements OnInit {
  @Input({ required: true }) instanceId!: string;

  input = signal(PRESET_CUSTOMER_ORDERS);
  result = signal('');
  activeTab = signal<'fluent' | 'annotations' | 'both'>('fluent');

  constructor(private instanceService: InstanceService) {
    effect(() => {
      // Re-run whenever config changes in the options panel
      this.config();
      this.generate();
    });
  }

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  ngOnInit() {
    this.generate();
  }

  loadPreset(preset: 'customer' | 'blog' | 'simple') {
    if (preset === 'customer') {
      this.input.set(PRESET_CUSTOMER_ORDERS);
    } else if (preset === 'blog') {
      this.input.set(PRESET_BLOG_POST);
    } else {
      this.input.set(`public class Product\n{\n    public int Id { get; set; }\n    public string Name { get; set; } = string.Empty;\n    public string Sku { get; set; } = string.Empty;\n    public decimal Price { get; set; }\n    public bool IsActive { get; set; } = true;\n    public DateTime CreatedAt { get; set; }\n}`);
    }
    this.generate();
  }

  setTab(tab: 'fluent' | 'annotations' | 'both') {
    this.activeTab.set(tab);
    this.generate();
  }

  private pluralize(name: string): string {
    if (name.endsWith('y') && !/[aeiou]y$/i.test(name)) {
      return `${name.slice(0, -1)}ies`;
    }
    if (/(s|x|z|ch|sh)$/i.test(name)) {
      return `${name}es`;
    }
    return `${name}s`;
  }

  private parseEntities(source: string): { entities: EntityInfo[]; enums: string[] } {
    const entities: EntityInfo[] = [];
    const enums: string[] = [];

    // Extract enums
    const enumRegex = /enum\s+(\w+)\s*\{([^}]*)\}/g;
    let enumMatch: RegExpExecArray | null;
    while ((enumMatch = enumRegex.exec(source)) !== null) {
      enums.push(enumMatch[1]);
    }

    // Extract classes / records
    const classRegex = /(?:\[([^\]]+)\]\s*)*(?:public\s+|internal\s+|sealed\s+)*(?:class|record)\s+(\w+)(?:<[^>]+>)?(?:\s*:\s*[^{]+)?\s*\{([\s\S]*?)\n\s*\}/g;
    let match: RegExpExecArray | null;

    const conf = this.config();
    const tableNaming = conf['tableNaming'] || 'plural'; // plural | singular | exact
    const defaultSchema = conf['schema']?.trim() || '';

    while ((match = classRegex.exec(source)) !== null) {
      const rawAttrs = match[1] || '';
      const className = match[2];
      const body = match[3];

      let tableName = className;
      if (tableNaming === 'plural') {
        tableName = this.pluralize(className);
      } else if (tableNaming === 'singular') {
        tableName = className;
      }

      let schema = defaultSchema;
      const tableAttrMatch = rawAttrs.match(/Table\s*\(\s*"([^"]+)"(?:\s*,\s*Schema\s*=\s*"([^"]+)")?\s*\)/);
      if (tableAttrMatch) {
        tableName = tableAttrMatch[1];
        if (tableAttrMatch[2]) {
          schema = tableAttrMatch[2];
        }
      }

      const properties: PropertyInfo[] = [];
      const propRegex = /(?:\[([^\]]+)\]\s*)*(?:public|protected|internal)?\s*(?:virtual\s+|override\s+|required\s+)*([\w<>?,.\[\]]+)\s+(\w+)\s*\{\s*get;\s*(?:set|init)?;\s*\}(?:\s*=\s*[^;]+;)?/g;
      let propMatch: RegExpExecArray | null;

      while ((propMatch = propRegex.exec(body)) !== null) {
        const attrStr = propMatch[1] || '';
        const rawType = propMatch[2].trim();
        const propName = propMatch[3].trim();

        const attributes = attrStr ? attrStr.split(',').map(a => a.trim()) : [];
        const nullable = rawType.includes('?') || rawType.endsWith('?');
        const cleanType = rawType.replace(/\?/g, '').trim();

        // Check if collection
        const colMatch = cleanType.match(/^(?:ICollection|IList|List|HashSet|IEnumerable|ISet)<(\w+)>$/);
        const isCollection = Boolean(colMatch);
        const collectionItemType = colMatch ? colMatch[1] : undefined;

        properties.push({
          name: propName,
          type: cleanType,
          rawType,
          nullable,
          isCollection,
          collectionItemType,
          isEnum: enums.includes(cleanType),
          attributes
        });
      }

      // Detect keys
      const keys = properties.filter(p =>
        p.attributes.some(a => /Key/i.test(a)) ||
        /^id$/i.test(p.name) ||
        new RegExp(`^${className}id$`, 'i').test(p.name)
      );
      if (keys.length === 0 && properties.length > 0) {
        keys.push(properties[0]);
      }
      keys.forEach(k => k.isKey = true);

      // Detect foreign keys and navigations
      properties.forEach(p => {
        if (!p.isKey && !p.isCollection) {
          if (p.name.endsWith('Id') && p.name.length > 2) {
            const targetNavName = p.name.slice(0, -2);
            p.isForeignKey = true;
            p.foreignKeyFor = targetNavName;
          }
        }
      });

      properties.forEach(p => {
        if (!p.isKey && !p.isCollection && !p.isForeignKey) {
          const isPrimitive = /^(int|long|short|byte|guid|string|bool|datetime|datetimeoffset|dateonly|timeonly|decimal|double|float|char|byte\[\])$/i.test(p.type);
          if (!isPrimitive && !p.isEnum) {
            p.isNavigation = true;
          }
        }
      });

      const foreignKeys = properties.filter(p => p.isForeignKey);
      const navigations = properties.filter(p => p.isNavigation);
      const collections = properties.filter(p => p.isCollection);

      entities.push({
        name: className,
        tableName,
        schema,
        properties,
        keys,
        foreignKeys,
        navigations,
        collections
      });
    }

    return { entities, enums };
  }

  generate() {
    const src = this.input();
    const { entities, enums } = this.parseEntities(src);

    if (entities.length === 0) {
      this.result.set('// No C# class or record definitions found.\n// Please paste one or more C# entity classes above.');
      return;
    }

    const conf = this.config();
    const tab = this.activeTab();
    const defaultStringLength = conf['defaultStringLength'] ? Number(conf['defaultStringLength']) : 200;
    const deleteBehavior = conf['deleteBehavior'] || 'Restrict';
    const enableSoftDelete = conf['enableSoftDelete'] ?? true;
    const enablePrecision = conf['enablePrecision'] ?? true;
    const enableEnumConversion = conf['enableEnumConversion'] ?? true;

    const sections: string[] = [];

    if (tab === 'fluent' || tab === 'both') {
      const fluentOutputs = entities.map(entity => {
        const lines: string[] = [];
        lines.push(`public sealed class ${entity.name}Configuration : IEntityTypeConfiguration<${entity.name}>`);
        lines.push('{');
        lines.push(`    public void Configure(EntityTypeBuilder<${entity.name}> builder)`);
        lines.push('    {');

        // Table & Schema
        if (entity.schema) {
          lines.push(`        builder.ToTable("${entity.tableName}", "${entity.schema}");`);
        } else {
          lines.push(`        builder.ToTable("${entity.tableName}");`);
        }
        lines.push('');

        // Primary Key
        if (entity.keys.length === 1) {
          lines.push(`        // Primary Key`);
          lines.push(`        builder.HasKey(e => e.${entity.keys[0].name});`);
        } else if (entity.keys.length > 1) {
          lines.push(`        // Composite Primary Key`);
          const keyProps = entity.keys.map(k => `e.${k.name}`).join(', ');
          lines.push(`        builder.HasKey(e => new { ${keyProps} });`);
        }
        lines.push('');

        // Properties configuration
        lines.push(`        // Property Configurations`);
        entity.properties.forEach(prop => {
          if (prop.isKey || prop.isNavigation || prop.isCollection) {
            return;
          }

          const propAccess = `builder.Property(e => e.${prop.name})`;
          const chain: string[] = [];

          const typeLower = prop.type.toLowerCase();

          // String properties
          if (typeLower === 'string') {
            if (!prop.nullable) {
              chain.push('.IsRequired()');
            }
            if (defaultStringLength > 0) {
              if (/description|content|notes|body|summary|json|xml/i.test(prop.name)) {
                chain.push('.HasMaxLength(4000)');
              } else if (/email/i.test(prop.name)) {
                chain.push('.HasMaxLength(256)');
              } else if (/phone|mobile/i.test(prop.name)) {
                chain.push('.HasMaxLength(32)');
              } else if (/code|sku|slug|zip|postal/i.test(prop.name)) {
                chain.push('.HasMaxLength(50)');
              } else {
                chain.push(`.HasMaxLength(${defaultStringLength})`);
              }
            }
          } else if (typeLower === 'decimal') {
            if (enablePrecision) {
              if (/rate|percentage|discount/i.test(prop.name)) {
                chain.push('.HasPrecision(5, 4)');
              } else {
                chain.push('.HasPrecision(18, 2)');
              }
            }
            if (!prop.nullable) {
              chain.push('.IsRequired()');
            }
          } else if (typeLower === 'byte[]' && /rowversion|timestamp|version/i.test(prop.name)) {
            chain.push('.IsRowVersion()');
          } else if (prop.isEnum || enums.includes(prop.type)) {
            if (enableEnumConversion) {
              chain.push('.HasConversion<string>()');
              chain.push('.HasMaxLength(50)');
            }
            if (!prop.nullable) {
              chain.push('.IsRequired()');
            }
          } else {
            if (!prop.nullable && (typeLower === 'guid' || typeLower === 'datetime' || typeLower === 'datetimeoffset')) {
              chain.push('.IsRequired()');
            }
          }

          if (chain.length > 0) {
            lines.push(`        ${propAccess}${chain.join('')};`);
          }
        });
        lines.push('');

        // Indexes
        const indexProps = entity.properties.filter(p =>
          /email|username|normalizedname|slug|code|sku|ordernumber|invoice/i.test(p.name) &&
          !p.isKey && !p.isCollection && !p.isNavigation
        );

        if (indexProps.length > 0) {
          lines.push(`        // Indexes & Constraints`);
          indexProps.forEach(idx => {
            lines.push(`        builder.HasIndex(e => e.${idx.name})`);
            lines.push(`            .IsUnique();`);
          });
          lines.push('');
        }

        // Relationships (Navigations & Collections)
        if (entity.foreignKeys.length > 0 || entity.navigations.length > 0 || entity.collections.length > 0) {
          lines.push(`        // Relationships & Foreign Keys`);

          // Match reference navigations
          entity.navigations.forEach(nav => {
            const matchingFk = entity.foreignKeys.find(fk => fk.foreignKeyFor?.toLowerCase() === nav.name.toLowerCase());
            const fkName = matchingFk ? matchingFk.name : `${nav.name}Id`;
            const matchingEntity = entities.find(e => e.name.toLowerCase() === nav.type.toLowerCase());
            const inverseCollection = matchingEntity?.collections.find(c => c.collectionItemType?.toLowerCase() === entity.name.toLowerCase());

            if (inverseCollection) {
              lines.push(`        builder.HasOne(e => e.${nav.name})`);
              lines.push(`            .WithMany(p => p.${inverseCollection.name})`);
              lines.push(`            .HasForeignKey(e => e.${fkName})`);
              lines.push(`            .OnDelete(DeleteBehavior.${deleteBehavior});`);
            } else {
              lines.push(`        builder.HasOne(e => e.${nav.name})`);
              lines.push(`            .WithMany()`);
              lines.push(`            .HasForeignKey(e => e.${fkName})`);
              lines.push(`            .OnDelete(DeleteBehavior.${deleteBehavior});`);
            }
          });

          // Unmatched collections
          entity.collections.forEach(col => {
            const itemType = col.collectionItemType || '';
            const targetEntity = entities.find(e => e.name.toLowerCase() === itemType.toLowerCase());
            const inverseNav = targetEntity?.navigations.find(n => n.type.toLowerCase() === entity.name.toLowerCase());

            if (!inverseNav) {
              lines.push(`        builder.HasMany(e => e.${col.name})`);
              lines.push(`            .WithOne()`);
              lines.push(`            .HasForeignKey("${entity.name}Id")`);
              lines.push(`            .OnDelete(DeleteBehavior.${deleteBehavior});`);
            }
          });
          lines.push('');
        }

        // Soft delete query filter
        if (enableSoftDelete) {
          const softDeleteProp = entity.properties.find(p => /^isdeleted$/i.test(p.name) || /^isactive$/i.test(p.name));
          if (softDeleteProp) {
            lines.push(`        // Global Query Filter (Soft Delete)`);
            if (/^isdeleted$/i.test(softDeleteProp.name)) {
              lines.push(`        builder.HasQueryFilter(e => !e.${softDeleteProp.name});`);
            } else {
              lines.push(`        builder.HasQueryFilter(e => e.${softDeleteProp.name});`);
            }
            lines.push('');
          }
        }

        lines.push('    }');
        lines.push('}');
        return lines.join('\n');
      });

      sections.push(fluentOutputs.join('\n\n'));
    }

    if (tab === 'annotations' || tab === 'both') {
      const annotOutputs = entities.map(entity => {
        const lines: string[] = [];
        if (entity.schema) {
          lines.push(`[Table("${entity.tableName}", Schema = "${entity.schema}")]`);
        } else {
          lines.push(`[Table("${entity.tableName}")]`);
        }

        // Index annotations
        const indexProps = entity.properties.filter(p =>
          /email|username|slug|code|sku/i.test(p.name) && !p.isKey && !p.isCollection && !p.isNavigation
        );
        indexProps.forEach(idx => {
          lines.push(`[Index(nameof(${idx.name}), IsUnique = true)]`);
        });

        lines.push(`public class ${entity.name}`);
        lines.push('{');

        entity.properties.forEach(prop => {
          const attrs: string[] = [];
          if (prop.isKey) {
            attrs.push('[Key]');
          }
          if (prop.type.toLowerCase() === 'string') {
            if (!prop.nullable) {
              attrs.push('[Required]');
            }
            if (defaultStringLength > 0) {
              attrs.push(`[MaxLength(${defaultStringLength})]`);
            }
          }
          if (prop.type.toLowerCase() === 'decimal' && enablePrecision) {
            attrs.push('[Precision(18, 2)]');
          }
          if (prop.type.toLowerCase() === 'byte[]' && /rowversion|timestamp/i.test(prop.name)) {
            attrs.push('[Timestamp]');
          }
          if (prop.isForeignKey && prop.foreignKeyFor) {
            attrs.push(`[ForeignKey(nameof(${prop.foreignKeyFor}))]`);
          }

          attrs.forEach(a => lines.push(`    ${a}`));
          lines.push(`    public ${prop.rawType} ${prop.name} { get; set; }`);
          lines.push('');
        });

        lines.push('}');
        return lines.join('\n');
      });

      if (tab === 'both') {
        sections.push('\n/* ==========================================\n   DATA ANNOTATIONS EQUIVALENT\n   ========================================== */\n\n' + annotOutputs.join('\n\n'));
      } else {
        sections.push(annotOutputs.join('\n\n'));
      }
    }

    // Add using statements at the top
    const usings = [
      'using System;',
      'using System.Collections.Generic;',
      'using Microsoft.EntityFrameworkCore;',
      'using Microsoft.EntityFrameworkCore.Metadata.Builders;',
      tab !== 'fluent' ? 'using System.ComponentModel.DataAnnotations;\nusing System.ComponentModel.DataAnnotations.Schema;' : ''
    ].filter(Boolean).join('\n');

    this.result.set(`${usings}\n\n${sections.join('\n\n')}`);
  }
}
