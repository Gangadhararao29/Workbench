import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  TOOL_GROUPS,
  UPCOMING_GROUPS,
  matchesToolSearch,
} from '../core/tool/tool-registry';
import { FeedbackComponent } from './feedback/feedback';
import { InstanceService } from '../core/tool/tool-instance';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, FeedbackComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {
  private instanceService = inject(InstanceService);
  private router = inject(Router);

  readonly toolGroups = TOOL_GROUPS;
  readonly upcomingGroups = UPCOMING_GROUPS;
  readonly version = '0.1.0';
  activeHomeTab = signal<'tools' | 'upcoming' | 'feedback'>('tools');

  searchQuery = this.instanceService.searchQuery;

  filteredToolGroups = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.toolGroups;
    return this.toolGroups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) => matchesToolSearch(tool, query, group.label)),
      }))
      .filter((group) => group.tools.length > 0);
  });

  openTool(toolType: string): void {
    this.router.navigate(['/tools', toolType]);
  }


  clearSearch(): void {
    this.searchQuery.set('');
  }
}
