import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InventarioCatalogoComponent } from './inventario-catalogo/inventarios.component'


const routes: Routes = [
    {
        path: 'catalogo',
        component: InventarioCatalogoComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class InventariosRoutingModule { }
