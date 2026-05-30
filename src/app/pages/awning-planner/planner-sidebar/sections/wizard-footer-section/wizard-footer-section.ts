import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';

@Component({
  selector: 'app-wizard-footer-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wizard-footer-section.html',
  styleUrl: '../../planner-sidebar.scss',
})
export class WizardFooterSection {
  readonly vm = inject(PlannerSidebarFacade);
}
