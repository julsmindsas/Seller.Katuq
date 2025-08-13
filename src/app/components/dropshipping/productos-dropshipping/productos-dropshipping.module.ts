import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared.module';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabViewModule } from 'primeng/tabview';

// Routing
import { ProductosDropshippingRoutingModule } from './productos-dropshipping-routing.module';

// Components
import { CatalogoDropshippingComponent } from './catalogo-dropshipping/catalogo-dropshipping.component';
import { ImportarProductosComponent } from './importar-productos/importar-productos.component';

@NgModule({
  declarations: [
    CatalogoDropshippingComponent,
    ImportarProductosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ProductosDropshippingRoutingModule,
    // PrimeNG
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    InputSwitchModule,
    FileUploadModule,
    ProgressBarModule,
    TabViewModule
  ]
})
export class ProductosDropshippingModule { }