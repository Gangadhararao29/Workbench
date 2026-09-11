import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CsharpFormatter } from './csharp-formatter';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('CsharpFormatter', () => {
  let component: CsharpFormatter;
  let fixture: ComponentFixture<CsharpFormatter>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsharpFormatter],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(CsharpFormatter);
    component = fixture.componentInstance;
    component.instanceId = 'test-csharp-formatter';
    await fixture.whenStable();
  });

  it('should create and format default input on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('public class User');
    expect(component.result()).toContain('public int Id { get; set; }');
  });

  it('should format code on input change', () => {
    component.onInputChange('public class Item { public int Id { get; set; } }');
    expect(component.result()).toContain('public class Item');
    expect(component.result()).toContain('public int Id { get; set; }');
  });

  it('should clear input and result', () => {
    component.clear();
    expect(component.input()).toBe('');
    expect(component.result()).toBe('');
  });
});
