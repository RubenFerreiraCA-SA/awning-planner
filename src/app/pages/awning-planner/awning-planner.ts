import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DrawingPlaneComponent } from './sections/drawing-plane/drawing-plane';
import { PlannerSidebarComponent } from './sections/planner-sidebar/planner-sidebar';

@Component({
  selector: 'app-awning-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlannerSidebarComponent, DrawingPlaneComponent],
  styleUrl: './awning-planner.scss',
  templateUrl: './awning-planner.html',
})
export class AwningPlannerPage {}
