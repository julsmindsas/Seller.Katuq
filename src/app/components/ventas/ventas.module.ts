import { NgModule, Injector } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SharedModule } from "../../../app/shared/shared.module";
import { NgxDatatableModule } from "@swimlane/ngx-datatable";
import { VentasRoutingModule } from "./ventas-routing.module";
import { CrearVentasComponent } from "./crear-ventas/crear-ventas.component";
import { TabViewModule } from "primeng/tabview";
import { NgSelectModule } from "@ng-select/ng-select";
import { ArchwizardModule } from "angular-archwizard";
import { ClientesComponent } from "./clientes/clientes.component";
import { QuickViewComponent } from "./quick-view/quick-view.component";
import { EcomerceProductsComponent } from "./catalogo/ecomerce-products/ecomerce-products.component";
import { TreeSelectModule } from "primeng/treeselect";
import { SliderModule } from "primeng/slider";
import { CatalogoSharedModule } from "./catalogo/catalogo-shared.module";
import {
  GalleryModule,
  ModalGalleryService,
} from "@ks89/angular-modal-gallery";
import { CarritoComponent } from "./carrito/carrito.component";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NotasComponent } from "./notas/notas/notas.component";
import { CheckOutComponent } from "../ventas/checkout/checkout.component";
import { ConfirmComponent } from "./confirm/confirm.component";
import { CalendarModule } from "primeng/calendar";
import { DropdownModule } from "primeng/dropdown";
import { NgxHotkeysModule, NgxHotkeysService } from "@balticcode/ngx-hotkeys";
import { NgxStarRatingModule } from "ngx-star-rating";
import { ListOrdersComponent } from "./list/list.component";
import { TableModule } from "primeng/table";
import { PedidoEntregaComponent } from "./entrega/pedido-entrega.component";
import { PedidoFacturacionComponent } from "./facturacion/pedido-facturacion.component";
import { MultiSelectModule } from "primeng/multiselect";
import { PedidosUtilService } from "./service/pedidos.util.service";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { DialogModule } from "primeng/dialog";
import { SidebarModule } from "primeng/sidebar";
import { TagModule } from "primeng/tag";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { SkeletonModule } from "primeng/skeleton";
import { MessageModule } from "primeng/message";
import { AccordionModule } from "primeng/accordion";
import { DataViewModule } from "primeng/dataview";
import { TabMenuModule } from "primeng/tabmenu";
import { ToggleButtonModule } from "primeng/togglebutton";
import { InputTextareaModule } from "primeng/inputtextarea";
import { InputMaskModule } from "primeng/inputmask";
import { CardModule } from "primeng/card";
import { MenuModule } from "primeng/menu";
import { AsentarpagomanualComponent } from "./asentarpagomanual/asentarpagomanual.component";
import { AutoCompleteModule } from "primeng/autocomplete";
import { ClientesListaComponent } from "./clientes/lista/clientes-lista.component";
import { ClientesCorporativosComponent } from "./clientes/corporativos/clientes-corporativos.component";
import { LeadFormModalComponent } from "../crm/components/lead-form-modal/lead-form-modal.component";
import { CargaVentasComponent } from "./carga-ventas/carga-ventas.component";
import { HttpClientModule } from "@angular/common/http";
import { VoiceInteractionModule } from "../../shared/components/voice-interaction/voice-interaction.module";
import { PosComponent } from "./pos2/pos.component";
import { ProductCategoryComponent } from "./pos2/widgets/product-category/product-category.component";
import { ProductComponent } from "./pos2/widgets/product/product.component";
import { CreateCustomerModalComponent } from "./pos2/widgets/create-customer-modal/create-customer-modal.component";
import { PosCheckoutComponent } from "./pos2/widgets/pos-checkout/pos-checkout.component";
import { ClientesSharedModule } from "./clientes/clientes-shared.module";
import { CardPaymentComponent } from "./pos2/widgets/card-payment/card-payment";
import { CashPaymentComponent } from "./pos2/widgets/cash-payment/cash-payment";
import { EWalletPaymentComponent } from "./pos2/widgets/ewallet-payment/ewallet-payment";
import { WarehouseSelectorComponent } from "./pos2/widgets/warehouse-selector/warehouse-selector";
import { ImageOptimizerDirective } from "../../shared/directives/image-optimizer.directive";
import { CashClosingComponent } from "./pos2/widgets/cash-closing/cash-closing.component";
import { CashClosingHistoryComponent } from "./pos2/widgets/cash-closing-history/cash-closing-history.component";
import { DireccionEstructuradaComponent } from "./entrega/direccion-estructurada/direccion-estructurada.component";
import { CustomerSectionComponent } from "./pos2/widgets/customer-section/customer-section.component";
import { CartSummaryComponent } from "./pos2/widgets/cart-summary/cart-summary.component";
import { PaymentSelectorComponent } from "./pos2/widgets/payment-selector/payment-selector.component";
import {
  PosCheckoutService,
  POS_CHECKOUT_SERVICE,
} from "../../shared/services/ventas/pos-checkout.service";
import { ReporteCierreComponent } from "./pos2/widgets/cash-closing/reporte-cierre/reporte-cierre.component";
import { DespachosModule } from "../despachos/despachos.module";
import { ListProduccionComponent } from "./list/list-produccion.component";
import { OrderHistoryTimelineComponent } from "./order-history-timeline/order-history-timeline.component";
import { OrdenVentaComponent } from "./orden-venta/orden-venta.component";
import { ImportModalModule } from "../../shared/components/import-modal/import-modal.module";
import { CustomerMetricsComponent } from "./clientes/customer-metrics/customer-metrics.component";
import { GlobalMetricsComponent } from "./clientes/global-metrics/global-metrics.component";

