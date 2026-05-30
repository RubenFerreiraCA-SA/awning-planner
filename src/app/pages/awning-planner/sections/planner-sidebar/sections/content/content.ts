import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EstimateSummaryComponent } from '../../../../../../components/estimate-summary/estimate-summary';
import { MaterialSettingsPanelComponent } from '../../../../../../components/material-settings-panel/material-settings-panel';
import { PlannerSidebarFacade } from '../../planner-sidebar.facade';
import { MeasureFormView } from './views/measure-form/measure-form';
import { ProjectSetupView } from './views/project-setup/project-setup';

@Component({
  selector: 'app-sidebar-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProjectSetupView,
    MeasureFormView,
    MaterialSettingsPanelComponent,
    EstimateSummaryComponent,
  ],
  templateUrl: './content.html',
  styleUrl: './content.scss',
})
export class SidebarContentSection {
  readonly vm = inject(PlannerSidebarFacade);
}
