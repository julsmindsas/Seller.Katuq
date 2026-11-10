import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CopMonedaPipe } from '../../../../../../shared/pipes/cop-moneda.pipe';
import { ConsolaCompartidoModule } from '../../consola-compartido.module';
import { AsistenteEnvioComponent } from './asistente-envio.component';
import { EnviosComponent } from './envios.component';
import { SelectorAudienciaComponent } from './selector-audiencia.component';

const routes: Routes = [{ path: '', component: EnviosComponent }];

/** Sección «Envíos» de la consola de WhatsApp (D-707), cargada bajo demanda. */
@NgModule({
  imports: [ConsolaCompartidoModule, CopMonedaPipe, RouterModule.forChild(routes)],
  declarations: [EnviosComponent, AsistenteEnvioComponent, SelectorAudienciaComponent],
})
export class EnviosModule {}
