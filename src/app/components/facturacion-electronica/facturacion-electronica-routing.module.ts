import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacturacionElectronicaComponent } from './facturacion-electronica.component';

const routes: Routes = [
  { path: '', component: FacturacionElectronicaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FacturacionElectronicaRoutingModule {}
