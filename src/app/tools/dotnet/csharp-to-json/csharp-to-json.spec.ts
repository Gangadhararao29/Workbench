import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CsharpToJson } from './csharp-to-json';

describe('CsharpToJson', () => {
  let component: CsharpToJson;
  let fixture: ComponentFixture<CsharpToJson>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsharpToJson],
    }).compileComponents();

    fixture = TestBed.createComponent(CsharpToJson);
    component = fixture.componentInstance;
    component.instanceId = 'test-csharp-to-json';
    await fixture.whenStable();
  });

  it('should create and convert default input on init', () => {
    expect(component).toBeTruthy();
    component.ngOnInit();
    expect(component.result()).toContain('"id": 0');
    expect(component.result()).toContain('"name": "string"');
    expect(component.error()).toBe('');
  });

  it('should convert on input change', () => {
    component.onInputChange('public record ProductDto(string Sku, decimal Price);');
    expect(component.result()).toContain('"sku": "string"');
    expect(component.result()).toContain('"price": 0');
    expect(component.error()).toBe('');
  });

  it('should display error message on invalid input', () => {
    component.onInputChange('invalid class syntax without body');
    expect(component.error()).toContain('No C# class or record found.');
  });

  it('should clear input, result, and error', () => {
    component.clear();
    expect(component.input()).toBe('');
    expect(component.result()).toBe('');
    expect(component.error()).toBe('');
  });
});
