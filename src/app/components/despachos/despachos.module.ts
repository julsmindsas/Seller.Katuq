import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

import { DespachosRoutingModule } from './despachos-routing.module';
import { DespachosComponent } from './despachos/despachos.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxHotkeysModule } from '@balticcode/ngx-hotkeys';
import { GalleryModule } from '@ks89/angular-modal-gallery';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ArchwizardModule } from 'angular-archwizard';
import { NgxStarRatingModule } from 'ngx-star-rating';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { SliderModule } from 'primeng/slider';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { TreeSelectModule } from 'primeng/treeselect';
import { VentasRoutingModule } from '../ventas/ventas-routing.module';
import { LogisticaService } from '../../shared/services/despachos/logistica.services';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    DespachosRoutingModule,
    NgSelectModule,
    CommonModule,
    SharedModule,
    VentasRoutingModule,
    NgxDatatableModule,
    TabViewModule,
    ArchwizardModule,
    TreeSelectModule,
    SliderModule,
    GalleryModule,
    FormsModule,
    CalendarModule,
    FormsModule,
    NgxHotkeysModule.forRoot(),
    NgxStarRatingModule,
    TableModule,
    MultiSelectModule,
    ToastModule
  ],
  providers: [LogisticaService],
  declarations: [DespachosComponent]
})
export class DespachosModule { }

