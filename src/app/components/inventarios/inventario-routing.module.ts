import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventarioCatalogoComponent } from './inventario-catalogo/inventarios.component'
import { BodegasComponent } from './bodegas/bodegas.component';
import { RecepcionMercanciaComponent } from './recepcion-mercancia/recepcion-mercancia.component';
import { TrasladosComponent } from './traslados/traslados.component';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';


const routes: Routes = [
    {
        path: '',
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
    },
    {
        path: 'historial-movimientos',
        component: HistorialMovimientosComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class InventariosRoutingModule { }
