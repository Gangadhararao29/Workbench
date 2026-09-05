import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SqlFormatter } from './sql-formatter';

describe('SqlFormatter', () => {
  let component: SqlFormatter;
  let fixture: ComponentFixture<SqlFormatter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlFormatter],
    }).compileComponents();

    fixture = TestBed.createComponent(SqlFormatter);
    component = fixture.componentInstance;
    component.instanceId = 'test-instance';
    await fixture.whenStable();
  });

  it('should create and format query as pretty by default', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('pretty');
    expect(component.result()).toContain('SELECT');
  });

  it('should support compact mode placing major clauses on separate lines with inline columns', () => {
    component.input.set(
      "select id, name, email from users left join orders on orders.user_id = users.id where active = 1 and role = 'admin' order by name;",
    );
    component.compact();
    expect(component.mode()).toBe('compact');
    const result = component.result();
    expect(result).toContain('SELECT id, name, email');
    expect(result).toContain('FROM users');
    expect(result).toContain('LEFT JOIN orders ON orders.user_id = users.id');
    expect(result).toContain("WHERE active = 1 AND role = 'admin'");
    expect(result).toContain('ORDER BY name;');
  });

  it('should support minified mode producing single-line SQL', () => {
    component.input.set('SELECT id,\n  name,\n  email\nFROM users\nWHERE active = 1;');
    component.minify();
    expect(component.mode()).toBe('minified');
    expect(component.result()).toBe('SELECT id, name, email FROM users WHERE active = 1;');
  });
});
