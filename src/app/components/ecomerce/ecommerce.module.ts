import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { TabViewModule } from 'primeng/tabview';
import { SharedModule } from 'src/app/shared/shared.module';
import { AdicionesComponent } from './adiciones/adiciones.component';
import { EcommerceRoutingModule } from './ecommerce-routing.module';
import { ListaComponent } from './adiciones/lista/lista.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';

@NgModule({
    imports: [EcommerceRoutingModule,
        FormsModule,
        CommonModule,
        SharedModule,
        TabViewModule,
        TableModule,
        NgbModule,
        TranslateModule,
        NgxDatatableModule,
        NgSelectModule
    ],
    exports: [],
    declarations: [AdicionesComponent, ListaComponent],
    providers: [NgbActiveModal],
})
export class EcommeceModule { }
