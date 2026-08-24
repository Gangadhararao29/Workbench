import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurlConverter } from './curl-converter';

describe('CurlConverter Component', () => {
  let component: CurlConverter;
  let fixture: ComponentFixture<CurlConverter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurlConverter],
    }).compileComponents();

    fixture = TestBed.createComponent(CurlConverter);
    component = fixture.componentInstance;
    component.instanceId = 'test-curl-1';
    await fixture.whenStable();
  });

  it('should create and initialize with converted code', () => {
    expect(component).toBeTruthy();
    expect(component.result()).toBeTruthy();
    expect(component.parsedRequest()).toBeTruthy();
  });

  it('should reactively convert on input changes', () => {
    component.onInputChange('curl -X POST "https://api.test.com/v1/auth" -H "Content-Type: application/json" -d "{\\"token\\":\\"abc\\"}"');
    expect(component.parsedRequest()?.method).toBe('POST');
    expect(component.parsedRequest()?.url).toBe('https://api.test.com/v1/auth');
    expect(component.result()).toContain('HttpRequestMessage');
  });

  it('should convert to chosen target language on target change', () => {
    component.onTargetChange('python-requests');
    expect(component.target()).toBe('python-requests');
    expect(component.outputLanguage()).toBe('python');
    expect(component.result()).toContain('import requests');
  });

  it('should load preset templates', () => {
    component.loadPreset('Basic Authentication');
    expect(component.parsedRequest()?.basicAuth).toBeDefined();
  });

  it('should handle invalid cURL input with clear error message', () => {
    component.onInputChange('curl -X GET');
    expect(component.errorMessage()).toBeTruthy();
    expect(component.result()).toBe('');
    expect(component.parsedRequest()).toBeNull();
  });

  it('should clear all state when clear is called', () => {
    component.clear();
    expect(component.input()).toBe('');
    expect(component.result()).toBe('');
    expect(component.parsedRequest()).toBeNull();
  });
});
