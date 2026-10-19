import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SqlToCsharp } from './sql-to-csharp';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';

describe('SqlToCsharp', () => {
  let component: SqlToCsharp;
  let fixture: ComponentFixture<SqlToCsharp>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlToCsharp],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    await instanceService.ready;
    const instance = instanceService.open('sql-to-csharp');
    fixture = TestBed.createComponent(SqlToCsharp);
    component = fixture.componentInstance;
    component.instanceId = instance.id;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should initialize and auto-convert default input to C# POCO class', () => {
    expect(component).toBeTruthy();
    expect(component.result()).toContain('public class Users');
    expect(component.result()).toContain('public int Id { get; set; }');
    expect(component.result()).toContain('public decimal Balance { get; set; }');
  });

  it('should reactively update when outputType option changes to record', async () => {
    new ToolState(instanceService, component.instanceId).updateOptions({ outputType: 'record' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.result()).toContain('public record Users(');
    expect(component.result()).toContain('int Id');
  });

  it('should reactively update when outputType option changes to ef', async () => {
    new ToolState(instanceService, component.instanceId).updateOptions({ outputType: 'ef' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.result()).toContain('[Table("Users")]');
    expect(component.result()).toContain('[Key]');
    expect(component.result()).toContain('public class Users');
  });

  it('should handle invalid input gracefully with an error message', async () => {
    component.input.set('SELECT * FROM');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.errorMessage()).toBeTruthy();
    expect(component.result()).toContain('// Error:');
  });
});
