import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EfMigrations } from './ef-migrations';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('EfMigrations', () => {
  let component: EfMigrations;
  let fixture: ComponentFixture<EfMigrations>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfMigrations],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    await instanceService.ready;
    const instance = instanceService.open('ef-migrations');
    fixture = TestBed.createComponent(EfMigrations);
    component = fixture.componentInstance;
    component.instanceId = instance.id;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and generate add migration command on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('dotnet ef migrations add AddCustomerAddressAndIndexes');
    expect(component.result()).toContain('-p "src/Infrastructure"');
    expect(component.result()).toContain('-s "src/WebApi"');
  });

  it('renders generated commands as plain text without the resizable code editor', () => {
    component.result.set('# Add a new migration\n\ndotnet ef migrations add Initial');
    fixture.detectChanges();

    const output = fixture.nativeElement.querySelector('.command-output') as HTMLElement;
    expect(output.textContent).toContain('dotnet ef migrations add Initial');
    expect(fixture.nativeElement.querySelector('app-code-editor')).toBeNull();
    expect(output.querySelector('.command-comment')?.textContent?.trim()).toContain('# Add a new migration');
    expect(output.querySelector('.command-executable')?.textContent?.trim()).toContain(
      'dotnet ef migrations add Initial',
    );
  });

  it('should generate dotnet ef database update and script commands with proper ranges', () => {
    component.setAction('update');
    component.targetMigration = '20260901_Initial';
    component.generate();
    expect(component.result()).toContain('dotnet ef database update 20260901_Initial');

    component.setAction('script');
    component.fromMigration = '';
    component.toMigration = 'AddOrders';
    component.generate();
    expect(component.result()).toContain('dotnet ef migrations script 0 AddOrders');

    component.fromMigration = 'Initial';
    component.toMigration = 'AddOrders';
    component.generate();
    expect(component.result()).toContain('dotnet ef migrations script Initial AddOrders');
  });

  it('should switch to PMC mode and generate PowerShell cmdlet syntax', () => {
    component.setMode('pmc');
    component.setAction('add');
    expect(component.result()).toContain('Add-Migration AddCustomerAddressAndIndexes');
    expect(component.result()).toContain('-Project "src/Infrastructure"');

    component.setAction('update');
    component.targetMigration = 'TargetStep';
    component.generate();
    expect(component.result()).toContain('Update-Database -TargetMigration "TargetStep"');

    component.setAction('scaffold');
    component.force = true;
    component.generate();
    expect(component.result()).toContain('Scaffold-DbContext');
    expect(component.result()).toContain('-Force');
  });

  it('should sync project options with ToolState', () => {
    component.ngOnInit();
    component.project = 'src/Data';
    component.startupProject = 'src/Api';
    component.contextName = 'MainDbContext';
    component.syncOptions();

    expect(instanceService.getState(component.instanceId)?.options).toMatchObject({
      project: 'src/Data',
      startupProject: 'src/Api',
      contextName: 'MainDbContext',
      provider: component.provider,
    });
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
