import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentCallbackComponent } from './payment-callback.component';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

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
    RouterModule.forChild(routes),
    HttpClientModule
  ]
})
export class PaymentCallbackModule { }
