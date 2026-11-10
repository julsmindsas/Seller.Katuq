import { CopMonedaPipe } from '../../../shared/pipes/cop-moneda.pipe';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';  // Asegura la importación
import { FacturaTirillaComponent } from './factura-tirilla.component';

@NgModule({
  declarations: [FacturaTirillaComponent],
  imports: [CopMonedaPipe, 
    CommonModule  // CommonModule regresa los pipes date y currency
  ],
  exports: [FacturaTirillaComponent]
})
export class FacturaTirillaModule { }
