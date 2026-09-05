import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

@Injectable()
export class WorkbenchRouteReuseStrategy implements RouteReuseStrategy {
  private handlers = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig?.path === 'tools/:toolType';
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (route.routeConfig?.path === 'tools/:toolType') {
      if (handle) {
        this.handlers.set('tool-page', handle);
      } else {
        this.handlers.delete('tool-page');
      }
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig?.path === 'tools/:toolType' && this.handlers.has('tool-page');
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (route.routeConfig?.path === 'tools/:toolType') {
      return this.handlers.get('tool-page') ?? null;
    }
    return null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
