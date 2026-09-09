import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolPage } from './tool-page';
import { InstanceService } from '../core/tool/tool-instance';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

describe('ToolPage', () => {
  let component: ToolPage;
  let fixture: ComponentFixture<ToolPage>;
  let instanceService: InstanceService;
  let router: Router;

  beforeEach(async () => {
    try { window?.localStorage?.clear(); } catch {}

    await TestBed.configureTestingModule({
      imports: [ToolPage],
      providers: [
        InstanceService,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ toolType: 'json-formatter' }))
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
            url: '/tools/json-formatter'
          }
        }
      ]
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ToolPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and auto-open the first instance for the toolType', () => {
    expect(component).toBeTruthy();
    expect(component.scopedInstances()).toHaveLength(1);
    expect(component.selectedInstance()?.toolType).toBe('json-formatter');
    expect(instanceService.activeInstance()?.toolType).toBe('json-formatter');
  });

  it('should filter instances scoped only to this tool', () => {
    instanceService.open('sql-formatter', 'sql');

    expect(instanceService.instances()).toHaveLength(2);
    expect(component.scopedInstances()).toHaveLength(1);
    expect(component.scopedInstances()[0].toolType).toBe('json-formatter');
  });

  it('should add a new instance for this tool when addInstance is called', () => {
    component.addInstance();
    fixture.detectChanges();

    expect(component.scopedInstances()).toHaveLength(2);
    expect(component.selectedInstance()?.label).toContain('Formatter 2');
  });

  it('should clone the current instance with identical config', () => {
    const active = component.selectedInstance()!;
    instanceService.updateConfig(active.id, { indent: '4 spaces', sortKeys: true });

    component.cloneInstance();
    fixture.detectChanges();

    expect(component.scopedInstances()).toHaveLength(2);
    const cloned = component.selectedInstance()!;
    expect(cloned.id).not.toBe(active.id);
    expect(cloned.config).toEqual({ indent: '4 spaces', sortKeys: true });
  });

  it('should switch selected instance when selectInstance is called', () => {
    component.addInstance();
    const instances = component.scopedInstances();
    const firstId = instances[0].id;
    const secondId = instances[1].id;

    component.selectInstance(firstId);
    expect(component.selectedInstance()?.id).toBe(firstId);

    component.selectInstance(secondId);
    expect(component.selectedInstance()?.id).toBe(secondId);
  });

  it('should navigate to / when the last instance is closed', () => {
    const inst = component.selectedInstance()!;
    const mockEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;

    component.closeInstance(inst.id, mockEvent);

    expect(instanceService.instances()).toHaveLength(0);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
