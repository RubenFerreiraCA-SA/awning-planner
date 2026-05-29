import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DrawingPlaneComponent } from './drawing-plane/drawing-plane';
import { PlannerSidebarComponent } from './planner-sidebar/planner-sidebar';

@Component({
  selector: 'app-awning-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlannerSidebarComponent, DrawingPlaneComponent],
  styleUrl: './awning-planner-page.scss',
  template: `
    <app-planner-sidebar class="page-sidebar" #sidebar />
    <main class="page-canvas" aria-label="Drawing area">
      <app-drawing-plane [configureMode]="sidebar.isConfigureMode()" />
    </main>
  `,
})
export class AwningPlannerPageComponent {}
