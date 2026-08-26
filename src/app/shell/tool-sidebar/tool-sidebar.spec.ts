import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolSidebar } from './tool-sidebar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

describe('ToolSidebar', () => {
  let component: ToolSidebar;
  let fixture: ComponentFixture<ToolSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolSidebar],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/tools/sql-formatter',
            events: new Subject(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect active tool from current router url', () => {
    expect(component.isToolActive('sql-formatter')).toBe(true);
    expect(component.isToolActive('json-formatter')).toBe(false);
  });

  it('should allow activeToolType input to override current url', () => {
    component.activeToolType = 'json-diff';
    expect(component.isToolActive('json-diff')).toBe(true);
    expect(component.isToolActive('sql-formatter')).toBe(false);
  });

  it('should expand the group containing the active tool', () => {
    const sqlGroup = component.groups.find((g) => g.id === 'sql')!;
    const jsonGroup = component.groups.find((g) => g.id === 'json')!;

    expect(component.isGroupExpanded(sqlGroup)).toBe(true);
    expect(component.isGroupExpanded(jsonGroup)).toBe(false);
  });
});

