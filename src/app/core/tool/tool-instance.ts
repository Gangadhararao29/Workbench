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
import { defaultToolStateFor } from './tool-state-defaults';
import type { ToolStateSnapshot } from './tool-state';

export interface ToolInstance {
  id: string;
  toolType: string;
  label: string;
  groupId: string;
  config: Record<string, any>;
  state: ToolStateSnapshot;
  version?: number;
  createdAt?: number;
  closedAt?: number;
}

const STORAGE_KEY = 'workbench.instances';
const ACTIVE_STORAGE_KEY = 'workbench.active-instance';
const MAX_ARCHIVED = 50;

@Injectable({ providedIn: 'root' })
export class ToolInstanceService {
  private _instances = signal<ToolInstance[]>([]);
  private _activeId = signal<string | null>(null);
  private hydrated = signal(false);
  readonly ready: Promise<void>;

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
    this._instances.set([]);
    try {
      effect(() => {
        if (!this.hydrated()) return;
        this.storage.set(STORAGE_KEY, this._instances(), 'workspaces');
      });
      effect(() => {
        if (!this.hydrated()) return;
        this.storage.set(ACTIVE_STORAGE_KEY, this._activeId(), 'workspaces');
      });
    } catch {
      // Handled when constructed outside of Angular injection context in unit tests
    }
    this.ready = this.hydrateFromIndexedDb();
  }

  private async hydrateFromIndexedDb(): Promise<void> {
    try {
      const [instances, activeId] = await Promise.all([
        this.storage.getAsync<ToolInstance[]>(STORAGE_KEY, [], 'workspaces'),
        this.storage.getAsync<string | null>(ACTIVE_STORAGE_KEY, null, 'workspaces'),
      ]);
      if (instances.length > 0) this._instances.set(instances);
      if (activeId && instances.some((instance) => instance.id === activeId)) {
        this._activeId.set(activeId);
      }
    } finally {
      this.hydrated.set(true);
    }
  }

  open(toolType: string, groupId?: string): ToolInstance {
    const def = findToolDefinition(toolType);
    const resolvedGroup = groupId || def?.group.id || 'general';
    const count = this.instances().filter((i) => i.toolType === toolType).length;

    const instance: ToolInstance = {
      id: crypto.randomUUID(),
      toolType,
      groupId: resolvedGroup,
      label: count === 0 ? toolLabelFor(toolType) : `${toolLabelFor(toolType)} ${count + 1}`,
      config: defaultConfigFor(toolType),
      state: defaultToolStateFor(toolType) ?? { input: {}, output: {}, options: {} },
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

  updateState(id: string, patch: Partial<ToolStateSnapshot>) {
    const instances = this._instances();
    const index = instances.findIndex((instance) => instance.id === id);
    if (index === -1) return;

    const instance = instances[index];
    const current = instance.state;
    const state = {
      input: { ...current.input, ...patch.input },
      output: { ...current.output, ...patch.output },
      options: { ...current.options, ...patch.options },
    };
    const unchanged = (section: keyof ToolStateSnapshot) =>
      Object.entries(patch[section] ?? {}).every(([key, value]) => Object.is(current[section][key], value));
    if (unchanged('input') && unchanged('output') && unchanged('options')) return;

    this._instances.update((list) =>
      list.map((item, itemIndex) => (itemIndex === index ? { ...item, state } : item)),
    );
  }

  getState(id: string): ToolStateSnapshot | undefined {
    return this._instances().find((instance) => instance.id === id)?.state;
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
    this.storage.set(STORAGE_KEY, workspace.instances, 'workspaces');
  }
}

export { ToolInstanceService as InstanceService };
