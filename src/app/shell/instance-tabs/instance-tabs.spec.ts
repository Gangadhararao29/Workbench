import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstanceTabs } from './instance-tabs';

describe('InstanceTabs', () => {
  let component: InstanceTabs;
  let fixture: ComponentFixture<InstanceTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstanceTabs],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceTabs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
