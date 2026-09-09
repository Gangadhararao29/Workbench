import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EfLinq } from './ef-linq';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('EfLinq', () => {
  let component: EfLinq;
  let fixture: ComponentFixture<EfLinq>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfLinq],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(EfLinq);
    component = fixture.componentInstance;
    component.instanceId = 'test-ef-linq';
    await fixture.whenStable();
  });

  it('should create and generate eager loading pattern on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('.Include(c => c.Orders');
    expect(component.result()).toContain('ToListAsync');
  });

  it('should switch between patterns correctly', () => {
    component.setPattern('split-query');
    expect(component.result()).toContain('.AsSplitQuery()');
    expect(component.result()).toContain('.Include(c => c.Addresses)');

    component.setPattern('batch-operations');
    expect(component.result()).toContain('ExecuteUpdateAsync');
    expect(component.result()).toContain('ExecuteDeleteAsync');

    component.setPattern('pagination');
    expect(component.result()).toContain('.Skip((page - 1) * pageSize)');
    expect(component.result()).toContain('.Take(pageSize)');

    component.setPattern('groupby');
    expect(component.result()).toContain('.GroupBy(c => c.Status)');
    expect(component.result()).toContain('.Where(g => g.Count() > 10)');

    component.setPattern('raw-sql');
    expect(component.result()).toContain('FromSqlInterpolated');
    expect(component.result()).toContain('SqlQuery<CustomerSummaryDto>');

    component.setPattern('soft-delete');
    expect(component.result()).toContain('.IgnoreQueryFilters()');

    component.setPattern('explicit-loading');
    expect(component.result()).toContain('.Collection(c => c.Orders)');
  });

  it('should support Query comprehension syntax across patterns', () => {
    component.setPattern('eager-loading');
    component.setSyntax('query');
    expect(component.result()).toContain('from c in context.Customers');

    component.setPattern('groupby');
    component.setSyntax('query');
    expect(component.result()).toContain('from c in context.Customers');
    expect(component.result()).toContain('group c by c.Status into g');

    component.setPattern('pagination');
    component.setSyntax('query');
    expect(component.result()).toContain('from c in context.Customers');
    expect(component.result()).toContain('from c in baseQuery');
  });

  it('should wrap queries in a compilable handler class matching context variable scoping', () => {
    component.wrapInHandler = true;
    component.contextVar = 'context';
    component.entityName = 'Customer';
    component.generate();

    const res = component.result();
    expect(res).toContain('public class GetCustomerQueryHandler');
    expect(res).toContain('private readonly AppDbContext _context;');
    expect(res).toContain('public GetCustomerQueryHandler(AppDbContext context)');
    expect(res).toContain('_context = context;');
    expect(res).toContain('_context.Customers');
  });

  it('should filter cards in cheatsheet mode', () => {
    component.setViewMode('cheatsheet');
    expect(component.viewMode()).toBe('cheatsheet');

    component.searchFilter.set('join');
    const filtered = component.filteredCards();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(c =>
      c.title.toLowerCase().includes('join') ||
      c.category.toLowerCase().includes('join') ||
      c.sql.toLowerCase().includes('join') ||
      c.notes.toLowerCase().includes('join')
    )).toBe(true);
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
