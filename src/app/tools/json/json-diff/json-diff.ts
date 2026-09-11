import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { DiffEditor } from '../../../shared/diff-editor/diff-editor';
import { diffJson, sortAndFormatJson } from '../../../core/engines/json-diff-engine';

@Component({
  selector: 'app-json-diff',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, CodeEditor, DiffEditor],
  templateUrl: './json-diff.html',
  styleUrls: ['./json-diff.css'],
})
export class JsonDiff implements OnInit {
  @Input({ required: true }) instanceId!: string;

  // Working drafts
  left = signal('[\n  { "id": 1, "name": "Ada", "role": "admin" },\n  { "id": 2, "name": "Bob", "role": "user" }\n]');
  right = signal('[\n  { "id": 2, "name": "Bob", "role": "manager" },\n  { "id": 1, "name": "Ada", "role": "admin" },\n  { "id": 3, "name": "Charlie", "role": "guest" }\n]');

  // Compared snapshots (only updated when user clicks Compare or Format & Sort)
  comparedLeft = signal(this.left());
  comparedRight = signal(this.right());

  result = signal('');
  changeCount = signal<number | null>(null);
  isIdentical = signal(false);
  errorMsg = signal<string | null>(null);

  viewMode = signal<'visual' | 'semantic'>('visual');
  renderSideBySide = signal(true);

  ngOnInit() {
    this.compare();
  }

  setViewMode(mode: 'visual' | 'semantic') {
    this.viewMode.set(mode);
  }

  toggleLayout() {
    this.renderSideBySide.update((v) => !v);
  }

  formatAndSort() {
    try {
      this.errorMsg.set(null);
      const formattedLeft = sortAndFormatJson(this.left());
      const formattedRight = sortAndFormatJson(this.right());
      this.left.set(formattedLeft);
      this.right.set(formattedRight);
      this.comparedLeft.set(formattedLeft);
      this.comparedRight.set(formattedRight);
      this.runDiff(formattedLeft, formattedRight);
    } catch (err) {
      this.errorMsg.set(`Formatting error: ${(err as Error).message}`);
    }
  }

  onLeftChange(val: string) {
    this.left.set(val);
  }

  onRightChange(val: string) {
    this.right.set(val);
  }

  compare() {
    this.comparedLeft.set(this.left());
    this.comparedRight.set(this.right());
    this.runDiff(this.left(), this.right());
  }

  private runDiff(leftVal: string, rightVal: string) {
    try {
      this.errorMsg.set(null);
      const { summary, changeCount } = diffJson(leftVal, rightVal);
      this.result.set(summary);
      this.changeCount.set(changeCount);
      this.isIdentical.set(changeCount === 0);
    } catch (error) {
      const msg = `Invalid JSON: ${(error as Error).message}`;
      this.errorMsg.set(msg);
      this.changeCount.set(null);
      this.isIdentical.set(false);
      this.result.set(msg);
    }
  }
}
