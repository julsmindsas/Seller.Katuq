import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CrmListComponent } from './components/crm-list/crm-list.component';
import { CrmDetailComponent } from './components/crm-detail/crm-detail.component';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: CrmListComponent },
  { path: 'detail/:id', component: CrmDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrmRoutingModule {}
