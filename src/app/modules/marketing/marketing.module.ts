import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';

import { MarketingDashboardComponent } from './components/marketing-dashboard/marketing-dashboard.component';
import { CampanaWhatsappComponent } from './components/campana-whatsapp/campana-whatsapp.component';
import { CampanasHistorialComponent } from './components/campanas-historial/campanas-historial.component';
import { CampanaCorreoComponent } from './components/campana-correo/campana-correo.component';
import { EditorBloquesCorreoComponent } from './components/editor-bloques-correo/editor-bloques-correo.component';
import { VistaPreviaCorreoComponent } from './components/vista-previa-correo/vista-previa-correo.component';
import { SuscriptoresCorreoComponent } from './components/suscriptores-correo/suscriptores-correo.component';
import { SelectorProductosModule } from '../../components/sitios/selector-productos/selector-productos.module';
import { MarketingService } from './services/marketing.service';
import { MarketingCorreoService } from './services/marketing-correo.service';
import { MarketingGuard } from './guards/marketing.guard';

const routes: Routes = [
  {
    path: '',
    component: MarketingDashboardComponent,
    canActivate: [MarketingGuard],
  },
  {
    path: 'campanas',
    component: CampanasHistorialComponent,
    canActivate: [MarketingGuard],
  },
  {
    path: 'campanas/whatsapp',
    component: CampanaWhatsappComponent,
    canActivate: [MarketingGuard],
  },
  // Campañas de correo de las tiendas (D-318).
  {
    path: 'campanas/correo',
    component: CampanaCorreoComponent,
    canActivate: [MarketingGuard],
  },
  {
    path: 'campanas/correo/:id',
    component: CampanaCorreoComponent,
    canActivate: [MarketingGuard],
  },
  {
    path: 'suscriptores',
    component: SuscriptoresCorreoComponent,
    canActivate: [MarketingGuard],
  },
];

/**
 * Módulo de Marketing — MVP (spec 022): dashboard read-only.
 *
 * El scaffold previo declaraba 8 componentes y 6 servicios inexistentes
 * (campañas, segmentos, automatización…) — esas features son fases 2+ de la
 * spec y sus componentes se agregarán cuando existan. Charts con ngx-echarts,
 * la misma librería del dashboard gerencial (chart.js NO está instalado).
 */
@NgModule({
  declarations: [
    MarketingDashboardComponent,
    CampanaWhatsappComponent,
    CampanasHistorialComponent,
    CampanaCorreoComponent,
    EditorBloquesCorreoComponent,
    VistaPreviaCorreoComponent,
    SuscriptoresCorreoComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SelectorProductosModule,
    RouterModule.forChild(routes),
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
  providers: [MarketingService, MarketingCorreoService, MarketingGuard],
})
export class MarketingModule {}
