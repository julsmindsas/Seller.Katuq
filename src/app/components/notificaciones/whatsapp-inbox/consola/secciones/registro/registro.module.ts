import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TableModule } from 'primeng/table';

import { ConsolaCompartidoModule } from '../../consola-compartido.module';
import { RegistroComponent } from './registro.component';

const routes: Routes = [{ path: '', component: RegistroComponent }];

/** Sección «Registro» de la consola de WhatsApp (D-707), cargada bajo demanda. */
@NgModule({
  imports: [ConsolaCompartidoModule, TableModule, RouterModule.forChild(routes)],
  declarations: [RegistroComponent],
})
export class RegistroModule {}
