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
});
