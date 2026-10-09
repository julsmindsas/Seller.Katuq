import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EnVivoKatuqGuard } from './paginas/en-vivo-katuq.guard';
import { EnVivoComercioPaginaComponent } from './paginas/en-vivo-comercio-pagina.component';
import { EnVivoKatuqPaginaComponent } from './paginas/en-vivo-katuq-pagina.component';

/**
 * Rutas del tablero "En vivo" (D-386).
 * - `` es la pantalla del comercio (con `?empresa=` si una sesión de Katuq mira un comercio).
 * - `katuq` es la vista de toda la plataforma: el candado real es del backend (empresa del token =
 *   Julsmind); el guardia solo evita mostrarla a quien no es administrador de Julsmind.
 */
const routes: Routes = [
  { path: '', component: EnVivoComercioPaginaComponent },
  { path: 'katuq', component: EnVivoKatuqPaginaComponent, canActivate: [EnVivoKatuqGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnVivoRoutingModule {}
