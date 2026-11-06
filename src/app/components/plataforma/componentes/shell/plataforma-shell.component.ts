import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { Definicion } from '../../plataforma.tipos';
import { TEXTOS } from '../../plataforma.textos';

type Mensaje = { tipo: 'ok' | 'warn' | 'error'; texto: string } | null;

/**
 * D-700 13.4a — Cabecera (`cfg-cabeza`), vista de pedidos, «Actualizar» (solo operador), pestañas y aviso de
 * definición. Sin encapsulación: sus estilos (la base `config-pagina` más las piezas `pl-*`) sirven a todas las
 * pantallas del módulo, que no repiten la hoja.
 */
@Component({
  selector: 'app-plataforma-shell',
  templateUrl: './plataforma-shell.component.html',
  styleUrls: ['./plataforma-shell.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlataformaShellComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly pestanas = [
    { ruta: 'resumen', rotulo: TEXTOS.pestanas.resumen },
    { ruta: 'tendencias', rotulo: TEXTOS.pestanas.tendencias },
    { ruta: 'comercios', rotulo: TEXTOS.pestanas.comercios },
    { ruta: 'segmentos', rotulo: TEXTOS.pestanas.segmentos },
    { ruta: 'cobros', rotulo: TEXTOS.pestanas.cobros },
    { ruta: 'adopcion', rotulo: TEXTOS.pestanas.adopcion },
    { ruta: 'calidad', rotulo: TEXTOS.pestanas.calidad },
    { ruta: 'sugerencias', rotulo: TEXTOS.pestanas.sugerencias },
    { ruta: 'excluidas', rotulo: TEXTOS.pestanas.excluidas },
  ];
  esOperador = false;
  vista: 'creacion' | 'entrega' = 'creacion';
  mostrarVista = false;
  actualizando = false;
  mensaje: Mensaje = null;
  version: string | null = null;
  definiciones: Definicion[] | null = null;
  private fin$ = new Subject<void>();

  constructor(
    private servicio: PlataformaService,
    private ctx: PlataformaContextoService,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.servicio.me().pipe(takeUntil(this.fin$)).subscribe({
      next: (r) => { this.esOperador = !!(r && r.datos && r.datos.esOperador); this.cd.markForCheck(); },
      error: () => { this.esOperador = false; },
    });
    this.ctx.definiciones().pipe(takeUntil(this.fin$)).subscribe({
      next: (d) => { this.version = d.reglaVersion; this.definiciones = d.metricas; this.cd.markForCheck(); },
      error: () => { /* sin definiciones el aviso no sale: las cifras traen su propia versión */ },
    });
    this.ctx.vista$.pipe(takeUntil(this.fin$)).subscribe((v) => { this.vista = v; this.cd.markForCheck(); });
    this.ajustarVista(this.router.url);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntil(this.fin$))
      .subscribe((e) => this.ajustarVista(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  private ajustarVista(url: string): void {
    this.mostrarVista = /\/plataforma\/resumen(\?|$|\/)/.test(url);
    this.cd.markForCheck();
  }

  cambiarVista(v: 'creacion' | 'entrega'): void {
    this.ctx.cambiarVista(v);
  }

  recargar(): void {
    this.mensaje = null;
    this.ctx.recargar();
  }

  actualizar(): void {
    if (this.actualizando) return;
    this.actualizando = true;
    this.mensaje = null;
    this.servicio.recalcular().pipe(takeUntil(this.fin$)).subscribe({
      next: (r) => {
        this.actualizando = false;
        const enCurso = r && r.datos && r.datos.estado === 'en_curso';
        this.mensaje = { tipo: 'ok', texto: enCurso ? TEXTOS.actualizarYa : TEXTOS.actualizarAviso };
        this.cd.markForCheck();
      },
      error: () => {
        this.actualizando = false;
        this.mensaje = { tipo: 'error', texto: TEXTOS.actualizarFallo };
        this.cd.markForCheck();
      },
    });
  }
}
