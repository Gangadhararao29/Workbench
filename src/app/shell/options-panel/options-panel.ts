import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService, ToolInstance } from '../../core/tool/tool-instance';
import { ToolState } from '../../core/tool/tool-state';

@Component({
  selector: 'app-options-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './options-panel.html',
  styleUrls: ['./options-panel.css']
})
export class OptionsPanel {
  private currentInstance!: ToolInstance;
  @Input({ required: true })
  set instance(instance: ToolInstance) {
    this.currentInstance = instance;
    if (!this.editingName) this.nameDraft = instance.label;
    this.toolState = this.usesToolState(instance)
      ? new ToolState(this.instanceService, instance.id)
      : null;
  }
  get instance(): ToolInstance {
    if (!this.currentInstance || !this.toolState) return this.currentInstance;
    return {
      ...this.currentInstance,
      config: this.toolState.state().options,
    };
  }
  editingName = false;
  nameDraft = '';
  regexFilter = '';
  jsonPathFilter = '';
  private toolState: ToolState | null = null;

  constructor(private instanceService: InstanceService) {}

  filterRow(token: string, desc: string): boolean {
    if (!this.regexFilter.trim()) return true;
    const q = this.regexFilter.toLowerCase().trim();
    return token.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  }

  filterJsonPathRow(token: string, desc: string): boolean {
    if (!this.jsonPathFilter.trim()) return true;
    const q = this.jsonPathFilter.toLowerCase().trim();
    return token.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  }

  private usesToolState(instance: ToolInstance): boolean {
    return ['json', 'dotnet', 'sql', 'ef'].includes(instance.groupId);
  }

  startEditingName() {
    this.nameDraft = this.instance.label;
    this.editingName = true;
  }

  saveName() {
    const label = this.nameDraft.trim();
    if (!label) return;
    this.instanceService.updateLabel(this.instance.id, label);
    this.editingName = false;
  }

  cancelNameEdit() {
    this.nameDraft = this.instance.label;
    this.editingName = false;
  }

  update(key: string, value: any) {
    if (this.toolState) {
      this.toolState?.updateOptions({ [key]: value });
    } else {
      this.instanceService.updateConfig(this.instance.id, { [key]: value });
    }
  }
}