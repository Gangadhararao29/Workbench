import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SqlQueryBuilder } from './sql-query-builder';

describe('SqlQueryBuilder', () => {
  let component: SqlQueryBuilder;
  let fixture: ComponentFixture<SqlQueryBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlQueryBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(SqlQueryBuilder);
    component = fixture.componentInstance;
    component.instanceId = 'test-instance';
    await fixture.whenStable();
  });

  it('should create and generate standard SELECT query by default', () => {
    expect(component).toBeTruthy();
    const sql = component.generatedSql();
    expect(sql).toContain('SELECT');
    expect(sql).toContain('FROM users');
  });

  it('should reactively update when adding and modifying joins and wheres', () => {
    component.tableName.set('users u');
    component.addJoin();
    component.updateJoin(0, 'table', 'orders o');
    component.updateJoin(0, 'condition', 'o.user_id = u.id');

    component.addWhere();
    component.updateWhere(0, 'column', 'status');
    component.updateWhere(0, 'operator', '=');
    component.updateWhere(0, 'value', 'active');

    const sql = component.generatedSql();
    expect(sql).toContain('JOIN orders o ON o.user_id = u.id');
    expect(sql).toContain("WHERE status = 'active'");
  });

  it('should support INSERT query with column-value pairs', () => {
    component.setQueryType('insert');
    component.tableName.set('products');
    component.dataPairs.set([
      { column: 'title', value: 'Laptop' },
      { column: 'price', value: '999.99' },
      { column: 'in_stock', value: 'true' }
    ]);

    const sql = component.generatedSql();
    expect(sql).toContain('INSERT INTO products (title, price, in_stock)');
    expect(sql).toContain("VALUES ('Laptop', 999.99, true)");
  });

  it('should support UPDATE query with where conditions', () => {
    component.setQueryType('update');
    component.tableName.set('users');
    component.dataPairs.set([{ column: 'status', value: 'inactive' }]);
    component.wheres.set([{ conjunction: 'AND', column: 'id', operator: '=', value: '42' }]);

    const sql = component.generatedSql();
    expect(sql).toContain('UPDATE users');
    expect(sql).toContain("SET status = 'inactive'");
    expect(sql).toContain('WHERE id = 42');
    expect(component.isUnsafeQuery()).toBeFalse();
  });

  it('should warn if UPDATE or DELETE has no WHERE clause', () => {
    component.setQueryType('delete');
    component.wheres.set([]);
    expect(component.isUnsafeQuery()).toBeTrue();
  });

  it('should format dialect specific pagination for T-SQL', () => {
    component.setDialect('tsql');
    component.limit.set('10');
    component.offset.set('20');
    const sql = component.generatedSql();
    expect(sql).toContain('OFFSET 20 ROWS');
    expect(sql).toContain('FETCH NEXT 10 ROWS ONLY');
  });
});
