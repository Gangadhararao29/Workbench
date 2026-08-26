import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { toolTypeGuard } from './tool-type.guard';

describe('toolTypeGuard', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    router = TestBed.inject(Router);
  });

  it('allows navigation for valid tool type', () => {
    const route = {
      paramMap: {
        get: (key: string) => (key === 'toolType' ? 'json-formatter' : null)
      }
    } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => toolTypeGuard(route, state));
    expect(result).toBe(true);
  });

  it('redirects to / for invalid tool type', () => {
    const route = {
      paramMap: {
        get: (key: string) => (key === 'toolType' ? 'non-existent-tool' : null)
      }
    } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => toolTypeGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('redirects to / when toolType parameter is missing', () => {
    const route = {
      paramMap: {
        get: () => null
      }
    } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => toolTypeGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/');
  });
});
