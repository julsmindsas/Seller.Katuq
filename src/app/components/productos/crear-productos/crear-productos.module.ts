import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CrearProductosRoutingModule } from './crear-productos-routing.module';
import { CrearProductosComponent } from './crear-productos.component';
import { DropzoneModule } from 'ngx-dropzone-wrapper';
import { TabViewModule } from 'primeng/tabview';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxBarcodeModule } from 'ngx-barcode';

import { TreeSelectModule } from 'primeng/treeselect';
import { TreeTableModule } from 'primeng/treetable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DropdownModule } from 'primeng/dropdown';
import { GalleryModule, ModalGalleryService } from '@ks89/angular-modal-gallery';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { PickListModule } from 'primeng/picklist';





@NgModule({
  imports: [
    NgSelectModule,
    CommonModule,
    DropdownModule,
    SharedModule,
    TreeSelectModule,
    CrearProductosRoutingModule,
    NgxDatatableModule,
    DropzoneModule,
    TreeTableModule,
    TabViewModule,
    NgxBarcodeModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    GalleryModule,
    CKEditorModule,
    PickListModule
  ],
  declarations: [CrearProductosComponent],
  providers: [NgbActiveModal,ModalGalleryService]

})
export class ProductosModule { }

