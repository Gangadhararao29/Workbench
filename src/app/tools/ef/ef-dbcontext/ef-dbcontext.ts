import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-ef-dbcontext',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatSlideToggleModule,
    CodeEditor
  ],
  templateUrl: './ef-dbcontext.html',
  styleUrls: ['./ef-dbcontext.css']
})
export class EfDbContext implements OnInit {
  @Input({ required: true }) instanceId!: string;

  contextName = 'AppDbContext';
  namespace = 'MyApp.Infrastructure.Data';
  entitiesText = 'Customer\nOrder\nProduct\nCategory\nOrderItem\nUser\nRole';
  provider = 'SqlServer'; // SqlServer | PostgreSql | MySql | Sqlite

  // Features
  useAssemblyConfigurations = true;
  includeAuditInterceptor = true;
  includeSoftDeleteFilter = true;
  includeDiExtension = true;
  includeDesignTimeFactory = true;
  useDbContextPool = true;

  result = signal('');

  constructor(private instanceService: InstanceService) {
    effect(() => {
      this.config();
      this.generate();
    });
  }

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  ngOnInit() {
    const conf = this.config();
    if (conf['contextName']) this.contextName = conf['contextName'];
    if (conf['namespace']) this.namespace = conf['namespace'];
    if (conf['provider']) this.provider = conf['provider'];

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

  private parseEntityNames(): string[] {
    const text = this.entitiesText.trim();
    if (!text) return ['Customer', 'Order', 'Product'];

    // Try extracting class names if user pasted C# source code
    const classMatches = [...text.matchAll(/(?:class|record)\s+(\w+)/g)].map(m => m[1]);
    if (classMatches.length > 0) {
      return [...new Set(classMatches)];
    }

    return text
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && /^[a-zA-Z_]\w*$/.test(s));
  }

