import { Component, DoCheck, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { generateGuids, formatGuids, GuidFormat, GuidCasing } from '../../../core/engines/guid-engine';
import { InstanceService } from '../../../core/tool/tool-instance';
import { ToolState, ToolStateSnapshot } from '../../../core/tool/tool-state';

@Component({
  selector: 'app-guid-generator',
  standalone: true,
  imports: [FormsModule, MatButtonModule],
  templateUrl: './guid-generator.html',
  styleUrls: ['./guid-generator.css'],
})
export class GuidGenerator implements OnInit, DoCheck {
  @Input({ required: true }) instanceId!: string;
  private toolState: ToolState | null = null;
  private stateFingerprint = '';

  constructor(private instanceService: InstanceService) {}

  count = 1;
  casing: GuidCasing = 'lower';
  format: GuidFormat = 'plain';
  result = signal('');

  ngOnInit(): void {
    this.toolState = new ToolState(this.instanceService, this.instanceId, 'guid-generator');
    this.restoreToolState(this.toolState.state());
    this.stateFingerprint = JSON.stringify(this.readToolState());
  }

  ngDoCheck(): void {
    const snapshot = this.readToolState();
    const fingerprint = JSON.stringify(snapshot);
    if (!this.toolState || fingerprint === this.stateFingerprint) return;
    this.stateFingerprint = fingerprint;
    this.toolState.save(snapshot);
  }

  private readToolState(): ToolStateSnapshot {
    return {
      input: { count: this.count },
      output: { result: this.result() },
      options: { casing: this.casing, format: this.format },
    };
  }

  private restoreToolState(state: ToolStateSnapshot): void {
    this.count = state.input['count'];
    this.casing = state.options['casing'];
    this.format = state.options['format'];
    this.result.set(state.output['result'] ?? '');
  }

  setCount(count: number): void {
    this.count = count;
    this.saveToolState();
  }

  setCasing(casing: GuidCasing): void {
    this.casing = casing;
    this.saveToolState();
  }

  setFormat(format: GuidFormat): void {
    this.format = format;
    this.saveToolState();
  }

  private saveToolState(): void {
    if (!this.toolState) return;
    const snapshot = this.readToolState();
    this.stateFingerprint = JSON.stringify(snapshot);
    this.toolState.save(snapshot);
  }

  generate(): void {
    const guids = generateGuids(this.count);
    this.result.set(formatGuids(guids, this.format, this.casing));
    this.saveToolState();
  }
}
