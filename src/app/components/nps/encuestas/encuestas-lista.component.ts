import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NpsService } from '../../../shared/services/nps/nps.service';
import { Encuesta } from '../../../shared/services/nps/nps.models';
import { NOMBRE_CANAL, NOMBRE_ESTADO_ENCUESTA, NOMBRE_ETAPA, esAdministradorSesion, fechaCorta, mensajeError } from '../nps-comun';
import { cambiarEstadoEncuesta, descargarQr, eliminarEncuesta, enlaceDe, nombreArchivo } from './encuesta-acciones';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
/**
 * Pestaña Encuestas (D-490): las encuestas de la empresa con su canal, estado y responsable.
 * Crear, editar, activar, pausar y eliminar es de la familia Administrador; la encuesta de
 * Julsmind a sus comercios (canal "seller") es de solo lectura y muestra su etapa.
 */
@Component({
  selector: 'app-nps-encuestas-lista',
  standalone: true,
  imports: [TranslateModule, CommonModule, RouterModule],
  templateUrl: './encuestas-lista.component.html',
  styleUrls: ['./encuestas-lista.component.scss'],
})
export class EncuestasListaComponent implements OnInit, OnDestroy {
  readonly NOMBRE_CANAL = NOMBRE_CANAL;
  readonly NOMBRE_ESTADO = NOMBRE_ESTADO_ENCUESTA;
  readonly NOMBRE_ETAPA = NOMBRE_ETAPA;
  readonly puedeEditar = esAdministradorSesion();

  encuestas: Encuesta[] = [];
  cargando = false;
  error: string | null = null;
  /** Encuesta con una acción en curso (para no repetir clics). */
  ocupada: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private nps: NpsService, private toastr: ToastrService,
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
    // Las encuestas solo las lee la familia Administrador (el servidor responde 403).
    if (!this.puedeEditar) {
      this.error = this.translate.instant('nps.encuestaEditor.lasEncuestasLasVenY');
      return;
    }
    this.cargando = true;
    this.error = null;
    this.nps.encuestas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.encuestas = r?.encuestas || [];
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.error = mensajeError(e, this.translate.instant('nps.encuestasLista.noPudimosCargarLasEncuestas'), this.translate);
      },
    });
  }

  alternarEstado(e: Encuesta): void {
    if (this.ocupada) return;
    this.ocupada = e.id;
    const nuevo = e.estado === 'activa' ? 'pausada' : 'activa';
    cambiarEstadoEncuesta(this.nps, e, nuevo, this.translate).pipe(takeUntil(this.destroy$)).subscribe((r) => {
      this.ocupada = null;
      if (!r.encuesta) return;
      this.toastr.success(this.translate.instant(nuevo === 'activa' ? 'nps.encuestas.nombreQuedoActiva' : 'nps.encuestas.nombreQuedoPausada', { nombre: e.nombre }));
      if (r.pausada) this.toastr.info(this.translate.instant('nps.encuestas.nombreQuedoPausada', { nombre: r.pausada.nombre }));
      this.cargar();
    });
  }

  eliminar(e: Encuesta): void {
    if (this.ocupada) return;
    this.ocupada = e.id;
    eliminarEncuesta(this.nps, e, this.translate).pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      this.ocupada = null;
      if (!ok) return;
      this.toastr.success(this.translate.instant('nps.encuestas.nombreQuedoEliminada', { nombre: e.nombre }));
      this.encuestas = this.encuestas.filter((x) => x.id !== e.id);
    });
  }

  enlace(e: Encuesta): string | null {
    return e.canal === 'enlace' ? enlaceDe(e) : null;
  }

  copiar(e: Encuesta): void {
    const url = this.enlace(e);
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => this.toastr.success(this.translate.instant('nps.encuestaEditor.enlaceCopiado')),
      () => this.toastr.info(url, this.translate.instant('nps.encuestaEditor.copiaElEnlace')),
    );
  }

  async qr(e: Encuesta): Promise<void> {
    const url = this.enlace(e);
    if (url && !(await descargarQr(url, nombreArchivo(e.nombre)))) {
      this.toastr.error(this.translate.instant('nps.encuestaEditor.noPudimosGenerarElQr'));
    }
  }

  detalle(e: Encuesta): string {
    if (e.canal === 'entrega') return this.translate.instant('nps.encuestasLista.diasDespues', { n: e.diasEspera || 3, unidad: this.translate.instant(e.diasEspera === 1 ? 'nps.encuestasLista.dia' : 'nps.encuestasLista.dias') });
    if (e.canal === 'enlace') return this.translate.instant('nps.encuestasLista.seRespondeDesdeElEnlace');
    return e.etapa ? this.translate.instant('nps.encuestasLista.etapa', { etapa: this.translate.instant(NOMBRE_ETAPA[e.etapa] || e.etapa) }) : this.translate.instant('nps.encuestasLista.dentroDelSeller');
  }

  fecha(iso?: string): string {
    return fechaCorta(iso);
  }

  porId(_: number, e: Encuesta): string {
    return e.id;
  }
}
