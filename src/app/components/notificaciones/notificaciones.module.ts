import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NotificacionesRoutingModule } from './notificaciones-routing.module';
import { NotificacionesComponent } from './notificaciones.component';
import { WhatsappBillingMeterComponent } from './whatsapp-billing-meter/whatsapp-billing-meter.component';
import { SharedModule } from '../../shared/shared.module';


@NgModule({
    declarations: [
        NotificacionesComponent,
        WhatsappBillingMeterComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        NotificacionesRoutingModule,
        SharedModule
    ]
})
export class NotificacionesModule { }
