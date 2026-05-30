import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawingPlaneComponent } from './sections/drawing-plane/drawing-plane';
import { PlannerSidebarComponent } from './sections/planner-sidebar/planner-sidebar';
import { PlannerSidebarFacade } from './sections/planner-sidebar/planner-sidebar.facade';

@Component({
  selector: 'app-awning-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlannerSidebarComponent, DrawingPlaneComponent],
  providers: [PlannerSidebarFacade],
  styleUrl: './awning-planner.scss',
  templateUrl: './awning-planner.html',
})
export class AwningPlannerPage {
  readonly vm = inject(PlannerSidebarFacade);
}
