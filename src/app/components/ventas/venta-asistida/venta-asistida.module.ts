import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentaAsistidaComponent } from './venta-asistida.component';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerInfoComponent } from './components/customer-info/customer-info.component';
import { ProductGridComponent } from './components/product-grid/product-grid.component';
import { CartPreviewComponent } from './components/cart-preview/cart-preview.component';
import { PaymentSectionComponent } from './components/payment-section/payment-section.component';
import { FacturacionSectionComponent } from './components/facturacion-section/facturacion-section.component';
import { EntregaSectionComponent } from './components/entrega-section/entrega-section.component';
import { InfoPaises } from '../../../../Mock/pais-estado-ciudad';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { CustomerQuickCreateComponent } from './components/customer-quick-create/customer-quick-create.component';
import { ConfirmSectionComponent } from './components/confirm-section/confirm-section.component';
// Importar módulos de PrimeNG y formularios según se requiera

@NgModule({
  declarations: [
    VentaAsistidaComponent,
    CustomerInfoComponent,
    ProductGridComponent,
    CartPreviewComponent,
    PaymentSectionComponent,
    FacturacionSectionComponent,
    EntregaSectionComponent,
    CustomerQuickCreateComponent,
    ConfirmSectionComponent
  ],
  imports: [
    CommonModule,
    AutoCompleteModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule
    // PrimeNG modules aquí (ej: TableModule, InputTextModule, etc.)
  ],
  providers: [InfoPaises, MessageService],
  exports: [VentaAsistidaComponent]
})
export class VentaAsistidaModule { } 