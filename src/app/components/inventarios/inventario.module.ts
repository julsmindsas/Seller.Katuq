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
import { environment } from 'src/environments/environment';
import { ProductosRoutingModule } from '../productos/prductos-rounting.module';
import { SharedModule } from 'src/app/shared/shared.module';
import {PaginatorModule} from 'primeng/paginator';
import { BodegasComponent } from './bodegas/bodegas.component';
import { CrearBodegasComponent } from './bodegas/crear-bodegas/crear-bodegas.component';
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
        PaginatorModule
    ],
    declarations: [InventarioCatalogoComponent, BodegasComponent, CrearBodegasComponent],
    providers: [NgbActiveModal, ModalGalleryService],
})
export class InventarioCatalogoModule { }
