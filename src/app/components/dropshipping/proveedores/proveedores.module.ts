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
import { InputSwitchModule } from 'primeng/inputswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { InputTextareaModule } from 'primeng/inputtextarea';

// Routing
import { ProveedoresRoutingModule } from './proveedores-routing.module';

// Components
import { ListaProveedoresComponent } from './lista-proveedores/lista-proveedores.component';
import { CrearProveedorComponent } from './crear-proveedor/crear-proveedor.component';
import { DetalleProveedorComponent } from './detalle-proveedor/detalle-proveedor.component';

@NgModule({
  declarations: [
    ListaProveedoresComponent,
    CrearProveedorComponent,
    DetalleProveedorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ProveedoresRoutingModule,
    // PrimeNG
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    InputSwitchModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    InputTextareaModule
  ]
})
export class ProveedoresModule { }