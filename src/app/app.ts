import { Component, signal, effect, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService } from './core/tool/tool-instance';
import { ToolSidebar } from './shell/tool-sidebar/tool-sidebar';
import { OptionsPanel } from './shell/options-panel/options-panel';

const THEME_KEY = 'workbench.theme';

@Component({
  selector: 'app-root',
  standalone: true,
  host: { class: 'block h-screen' },
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    ToolSidebar,
    OptionsPanel,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  @ViewChild('leftDrawer') leftDrawer!: MatSidenav;
  @ViewChild('rightDrawer') rightDrawer!: MatSidenav;

  public instanceService = inject(InstanceService);
  private router = inject(Router);

  isDark = signal(this.loadTheme());

  ngOnInit(): void {
    // Pre-warm the heavy CodeEditor (Monaco Editor) in the background during idle time
    // so Vite pre-bundles it and browser preloads it before user opens any tool.
    if (typeof window !== 'undefined') {
      const prewarm = () => {
        import('./shared/code-editor/code-editor').catch(() => {});
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prewarm, { timeout: 1500 });
      } else {
        setTimeout(prewarm, 1000);
      }
    }
  }

  constructor() {
    effect(() => {
      const dark = this.isDark();
      document.body.classList.toggle('dark-theme', dark);
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  private loadTheme(): boolean {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  toggleTheme(): void {
    this.isDark.update((v) => !v);
  }

  toggleLeft(): void {
    this.leftDrawer.toggle();
  }

  toggleRight(): void {
    this.instanceService.toggleRightDrawer();
  }

  openTool(toolType: string, _groupId: string): void {
    this.router.navigate(['/tools', toolType]);
  }

  closeAllTools(): void {
    this.instanceService.closeAll();
    this.router.navigate(['/']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
