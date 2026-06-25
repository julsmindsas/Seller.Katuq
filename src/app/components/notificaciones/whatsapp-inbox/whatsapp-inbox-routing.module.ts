import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { WhatsappInboxShellComponent } from "./components/whatsapp-inbox-shell/whatsapp-inbox-shell.component";

/**
 * Rutas del módulo lazy WhatsApp Inbox.
 *
 * Nota: el AuthGuard lo aplica la ruta padre en `src/app/shared/routes/routes.ts`
 * (ver spec 009 — wiring). NO se duplica aquí para evitar canActivate redundante.
 */
const routes: Routes = [
  { path: "", redirectTo: "inbox", pathMatch: "full" },
  { path: "inbox", component: WhatsappInboxShellComponent },
  { path: "inbox/:phoneHash", component: WhatsappInboxShellComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WhatsappInboxRoutingModule {}
