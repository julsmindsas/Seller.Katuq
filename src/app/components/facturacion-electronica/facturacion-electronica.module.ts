import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { FacturacionElectronicaRoutingModule } from './facturacion-electronica-routing.module';
import { FacturacionElectronicaComponent } from './facturacion-electronica.component';
import { InvoiceComposerComponent } from './composer/invoice-composer.component';
import { ManualInvoiceFormComponent } from './composer/manual-invoice-form.component';
import { InvoiceOrderPickerComponent } from './composer/invoice-order-picker.component';
import { InvoiceCustomerPickerComponent } from './composer/invoice-customer-picker.component';
import { ClientesSharedModule } from '../ventas/clientes/clientes-shared.module';
import { InvoiceConceptPickerComponent } from './composer/invoice-concept-picker.component';
import { InvoiceDraftsComponent } from './composer/invoice-drafts.component';

@NgModule({
  declarations: [FacturacionElectronicaComponent, InvoiceComposerComponent, ManualInvoiceFormComponent, InvoiceOrderPickerComponent, InvoiceCustomerPickerComponent, InvoiceConceptPickerComponent, InvoiceDraftsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ClientesSharedModule,
    FacturacionElectronicaRoutingModule,
  ],
})
export class FacturacionElectronicaModule {}
