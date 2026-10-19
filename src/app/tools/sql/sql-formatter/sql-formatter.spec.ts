import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SqlFormatter } from './sql-formatter';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('SqlFormatter', () => {
  let component: SqlFormatter;
  let fixture: ComponentFixture<SqlFormatter>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlFormatter],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    await instanceService.ready;
    const instance = instanceService.open('sql-formatter');
    fixture = TestBed.createComponent(SqlFormatter);
    component = fixture.componentInstance;
    component.instanceId = instance.id;
    fixture.detectChanges();
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

  it('restores the saved query and mode for its instance', () => {
    instanceService.updateState(component.instanceId, {
      input: { document: 'select id from saved_users;' },
      output: { document: '' },
      options: { ...component.options(), mode: 'compact' },
    });
    component.ngOnInit();

    expect(component.input()).toBe('select id from saved_users;');
    expect(component.mode()).toBe('compact');
    expect(component.result()).toContain('FROM saved_users');
  });

  it('persists editor input and selected mode to its instance state', () => {
    component.onInputChange('select id from current_users;');
    component.setMode('minified');

    expect(instanceService.getState(component.instanceId)).toEqual({
      input: { document: 'select id from current_users;' },
      output: { document: 'select id from current_users;' },
      options: { ...component.options(), mode: 'minified' },
    });
  });

  it('should automatically re-format when options change in InstanceService', async () => {
    component.input.set('select id from users;');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.result()).toContain('SELECT');

    instanceService.updateState(component.instanceId, {
      options: { ...component.options(), keywordCase: 'lower' },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.result()).toContain('select');
  });
});
