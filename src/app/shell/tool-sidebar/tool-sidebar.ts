import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TOOL_GROUPS, ToolGroup } from '../../core/tool-registry';
import { WorkspaceStorage } from '../../core/workspace-storage';

@Component({
  selector: 'app-tool-sidebar',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './tool-sidebar.html',
  styleUrls: ['./tool-sidebar.css']
})
export class ToolSidebar {
  @Input() searchQuery = '';
  @Input() hasOpenTools = false;
  @Output() openTool = new EventEmitter<{ toolType: string; groupId: string }>();
  @Output() closeAll = new EventEmitter<void>();
  @Output() home = new EventEmitter<void>();
  favoriteTools = new Set<string>();

  constructor(private storage: WorkspaceStorage) {
    this.favoriteTools = new Set(storage.get<string[]>('workbench.favorite-tools', []));
  }

  groups: ToolGroup[] = TOOL_GROUPS;

  get filteredGroups(): ToolGroup[] {
    const query = this.searchQuery.trim().toLowerCase();
    const groups = this.groups.map(group => ({
      ...group,
      tools: group.tools.filter(tool => `${group.label} ${tool.label}`.toLowerCase().includes(query))
    })).filter(group => group.tools.length);
    if (query) return groups;
    const favorites = this.groups.flatMap(group => group.tools).filter(tool => this.isFavorite(tool.type));
    return favorites.length ? [{ id: 'favorites', label: 'Favorites', icon: 'star', tools: favorites }, ...groups] : groups;
  }

  emit(toolType: string, groupId: string) {
    this.openTool.emit({ toolType, groupId });
  }

  toggleFavorite(toolType: string) {
    if (this.favoriteTools.has(toolType)) this.favoriteTools.delete(toolType);
    else this.favoriteTools.add(toolType);
    this.storage.set('workbench.favorite-tools', [...this.favoriteTools]);
  }

  isFavorite(toolType: string) { return this.favoriteTools.has(toolType); }
}