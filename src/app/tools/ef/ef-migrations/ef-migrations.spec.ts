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
    fixture = TestBed.createComponent(EfMigrations);
    component = fixture.componentInstance;
    component.instanceId = 'test-ef-migrations';
    await fixture.whenStable();
  });

  it('should create and generate add migration command on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('dotnet ef migrations add AddCustomerAddressAndIndexes');
    expect(component.result()).toContain('-p "src/Infrastructure"');
    expect(component.result()).toContain('-s "src/WebApi"');
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

  it('should generate custom C# migration with stable class name and data seeding', () => {
    component.migrationName = 'SeedInitialRoles';
    component.setAction('custom-cs');
    component.customSnippetType = 'seed';
    component.customTable = 'Roles';
    component.customColumn = 'Name';
    component.generate();

    const code = component.result();
    expect(code).toContain('public partial class SeedInitialRoles : Migration');
    expect(code).toContain('migrationBuilder.InsertData(');
    expect(code).toContain('table: "Roles"');
    expect(code).toContain('migrationBuilder.DeleteData(');
  });

  it('should sync project configuration changes with instanceService', () => {
    const updateSpy = vi.spyOn(instanceService, 'updateConfig');
    component.project = 'src/Data';
    component.startupProject = 'src/Api';
    component.contextName = 'MainDbContext';
    component.syncConfig();

    expect(updateSpy).toHaveBeenCalledWith('test-ef-migrations', {
      project: 'src/Data',
      startupProject: 'src/Api',
      contextName: 'MainDbContext',
      provider: component.provider,
      connectionString: component.connectionString,
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
