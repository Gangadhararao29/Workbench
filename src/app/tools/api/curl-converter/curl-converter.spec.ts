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

  it('should create and initialize with converted C# code', () => {
    expect(component).toBeTruthy();
    expect(component.selectedTech()).toBe('csharp');
    expect(component.selectedType()).toBe('httpclient');
    expect(component.result()).toContain('HttpClient');
  });

  it('should switch technology to React and default to Fetch', () => {
    component.onTechChange('react');
    expect(component.selectedTech()).toBe('react');
    expect(component.result()).toContain('export function ApiComponent');
    expect(component.result()).toContain('fetch');
  });

  it('should switch type to Axios for React', () => {
    component.onTechChange('react');
    component.onTypeChange('axios');
    expect(component.result()).toContain("import axios from 'axios'");
    expect(component.result()).toContain('axios.');
  });

  it('should convert to Angular HttpClient', () => {
    component.onTechChange('angular');
    component.onTypeChange('httpclient');
    expect(component.result()).toContain('@angular/common/http');
    expect(component.result()).toContain('inject(HttpClient)');
  });

  it('should convert to Python Requests and HTTPX', () => {
    component.onTechChange('python');
    component.onTypeChange('requests');
    expect(component.result()).toContain('import requests');

    component.onTypeChange('httpx');
    expect(component.result()).toContain('import httpx');
  });

  it('should convert to Java OkHttp and HttpClient', () => {
    component.onTechChange('java');
    component.onTypeChange('okhttp');
    expect(component.result()).toContain('okhttp3.OkHttpClient');

    component.onTypeChange('httpclient');
    expect(component.result()).toContain('java.net.http.HttpClient');
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
