import { Routes } from '@angular/router';
import { MigracionTiendaGuard } from './migracion-tienda.guard';

/**
 * Rutas del módulo lazy `migrar-tienda`. El `AuthGuard` va en la ruta que lo carga
 * (shared/routes/routes.ts); aquí solo la bandera y el rol.
 */
export const MIGRACION_TIENDA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [MigracionTiendaGuard],
    loadComponent: () => import('./migrar-tienda.component').then((m) => m.MigrarTiendaComponent),
  },
];
