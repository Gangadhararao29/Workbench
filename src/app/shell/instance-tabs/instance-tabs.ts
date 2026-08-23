import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToolInstance } from '../../core/instance-service';

@Component({
  selector: 'app-instance-tabs',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './instance-tabs.html',
  styleUrls: ['./instance-tabs.css']
})
export class InstanceTabs {
  @Input() instances: ToolInstance[] = [];
  @Input() activeId: string | null = null;
  @Output() select = new EventEmitter<string>();
  @Output() close = new EventEmitter<string>();
}