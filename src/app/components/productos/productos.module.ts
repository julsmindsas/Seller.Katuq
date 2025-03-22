import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ProductosRoutingModule } from './prductos-rounting.module';
import { ProductosComponent } from './productos.component';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from 'src/environments/environment';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ProductDetailsComponent } from './product-details/product-details.component'
import { GalleryModule, ModalGalleryService } from '@ks89/angular-modal-gallery';
import { TableModule } from 'primeng/table';

import 'hammerjs';
import 'mousetrap';
@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    ProductosRoutingModule,
    NgbModule,
    NgxDatatableModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireStorageModule,
    NgbModule,
    GalleryModule,
    TableModule
  ],
  declarations: [ProductosComponent, ProductDetailsComponent],
  providers: [NgbActiveModal, ModalGalleryService]
})
export class ProductosModule { }

