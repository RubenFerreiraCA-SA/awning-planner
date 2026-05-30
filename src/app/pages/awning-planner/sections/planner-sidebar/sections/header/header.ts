import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';

@Component({
  selector: 'app-sidebar-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderSection {
  readonly vm = inject(PlannerSidebarFacade);
}