@NgModule({
  imports: [
    NgSelectModule,
    CommonModule,
    SharedModule,
    LeadFormModalComponent,
    VentasRoutingModule,
    NgxDatatableModule,
    TabViewModule,
    AutoCompleteModule,
    ArchwizardModule,
    TreeSelectModule,
    SliderModule,
    GalleryModule,
    FormsModule,
    ReactiveFormsModule,
    CalendarModule,
    DropdownModule,
    NgxHotkeysModule.forRoot(),
    NgxStarRatingModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    SidebarModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    MessageModule,
    HttpClientModule,
    VoiceInteractionModule,
    DespachosModule,
    AccordionModule,
    DataViewModule,
    TabMenuModule,
    ToggleButtonModule,
    InputTextareaModule,
    InputMaskModule,
    CardModule,
    MenuModule,
    ImportModalModule,
    CatalogoSharedModule,
    ClientesSharedModule,
  ],
  declarations: [
    PedidoFacturacionComponent,
    ClientesListaComponent,
    ClientesCorporativosComponent,
    CheckOutComponent,
    PedidoEntregaComponent,
    ListOrdersComponent,
    CrearVentasComponent,
    ClientesComponent,
    QuickViewComponent,
    EcomerceProductsComponent,
    CarritoComponent,
    NotasComponent,
    ConfirmComponent,
    AsentarpagomanualComponent,
    CargaVentasComponent,
    PosComponent,
    ProductCategoryComponent,
    ProductComponent,
    CreateCustomerModalComponent,
    PosCheckoutComponent,
    CardPaymentComponent,
    CashPaymentComponent,
    EWalletPaymentComponent,
    WarehouseSelectorComponent,
    CashClosingComponent,
    CashClosingHistoryComponent,
    ReporteCierreComponent,
    DireccionEstructuradaComponent,
    CustomerSectionComponent,
    CartSummaryComponent,
    OrderHistoryTimelineComponent, // NUEVO: 2025-10-21 - Componente de timeline de historial
    PaymentSelectorComponent,
    ListProduccionComponent,
    OrdenVentaComponent, // NUEVO: 2025-10-21 - Componente de orden de venta profesional
    CustomerMetricsComponent, // Spec 009 - métricas del cliente en su ficha
    GlobalMetricsComponent, // Panel de métricas globales de clientes (top del listado)
  ],
  exports: [
    CrearVentasComponent,
    ClientesComponent,
    QuickViewComponent,
    ListOrdersComponent,
    PedidoEntregaComponent,
    PedidoFacturacionComponent,
    CheckOutComponent,
    ConfirmComponent,
    AsentarpagomanualComponent,
  ],
  providers: [
    QuickViewComponent,
    ModalGalleryService,
    NgxHotkeysService,
    PedidosUtilService,
    ImageOptimizerDirective,
    {
      provide: POS_CHECKOUT_SERVICE,
      useFactory: (injector: Injector) => injector.get(PosCheckoutService),
      deps: [Injector],
    },
  ],
})
export class VentasModule {}
