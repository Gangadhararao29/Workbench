import { Component, OnInit, OnDestroy, computed, signal, effect, inject, Type } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService, ToolInstance } from '../core/instance-service';
import { findToolDefinition, getLoadedComponent, resolveToolComponent } from '../core/tool-registry';
import { ShellStateService } from '../core/shell-state.service';

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
  public shellState = inject(ShellStateService);

  toolType = signal<string>('');
  groupId = signal<string>('general');
  selectedInstanceId = signal<string | null>(null);
  loadedComponents = signal<Record<string, Type<any>>>({});

  scopedInstances = computed(() =>
    this.instanceService.instances().filter((i) => i.toolType === this.toolType())
  );

  selectedInstance = computed(() => {
    const list = this.scopedInstances();
    const id = this.selectedInstanceId();
    if (!list.length) return null;
    return list.find((i) => i.id === id) ?? list[0] ?? null;
  });

  constructor() {
    effect(() => {
      const active = this.selectedInstance();
      this.shellState.selectedInstance.set(active);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const type = params.get('toolType') || '';
      this.toolType.set(type);

      const def = findToolDefinition(type);
      if (def) {
        this.groupId.set(def.group.id);
      }

      this.ensureComponentLoaded(type);

      const existing = this.scopedInstances();
      if (existing.length === 0 && type) {
        const created = this.instanceService.open(type, this.groupId());
        this.selectedInstanceId.set(created.id);
      } else if (existing.length > 0) {
        if (!this.selectedInstanceId() || !existing.some((i) => i.id === this.selectedInstanceId())) {
          this.selectedInstanceId.set(existing[0].id);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.shellState.selectedInstance.set(null);
  }

  ensureComponentLoaded(type: string): void {
    if (!type) return;
    const cached = getLoadedComponent(type);
    if (cached) {
      if (this.loadedComponents()[type] !== cached) {
        this.loadedComponents.update((map) => ({ ...map, [type]: cached }));
      }
      return;
    }

    resolveToolComponent(type).then((comp) => {
      if (comp) {
        this.loadedComponents.update((map) => ({ ...map, [type]: comp }));
      }
    });
  }

  selectInstance(id: string): void {
    this.selectedInstanceId.set(id);
  }

  addInstance(): void {
    const created = this.instanceService.open(this.toolType(), this.groupId());
    this.selectedInstanceId.set(created.id);
  }

  cloneInstance(): void {
    const current = this.selectedInstance();
    if (!current) return;
    const cloned = this.instanceService.clone(current.id);
    if (cloned) {
      this.selectedInstanceId.set(cloned.id);
    }
  }

  closeInstance(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.instanceService.close(id);
    const remaining = this.scopedInstances();
    if (remaining.length === 0) {
      this.router.navigate(['/']);
    } else if (this.selectedInstanceId() === id) {
      this.selectedInstanceId.set(remaining[remaining.length - 1].id);
    }
  }
}
