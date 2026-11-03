import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CentroAyudaService, ErrorAyuda } from '../centro-ayuda.service';
import { AlcanceArticulo, ArticuloAdmin, ESTADOS_ARTICULO, EstadoArticulo } from '../centro-ayuda.models';
import { CLASE_ESTADO, NOMBRE_ESTADO, NOMBRE_MODULO, NOMBRE_TIPO, fechaCorta, mensajeError } from '../centro-ayuda-comun';

type Accion = 'publish' | 'unpublish' | 'archive' | 'restore';

/**
 * Administración de artículos (D-628, fase 1), solo para Julsmind (el servidor responde 403 a cualquier
 * otra sesión): lista por estado y alcance, y las acciones de publicar, despublicar, archivar y restaurar.
 */
@Component({
  selector: 'app-centro-ayuda-articulos-admin',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './articulos-admin.component.html',
  styleUrls: ['./articulos-admin.component.scss'],
})
export class ArticulosAdminComponent implements OnInit, OnDestroy {
  readonly ESTADOS = ESTADOS_ARTICULO;
  readonly NOMBRE_ESTADO = NOMBRE_ESTADO;
  readonly CLASE_ESTADO = CLASE_ESTADO;
  readonly NOMBRE_MODULO = NOMBRE_MODULO;
  readonly NOMBRE_TIPO = NOMBRE_TIPO;

  articulos: ArticuloAdmin[] = [];
  estado: EstadoArticulo | '' = '';
  alcance: AlcanceArticulo | '' = '';
  texto = '';
  cargando = false;
  error: string | null = null;
  ocupado: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly ayuda: CentroAyudaService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  elegirEstado(estado: EstadoArticulo | ''): void {
    this.estado = estado;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.ayuda.adminArticulos({ status: this.estado, scope: this.alcance, q: this.texto.trim() }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.articulos = r.data || []; this.cargando = false; },
      error: (e) => {
        this.cargando = false;
        this.articulos = [];
        this.error = mensajeError(e, this.translate.instant('centroAyuda.errorCargar'));
      },
    });
  }

  /** Publicar, despublicar, archivar o restaurar; pide confirmación y muestra los datos de clientes si el servidor los encuentra. */
  async cambiar(a: ArticuloAdmin, accion: Accion): Promise<void> {
    const t = (k: string, p?: object) => this.translate.instant(k, p);
    const confirmado = await Swal.fire({
      title: t(`centroAyuda.confirmar.${accion}.titulo`),
      text: t(`centroAyuda.confirmar.${accion}.texto`, { titulo: a.title }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t(`centroAyuda.accion.${accion}`),
      cancelButtonText: t('comun.cancelar'),
    });
    if (!confirmado.isConfirmed) return;
    this.ocupado = a.id;
    this.ayuda.adminCambiarEstado(a.id, accion).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.ocupado = null;
        this.articulos = this.articulos.map((x) => (x.id === a.id ? { ...x, ...r.data } : x));
        this.toastr.success(t(`centroAyuda.hecho.${accion}`));
        if (this.estado && r.data.status !== this.estado) this.cargar();
      },
      error: (e: ErrorAyuda) => {
        this.ocupado = null;
        const hallazgos = e?.error?.hallazgos;
        const detalle = hallazgos?.length ? `\n${hallazgos.map((h) => `${h.tipo}: ${h.dato}`).join('\n')}` : '';
        Swal.fire({ icon: 'error', title: t('centroAyuda.noSePudo'), text: mensajeError(e, t('centroAyuda.errorGuardar')) + detalle });
      },
    });
  }

  fecha(iso: string | null): string { return fechaCorta(iso); }
  porId(_: number, a: ArticuloAdmin): string { return a.id; }
}
