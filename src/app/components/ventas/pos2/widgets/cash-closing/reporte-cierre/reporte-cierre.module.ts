import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReporteCierreComponent } from './reporte-cierre.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [ReporteCierreComponent],
  imports: [
    CommonModule,
    TranslateModule
  ],
  exports: [ReporteCierreComponent]
})
export class ReporteCierreModule { } 