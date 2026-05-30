import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';

@Component({
  selector: 'app-sidebar-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterSection {
  readonly vm = inject(PlannerSidebarFacade);
}
