import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AwningType } from '../../../../../../models/awning.models';

@Component({
  selector: 'app-project-setup-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './project-setup.scss',
  templateUrl: './project-setup.html',
})
export class ProjectSetupView {
  readonly selectedType = input<AwningType | null>(null);
  readonly customerName = input('');
  readonly projectName = input('');

  readonly typeChange = output<AwningType>();
  readonly customerNameChange = output<string>();
  readonly projectNameChange = output<string>();
  readonly confirmSetup = output<void>();

  readonly formValid = computed(() => {
    return !!this.selectedType()
      && this.customerName().trim().length > 0
      && this.projectName().trim().length > 0;
  });

  onCustomerNameInput(event: Event): void {
    this.customerNameChange.emit(this.getInputValue(event));
  }

  onProjectNameInput(event: Event): void {
    this.projectNameChange.emit(this.getInputValue(event));
  }

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AwningType;

    if (value) {
      this.typeChange.emit(value);
    }
  }

  onConfirm(): void {
    if (!this.formValid()) {
      return;
    }

    this.confirmSetup.emit();
  }

  private getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}