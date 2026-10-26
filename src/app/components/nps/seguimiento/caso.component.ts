import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Observable, Subject, from, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { NpsService } from '../../../shared/services/nps/nps.service';
import { SecurityService } from '../../../shared/services/security/security.service';
import { CambiosCaso, Caso, EstadoCaso, HistorialCaso, UsuarioResponsable } from '../../../shared/services/nps/nps.models';
import {
  ESTADOS_CASO, ESTADOS_CIERRE, NOMBRE_CANAL, NOMBRE_ESTADO_CASO, NOMBRE_SEGMENTO, codigoError, enlaceLlamada, enlaceWhatsapp,
  esAdministradorSesion, fechaHora, mensajeError,
} from '../nps-comun';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
const MAX_NOTA = 1000;

const ACCIONES: Record<string, string> = {
  abierto: 'nps.caso.seAbrioElCaso',
  apertura: 'nps.caso.seAbrioElCaso',
  estado: 'nps.caso.cambioElEstado',
  responsable: 'nps.caso.seReasigno',
  reasignado: 'nps.caso.seReasigno',
  nota: 'nps.caso.agregoUnaNota',
  cierre: 'nps.caso.cerroElCaso',
  aviso: 'nps.caso.seAvisoAlResponsable',
  recordatorio: 'nps.caso.seRecordoAlResponsable',
};

/**
 * Un caso de seguimiento (D-490): la respuesta del cliente, cómo contactarlo (llamar o
 * escribir por WhatsApp: el mensaje lo envía la persona), el estado, el responsable, las
 * notas y el historial. Pasar a Resuelto o Sin solución pide la nota de cierre; el servidor
 * también la exige (400 NOTA_REQUERIDA).
 */
@Component({
  selector: 'app-nps-caso',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './caso.component.html',
  styleUrls: ['./caso.component.scss'],
})
export class CasoComponent implements OnInit, OnDestroy {
  readonly ESTADOS = ESTADOS_CASO;
  readonly NOMBRE_ESTADO = NOMBRE_ESTADO_CASO;
  readonly NOMBRE_SEGMENTO = NOMBRE_SEGMENTO;
  readonly NOMBRE_CANAL = NOMBRE_CANAL;
  readonly MAX_NOTA = MAX_NOTA;
  private readonly comercio = this.security.getCompanyInformationLogged()?.nombreComercio || '';

  caso: Caso | null = null;
  cargando = true;
  error: string | null = null;
  guardando = false;
  responsables: UsuarioResponsable[] = [];
  nuevoResponsable = '';
  nota = '';

  private id = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private nps: NpsService,
    private security: SecurityService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  get whatsapp(): string | null {
    const c = this.caso;
    if (!c?.comprador?.telefono) return null;
    const nombre = String(c.comprador.nombre || '').split(' ')[0];
    const saludo = `Hola${nombre ? ' ' + nombre : ''}, te escribimos${this.comercio ? ' de ' + this.comercio : ''}. Vimos tu opinión sobre tu compra y queremos ayudarte.`;
    return enlaceWhatsapp(c.comprador.telefono, saludo);
  }

  get llamada(): string | null {
    return enlaceLlamada(this.caso?.comprador?.telefono);
  }

