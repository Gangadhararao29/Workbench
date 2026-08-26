import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { Router } from '@angular/router';
import { InstanceService } from './core/instance-service';
import { ShellStateService } from './core/shell-state.service';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let router: Router;
  let instanceService: InstanceService;

  beforeEach(async () => {
    try { window?.localStorage?.clear(); } catch {}

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        InstanceService,
        ShellStateService,
        {
          provide: Router,
          useValue: {
            navigate: vi.fn()
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the app shell', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a router outlet', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('navigates to /tools/:toolType when openTool is called', () => {
    component.openTool('sql-formatter', 'sql');
    expect(router.navigate).toHaveBeenCalledWith(['/tools', 'sql-formatter']);
  });

  it('navigates to / when goHome is called', () => {
    component.goHome();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('closes all tools and navigates to / when closeAllTools is called', () => {
    instanceService.open('json-formatter', 'json');
    expect(instanceService.instances().length).toBeGreaterThan(0);

    component.closeAllTools();
    expect(instanceService.instances()).toHaveLength(0);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('toggles theme correctly', () => {
    const initial = component.isDark();
    component.toggleTheme();
    expect(component.isDark()).toBe(!initial);
  });
});
