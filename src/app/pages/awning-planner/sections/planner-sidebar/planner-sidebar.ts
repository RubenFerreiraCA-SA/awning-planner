import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PlannerSidebarFacade } from './planner-sidebar.facade';
import { HeaderSection } from './sections/header/header';
import { SidebarContentSection } from './sections/content/content';
import { FooterSection } from './sections/footer/footer';

@Component({
  selector: 'app-planner-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeaderSection, SidebarContentSection, FooterSection],
  templateUrl: './planner-sidebar.html',
  styleUrl: './planner-sidebar.scss',
})
export class PlannerSidebarComponent {
  readonly vm = inject(PlannerSidebarFacade);
}
