import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EfConfiguration } from './ef-configuration';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('EfConfiguration', () => {
  let component: EfConfiguration;
  let fixture: ComponentFixture<EfConfiguration>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfConfiguration],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(EfConfiguration);
    component = fixture.componentInstance;
    component.instanceId = 'test-ef-configuration';
    await fixture.whenStable();
  });

  it('should create and generate default fluent configuration on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>');
    expect(component.result()).toContain('builder.ToTable("Customers");');
    expect(component.result()).toContain('builder.HasKey(e => e.Id);');
  });

  it('should switch output tabs between fluent, annotations, and both', () => {
    component.setTab('annotations');
    expect(component.activeTab()).toBe('annotations');
    expect(component.result()).toContain('[Table("Customers")]');
    expect(component.result()).toContain('[Key]');

    component.setTab('both');
    expect(component.activeTab()).toBe('both');
    expect(component.result()).toContain('IEntityTypeConfiguration<Customer>');
    expect(component.result()).toContain('[Table("Customers")]');

    component.setTab('fluent');
    expect(component.activeTab()).toBe('fluent');
    expect(component.result()).toContain('builder.ToTable("Customers");');
  });

  it('should load customer, blog, and simple presets correctly', () => {
    component.loadPreset('blog');
    expect(component.input()).toContain('public class Blog');
    expect(component.result()).toContain('BlogConfiguration');

    component.loadPreset('simple');
    expect(component.input()).toContain('public class Product');
    expect(component.result()).toContain('ProductConfiguration');

    component.loadPreset('customer');
    expect(component.input()).toContain('public class Customer');
    expect(component.result()).toContain('CustomerConfiguration');
  });

  it('should regenerate when onInputChange is called', () => {
    component.onInputChange(`public class OrderItem\n{\n    public int Id { get; set; }\n    public decimal UnitPrice { get; set; }\n}`);
    expect(component.result()).toContain('OrderItemConfiguration');
    expect(component.result()).toContain('builder.HasKey(e => e.Id);');
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
