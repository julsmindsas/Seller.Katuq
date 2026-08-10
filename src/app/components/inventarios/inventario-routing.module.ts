import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventarioCatalogoComponent } from './inventario-catalogo/inventarios.component'
import { BodegasComponent } from './bodegas/bodegas.component';
import { RecepcionMercanciaComponent } from './recepcion-mercancia/recepcion-mercancia.component';
import { TrasladosComponent } from './traslados/traslados.component';
import { HistorialMovimientosComponent } from './historial-movimientos/historial-movimientos.component';
import { CentralAbastecimientoComponent } from './central-abastecimiento/central-abastecimiento.component';
import { BodegaDetalleComponent } from './bodega-detalle/bodega-detalle.component';
import { IndicadoresComponent } from './indicadores/indicadores.component';


const routes: Routes = [
    {
        path: 'inventario-catalogo',
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
    },
    {
        path: 'central-abastecimiento',
        component: CentralAbastecimientoComponent
    },
    {
        path: 'bodega-detalle',
        component: BodegaDetalleComponent
    },
    {
        path: 'indicadores',
        component: IndicadoresComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class InventariosRoutingModule { }
