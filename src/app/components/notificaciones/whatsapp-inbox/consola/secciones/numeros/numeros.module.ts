import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AsistenteConectarModule } from '../../../../../../shared/components/asistente-conectar/asistente-conectar.module';
import { SelectorEquipoModule } from '../../../../../../shared/components/selector-equipo/selector-equipo.module';
import { ConsolaCompartidoModule } from '../../consola-compartido.module';
import { NumerosComponent } from './numeros.component';
import { TarjetaNumeroComponent } from './tarjeta-numero.component';

const routes: Routes = [{ path: '', component: NumerosComponent }];

/** Sección «Números» de la consola de WhatsApp (D-707), cargada bajo demanda. */
@NgModule({
  imports: [ConsolaCompartidoModule, AsistenteConectarModule, SelectorEquipoModule, RouterModule.forChild(routes)],
  declarations: [NumerosComponent, TarjetaNumeroComponent],
})
export class NumerosModule {}
