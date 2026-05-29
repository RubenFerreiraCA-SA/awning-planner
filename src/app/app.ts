import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AwningPlannerPageComponent } from './pages/awning-planner-page/awning-planner-page';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AwningPlannerPageComponent],
  template: '<app-awning-planner-page />',
})
export class App {}
