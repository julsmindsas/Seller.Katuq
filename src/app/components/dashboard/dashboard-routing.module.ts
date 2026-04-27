import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LegacyDashboardComponent } from './legacy-dashboard.component';
import { DashboardHomeComponent } from './home/dashboard-home.component';
import { ReportBuilderComponent } from './builder/report-builder.component';

const routes: Routes = [
  { path: '', component: DashboardHomeComponent },
  { path: 'classic', component: LegacyDashboardComponent },
  { path: 'builder', component: ReportBuilderComponent },
  { path: 'builder/:id', component: ReportBuilderComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
