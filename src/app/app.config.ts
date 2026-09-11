import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { WorkbenchRouteReuseStrategy } from './core/route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: WorkbenchRouteReuseStrategy },
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() }),
  ],
};
