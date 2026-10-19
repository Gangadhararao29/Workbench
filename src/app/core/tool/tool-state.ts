import { computed, effect, untracked, type Injector, type Signal } from '@angular/core';
import type { ToolInstanceService } from './tool-instance';
import { defaultToolStateFor } from './tool-state-defaults';

export interface ToolStateSnapshot {
  input: Record<string, any>;
  output: Record<string, any>;
  options: Record<string, any>;
}

const EMPTY_STATE: ToolStateSnapshot = { input: {}, output: {}, options: {} };

export class ToolState {
  readonly state: Signal<ToolStateSnapshot>;

  constructor(
    private readonly instanceService: ToolInstanceService,
    private readonly instanceId: string,
    fallbackToolType?: string,
  ) {
    const toolType =
      this.instanceService.instances().find((instance) => instance.id === this.instanceId)?.toolType ??
      fallbackToolType;
    const defaults = defaultToolStateFor(toolType ?? '') ?? EMPTY_STATE;
    this.state = computed(() => {
      const saved = this.instanceService.getState(this.instanceId);
      return {
        input: this.mergeSection(defaults.input, saved?.input),
        output: this.mergeSection(defaults.output, saved?.output),
        options: this.mergeSection(defaults.options, saved?.options),
      };
    });
  }

  connect(
    read: () => ToolStateSnapshot,
    restore: (state: ToolStateSnapshot) => void,
    injector: Injector,
  ): void {
    restore(this.state());
    effect(
      () => {
        const snapshot = read();
        untracked(() => this.save(snapshot));
      },
      { injector },
    );
  }
  updateInput(patch: Record<string, any>): void {
    this.updateSection('input', patch);
  }

  updateOutput(patch: Record<string, any>): void {
    this.updateSection('output', patch);
  }

  updateOptions(patch: Record<string, any>): void {
    this.updateSection('options', patch);
  }

  save(snapshot: ToolStateSnapshot): void {
    this.updateInput(snapshot.input);
    this.updateOutput(snapshot.output);
    this.updateOptions(snapshot.options);
  }

  private updateSection(section: keyof ToolStateSnapshot, patch: Record<string, any>): void {
    const current = this.state()[section];
    if (Object.entries(patch).every(([key, value]) => Object.is(current[key], value))) return;
    const next = { ...current, ...patch };
    this.instanceService.updateState(this.instanceId, { [section]: next });
  }

  private mergeSection(defaults: Record<string, any>, saved?: unknown): Record<string, any> {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...defaults };
    return { ...defaults, ...saved };
  }
}