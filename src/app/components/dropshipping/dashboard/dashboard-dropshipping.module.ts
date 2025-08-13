import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

// Component
import { DashboardDropshippingComponent } from './dashboard-dropshipping.component';

@NgModule({
  declarations: [
    DashboardDropshippingComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild([{ path: '', component: DashboardDropshippingComponent }]),
    // PrimeNG
    CardModule,
    TagModule
  ]
})
export class DashboardDropshippingModule { }