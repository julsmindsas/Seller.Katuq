import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InventarioCatalogoComponent } from './inventario-catalogo/inventarios.component'
import { BodegasComponent } from './bodegas/bodegas.component';


const routes: Routes = [
    {
        path: 'catalogo',
        component: InventarioCatalogoComponent
    },
    {
        path: 'bodegas',
        component: BodegasComponent
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class InventariosRoutingModule { }
