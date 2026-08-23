import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolSidebar } from './tool-sidebar';

describe('ToolSidebar', () => {
  let component: ToolSidebar;
  let fixture: ComponentFixture<ToolSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
