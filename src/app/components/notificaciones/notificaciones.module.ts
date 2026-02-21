import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NotificacionesRoutingModule } from './notificaciones-routing.module';
import { NotificacionesComponent } from './notificaciones.component';
import { SharedModule } from '../../shared/shared.module';


@NgModule({
    declarations: [
        NotificacionesComponent
    ],
    imports: [
        CommonModule,
        NotificacionesRoutingModule,
        SharedModule
    ]
})
export class NotificacionesModule { }
