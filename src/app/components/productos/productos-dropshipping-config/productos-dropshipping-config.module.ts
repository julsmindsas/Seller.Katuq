import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared
import { SharedModule } from '../../../shared/shared.module';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';

// Component
import { ProductosDropshippingConfigComponent } from './productos-dropshipping-config.component';

const routes: Routes = [
  {
    path: '',
    component: ProductosDropshippingConfigComponent
  }
];

@NgModule({
  declarations: [
    ProductosDropshippingConfigComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes),
    // PrimeNG
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CheckboxModule,
    InputSwitchModule,
    InputTextareaModule,
    ToastModule
  ]
})
export class ProductosDropshippingConfigModule { }