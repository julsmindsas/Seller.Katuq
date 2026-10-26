import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { FacturacionHubComponent } from './facturacion-hub.component';

/**
 * D-500 (ticket 1260, FE-01): facturación electrónica en Integraciones (lazy).
 * NgModule y no standalone por la excepción parcial del Art. IX (Angular 14), registrada en D-500.
 */
const routes: Routes = [{ path: '', component: FacturacionHubComponent }];

@NgModule({
  declarations: [FacturacionHubComponent],
  imports: [CommonModule, TranslateModule, FormsModule, RouterModule.forChild(routes)],
})
export class FacturacionModule {}
