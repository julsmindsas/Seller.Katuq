import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InventarioCatalogoComponent } from './inventario-catalogo/inventarios.component'
import { BodegasComponent } from './bodegas/bodegas.component';
import { RecepcionMercanciaComponent } from './recepcion-mercancia/recepcion-mercancia.component';
import { TrasladosComponent } from './traslados/traslados.component';


const routes: Routes = [
    {
        path: 'catalogo',
        component: InventarioCatalogoComponent
    },
    {
        path: 'bodegas',
        component: BodegasComponent
    },
    {
        path: 'recepcion-mercancia',
        component: RecepcionMercanciaComponent
    },
    {
        path: 'traslados',
        component: TrasladosComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class InventariosRoutingModule { }
