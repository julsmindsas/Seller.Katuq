import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../../shared/shared.module';
import { BillingComponent } from './billing.component';

const routes: Routes = [
  { path: '', component: BillingComponent }
];

@NgModule({
  declarations: [BillingComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ButtonModule,
    TooltipModule,
    SharedModule
  ]
})
export class BillingModule {}
