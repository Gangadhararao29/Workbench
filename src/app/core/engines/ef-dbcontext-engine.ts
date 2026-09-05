import { pluralize } from './code-naming';

export type DatabaseProvider = 'SqlServer' | 'PostgreSql' | 'MySql' | 'Sqlite';

export interface EfDbContextOptions {
  contextName?: string;
  namespace?: string;
  provider?: DatabaseProvider;
  useDbContextPool?: boolean;
  useAssemblyConfigurations?: boolean;
  includeAuditInterceptor?: boolean;
  includeSoftDeleteFilter?: boolean;
  includeDiExtension?: boolean;
  includeDesignTimeFactory?: boolean;
}

export function parseEntityNames(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return ['Customer', 'Order', 'Product'];

  // Try extracting class names if user pasted C# source code
  const classMatches = [...trimmed.matchAll(/(?:class|record)\s+(\w+)/g)].map((m) => m[1]);
  if (classMatches.length > 0) {
    return [...new Set(classMatches)];
  }

  return trimmed
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^[a-zA-Z_]\w*$/.test(s));
}

export function generateEfDbContext(
  entitiesText: string,
  options: EfDbContextOptions = {},
): string {
  const name = options.contextName?.trim() || 'AppDbContext';
  const ns = options.namespace?.trim() || 'MyApp.Infrastructure.Data';
  const provider = options.provider || 'SqlServer';
  const entities = parseEntityNames(entitiesText);

  const useDbContextPool = options.useDbContextPool ?? true;
  const useAssemblyConfigurations = options.useAssemblyConfigurations ?? true;
  const includeAuditInterceptor = options.includeAuditInterceptor ?? true;
  const includeSoftDeleteFilter = options.includeSoftDeleteFilter ?? true;
  const includeDiExtension = options.includeDiExtension ?? true;
  const includeDesignTimeFactory = options.includeDesignTimeFactory ?? true;

  const lines: string[] = [];

  // Usings
  lines.push('using System;');
  lines.push('using System.Linq;');
  lines.push('using System.Linq.Expressions;');
  lines.push('using System.Reflection;');
  lines.push('using System.Threading;');
  lines.push('using System.Threading.Tasks;');
  lines.push('using Microsoft.EntityFrameworkCore;');
  if (includeDesignTimeFactory) {
    lines.push('using Microsoft.EntityFrameworkCore.Design;');
    lines.push('using Microsoft.Extensions.Configuration;');
  }
  if (includeDiExtension) {
    lines.push('using Microsoft.Extensions.DependencyInjection;');
  }
  lines.push('');
  lines.push(`namespace ${ns};`);
  lines.push('');

  // Interface markers for clean architecture
  if (includeAuditInterceptor || includeSoftDeleteFilter) {
    lines.push('// --- Common Domain Contract Markers ---');
    if (includeAuditInterceptor) {
      lines.push('public interface IAuditableEntity');
      lines.push('{');
      lines.push('    DateTime CreatedAtUtc { get; set; }');
      lines.push('    string? CreatedBy { get; set; }');
      lines.push('    DateTime? UpdatedAtUtc { get; set; }');
      lines.push('    string? UpdatedBy { get; set; }');
      lines.push('}');
      lines.push('');
    }
    if (includeSoftDeleteFilter) {
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
  entities.forEach((ent) => {
    lines.push(`    public DbSet<${ent}> ${pluralize(ent)} => Set<${ent}>();`);
  });
  lines.push('');

  // OnModelCreating
  lines.push('    protected override void OnModelCreating(ModelBuilder modelBuilder)');
  lines.push('    {');
  lines.push('        base.OnModelCreating(modelBuilder);');
  lines.push('');

  if (useAssemblyConfigurations) {
    lines.push('        // Auto-discover and apply all IEntityTypeConfiguration<T> classes in this assembly');
    lines.push('        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());');
  } else {
    entities.forEach((ent) => {
      lines.push(`        modelBuilder.ApplyConfiguration(new ${ent}Configuration());`);
    });
  }

  if (includeSoftDeleteFilter) {
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
  if (includeAuditInterceptor || includeSoftDeleteFilter) {
    lines.push('    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)');
    lines.push('    {');
    lines.push('        var now = DateTime.UtcNow;');
    lines.push('');

    if (includeAuditInterceptor) {
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

    if (includeSoftDeleteFilter) {
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
  if (includeDiExtension) {
    lines.push('');
    lines.push('// --- Dependency Injection Extension ---');
    lines.push('public static class ServiceCollectionExtensions');
    lines.push('{');
    lines.push(`    public static IServiceCollection AddDatabaseContext(this IServiceCollection services, string connectionString)`);
    lines.push('    {');

    const dbMethod = useDbContextPool ? 'AddDbContextPool' : 'AddDbContext';

    if (provider === 'SqlServer') {
      lines.push(`        services.${dbMethod}<${name}>(options =>`);
      lines.push(`            options.UseSqlServer(connectionString, sql =>`);
      lines.push(`                sql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null)));`);
    } else if (provider === 'PostgreSql') {
      lines.push(`        services.${dbMethod}<${name}>(options =>`);
      lines.push(`            options.UseNpgsql(connectionString, npgsql =>`);
      lines.push(`                npgsql.EnableRetryOnFailure(maxRetryCount: 3)));`);
    } else if (provider === 'MySql') {
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
  if (includeDesignTimeFactory) {
    lines.push('');
    lines.push('// --- Design-Time Factory for EF Core CLI Migrations ---');
    lines.push(`public class ${name}Factory : IDesignTimeDbContextFactory<${name}>`);
    lines.push('{');
    lines.push(`    public ${name} CreateDbContext(string[] args)`);
    lines.push('    {');
    lines.push(`        var optionsBuilder = new DbContextOptionsBuilder<${name}>();`);

    if (provider === 'SqlServer') {
      lines.push(`        optionsBuilder.UseSqlServer("Server=localhost;Database=AppDb;Trusted_Connection=True;TrustServerCertificate=True;");`);
    } else if (provider === 'PostgreSql') {
      lines.push(`        optionsBuilder.UseNpgsql("Host=localhost;Database=AppDb;Username=postgres;Password=postgres;");`);
    } else if (provider === 'MySql') {
      lines.push(`        optionsBuilder.UseMySql("Server=localhost;Database=AppDb;Uid=root;Pwd=root;", ServerVersion.AutoDetect("Server=localhost;Database=AppDb;Uid=root;Pwd=root;"));`);
    } else {
      lines.push(`        optionsBuilder.UseSqlite("Data Source=app.db");`);
    }

    lines.push(`        return new ${name}(optionsBuilder.Options);`);
    lines.push('    }');
    lines.push('}');
  }

  return lines.join('\n');
}