  get notasRecientes() {
    return (this.caso?.notas || []).slice().sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0));
  }

  get historialReciente(): HistorialCaso[] {
    return (this.caso?.historial || []).slice().sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0));
  }

  ngOnInit(): void {
    // La lista de usuarios es solo de la familia Administrador: el responsable sin ese rol
    // atiende su caso pero no lo reasigna desde aquí.
    if (esAdministradorSesion()) {
      this.nps.responsables().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => (this.responsables = r?.usuarios || []),
        error: () => (this.responsables = []),
      });
    }
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((p) => {
      this.id = p.get('id') || '';
      this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.nps.caso(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.caso = r?.caso || null;
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        this.caso = null;
        this.error = e?.status === 404
          ? this.translate.instant('nps.caso.noEncontramosEsteCaso')
          : e?.status === 403
            ? this.translate.instant('nps.caso.esteCasoLoAtiendenSu')
            : mensajeError(e, this.translate.instant('nps.caso.noPudimosAbrirElCaso'), this.translate);
      },
    });
  }

  /** Cambiar a otro estado; los de cierre piden la nota. */
  cambiarEstado(estado: EstadoCaso): void {
    if (!this.caso || this.guardando || estado === this.caso.estado) return;
    const cambio$: Observable<CambiosCaso | null> = ESTADOS_CIERRE.includes(estado)
      ? this.pedirNotaCierre(estado).pipe(map((nota) => (nota ? { estado, nota } : null)))
      : of({ estado });
    cambio$.pipe(takeUntil(this.destroy$)).subscribe((cambios) => {
      if (cambios) this.guardar(cambios, this.translate.instant('nps.caso.casoQuedoEn', { estado: this.translate.instant(NOMBRE_ESTADO_CASO[estado]) }));
    });
  }

  reasignar(): void {
    if (!this.nuevoResponsable || this.nuevoResponsable === this.caso?.responsable?.email) return;
    const persona = this.responsables.find((u) => u.email === this.nuevoResponsable);
    this.guardar({ responsableEmail: this.nuevoResponsable }, this.translate.instant('nps.caso.casoReasignado', { nombre: persona?.nombre || this.nuevoResponsable }), () => {
      this.nuevoResponsable = '';
    });
  }

  agregarNota(): void {
    const texto = this.nota.trim();
    if (!texto) return;
    this.guardar({ nota: texto.slice(0, MAX_NOTA) }, this.translate.instant('nps.caso.notaAgregada'), () => (this.nota = ''));
  }

  private guardar(cambios: CambiosCaso, exito: string, despues?: () => void): void {
    if (!this.caso || this.guardando) return;
    this.guardando = true;
    this.nps.actualizarCaso(this.caso.id, cambios).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.guardando = false;
        if (r?.caso) this.caso = r.caso;
        this.toastr.success(exito);
        despues?.();
      },
      error: (e) => {
        this.guardando = false;
        // El servidor también exige la nota al cerrar: se vuelve a pedir.
        if (codigoError(e) === 'NOTA_REQUERIDA' && cambios.estado) {
          this.cambiarEstado(cambios.estado);
          return;
        }
        this.toastr.error(e?.status === 403
          ? this.translate.instant('nps.caso.esteCasoLoAtiendenSu')
          : mensajeError(e, this.translate.instant('nps.caso.noPudimosGuardarElCambio'), this.translate));
      },
    });
  }

  private pedirNotaCierre(estado: EstadoCaso): Observable<string | null> {
    return from(Swal.fire({
      title: estado === 'resuelto' ? this.translate.instant('nps.caso.marcarComoResuelto') : this.translate.instant('nps.caso.cerrarSinSolucion'),
      text: estado === 'resuelto'
        ? this.translate.instant('nps.caso.queSeHizoConEl')
        : this.translate.instant('nps.caso.porQueSeCierraSin'),
      input: 'textarea',
      inputPlaceholder: estado === 'resuelto' ? this.translate.instant('nps.caso.ejSeLeReenvioEl') : this.translate.instant('nps.caso.ejNoRespondioDespuesDe'),
      inputAttributes: { maxlength: String(MAX_NOTA), 'aria-label': this.translate.instant('nps.caso.notaDeCierre') },
      showCancelButton: true,
      confirmButtonText: this.translate.instant('nps.caso.cerrarElCaso'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0',
      cancelButtonColor: '#5A6B78',
      reverseButtons: true,
      inputValidator: (v) => (String(v || '').trim() ? null : this.translate.instant('nps.caso.escribeLaNotaDeCierre')),
    })).pipe(
      map((r) => (r.isConfirmed ? String(r.value || '').trim().slice(0, MAX_NOTA) : null)),
      catchError(() => of(null)),
    );
  }

  accion(h: HistorialCaso): string {
    return ACCIONES[h.accion] ? this.translate.instant(ACCIONES[h.accion]) : h.accion;
  }

  /** "de Nuevo a Contactado" con los nombres de los estados cuando aplican. */
  detalle(h: HistorialCaso): string {
    const nombre = (v?: string) => { const k = v && (NOMBRE_ESTADO_CASO as Record<string, string>)[v]; return k ? this.translate.instant(k) : v || ''; };
    if (h.de && h.a) return this.translate.instant('nps.caso.deAA', { de: nombre(h.de), a: nombre(h.a) });
    if (h.a) return nombre(h.a);
    return '';
  }

  fecha(iso?: string): string {
    return fechaHora(iso);
  }

  /** Solo se ofrecen los responsables distintos del actual. */
  get otrosResponsables(): UsuarioResponsable[] {
    const actual = this.caso?.responsable?.email;
    return this.responsables.filter((u) => u.email !== actual);
  }

  porIndice(i: number): number {
    return i;
  }
}
