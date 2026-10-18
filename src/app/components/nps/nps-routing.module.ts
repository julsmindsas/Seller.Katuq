import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NpsShellComponent } from './shell/nps-shell.component';
import { ResultadosComponent } from './resultados/resultados.component';
import { EncuestasListaComponent } from './encuestas/encuestas-lista.component';
import { EncuestaEditorComponent } from './encuestas/encuesta-editor.component';
import { SeguimientoListaComponent } from './seguimiento/seguimiento-lista.component';
import { CasoComponent } from './seguimiento/caso.component';

/** Módulo NPS por comercio (D-490): el marco con las pestañas y una pieza standalone por ruta. */
const routes: Routes = [
  {
    path: '',
    component: NpsShellComponent,
    children: [
      { path: '', redirectTo: 'resultados', pathMatch: 'full' },
      { path: 'resultados', component: ResultadosComponent, data: { title: 'NPS · Resultados' } },
      { path: 'encuestas', component: EncuestasListaComponent, data: { title: 'NPS · Encuestas' } },
      // `nueva` crea; `seller` es la encuesta de Julsmind a sus comercios (solo lectura).
      { path: 'encuestas/:id', component: EncuestaEditorComponent, data: { title: 'NPS · Encuesta' } },
      { path: 'seguimiento', component: SeguimientoListaComponent, data: { title: 'NPS · Seguimiento' } },
      { path: 'seguimiento/:id', component: CasoComponent, data: { title: 'NPS · Caso' } },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NpsRoutingModule {}
