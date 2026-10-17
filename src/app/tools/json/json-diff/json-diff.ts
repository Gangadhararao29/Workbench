import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { DiffEditor } from '../../../shared/diff-editor/diff-editor';
import { diffJson, sortAndFormatJson } from '../../../core/engines/json-diff-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState } from '../../../core/tool/tool-state';
import { defaultToolStateFor } from '../../../core/tool/tool-state-defaults';

const DEFAULT_STATE = defaultToolStateFor('json-diff')!;

@Component({
  selector: 'app-json-diff',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor, DiffEditor],
  templateUrl: './json-diff.html',
  styleUrls: ['./json-diff.css'],
})
export class JsonDiff implements OnInit {
  @Input({ required: true }) instanceId!: string;
  private toolState = signal<ToolState | null>(null);
  left = computed(() => this.toolState()?.state().input['left'] ?? DEFAULT_STATE.input['left']);
  right = computed(() => this.toolState()?.state().input['right'] ?? DEFAULT_STATE.input['right']);
  comparedLeft = computed(() => this.toolState()?.state().output['comparedLeft'] ?? this.left());
  comparedRight = computed(() => this.toolState()?.state().output['comparedRight'] ?? this.right());
  result = computed(() => this.toolState()?.state().output['result'] ?? '');
  changeCount = computed(() => this.toolState()?.state().output['changeCount'] ?? null);
  isIdentical = computed(() => this.toolState()?.state().output['isIdentical'] ?? false);
  errorMsg = computed(() => this.toolState()?.state().output['errorMsg'] ?? null);
  viewMode = computed(() => this.toolState()?.state().options['viewMode'] ?? 'visual');
  renderSideBySide = computed(() => this.toolState()?.state().options['renderSideBySide'] ?? true);

  constructor(private instanceService: InstanceService) {}

  ngOnInit() {
    this.toolState.set(new ToolState(this.instanceService, this.instanceId));
    this.compare();
  }

  setViewMode(mode: 'visual' | 'semantic') {
    this.toolState()?.updateOptions({ viewMode: mode });
  }

  toggleLayout() {
    this.toolState()?.updateOptions({ renderSideBySide: !this.renderSideBySide() });
  }

  formatAndSort() {
    try {
      const formattedLeft = sortAndFormatJson(this.left());
      const formattedRight = sortAndFormatJson(this.right());
      this.toolState()?.updateInput({ left: formattedLeft, right: formattedRight });
      this.toolState()?.updateOutput({ comparedLeft: formattedLeft, comparedRight: formattedRight });
      this.runDiff(formattedLeft, formattedRight);
    } catch (err) {
      this.toolState()?.updateOutput({ errorMsg: `Formatting error: ${(err as Error).message}` });
    }
  }

  onLeftChange(val: string) {
    this.toolState()?.updateInput({ left: val });
  }

  onRightChange(val: string) {
    this.toolState()?.updateInput({ right: val });
  }

  compare() {
    this.toolState()?.updateOutput({ comparedLeft: this.left(), comparedRight: this.right() });
    this.runDiff(this.left(), this.right());
  }

  private runDiff(leftVal: string, rightVal: string) {
    try {
      const { summary, changeCount } = diffJson(leftVal, rightVal);
      this.toolState()?.updateOutput({ result: summary, changeCount, isIdentical: changeCount === 0, errorMsg: null });
    } catch (error) {
      const msg = `Invalid JSON: ${(error as Error).message}`;
      this.toolState()?.updateOutput({ errorMsg: msg, changeCount: null, isIdentical: false, result: msg });
    }
  }
}
