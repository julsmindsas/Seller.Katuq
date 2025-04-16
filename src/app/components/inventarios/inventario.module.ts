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
import { RecepcionMercanciaComponent } from './recepcion-mercancia/recepcion-mercancia.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TrasladosComponent } from './traslados/traslados.component';
import { ImageOptimizerDirective } from '../../shared/directives/image-optimizer.directive';
import { NgSelectModule } from '@ng-select/ng-select';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';

@NgModule({
    imports: [
        InventariosRoutingModule,
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
        InputTextModule
    ],
    declarations: [
        InventarioCatalogoComponent,
        BodegasComponent,
        CrearBodegasComponent,
        RecepcionMercanciaComponent,
        TrasladosComponent,
        HistorialMovimientosComponent
    ],
    providers: [NgbActiveModal, ModalGalleryService, ImageOptimizerDirective],
})
export class InventarioCatalogoModule { }
