import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HeaderSection } from './sections/header-section/header-section';
import { StepProgressSection } from './sections/step-progress-section/step-progress-section';
import { PlannerSidebarFacade } from './planner-sidebar.facade';
import { WizardPanelSection } from './sections/wizard-panel-section/wizard-panel-section';
import { WizardFooterSection } from './sections/wizard-footer-section/wizard-footer-section';
import { ScrollModeSection } from './sections/scroll-mode-section/scroll-mode-section';

@Component({
  selector: 'app-planner-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderSection,
    StepProgressSection,
    WizardPanelSection,
    WizardFooterSection,
    ScrollModeSection,
  ],
  providers: [PlannerSidebarFacade],
  templateUrl: './planner-sidebar.html',
  styleUrl: './planner-sidebar.scss',
})
export class PlannerSidebarComponent {
  readonly vm = inject(PlannerSidebarFacade);

  // Public bridge used by the parent page template via #sidebar.
  // Keep this here so the page does not need to know about the sidebar facade.
  readonly isConfigureMode = this.vm.isConfigureMode;
  readonly canDraw = this.vm.canDraw;
}
