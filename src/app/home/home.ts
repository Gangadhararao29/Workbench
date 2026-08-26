import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TOOL_GROUPS, UPCOMING_GROUPS } from '../core/tool-registry';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  readonly toolGroups = TOOL_GROUPS;
  readonly upcomingGroups = UPCOMING_GROUPS;
  activeHomeTab = signal<'tools' | 'upcoming'>('tools');

  constructor(private router: Router) {}

  openTool(toolType: string): void {
    this.router.navigate(['/tools', toolType]);
  }
}
