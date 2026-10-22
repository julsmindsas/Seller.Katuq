import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import {
  ConstructorMetricasService,
  EmpresaConstructor,
  MetricasConstructor,
  SitioConstructor,
} from '../../../../shared/services/constructor-metricas.service';

import { TranslateService } from '@ngx-translate/core';
/**
 * Ticket 1246 (Web F5-31): cómo va el constructor web en toda la plataforma.
 * Sitios, tiempo hasta publicar, embudo, ventas de las webs, uso de funciones
 * y a qué comercios hay que acompañar. Solo lectura; lo calcula el servidor.
 */
@Component({
  selector: 'app-constructor-metricas',
  templateUrl: './constructor-metricas.component.html',
  styleUrls: ['./constructor-metricas.component.scss'],
})
export class ConstructorMetricasComponent implements OnInit, OnDestroy {
  datos: MetricasConstructor | null = null;
  cargando = false;
  error = '';
  tabla: 'empresas' | 'sitios' = 'empresas';
  private destroy$ = new Subject<void>();

  constructor(private servicio: ConstructorMetricasService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.servicio
      .metricas()
      .pipe(takeUntil(this.destroy$), finalize(() => (this.cargando = false)))
      .subscribe({
        next: (r) => (this.datos = r),
        error: (err) => {
          this.datos = null;
          this.error = err?.error?.error || this.translate.instant('empresas.constructorMetricas.noSePudieronCargarMetricas');
        },
      });
  }

  get tipos(): { tipo: string; creados: number; publicados: number; activos: number }[] {
    const t = this.datos?.porTipo || {};
    return Object.keys(t).sort().map((tipo) => ({ tipo, ...t[tipo] }));
  }

  get estadosTiendaEnUnPaso(): { estado: string; total: number }[] {
    const t = this.datos?.tiendaEnUnPaso || {};
    return Object.keys(t).map((estado) => ({ estado, total: t[estado] }));
  }

  /** Ancho de cada barra del embudo, contra las empresas con sitio. */
  pctEmbudo(valor: number): number {
    const base = this.datos?.embudo.conSitio || 0;
    return base ? Math.round((valor / base) * 100) : 0;
  }

  moneda(valor: number): string {
    return (Number(valor) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  dias(valor: number | null): string {
    if (valor === null || valor === undefined) return '—';
    if (valor < 1) return 'menos de 1 día';
    return `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${valor === 1 ? 'día' : 'días'}`;
  }

  trackEmpresa(_: number, e: EmpresaConstructor): string {
    return e.empresa;
  }

  trackSitio(_: number, s: SitioConstructor): string {
    return s.siteId;
  }
}
