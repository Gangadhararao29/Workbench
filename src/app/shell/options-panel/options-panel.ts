import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InstanceService, ToolInstance } from '../../core/instance-service';

@Component({
  selector: 'app-options-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './options-panel.html',
  styleUrls: ['./options-panel.css']
})
export class OptionsPanel implements OnChanges {
  @Input({ required: true }) instance!: ToolInstance;
  editingName = false;
  nameDraft = '';

  constructor(private instanceService: InstanceService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['instance'] && !this.editingName) {
      this.nameDraft = this.instance.label;
    }
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
    this.instanceService.updateConfig(this.instance.id, { [key]: value });
  }
}