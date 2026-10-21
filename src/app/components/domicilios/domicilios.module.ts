import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { AppTranslateModule } from '../../shared/modules/translate.module';
import { CargarArchivoComponent } from './archivo/cargar-archivo.component';
import { ConfirmarDialogoComponent } from './comunes/confirmar-dialogo.component';
import { ErrorServidorComponent } from './comunes/error-servidor.component';
import { DomiciliosRoutingModule } from './domicilios-routing.module';
import { DomiciliosComponent } from './domicilios.component';
import { IntegracionComponent } from './integracion/integracion.component';
import { SecretoUnicoComponent } from './integracion/secreto-unico.component';
import { DetalleDomicilioComponent } from './lista/detalle-domicilio.component';
import { MisDomiciliosComponent } from './lista/mis-domicilios.component';
import { NuevoDomicilioComponent } from './nuevo/nuevo-domicilio.component';
import { RecogidaComponent } from './recogida/recogida.component';

/**
 * Domicilios: el comercio monta sus entregas (a mano o por archivo), las sigue y administra su integración
 * por API. Se carga bajo demanda desde `routes.ts` (ruta `/domicilios`).
 */
@NgModule({
  declarations: [
    DomiciliosComponent,
    RecogidaComponent,
    NuevoDomicilioComponent,
    CargarArchivoComponent,
    MisDomiciliosComponent,
    DetalleDomicilioComponent,
    IntegracionComponent,
    SecretoUnicoComponent,
    ConfirmarDialogoComponent,
    ErrorServidorComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DialogModule, AppTranslateModule, DomiciliosRoutingModule]
})
export class DomiciliosModule {}
