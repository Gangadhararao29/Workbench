import { Injectable, signal, computed, effect } from '@angular/core';
import {
  defaultConfigFor,
  findToolDefinition,
  hasSidebarOptions,
  isSidebarOpenByDefault,
  toolLabelFor,
  ToolDefinition,
} from './tool-registry';
import { WorkspaceStorage } from '../workspace-storage';

export interface ToolInstance<TConfig = Record<string, any>, TState = Record<string, any>> {
  id: string;
  toolType: string;
  label: string;
  groupId: string;
  config: TConfig;
  state?: TState;
  version?: number;
  createdAt?: number;
  closedAt?: number;
}

const STORAGE_KEY = 'workbench.instances';
const LEGACY_STORAGE_KEY = 'workbench.instances.v1';
const MAX_ARCHIVED = 50;

@Injectable({ providedIn: 'root' })
export class ToolInstanceService {
  private _instances = signal<ToolInstance[]>([]);
  private _activeId = signal<string | null>(null);

  searchQuery = signal('');
  rightDrawerOpened = signal(false);

  instances = computed(() => this._instances().filter((i) => !i.closedAt));
  archived = computed(() =>
    this._instances()
      .filter((i) => i.closedAt)
      .sort((a, b) => b.closedAt! - a.closedAt!),
  );
  recent = computed(() => [...this.instances()].reverse());
  activeInstance = computed(() => this._instances().find((i) => i.id === this._activeId()) ?? null);
  selectedInstance = computed(() => this.activeInstance());

  activeToolDef = computed<ToolDefinition | null>(() => {
    const inst = this.activeInstance();
    if (!inst) return null;
    return findToolDefinition(inst.toolType)?.tool ?? null;
  });

  hasOptions = computed(() => {
    const inst = this.activeInstance();
    if (!inst) return false;
    return hasSidebarOptions(inst.toolType);
  });

  constructor(private storage: WorkspaceStorage) {
    this._instances.set(this.loadFromStorage());
    try {
      effect(() => {
        this.storage.set(STORAGE_KEY, this._instances());
      });
    } catch {
      // Handled when constructed outside of Angular injection context in unit tests
    }
  }

  private loadFromStorage(): ToolInstance[] {
    const data = this.storage.get<ToolInstance[]>(STORAGE_KEY, []);
    if (data.length > 0) return data;
    return this.storage.get<ToolInstance[]>(LEGACY_STORAGE_KEY, []);
  }

  open(toolType: string, groupId?: string): ToolInstance {
    const def = findToolDefinition(toolType);
    const resolvedGroup = groupId || def?.group.id || 'general';
    const count = this.instances().filter((i) => i.toolType === toolType).length;

    const instance: ToolInstance = {
      id: crypto.randomUUID(),
      toolType,
      groupId: resolvedGroup,
      label: `${toolLabelFor(toolType)} ${count + 1}`,
      config: defaultConfigFor(toolType),
      state: {},
      version: 1,
      createdAt: Date.now(),
    };

    this._instances.update((list) => [...list, instance]);
    this.select(instance.id);
    return instance;
  }

  clone(id: string): ToolInstance | null {
    const target = this._instances().find((i) => i.id === id);
    if (!target) return null;
    const count = this.instances().filter((i) => i.toolType === target.toolType).length + 1;
    const cloned: ToolInstance = {
      id: crypto.randomUUID(),
      toolType: target.toolType,
      groupId: target.groupId,
      label: `${toolLabelFor(target.toolType)} ${count}`,
      config: JSON.parse(JSON.stringify(target.config || {})),
      state: target.state ? JSON.parse(JSON.stringify(target.state)) : {},
      version: target.version ?? 1,
      createdAt: Date.now(),
    };
    this._instances.update((list) => [...list, cloned]);
    this.select(cloned.id);
    return cloned;
  }

  close(id: string) {
    this._instances.update((list) => {
      const updated = list.map((i) => (i.id === id ? { ...i, closedAt: Date.now() } : i));
      const archivedCount = updated.filter((i) => i.closedAt).length;
      if (archivedCount > MAX_ARCHIVED) {
        const archived = updated
          .filter((i) => i.closedAt)
          .sort((a, b) => a.closedAt! - b.closedAt!);
        const toDrop = new Set(archived.slice(0, archivedCount - MAX_ARCHIVED).map((i) => i.id));
        return updated.filter((i) => !toDrop.has(i.id));
      }
      return updated;
    });

    if (this._activeId() === id) {
      const remaining = this.instances();
      const nextId = remaining.at(-1)?.id ?? null;
      if (nextId) {
        this.select(nextId);
      } else {
        this._activeId.set(null);
        this.rightDrawerOpened.set(false);
      }
    }
  }

  closeAll() {
    this.instances().forEach((instance) => this.close(instance.id));
    this._activeId.set(null);
    this.rightDrawerOpened.set(false);
  }

  reopen(id: string) {
    this._instances.update((list) =>
      list.map((i) => (i.id === id ? { ...i, closedAt: undefined } : i)),
    );
    this.select(id);
  }

  deleteArchived(id: string) {
    this._instances.update((list) => list.filter((i) => i.id !== id));
  }

  select(id: string) {
    this._activeId.set(id);
    const inst = this._instances().find((i) => i.id === id);
    if (inst) {
      if (!hasSidebarOptions(inst.toolType)) {
        this.rightDrawerOpened.set(false);
      } else if (isSidebarOpenByDefault(inst.toolType)) {
        this.rightDrawerOpened.set(true);
      }
    }
  }

  goHome() {
    this._activeId.set(null);
    this.rightDrawerOpened.set(false);
  }

  updateLabel(id: string, label: string) {
    this._instances.update((list) =>
      list.map((instance) => (instance.id === id ? { ...instance, label } : instance)),
    );
  }

  updateConfig(id: string, patch: Record<string, any>) {
    this._instances.update((list) =>
      list.map((i) => (i.id === id ? { ...i, config: { ...i.config, ...patch } } : i)),
    );
  }

  updateState(id: string, patch: Record<string, any>) {
    this._instances.update((list) =>
      list.map((i) => (i.id === id ? { ...i, state: { ...(i.state || {}), ...patch } } : i)),
    );
  }

  getState<T = Record<string, any>>(id: string): T | undefined {
    return this._instances().find((i) => i.id === id)?.state as T | undefined;
  }

  setRightDrawer(opened: boolean): void {
    this.rightDrawerOpened.set(opened);
  }

  toggleRightDrawer(): void {
    this.rightDrawerOpened.update((v) => !v);
  }

  exportWorkspace(): string {
    return JSON.stringify(
      {
        instances: this._instances(),
        favorites: this.storage.get<string[]>('workbench.favorite-tools', []),
      },
      null,
      2,
    );
  }

  importWorkspace(raw: string) {
    const workspace = JSON.parse(raw) as { instances?: ToolInstance[]; favorites?: string[] };
    if (!Array.isArray(workspace.instances)) throw new Error('Workspace instances are invalid.');
    this._instances.set(workspace.instances);
    this.storage.set('workbench.favorite-tools', workspace.favorites ?? []);
    this.storage.set(STORAGE_KEY, workspace.instances);
  }
}

export { ToolInstanceService as InstanceService };
