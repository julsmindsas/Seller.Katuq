import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LegacyDashboardComponent } from './legacy-dashboard.component';
import { DashboardHomeComponent } from './home/dashboard-home.component';
import { ReportBuilderComponent } from './builder/report-builder.component';
import { ReportViewComponent } from './view/report-view.component';

const routes: Routes = [
  { path: '', component: DashboardHomeComponent },
  { path: 'classic', component: LegacyDashboardComponent },
  { path: 'builder', component: ReportBuilderComponent },
  { path: 'builder/:id', component: ReportBuilderComponent },
  { path: 'view/:id', component: ReportViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
