import { CopMonedaPipe } from '../../../../../../shared/pipes/cop-moneda.pipe';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReporteCierreComponent } from './reporte-cierre.component';

@NgModule({
  declarations: [ReporteCierreComponent],
  imports: [CopMonedaPipe, 
    CommonModule
  ],
  exports: [ReporteCierreComponent]
})
export class ReporteCierreModule { } 