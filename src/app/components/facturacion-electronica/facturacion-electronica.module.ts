import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { FacturacionElectronicaRoutingModule } from './facturacion-electronica-routing.module';
import { FacturacionElectronicaComponent } from './facturacion-electronica.component';

@NgModule({
  declarations: [FacturacionElectronicaComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    FacturacionElectronicaRoutingModule,
  ],
})
export class FacturacionElectronicaModule {}
