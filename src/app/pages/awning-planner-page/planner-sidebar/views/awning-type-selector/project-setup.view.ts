import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AwningType } from '../../../../../models/awning.models';

@Component({
  selector: 'app-project-setup-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './project-setup.view.scss',
  templateUrl: './project-setup.view.html',
})
export class ProjectSetupView {
  readonly selectedType = input<AwningType | null>(null);
  readonly customerName = input('');
  readonly projectName = input('');

  readonly typeChange = output<AwningType>();
  readonly customerNameChange = output<string>();
  readonly projectNameChange = output<string>();

  onCustomerNameInput(event: Event): void {
    this.customerNameChange.emit((event.target as HTMLInputElement).value);
  }

  onProjectNameInput(event: Event): void {
    this.projectNameChange.emit((event.target as HTMLInputElement).value);
  }
}
