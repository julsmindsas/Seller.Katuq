import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { MetaInboxShellComponent } from "./components/meta-inbox-shell/meta-inbox-shell.component";

/**
 * Rutas del buzón de Meta.
 *
 * El canal se deriva de la URL en el componente: `/notificaciones/instagram/inbox`
 * y `/notificaciones/facebook/inbox` montan este mismo módulo. Dos buzones para
 * el usuario, una implementación para el código.
 *
 * El AuthGuard lo aplica la ruta padre, igual que en el buzón de WhatsApp.
 */
const routes: Routes = [{ path: "", component: MetaInboxShellComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MetaInboxRoutingModule {}
