import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConsolaCompartidoModule } from './consola-compartido.module';
import { ConsolaShellComponent } from './componentes/consola-shell/consola-shell.component';

/**
 * Consola de WhatsApp (D-707), en `notificaciones/whatsapp/consola/:seccion`. Cada sección es un
 * módulo lazy. La entrada la protege `ConsolaWhatsappGuard` (bandera `whatsappConsola` y familia
 * Administrador, registrada en `shared/routes/routes.ts`); sin ella se vuelve al buzón.
 */
const routes: Routes = [
  {
    path: '',
    component: ConsolaShellComponent,
    children: [
      { path: '', redirectTo: 'numeros', pathMatch: 'full' },
      {
        path: 'numeros',
        loadChildren: () => import('./secciones/numeros/numeros.module').then((m) => m.NumerosModule),
      },
      {
        path: 'plantillas',
        loadChildren: () => import('./secciones/plantillas/plantillas.module').then((m) => m.PlantillasModule),
      },
      {
        path: 'envios',
        loadChildren: () => import('./secciones/envios/envios.module').then((m) => m.EnviosModule),
      },
      {
        path: 'registro',
        loadChildren: () => import('./secciones/registro/registro.module').then((m) => m.RegistroModule),
      },
      { path: '**', redirectTo: 'numeros' },
    ],
  },
];

@NgModule({
  imports: [ConsolaCompartidoModule, RouterModule.forChild(routes)],
  declarations: [ConsolaShellComponent],
})
export class WhatsappConsolaModule {}
