import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AwningType } from '../../../../../../../../models/awning.models';

@Component({
  selector: 'app-type-selection-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './type-selection.html',
  styleUrl: './type-selection.scss',
})
export class TypeSelectionView {
  readonly selectedType = input<AwningType | null>(null);
  readonly typeChange = output<AwningType>();

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AwningType;

    if (value) {
      this.typeChange.emit(value);
    }
  }
}
