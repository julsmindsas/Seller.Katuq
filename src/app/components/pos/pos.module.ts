import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgxHotkeysModule, NgxHotkeysService } from "@balticcode/ngx-hotkeys";
import { GalleryModule, ModalGalleryService } from "@ks89/angular-modal-gallery";
import { NgSelectModule } from "@ng-select/ng-select";
import { NgxDatatableModule } from "@swimlane/ngx-datatable";
import { ArchwizardModule, WizardComponent } from "angular-archwizard";
import { NgxStarRatingModule } from "ngx-star-rating";
import { AutoCompleteModule } from "primeng/autocomplete";
import { CalendarModule } from "primeng/calendar";
import { MultiSelectModule } from "primeng/multiselect";
import { SliderModule } from "primeng/slider";
import { TableModule } from "primeng/table";
import { TabViewModule } from "primeng/tabview";
import { ToastModule } from "primeng/toast";
import { TreeSelectModule } from "primeng/treeselect";
import { POSRoutingModule } from "./pos-routing.module"
import { POSPedidosUtilService } from "./pos-service/pos-pedidos.util.service";
import { QuickViewComponent } from "./pos-quick-view/quick-view.component";
import { CheckOutPOSComponent } from "./pos-checkout/pos-checkout.component";
import { ClientesComponent } from "../ventas/clientes/clientes.component";
import { POSPedidoFacturacionComponent } from './pos-facturacion/pos-pedido-facturacion.component'
import { EcomerceProductsComponent } from "./pos-catalogo/ecomerce-products/ecomerce-products.component";
import { POSConfProductToCartComponent } from "./pos-catalogo/conf-product-to-cart/conf-product-to-cart.component";
import { CarritoComponent } from "./pos-carrito/carrito.component";
import { CrearPOSVentasComponent } from "./pos-crear-ventas/pos-crear-ventas.component";
import { POSConfirmComponent } from './pos-confirm/pos-confirm.component'
import { SharedModule } from "src/app/shared/shared.module";
import { InputNumberModule } from "primeng/inputnumber";
import { POSListOrdersComponent } from "./pos-list/list.component"
import { POSAsentarpagomanualComponent } from './pos-asentarpagomanual/asentarpagomanual.component'
import { CustomPrimeNGWizardComponent } from "./custom-primeng-wizard/custom-primeng-wizard.component";
import { WizardStepDirective } from "./custom-primeng-wizard/wizard-step.directive";
import { StepsModule } from 'primeng/steps';

@NgModule({
  imports: [
    NgSelectModule,
    CommonModule,
    SharedModule,
    POSRoutingModule,
    NgxDatatableModule,
    TabViewModule,
    AutoCompleteModule,
    ArchwizardModule,
    TreeSelectModule,
    SliderModule,
    GalleryModule,
    FormsModule,
    CalendarModule,
    NgxStarRatingModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    InputNumberModule,
    StepsModule,
    // VentasModule
  ],
  declarations: [
    POSPedidoFacturacionComponent,
    CheckOutPOSComponent,
    CrearPOSVentasComponent,
    QuickViewComponent,
    EcomerceProductsComponent,
    POSConfProductToCartComponent,
    CarritoComponent,
    POSConfirmComponent,
    POSListOrdersComponent,
    POSAsentarpagomanualComponent,
    CustomPrimeNGWizardComponent,
    WizardStepDirective
  ],
  exports: [
    CustomPrimeNGWizardComponent
  ],
  providers: [ModalGalleryService, WizardComponent, NgxHotkeysService, POSPedidosUtilService]
})
export class PosModule { }


