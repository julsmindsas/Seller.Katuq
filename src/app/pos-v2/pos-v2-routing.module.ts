import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PosShellComponent } from './components/pos-shell/pos-shell.component';
import { ShiftReportComponent } from './components/shift-report/shift-report.component';
import { ZReportComponent } from './components/z-report/z-report.component';
import { SalesBySellerComponent } from './components/sales-by-seller/sales-by-seller.component';
import { ReturnsReportComponent } from './components/returns/returns-report.component';

const routes: Routes = [
  { path: '', component: PosShellComponent },
  { path: 'report', component: ShiftReportComponent },
  { path: 'z-report', component: ZReportComponent },
  { path: 'sales-by-seller', component: SalesBySellerComponent },
  { path: 'returns', component: ReturnsReportComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PosV2RoutingModule {}