  generate() {
    const name = this.contextName.trim() || 'AppDbContext';
    const ns = this.namespace.trim() || 'MyApp.Infrastructure.Data';
    const entities = this.parseEntityNames();

    const lines: string[] = [];

    // Usings
    lines.push('using System;');
    lines.push('using System.Linq;');
    lines.push('using System.Linq.Expressions;');
    lines.push('using System.Reflection;');
    lines.push('using System.Threading;');
    lines.push('using System.Threading.Tasks;');
    lines.push('using Microsoft.EntityFrameworkCore;');
    if (this.includeDesignTimeFactory) {
      lines.push('using Microsoft.EntityFrameworkCore.Design;');
      lines.push('using Microsoft.Extensions.Configuration;');
    }
    if (this.includeDiExtension) {
      lines.push('using Microsoft.Extensions.DependencyInjection;');
    }
    lines.push('');
    lines.push(`namespace ${ns};`);
    lines.push('');

    // Interface markers for clean architecture
    if (this.includeAuditInterceptor || this.includeSoftDeleteFilter) {
      lines.push('// --- Common Domain Contract Markers ---');
      if (this.includeAuditInterceptor) {
        lines.push('public interface IAuditableEntity');
        lines.push('{');
        lines.push('    DateTime CreatedAtUtc { get; set; }');
        lines.push('    string? CreatedBy { get; set; }');
        lines.push('    DateTime? UpdatedAtUtc { get; set; }');
        lines.push('    string? UpdatedBy { get; set; }');
        lines.push('}');
        lines.push('');
      }
      if (this.includeSoftDeleteFilter) {
        lines.push('public interface ISoftDeletable');
        lines.push('{');
        lines.push('    bool IsDeleted { get; set; }');
        lines.push('    DateTime? DeletedAtUtc { get; set; }');
        lines.push('}');
        lines.push('');
      }
    }

    // DbContext Class Definition
    lines.push(`public class ${name} : DbContext`);
    lines.push('{');
    lines.push(`    public ${name}(DbContextOptions<${name}> options) : base(options)`);
    lines.push('    {');
    lines.push('    }');
    lines.push('');

    // DbSets
    lines.push('    // --- Entity Sets ---');
    entities.forEach(ent => {
      lines.push(`    public DbSet<${ent}> ${this.pluralize(ent)} => Set<${ent}>();`);
    });
    lines.push('');

    // OnModelCreating
    lines.push('    protected override void OnModelCreating(ModelBuilder modelBuilder)');
    lines.push('    {');
    lines.push('        base.OnModelCreating(modelBuilder);');
    lines.push('');

    if (this.useAssemblyConfigurations) {
      lines.push('        // Auto-discover and apply all IEntityTypeConfiguration<T> classes in this assembly');
      lines.push('        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());');
    } else {
      entities.forEach(ent => {
        lines.push(`        modelBuilder.ApplyConfiguration(new ${ent}Configuration());`);
      });
    }

    if (this.includeSoftDeleteFilter) {
      lines.push('');
      lines.push('        // Apply Global Soft Delete Query Filter dynamically for all ISoftDeletable entities');
      lines.push('        foreach (var entityType in modelBuilder.Model.GetEntityTypes())');
      lines.push('        {');
      lines.push('            if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))');
      lines.push('            {');
      lines.push('                var parameter = Expression.Parameter(entityType.ClrType, "e");');
      lines.push('                var property = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));');
      lines.push('                var filter = Expression.Lambda(Expression.Not(property), parameter);');
      lines.push('                entityType.SetQueryFilter(filter);');
      lines.push('            }');
      lines.push('        }');
    }

    lines.push('    }');
    lines.push('');

    // SaveChangesAsync Override with Audit / Soft Delete stamping
    if (this.includeAuditInterceptor || this.includeSoftDeleteFilter) {
      lines.push('    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)');
      lines.push('    {');
      lines.push('        var now = DateTime.UtcNow;');
      lines.push('');

      if (this.includeAuditInterceptor) {
        lines.push('        // Automatic Audit Stamping');
        lines.push('        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())');
        lines.push('        {');
        lines.push('            if (entry.State == EntityState.Added)');
        lines.push('            {');
        lines.push('                entry.Entity.CreatedAtUtc = now;');
        lines.push('            }');
        lines.push('            else if (entry.State == EntityState.Modified)');
        lines.push('            {');
        lines.push('                entry.Entity.UpdatedAtUtc = now;');
        lines.push('            }');
        lines.push('        }');
        lines.push('');
      }

      if (this.includeSoftDeleteFilter) {
        lines.push('        // Convert Hard Deletes to Soft Deletes');
        lines.push('        foreach (var entry in ChangeTracker.Entries<ISoftDeletable>())');
        lines.push('        {');
        lines.push('            if (entry.State == EntityState.Deleted)');
        lines.push('            {');
        lines.push('                entry.State = EntityState.Modified;');
        lines.push('                entry.Entity.IsDeleted = true;');
        lines.push('                entry.Entity.DeletedAtUtc = now;');
        lines.push('            }');
        lines.push('        }');
        lines.push('');
      }

      lines.push('        return await base.SaveChangesAsync(cancellationToken);');
      lines.push('    }');
    }

    lines.push('}');

    // DI Service Collection Registration Extension
    if (this.includeDiExtension) {
      lines.push('');
      lines.push('// --- Dependency Injection Extension ---');
      lines.push('public static class ServiceCollectionExtensions');
      lines.push('{');
      lines.push(`    public static IServiceCollection AddDatabaseContext(this IServiceCollection services, string connectionString)`);
      lines.push('    {');

      const dbMethod = this.useDbContextPool ? 'AddDbContextPool' : 'AddDbContext';

      if (this.provider === 'SqlServer') {
        lines.push(`        services.${dbMethod}<${name}>(options =>`);
        lines.push(`            options.UseSqlServer(connectionString, sql =>`);
        lines.push(`                sql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null)));`);
      } else if (this.provider === 'PostgreSql') {
        lines.push(`        services.${dbMethod}<${name}>(options =>`);
        lines.push(`            options.UseNpgsql(connectionString, npgsql =>`);
        lines.push(`                npgsql.EnableRetryOnFailure(maxRetryCount: 3)));`);
      } else if (this.provider === 'MySql') {
        lines.push(`        services.${dbMethod}<${name}>(options =>`);
        lines.push(`            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));`);
      } else {
        lines.push(`        services.${dbMethod}<${name}>(options =>`);
        lines.push(`            options.UseSqlite(connectionString));`);
      }

      lines.push('        return services;');
      lines.push('    }');
      lines.push('}');
    }

    // DesignTimeDbContextFactory
    if (this.includeDesignTimeFactory) {
      lines.push('');
      lines.push('// --- Design-Time Factory for EF Core CLI Migrations ---');
      lines.push(`public class ${name}Factory : IDesignTimeDbContextFactory<${name}>`);
      lines.push('{');
      lines.push(`    public ${name} CreateDbContext(string[] args)`);
      lines.push('    {');
      lines.push(`        var optionsBuilder = new DbContextOptionsBuilder<${name}>();`);

      if (this.provider === 'SqlServer') {
        lines.push(`        optionsBuilder.UseSqlServer("Server=localhost;Database=AppDb;Trusted_Connection=True;TrustServerCertificate=True;");`);
      } else if (this.provider === 'PostgreSql') {
        lines.push(`        optionsBuilder.UseNpgsql("Host=localhost;Database=AppDb;Username=postgres;Password=postgres;");`);
      } else if (this.provider === 'MySql') {
        lines.push(`        optionsBuilder.UseMySql("Server=localhost;Database=AppDb;Uid=root;Pwd=root;", ServerVersion.AutoDetect("Server=localhost;Database=AppDb;Uid=root;Pwd=root;"));`);
      } else {
        lines.push(`        optionsBuilder.UseSqlite("Data Source=app.db");`);
      }

      lines.push(`        return new ${name}(optionsBuilder.Options);`);
      lines.push('    }');
      lines.push('}');
    }

    this.result.set(lines.join('\n'));
  }
}
