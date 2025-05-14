import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { PickingPackingRoutingModule } from './picking-packing-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

// Componentes
import { PickingListComponent } from './picking-list/picking-list.component';
import { PickingDetailComponent } from './picking-detail/picking-detail.component';
import { PackingListComponent } from './packing-list/packing-list.component';
import { PackingDetailComponent } from './packing-detail/packing-detail.component';

// Servicios
import { PickingPackingService } from '../../shared/services/picking-packig/picking-packing.service';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    PickingPackingRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    CalendarModule,
    DropdownModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    PaginatorModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  declarations: [
    PickingListComponent,
    PickingDetailComponent,
    PackingListComponent,
    PackingDetailComponent
  ],
  exports: [
    PickingListComponent,
    PickingDetailComponent,
    PackingListComponent,
    PackingDetailComponent
  ],
  providers: [
  ]
})
export class PickingPackingModule { } 