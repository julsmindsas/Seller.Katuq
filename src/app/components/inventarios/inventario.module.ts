import { NgModule } from '@angular/core';

import { InventarioCatalogoComponent } from './inventario-catalogo/inventarios.component';
import { InventariosRoutingModule } from './inventario-routing.module'
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CommonModule } from '@angular/common';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { GalleryModule, ModalGalleryService } from '@ks89/angular-modal-gallery';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TableModule } from 'primeng/table';
import { environment } from '../../../environments/environment';
import { ProductosRoutingModule } from '../productos/prductos-rounting.module';
import { SharedModule } from '../../shared/shared.module';
import { PaginatorModule } from 'primeng/paginator';
import { BodegasComponent } from './bodegas/bodegas.component';
import { CrearBodegasComponent } from './bodegas/crear-bodegas/crear-bodegas.component';
import { SelectorCiudadesCoberturaComponent } from './bodegas/selector-ciudades-cobertura/selector-ciudades-cobertura.component';
import { RecepcionMercanciaComponent } from './recepcion-mercancia/recepcion-mercancia.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TrasladosComponent } from './traslados/traslados.component';
import { ImageOptimizerDirective } from '../../shared/directives/image-optimizer.directive';
import { NgSelectModule } from '@ng-select/ng-select';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { MenuModule } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService } from 'primeng/api';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';
import { ImportarBodegasModalComponent } from './bodegas/importar-bodegas-modal/importar-bodegas-modal.component';
import { FulfillmentSyncHistoryComponent } from './fulfillment-sync-history/fulfillment-sync-history.component';
import { ImportModalModule } from '../../shared/components/import-modal/import-modal.module';
import { CentralAbastecimientoComponent } from './central-abastecimiento/central-abastecimiento.component';
import { BodegaDetalleComponent } from './bodega-detalle/bodega-detalle.component';
import { SiigoBodegaMappingComponent } from './siigo-bodega-mapping/siigo-bodega-mapping.component';
import { IndicadoresComponent } from './indicadores/indicadores.component';
import { UbicacionesComponent } from './ubicaciones/ubicaciones.component';

import { ImagenProductoPipe } from '../../shared/pipes/imagen-producto.pipe';
@NgModule({
    imports: [
    ImagenProductoPipe,
        InventariosRoutingModule,
        ImportModalModule,
        CommonModule,
        SharedModule,
        ProductosRoutingModule,
        NgbModule,
        NgxDatatableModule,
        AngularFireModule.initializeApp(environment.firebase),
        AngularFireStorageModule,
        NgbModule,
        GalleryModule,
        TableModule,
        PaginatorModule,
        FormsModule,
        ReactiveFormsModule,
        NgSelectModule,
        CalendarModule,
        DropdownModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        TooltipModule,
        TabViewModule,
        CheckboxModule,
        MenuModule,
        ConfirmDialogModule,
        AutoCompleteModule,
        InputNumberModule
    ],
    declarations: [
        InventarioCatalogoComponent,
        BodegasComponent,
        CrearBodegasComponent,
        SelectorCiudadesCoberturaComponent,
        RecepcionMercanciaComponent,
        TrasladosComponent,
        HistorialMovimientosComponent,
        ImportarBodegasModalComponent,
        FulfillmentSyncHistoryComponent,
        CentralAbastecimientoComponent,
        BodegaDetalleComponent,
        SiigoBodegaMappingComponent,
        IndicadoresComponent,
        UbicacionesComponent
    ],
    providers: [NgbActiveModal, ModalGalleryService, ImageOptimizerDirective, ConfirmationService],
})
export class InventarioCatalogoModule { }
