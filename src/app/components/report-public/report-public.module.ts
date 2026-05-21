import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportPublicRoutingModule } from './report-public-routing.module';
import { ReportPublicComponent } from './report-public.component';

@NgModule({
  imports: [CommonModule, ReportPublicRoutingModule],
  declarations: [ReportPublicComponent],
})
export class ReportPublicModule {}
