import { NgModule } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProduccionModuleRoutingModule } from './produccion-routing.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxHotkeysModule } from '@balticcode/ngx-hotkeys';
import { GalleryModule } from '@ks89/angular-modal-gallery';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ArchwizardModule } from 'angular-archwizard';
import { NgxStarRatingModule } from 'ngx-star-rating';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { SliderModule } from 'primeng/slider';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { TreeSelectModule } from 'primeng/treeselect';
import { VentasRoutingModule } from '../ventas/ventas-routing.module';
import { ProduccionService } from '../../shared/services/produccion/produccion.service';
import { SharedModule } from '../../shared/shared.module';
import { CheckboxModule } from 'primeng/checkbox';
import { CerrararticuloComponent } from './dashboard/cerrararticulo/cerrararticulo.component';
import { DropdownModule } from 'primeng/dropdown';
import { ProcesoTrackingComponent } from './dashboard/tracking/proceso-tracking.component';
import { TimelineModule } from 'primeng/timeline';
import { CerrarProductoComponent } from './dashboard/cerrarproducto/cerrarproducto.component';
import { VentasModule } from '../ventas/ventas.module';

@NgModule({
    imports: [ProduccionModuleRoutingModule,
        NgSelectModule,
        CommonModule,
        SharedModule,
        DropdownModule,
        VentasRoutingModule,
        NgxDatatableModule,
        TabViewModule,
        CheckboxModule,
        ArchwizardModule,
        TreeSelectModule,
        SliderModule,
        GalleryModule,
        FormsModule,
        TabViewModule,
        CalendarModule,
        FormsModule,
        NgxHotkeysModule.forRoot(),
        NgxStarRatingModule,
        TableModule,
        MultiSelectModule,
        VentasModule,
        TimelineModule,
        ToastModule],
    exports: [DashboardComponent],
    declarations: [DashboardComponent,
        CerrararticuloComponent, ProcesoTrackingComponent,
        CerrarProductoComponent],
    providers: [ProduccionService],
})
export class ProduccionModule { }
