import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConsolaCompartidoModule } from '../../consola-compartido.module';
import { PlantillaFormComponent } from './plantilla-form.component';
import { PlantillasComponent } from './plantillas.component';

const routes: Routes = [{ path: '', component: PlantillasComponent }];

/** Sección «Plantillas» de la consola de WhatsApp (D-707), cargada bajo demanda. */
@NgModule({
  imports: [ConsolaCompartidoModule, RouterModule.forChild(routes)],
  declarations: [PlantillasComponent, PlantillaFormComponent],
})
export class PlantillasModule {}
