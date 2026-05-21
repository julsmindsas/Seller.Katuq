import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportPublicComponent } from './report-public.component';

const routes: Routes = [
  { path: ':id', component: ReportPublicComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportPublicRoutingModule {}
