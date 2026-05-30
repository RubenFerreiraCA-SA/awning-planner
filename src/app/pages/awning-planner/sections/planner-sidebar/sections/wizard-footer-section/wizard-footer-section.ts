import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';

@Component({
  selector: 'app-wizard-footer-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wizard-footer-section.html',
  styleUrl: './wizard-footer-section.scss',
})
export class WizardFooterSection {
  readonly vm = inject(PlannerSidebarFacade);
}
