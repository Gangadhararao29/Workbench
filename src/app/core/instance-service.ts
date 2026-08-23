import { Injectable, signal, computed, effect } from '@angular/core';
import { defaultConfigFor } from './tool-defaults';
import { toolLabelFor } from './tool-registry';
import { WorkspaceStorage } from './workspace-storage';

export interface ToolInstance {
  id: string;
  toolType: string;
  label: string;
  groupId: string;
  config: Record<string, any>;
  closedAt?: number;
}

const STORAGE_KEY = 'workbench.instances.v1';
const MAX_ARCHIVED = 50;

@Injectable({ providedIn: 'root' })
export class InstanceService {
  private _instances = signal<ToolInstance[]>([]);
  private _activeId = signal<string | null>(null);

  instances = computed(() => this._instances().filter(i => !i.closedAt));
  archived = computed(() =>
    this._instances().filter(i => i.closedAt).sort((a, b) => b.closedAt! - a.closedAt!)
  );
  recent = computed(() => [...this.instances()].reverse());
  activeInstance = computed(() =>
    this._instances().find(i => i.id === this._activeId()) ?? null
  );

  constructor(private storage: WorkspaceStorage) {
    this._instances.set(this.loadFromStorage());
    effect(() => {
      this.storage.set(STORAGE_KEY, this._instances());
    });
  }

  private loadFromStorage(): ToolInstance[] {
    return this.storage.get<ToolInstance[]>(STORAGE_KEY, []);
  }

  open(toolType: string, groupId: string) {
    const count = this.instances().filter(i => i.toolType === toolType).length + 1;
    const instance: ToolInstance = {
      id: crypto.randomUUID(),
      toolType,
      groupId,
      label: `${toolLabelFor(toolType)} ${count}`,
      config: defaultConfigFor(toolType)
    };
    this._instances.update(list => [...list, instance]);
    this._activeId.set(instance.id);
  }

  close(id: string) {
    this._instances.update(list => {
      const updated = list.map(i => i.id === id ? { ...i, closedAt: Date.now() } : i);
      const archivedCount = updated.filter(i => i.closedAt).length;
      if (archivedCount > MAX_ARCHIVED) {
        // drop oldest archived beyond the cap
        const archived = updated.filter(i => i.closedAt).sort((a, b) => a.closedAt! - b.closedAt!);
        const toDrop = new Set(archived.slice(0, archivedCount - MAX_ARCHIVED).map(i => i.id));
        return updated.filter(i => !toDrop.has(i.id));
      }
      return updated;
    });
    if (this._activeId() === id) {
      const remaining = this.instances();
      this._activeId.set(remaining.at(-1)?.id ?? null);
    }
  }

  reopen(id: string) {
    this._instances.update(list =>
      list.map(i => i.id === id ? { ...i, closedAt: undefined } : i)
    );
    this._activeId.set(id);
  }

  deleteArchived(id: string) {
    this._instances.update(list => list.filter(i => i.id !== id));
  }

  select(id: string) {
    this._activeId.set(id);
  }

  goHome() {
    this._activeId.set(null);
  }

  updateLabel(id: string, label: string) {
    this._instances.update(list =>
      list.map(instance => instance.id === id ? { ...instance, label } : instance)
    );
  }

  updateConfig(id: string, patch: Record<string, any>) {
    this._instances.update(list =>
      list.map(i => i.id === id ? { ...i, config: { ...i.config, ...patch } } : i)
    );
  }

  exportWorkspace(): string {
    return JSON.stringify({ instances: this._instances(), favorites: this.storage.get<string[]>('workbench.favorite-tools', []) }, null, 2);
  }

  importWorkspace(raw: string) {
    const workspace = JSON.parse(raw) as { instances?: ToolInstance[]; favorites?: string[] };
    if (!Array.isArray(workspace.instances)) throw new Error('Workspace instances are invalid.');
    this._instances.set(workspace.instances);
    this.storage.set('workbench.favorite-tools', workspace.favorites ?? []);
    this.storage.set(STORAGE_KEY, workspace.instances);
  }
}