import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../app/shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { VentasRoutingModule } from './ventas-routing.module';
import { CrearVentasComponent } from './crear-ventas/crear-ventas.component';
import { TabViewModule } from 'primeng/tabview';
import { NgSelectModule } from '@ng-select/ng-select';
import { ArchwizardModule } from 'angular-archwizard';
import { ClientesComponent } from './clientes/clientes.component';
import { QuickViewComponent } from './quick-view/quick-view.component';
import { EcomerceProductsComponent } from './catalogo/ecomerce-products/ecomerce-products.component';
import { TreeSelectModule } from 'primeng/treeselect';
import { SliderModule } from 'primeng/slider';
import { ConfProductToCartComponent } from './catalogo/conf-product-to-cart/conf-product-to-cart.component';
import { GalleryModule, ModalGalleryService } from '@ks89/angular-modal-gallery';
import { CarritoComponent } from './carrito/carrito.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NotasComponent } from './notas/notas/notas.component';
import { CheckOutComponent } from '../ventas/checkout/checkout.component';
import { ConfirmComponent } from './confirm/confirm.component'
import { CalendarModule } from 'primeng/calendar';
import { NgxHotkeysModule, NgxHotkeysService } from '@balticcode/ngx-hotkeys';
import { NgxStarRatingModule } from 'ngx-star-rating';
import { ListOrdersComponent } from './list/list.component';
import { TableModule } from 'primeng/table';
import { PedidoEntregaComponent } from './entrega/pedido-entrega.component';
import { PedidoFacturacionComponent } from './facturacion/pedido-facturacion.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { PedidosUtilService } from './service/pedidos.util.service'
import { ToastModule } from 'primeng/toast';
import { AsentarpagomanualComponent } from './asentarpagomanual/asentarpagomanual.component';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ClientesListaComponent } from './clientes/lista/clientes-lista.component';
import { CargaVentasComponent } from './carga-ventas/carga-ventas.component';
import { HttpClientModule } from '@angular/common/http';
import { VoiceInteractionModule } from '../../shared/components/voice-interaction/voice-interaction.module';
import { PosComponent } from './pos2/pos.component';
import { ProductCategoryComponent } from './pos2/widgets/product-category/product-category.component';
import { ProductComponent } from './pos2/widgets/product/product.component';
import { CreateCustomerModalComponent } from './pos2/widgets/create-customer-modal/create-customer-modal.component';
import { PosCheckoutComponent } from './pos2/widgets/pos-checkout/pos-checkout.component';
import { CrearClienteModalComponent } from './clientes/crear-cliente-modal/crear-cliente-modal.component';
import { CardPaymentComponent } from './pos2/widgets/card-payment/card-payment';
import { CashPaymentComponent } from './pos2/widgets/cash-payment/cash-payment';
import { EWalletPaymentComponent } from './pos2/widgets/ewallet-payment/ewallet-payment';
import { WarehouseSelectorComponent } from './pos2/widgets/warehouse-selector/warehouse-selector';

@NgModule({
  imports: [
    NgSelectModule,
    CommonModule,
    SharedModule,
    VentasRoutingModule,
    NgxDatatableModule,
    TabViewModule,
    AutoCompleteModule,
    ArchwizardModule,
    TreeSelectModule,
    SliderModule,
    GalleryModule,
    FormsModule,
    CalendarModule,
    FormsModule,
    ReactiveFormsModule,
    NgxHotkeysModule.forRoot(),
    NgxStarRatingModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    HttpClientModule,
    VoiceInteractionModule
  ],
  declarations: [
    PedidoFacturacionComponent,
    ClientesListaComponent,
    CheckOutComponent,
    PedidoEntregaComponent,
    ListOrdersComponent,
    CrearVentasComponent, 
    ClientesComponent, 
    QuickViewComponent, 
    EcomerceProductsComponent, 
    ConfProductToCartComponent, 
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
    CrearClienteModalComponent,
    CardPaymentComponent,
    CashPaymentComponent,
    EWalletPaymentComponent,
    WarehouseSelectorComponent
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
    AsentarpagomanualComponent
  ],
  providers: [
    QuickViewComponent, 
    ModalGalleryService, 
    NgxHotkeysService, 
    PedidosUtilService
  ]
})
export class VentasModule { }


