import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { ListaPreciosRoutingModule } from './lista-precios-routing.module';
import { ListaPreciosComponent } from './lista-precios/lista-precios.component';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    ListaPreciosRoutingModule,
    TableModule,
    PaginatorModule,
    TabViewModule,
    InputTextModule,
    ButtonModule
  ],
  declarations: [
    ListaPreciosComponent
  ]
})
export class ListaPreciosModule { }

