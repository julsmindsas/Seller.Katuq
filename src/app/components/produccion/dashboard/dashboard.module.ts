import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardComponent } from './dashboard.component';
import { CerrararticuloComponent } from './cerrararticulo/cerrararticulo.component';
import { ProcesoTrackingComponent } from './tracking/proceso-tracking.component';
import { CerrarProductoComponent } from './cerrarproducto/cerrarproducto.component';

@NgModule({
  declarations: [
    DashboardComponent,
    CerrararticuloComponent,
    ProcesoTrackingComponent,
    CerrarProductoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    NgxDatatableModule,
    TableModule,
    DropdownModule,
    CalendarModule,
    MultiSelectModule,
    TooltipModule
  ],
  exports: [
    DashboardComponent
  ]
})
export class DashboardModule { } 