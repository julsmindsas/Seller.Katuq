import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { ListaPreciosRoutingModule } from './lista-precios-routing.module';
import { ListaPreciosComponent } from './lista-precios/lista-precios.component';
import { EditarPreciosTipoClienteComponent } from './editar-precios-tipo-cliente/editar-precios-tipo-cliente.component';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ListaPreciosRoutingModule,
    TableModule,
    PaginatorModule,
    TabViewModule,
    InputTextModule,
    ButtonModule,
    NgbModule
  ],
  declarations: [
    ListaPreciosComponent,
    EditarPreciosTipoClienteComponent
  ]
})
export class ListaPreciosModule { }

