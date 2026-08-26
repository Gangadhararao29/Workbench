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

  it('should switch technology to React', () => {
    component.onTechChange('react');
    expect(component.selectedTech()).toBe('react');
    expect(component.result()).toContain('export function ApiComponent');
    expect(component.result()).toContain("import axios from 'axios'");
  });

  it('should switch technology to Vanilla JS and support Fetch and Axios', () => {
    component.onTechChange('vanilla-js');
    component.onTypeChange('fetch');
    expect(component.result()).toContain('fetch(');

    component.onTypeChange('axios');
    expect(component.result()).toContain('axios.');
  });

  it('should convert to Angular HttpClient', () => {
    component.onTechChange('angular');
    component.onTypeChange('httpclient');
    expect(component.result()).toContain('@angular/common/http');
    expect(component.result()).toContain('inject(HttpClient)');
  });

  it('should convert to Python Requests', () => {
    component.onTechChange('python');
    component.onTypeChange('requests');
    expect(component.result()).toContain('import requests');
  });

  it('should convert to Java HttpClient', () => {
    component.onTechChange('java');
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
