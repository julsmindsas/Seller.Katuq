import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReportVizModule } from '../../shared/report-viz/report-viz.module';
import { PlataformaContextoService } from './servicios/plataforma-contexto.service';
import { CopPipe, FechaCoPipe, MetricaPipe } from './pipes/plataforma.pipes';
import { PlataformaShellComponent } from './componentes/shell/plataforma-shell.component';
import { AvisoDefinicionComponent } from './componentes/aviso-definicion/aviso-definicion.component';
import { ResumenComponent } from './componentes/resumen/resumen.component';
import { KpiSeccionComponent } from './componentes/resumen/kpi-seccion.component';
import { TendenciasComponent } from './componentes/tendencias/tendencias.component';
import { GraficoTendenciaComponent } from './componentes/tendencias/grafico-tendencia.component';
import { ComerciosTablaComponent } from './componentes/comercios/comercios-tabla.component';
import { ComercioFichaComponent } from './componentes/ficha/comercio-ficha.component';
import { FichaSeccionComponent } from './componentes/ficha/ficha-seccion.component';
import { FichaIdentidadComponent } from './componentes/ficha/ficha-identidad.component';
import { FichaSuscripcionPagosComponent } from './componentes/ficha/ficha-suscripcion-pagos.component';
import { FichaUsoComponent } from './componentes/ficha/ficha-uso.component';
import { FichaSaludComponent } from './componentes/ficha/ficha-salud.component';
import { FichaSoporteComponent } from './componentes/ficha/ficha-soporte.component';
import { FichaHistorialComponent } from './componentes/ficha/ficha-historial.component';
import { CuentasExcluidasComponent } from './componentes/excluidas/cuentas-excluidas.component';
import { SegmentosComponent } from './componentes/segmentos/segmentos.component';
import { CalidadDatosComponent } from './componentes/calidad/calidad-datos.component';
import { SugerenciasComponent } from './componentes/sugerencias/sugerencias.component';
import { CobrosComponent } from './componentes/cobros/cobros.component';
import { AdopcionComponent } from './componentes/adopcion/adopcion.component';
import { ExportarComerciosComponent } from './componentes/exportar/exportar-comercios.component';
import { FichaIntegracionesComponent } from './componentes/ficha/ficha-integraciones.component';
import { FichaInformeComponent } from './componentes/ficha/ficha-informe.component';
import { TipoCuentaDialogComponent } from './componentes/dialogos/tipo-cuenta-dialog.component';
import { MotivoBajaDialogComponent } from './componentes/dialogos/motivo-baja-dialog.component';

/**
 * D-700 13.3 — Rutas internas del módulo (la ruta `plataforma` la registra `routes.ts` con `AuthGuard` y
 * `PlataformaUiGuard`). Las pestañas y la ficha cuelgan del marco `PlataformaShellComponent`.
 */
const rutas: Routes = [
  {
    path: '',
    component: PlataformaShellComponent,
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { path: 'resumen', component: ResumenComponent },
      { path: 'tendencias', component: TendenciasComponent },
      { path: 'comercios', component: ComerciosTablaComponent },
      { path: 'comercios/:docId', component: ComercioFichaComponent },
      { path: 'segmentos', component: SegmentosComponent },
      { path: 'cobros', component: CobrosComponent },
      { path: 'adopcion', component: AdopcionComponent },
      { path: 'calidad', component: CalidadDatosComponent },
      { path: 'sugerencias', component: SugerenciasComponent },
      { path: 'excluidas', component: CuentasExcluidasComponent },
      { path: '**', redirectTo: 'resumen' },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(rutas), ReportVizModule],
  declarations: [
    CopPipe, FechaCoPipe, MetricaPipe,
    PlataformaShellComponent, AvisoDefinicionComponent, ResumenComponent, KpiSeccionComponent,
    TendenciasComponent, GraficoTendenciaComponent, ComerciosTablaComponent,
    ComercioFichaComponent, FichaSeccionComponent, FichaIdentidadComponent, FichaSuscripcionPagosComponent,
    FichaUsoComponent, FichaSaludComponent, FichaSoporteComponent, FichaHistorialComponent, CuentasExcluidasComponent,
    SegmentosComponent, CalidadDatosComponent, SugerenciasComponent, CobrosComponent, AdopcionComponent, ExportarComerciosComponent,
    FichaIntegracionesComponent, FichaInformeComponent, TipoCuentaDialogComponent, MotivoBajaDialogComponent,
  ],
  providers: [PlataformaContextoService],
})
export class PlataformaModule {}
