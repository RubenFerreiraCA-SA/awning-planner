import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AwningType } from '../../../../../models/awning.models';

@Component({
  selector: 'app-awning-type-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './awning-type-selector.scss',
  templateUrl: './awning-type-selector.html',
})
export class AwningTypeSelectorView {
  readonly selectedType = input<AwningType | null>(null);
  readonly typeChange = output<AwningType>();
}
