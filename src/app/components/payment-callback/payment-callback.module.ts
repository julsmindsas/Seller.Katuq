import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentCallbackComponent } from './payment-callback.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: PaymentCallbackComponent
  }
];

@NgModule({
  declarations: [PaymentCallbackComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class PaymentCallbackModule { }
