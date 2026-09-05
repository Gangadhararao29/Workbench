import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { toolTypeGuard } from './tool-type.guard';

describe('toolTypeGuard', () => {
  const mockRouter = {
    parseUrl: (url: string) => ({ toString: () => url } as unknown as UrlTree),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('allows navigation for valid tool type', () => {
    const route = {
      paramMap: {
        get: (key: string) => (key === 'toolType' ? 'json-formatter' : null)
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      toolTypeGuard(route, {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('redirects to / for invalid tool type', () => {
    const route = {
      paramMap: {
        get: (key: string) => (key === 'toolType' ? 'non-existent-tool' : null)
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      toolTypeGuard(route, {} as RouterStateSnapshot)
    );
    expect(result.toString()).toBe('/');
  });

  it('redirects to / when toolType parameter is missing', () => {
    const route = {
      paramMap: {
        get: () => null
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      toolTypeGuard(route, {} as RouterStateSnapshot)
    );
    expect(result.toString()).toBe('/');
  });
});

