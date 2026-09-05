import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';
import { Router } from '@angular/router';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: vi.fn()
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders available tools by default', () => {
    expect(component.activeHomeTab()).toBe('tools');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.home-groups')).toBeTruthy();
  });

  it('navigates to tool page when openTool is called', () => {
    component.openTool('json-formatter');
    expect(router.navigate).toHaveBeenCalledWith(['/tools', 'json-formatter']);
  });

  it('switches tabs to upcoming features', () => {
    component.activeHomeTab.set('upcoming');
    fixture.detectChanges();
    expect(component.activeHomeTab()).toBe('upcoming');
  });

  it('filters tool groups when search query is present', () => {
    component.searchQuery.set('curl');
    fixture.detectChanges();

    const filtered = component.filteredToolGroups();
    const allMatching = filtered.flatMap((g) => g.tools).map((t) => t.type);

    expect(allMatching).toContain('curl-converter');
    expect(allMatching).toContain('http-request-builder');
    expect(allMatching).toContain('openapi-inspector');
    expect(allMatching).toContain('terminal');
    expect(allMatching).not.toContain('guid-generator');
  });

  it('clears search when clearSearch is called', () => {
    component.searchQuery.set('curl');
    expect(component.searchQuery()).toBe('curl');

    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });
});
