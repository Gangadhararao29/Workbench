import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkspaceStorage } from '../../core/workspace-storage';
import {
  ToolGroup,
  TOOL_GROUPS,
  matchesToolSearch,
  ToolDefinition,
  getToolSearchSnippet,
  resolveToolComponent,
} from '../../core/tool/tool-registry';

@Component({
  selector: 'app-tool-sidebar',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './tool-sidebar.html',
  styleUrls: ['./tool-sidebar.css'],
})
export class ToolSidebar implements OnInit, OnDestroy {
  @Input() searchQuery = '';
  @Input() hasOpenTools = false;
  @Input() activeToolType?: string;
  @Output() openTool = new EventEmitter<{ toolType: string; groupId: string }>();
  @Output() closeAll = new EventEmitter<void>();
  @Output() home = new EventEmitter<void>();

  private router = inject(Router, { optional: true });
  private routerSub?: Subscription;
  private currentActiveTool = signal<string | null>(null);

  favoriteTools = new Set<string>();
  groups: ToolGroup[] = TOOL_GROUPS;

  constructor(private storage: WorkspaceStorage) {
    this.favoriteTools = new Set(storage.get<string[]>('workbench.favorite-tools', []));
    if (this.router?.url) {
      this.currentActiveTool.set(this.getToolTypeFromUrl(this.router.url));
    }
  }

  ngOnInit(): void {
    if (this.router?.events) {
      this.routerSub = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.currentActiveTool.set(this.getToolTypeFromUrl(event.urlAfterRedirects || event.url));
        });
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private getToolTypeFromUrl(url: string): string | null {
    if (!url) return null;
    const cleanUrl = url.split('?')[0].split('#')[0];
    const match = cleanUrl.match(/^\/tools\/([^/]+)/);
    return match ? match[1] : null;
  }

  get filteredGroups(): ToolGroup[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      const favorites = this.groups
        .flatMap((group) => group.tools)
        .filter((tool) => this.isFavorite(tool.type));
      return favorites.length
        ? [{ id: 'favorites', label: 'Favorites', icon: 'star', tools: favorites }, ...this.groups]
        : this.groups;
    }
    return this.groups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) => matchesToolSearch(tool, query, group.label)),
      }))
      .filter((group) => group.tools.length > 0);
  }

  isToolActive(toolType: string): boolean {
    const active = this.activeToolType ?? this.currentActiveTool();
    return active === toolType;
  }

  isGroupExpanded(group: ToolGroup): boolean {
    if (this.searchQuery.trim()) {
      return true;
    }
    const active = this.activeToolType ?? this.currentActiveTool();
    if (active) {
      return group.tools.some((t) => t.type === active);
    }
    return group.id === 'json';
  }

  getSearchHint(tool: ToolDefinition): string {
    return getToolSearchSnippet(tool, this.searchQuery);
  }

  emit(toolType: string, groupId: string) {
    this.openTool.emit({ toolType, groupId });
  }

  preloadTool(toolType: string): void {
    resolveToolComponent(toolType).catch(() => {});
  }

  toggleFavorite(toolType: string) {
    if (this.favoriteTools.has(toolType)) this.favoriteTools.delete(toolType);
    else this.favoriteTools.add(toolType);
    this.storage.set('workbench.favorite-tools', [...this.favoriteTools]);
  }

  isFavorite(toolType: string) {
    return this.favoriteTools.has(toolType);
  }
}
