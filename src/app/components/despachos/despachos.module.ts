import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SharedModule } from "../../shared/shared.module";
import { DespachosRoutingModule } from "./despachos-routing.module";
import { DespachosComponent } from "./despachos/despachos.component";
import { NgSelectModule } from "@ng-select/ng-select";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgxHotkeysModule } from "@balticcode/ngx-hotkeys";
import { GalleryModule } from "@ks89/angular-modal-gallery";
import { NgxDatatableModule } from "@swimlane/ngx-datatable";
import { ArchwizardModule } from "angular-archwizard";
import { NgxStarRatingModule } from "ngx-star-rating";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { CalendarModule } from "primeng/calendar";
import { MultiSelectModule } from "primeng/multiselect";
import { SliderModule } from "primeng/slider";
import { TableModule } from "primeng/table";
import { TabViewModule } from "primeng/tabview";
import { ToastModule } from "primeng/toast";
import { TreeSelectModule } from "primeng/treeselect";
import { VentasRoutingModule } from "../ventas/ventas-routing.module";
import { LogisticaService } from "../../shared/services/despachos/logistica.services";
import { ZonaManagementService } from "./services/zona-management.service";
import { HttpClientModule } from "@angular/common/http";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { DropdownModule } from "primeng/dropdown";
import { RippleModule } from "primeng/ripple";
import { RouterModule } from "@angular/router";
import { DynamicDialogModule, DialogService } from "primeng/dynamicdialog";
import { MenuModule } from "primeng/menu";
import { SplitButtonModule } from 'primeng/splitbutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AccordionModule } from 'primeng/accordion';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ChipsModule } from 'primeng/chips';

// Componentes
import { TablaPedidosComponent } from "./components/tabla-pedidos/tabla-pedidos.component";
import { DetalleEntregaComponent } from "./components/detalle-entrega/detalle-entrega.component";
import { TransportadoresComponent } from "./components/transportadores/transportadores.component";
import { GenerarOrdenComponent } from "./components/generar-orden/generar-orden.component";
import { OrdenesDespachoComponent } from "./components/ordenes-despacho/ordenes-despacho.component";
import { OrdenesDespachoV2Component } from "./components/ordenes-despacho-v2/ordenes-despacho-v2.component";
import { ImprimirPdfComponent } from "./components/imprimir-pdf/imprimir-pdf.component";
import { ObservacionesDetalleComponent } from "./components/observaciones-detalle/observaciones-detalle.component";
import { MapaUbicacionesComponent } from "./components/mapa-ubicaciones/mapa-ubicaciones.component";
import { PdfTemplateComponent } from "./components/pdf-template/pdf-template.component";
import { SeguimientoModalComponent } from "./components/seguimiento-modal/seguimiento-modal.component";
import { AnalisisDespachosComponent } from "./components/analisis-despachos/analisis-despachos.component";
import { ZonaGestionModalComponent } from "./components/zona-gestion-modal/zona-gestion-modal.component";

// Componentes de Enviame.io y Tracking Multiprovider
import { EnviameRatesModalComponent } from "./components/enviame/rates-modal/enviame-rates-modal.component";
import { CerezaCarrierModalComponent } from "./components/cereza/carrier-modal/cereza-carrier-modal.component";
import { EnviameCancelModalComponent } from "./components/enviame/cancel-modal/enviame-cancel-modal.component";
import { TrackingDetailsModalComponent } from "./components/enviame/tracking-details/tracking-details-modal.component";
import { OsmosisOrderExtrasComponent } from "./components/osmosis-order-extras/osmosis-order-extras.component";
import { EnviameHelperService } from "./components/enviame/services/enviame-helper.service";
import { EvidenciaEmpacadoModalComponent } from "./components/evidencia-empacado-modal/evidencia-empacado-modal.component";
import { DespachoExpressModalComponent } from "./components/despacho-express-modal/despacho-express-modal.component";
import { DispatchRulesConfigComponent } from "./components/dispatch-rules-config/dispatch-rules-config.component";

// Servicios para códigos DANE
import { DaneCodesService } from "../../shared/services/dane-codes.service";

// Pipes
import { TotalValorACobrarPipe } from "./pipes/total-valor-cobrar.pipe";

import { ImagenProductoPipe } from '../../shared/pipes/imagen-producto.pipe';
@NgModule({
  imports: [
    ImagenProductoPipe,
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
    MenuModule,
    SplitButtonModule,
    AutoCompleteModule,
    InputNumberModule,
    ProgressSpinnerModule,
    AccordionModule,
    CheckboxModule,
    InputTextareaModule,
    InputTextModule,
    DividerModule,
    ProgressBarModule,
    DialogModule,
    InputSwitchModule,
    ChipsModule,
    NgbNavModule,
    NgxHotkeysModule.forRoot(),
    NgxStarRatingModule,
  ],
  providers: [
    LogisticaService,
    DialogService,
    ZonaManagementService,
    EnviameHelperService,
    DaneCodesService
  ],
  declarations: [
    DespachosComponent,
    TablaPedidosComponent,
    DetalleEntregaComponent,
    TransportadoresComponent,
    GenerarOrdenComponent,
    OrdenesDespachoComponent,
    OrdenesDespachoV2Component,
    ImprimirPdfComponent,
    ObservacionesDetalleComponent,
    MapaUbicacionesComponent,
    PdfTemplateComponent,
    TotalValorACobrarPipe,
    SeguimientoModalComponent,
    AnalisisDespachosComponent,
    ZonaGestionModalComponent,
    // Componentes de Enviame.io y Tracking Multiprovider
    EnviameRatesModalComponent,
    CerezaCarrierModalComponent,
    EnviameCancelModalComponent,
    TrackingDetailsModalComponent,
    OsmosisOrderExtrasComponent,
    EvidenciaEmpacadoModalComponent,
    DespachoExpressModalComponent,
    DispatchRulesConfigComponent,
  ],
  exports: [DetalleEntregaComponent],
})
export class DespachosModule {}
