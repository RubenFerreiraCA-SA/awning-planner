import { Component, EventEmitter, Input, input, Output } from '@angular/core';

@Component({
  selector: 'app-step-progress-section',
  imports: [],
  templateUrl: './step-progress-section.html',
  styleUrl: './step-progress-section.scss',
})
export class StepProgressSection {
  @Input() panelDefs: { label: string; hint: string }[] = [];
  @Input() panelIndex = 0;

  @Output() setPanel = new EventEmitter<number>();
}
