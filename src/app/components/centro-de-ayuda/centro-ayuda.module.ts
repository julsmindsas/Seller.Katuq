import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CentroAyudaListaComponent } from './lectura/centro-ayuda-lista.component';
import { ArticuloComponent } from './lectura/articulo.component';
import { ArticulosAdminComponent } from './admin/articulos-admin.component';
import { ArticuloEditorComponent } from './admin/articulo-editor.component';
import { CentroAyudaAdminGuard } from './centro-ayuda.guard';

/**
 * Centro de ayuda, fase 1 (D-628). Lazy. La bandera `centroDeAyuda` y la sesión las exige la ruta que lo carga
 * (`routes.ts`). La administración es solo del operador: `CentroAyudaAdminGuard` y, sobre todo, el servidor.
 */
const routes: Routes = [
  { path: '', component: CentroAyudaListaComponent, data: { title: 'Centro de ayuda' } },
  { path: 'articulo/:id', component: ArticuloComponent, data: { title: 'Centro de ayuda · Artículo' } },
  { path: 'administrar', component: ArticulosAdminComponent, canActivate: [CentroAyudaAdminGuard], data: { title: 'Centro de ayuda · Artículos' } },
  { path: 'administrar/:id', component: ArticuloEditorComponent, canActivate: [CentroAyudaAdminGuard], data: { title: 'Centro de ayuda · Editor' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class CentroAyudaModule {}
