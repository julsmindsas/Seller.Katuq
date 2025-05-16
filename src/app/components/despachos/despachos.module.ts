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
import { HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { RippleModule } from 'primeng/ripple';
import { RouterModule } from '@angular/router';
import { DynamicDialogModule, DialogService } from 'primeng/dynamicdialog';

// Componentes
import { TablaPedidosComponent } from './components/tabla-pedidos/tabla-pedidos.component';
import { DetalleEntregaComponent } from './components/detalle-entrega/detalle-entrega.component';
import { TransportadoresComponent } from './components/transportadores/transportadores.component';
import { GenerarOrdenComponent } from './components/generar-orden/generar-orden.component';
import { OrdenesDespachoComponent } from './components/ordenes-despacho/ordenes-despacho.component';
import { ImprimirPdfComponent } from './components/imprimir-pdf/imprimir-pdf.component';
import { ObservacionesDetalleComponent } from './components/observaciones-detalle/observaciones-detalle.component';

// Pipes
import { TotalValorACobrarPipe } from './pipes/total-valor-cobrar.pipe';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    DespachosRoutingModule,
    NgSelectModule,
    NgxDatatableModule,
    TabViewModule,
    ArchwizardModule,
    TreeSelectModule,
    SliderModule,
    GalleryModule,
    FormsModule,
    HttpClientModule,
    CalendarModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    ButtonModule,
    TooltipModule,
    DropdownModule,
    RippleModule,
    RouterModule,
    DynamicDialogModule,
    NgxHotkeysModule.forRoot(),
    NgxStarRatingModule
  ],
  providers: [
    LogisticaService,
    DialogService
  ],
  declarations: [
    DespachosComponent,
    TablaPedidosComponent,
    DetalleEntregaComponent,
    TransportadoresComponent,
    GenerarOrdenComponent,
    OrdenesDespachoComponent,
    ImprimirPdfComponent,
    ObservacionesDetalleComponent,
    TotalValorACobrarPipe
  ]
})
export class DespachosModule { }

