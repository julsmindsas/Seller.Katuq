import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingComponent } from './pricing.component';
import { PricingRoutingModule } from './pricing-routing.module';
import { SharedModule } from '../../shared/shared.module';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@NgModule({
  declarations: [PricingComponent],
  imports: [
    CommonModule,
    PricingRoutingModule,
    SharedModule,
    CardModule,
    ButtonModule
  ]
})
export class PricingModule { }
