import { Component, OnInit, OnDestroy, computed, signal, inject, Type } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService, ToolInstance } from '../core/tool/tool-instance';
import { findToolDefinition, getToolComponent } from '../core/tool/tool-registry';

@Component({
  selector: 'app-tool-page',
  standalone: true,
  imports: [
    CommonModule,
    NgComponentOutlet,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './tool-page.html',
  styleUrls: ['./tool-page.css'],
})
export class ToolPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public instanceService = inject(InstanceService);

  toolType = signal<string>('');
  groupId = signal<string>('general');

  scopedInstances = computed(() =>
    this.instanceService.instances().filter((i) => i.toolType === this.toolType()),
  );

  selectedInstance = computed<ToolInstance | null>(() => {
    const active = this.instanceService.activeInstance();
    const list = this.scopedInstances();
    if (active && list.some((i) => i.id === active.id)) {
      return active;
    }
    return list[0] ?? null;
  });

  currentToolDef = computed(() => {
    const type = this.toolType();
    return type ? findToolDefinition(type) : null;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const type = params.get('toolType') || '';
      this.toolType.set(type);

      const def = findToolDefinition(type);
      if (def) {
        this.groupId.set(def.group.id);
      }

      const existing = this.scopedInstances();
      if (existing.length === 0 && type) {
        this.instanceService.open(type, this.groupId());
      } else if (existing.length > 0) {
        const active = this.instanceService.activeInstance();
        if (!active || !existing.some((i) => i.id === active.id)) {
          this.instanceService.select(existing[0].id);
        }
      }
    });
  }

  ngOnDestroy(): void {
    // If not navigating to another tool, reset active instance
    const currentUrl = this.router.url || '';
    if (!currentUrl.startsWith('/tools/')) {
      this.instanceService.goHome();
    }
  }

  getToolComponent(type: string): Type<any> | undefined {
    return getToolComponent(type);
  }

  selectInstance(id: string): void {
    this.instanceService.select(id);
  }

  addInstance(): void {
    this.instanceService.open(this.toolType(), this.groupId());
  }

  cloneInstance(): void {
    const current = this.selectedInstance();
    if (!current) return;
    this.instanceService.clone(current.id);
  }

  closeInstance(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.instanceService.close(id);
    const remaining = this.scopedInstances();
    if (remaining.length === 0) {
      this.router.navigate(['/']);
    } else {
      const active = this.instanceService.activeInstance();
      if (!active || !remaining.some((i) => i.id === active.id)) {
        this.instanceService.select(remaining[remaining.length - 1].id);
      }
    }
  }
}
