import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

import { ProviderDashboardComponent } from './provider-dashboard/provider-dashboard.component';
import { ProviderIssuesTableComponent } from './provider-issues-table/provider-issues-table.component';
import { ProviderSummaryComponent } from './provider-summary/provider-summary.component';
import { ProviderDashboardService } from './provider-dashboard.service';

const routes: Routes = [
  { path: '', component: ProviderDashboardComponent },
];

@NgModule({
  declarations: [
    ProviderDashboardComponent,
    ProviderIssuesTableComponent,
    ProviderSummaryComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TableModule,
    TabViewModule,
    TooltipModule,
    ButtonModule,
    TagModule,
    SkeletonModule,
    InputTextModule,
    DropdownModule,
  ],
  providers: [ProviderDashboardService],
})
export class ProviderDashboardModule {}
