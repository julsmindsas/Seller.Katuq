import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CrmDashboardComponent } from './components/crm-dashboard/crm-dashboard.component';
import { ContactListComponent } from './components/contact-list/contact-list.component';
import { ContactDetailComponent } from './components/contact-detail/contact-detail.component';
import { PipelineViewComponent } from './components/pipeline-view/pipeline-view.component';
import { TaskListComponent } from './components/task-list/task-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: CrmDashboardComponent },
  { path: 'contacts', component: ContactListComponent },
  { path: 'contacts/:id', component: ContactDetailComponent },
  { path: 'pipeline', component: PipelineViewComponent },
  { path: 'tasks', component: TaskListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrmRoutingModule {}
