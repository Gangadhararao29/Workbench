import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CsharpToTypescript } from './csharp-to-typescript';
import { InstanceService } from '../../../core/tool/tool-instance';

describe('CsharpToTypescript', () => {
  let component: CsharpToTypescript;
  let fixture: ComponentFixture<CsharpToTypescript>;
  let instanceService: InstanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsharpToTypescript],
    }).compileComponents();

    instanceService = TestBed.inject(InstanceService);
    fixture = TestBed.createComponent(CsharpToTypescript);
    component = fixture.componentInstance;
    component.instanceId = 'test-csharp-to-typescript';
    await fixture.whenStable();
  });

  it('should create and format default input on init', async () => {
    expect(component).toBeTruthy();
    await component.format();
    expect(component.result()).toContain('export interface UserDto');
    expect(component.result()).toContain('id: number');
    expect(component.result()).toContain('roles: string[]');
    expect(component.error()).toBe('');
  });

  it('should convert on input change', async () => {
    component.input.set('public record ProductDto(string Sku, decimal Price);');
    await component.format();
    expect(component.result()).toContain('export interface ProductDto');
    expect(component.result()).toContain('sku: string');
    expect(component.result()).toContain('price: number');
    expect(component.error()).toBe('');
  });

  it('should display error message on empty or invalid input', async () => {
    component.input.set('invalid input without class');
    await component.format();
    expect(component.error()).toContain('No C# classes, records, or enums found.');
  });

  it('should clear input, result, and error', () => {
    component.clear();
    expect(component.input()).toBe('');
    expect(component.result()).toBe('');
    expect(component.error()).toBe('');
  });
});
