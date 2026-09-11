import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EfDbContext } from './ef-dbcontext';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('EfDbContext', () => {
  let component: EfDbContext;
  let fixture: ComponentFixture<EfDbContext>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfDbContext],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(EfDbContext);
    component = fixture.componentInstance;
    component.instanceId = 'test-ef-dbcontext';
    await fixture.whenStable();
  });

  it('should create and generate default DbContext on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('public class AppDbContext : DbContext');
    expect(component.result()).toContain('public DbSet<Customer> Customers => Set<Customer>();');
    expect(component.result()).toContain('namespace MyApp.Infrastructure.Data;');
    expect(component.result()).toContain('options.UseSqlServer(');
  });

  it('should update generated DbContext when options change', () => {
    component.contextName = 'CatalogDbContext';
    component.namespace = 'MyStore.Data';
    component.provider = 'PostgreSql';
    component.entitiesText = 'Category\nProduct';
    component.generate();

    expect(component.result()).toContain('public class CatalogDbContext : DbContext');
    expect(component.result()).toContain('namespace MyStore.Data;');
    expect(component.result()).toContain('public DbSet<Category> Categories => Set<Category>();');
    expect(component.result()).toContain('public DbSet<Product> Products => Set<Product>();');
    expect(component.result()).toContain('options.UseNpgsql(');
  });

  it('should toggle architecture features cleanly', () => {
    component.includeDesignTimeFactory = false;
    component.includeDiExtension = false;
    component.generate();

    expect(component.result()).not.toContain('IDesignTimeDbContextFactory');
    expect(component.result()).not.toContain('public static class ServiceCollectionExtensions');

    component.includeDesignTimeFactory = true;
    component.includeDiExtension = true;
    component.generate();

    expect(component.result()).toContain('IDesignTimeDbContextFactory');
    expect(component.result()).toContain('public static class ServiceCollectionExtensions');
  });

  it('should sync changes to instance service when onParamChange is invoked', () => {
    const updateSpy = vi.spyOn(instanceService, 'updateConfig');
    component.contextName = 'StoreDbContext';
    component.namespace = 'Store.Infrastructure';
    component.provider = 'Sqlite';
    component.onParamChange();

    expect(updateSpy).toHaveBeenCalledWith('test-ef-dbcontext', {
      contextName: 'StoreDbContext',
      namespace: 'Store.Infrastructure',
      provider: 'Sqlite',
    });
    expect(component.result()).toContain('public class StoreDbContext : DbContext');
    expect(component.result()).toContain('options.UseSqlite(');
  });

  it('should copy result to clipboard', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    component.copyResult();
    expect(writeTextSpy).toHaveBeenCalledWith(component.result());
  });
});
