import { Injectable, computed, signal } from '@angular/core';
import { ToolInstance } from './instance-service';

const TOOLS_WITH_OPTIONS = new Set([
  'sql-formatter',
  'json-formatter',
  'csharp-to-typescript',
  'json-to-typescript',
  'sql-to-csharp',
  'feature-generator',
  'regex-tester',
]);

@Injectable({
  providedIn: 'root',
})
export class ShellStateService {
  searchQuery = signal('');
  rightDrawerOpened = signal(false);
  selectedInstance = signal<ToolInstance | null>(null);

  hasOptions = computed(() => {
    const inst = this.selectedInstance();
    if (!inst) return false;
    return TOOLS_WITH_OPTIONS.has(inst.toolType);
  });

  setRightDrawer(opened: boolean): void {
    this.rightDrawerOpened.set(opened);
  }

  toggleRightDrawer(): void {
    this.rightDrawerOpened.update((v) => !v);
  }
}
