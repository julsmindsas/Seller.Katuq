import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CentrotrabajosComponent } from './produccion/centrotrabajos/centrotrabajos.component';
import { ModuloVariableComponent } from './modulovariable.component';
import { ProcesosComponent } from './produccion/procesos/procesos.component';

const routes: Routes = [

    {
        path: 'produccion/centrotrabajos',
        component: CentrotrabajosComponent
    },
    {
        path: 'produccion/procesos',
        component: ProcesosComponent
    },
    {
        path: 'produccion/opciones',
        component: ModuloVariableComponent
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ModuloVariableRoutingModule { }
