import { ChangeDetectionStrategy, Component, EventEmitter, Input, input, Output, output } from '@angular/core';
import { AwningType } from '../../../../../models/awning.models';

@Component({
  selector: 'app-project-setup-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './project-setup.view.scss',
  templateUrl: './project-setup.view.html',
})
export class ProjectSetupView {
  @Input() selectedType: AwningType | null = null;
  @Output() typeChange = new EventEmitter<AwningType>();
}
