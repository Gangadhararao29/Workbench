import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    const measurementId = environment.firebase.measurementId;
    if (!this.isBrowser || !environment.production || !measurementId) return;

    const windowRef = this.document.defaultView;
    if (!windowRef) return;

    windowRef.dataLayer = windowRef.dataLayer || [];
    windowRef.gtag = (...args: unknown[]) => windowRef.dataLayer?.push(args);
    windowRef.gtag('js', new Date());
    windowRef.gtag('config', measurementId, { send_page_view: false });

    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    this.document.head.appendChild(script);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const pagePath = event.urlAfterRedirects.split(/[?#]/, 1)[0];
        windowRef.gtag?.('event', 'page_view', {
          page_path: pagePath,
          page_title: this.document.title,
        });
      });
  }
}