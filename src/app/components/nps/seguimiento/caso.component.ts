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

const MAX_NOTA = 1000;

const ACCIONES: Record<string, string> = {
  abierto: 'Se abrió el caso',
  apertura: 'Se abrió el caso',
  estado: 'Cambió el estado',
  responsable: 'Se reasignó',
  reasignado: 'Se reasignó',
  nota: 'Agregó una nota',
  cierre: 'Cerró el caso',
  aviso: 'Se avisó al responsable',
  recordatorio: 'Se recordó al responsable',
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
  imports: [CommonModule, FormsModule, RouterModule],
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
          ? 'No encontramos este caso.'
          : e?.status === 403
            ? 'Este caso lo atienden su responsable y los administradores de tu empresa.'
            : mensajeError(e, 'No pudimos abrir el caso. Intenta de nuevo en unos minutos.');
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
      if (cambios) this.guardar(cambios, `El caso quedó en "${NOMBRE_ESTADO_CASO[estado]}"`);
    });
  }

  reasignar(): void {
    if (!this.nuevoResponsable || this.nuevoResponsable === this.caso?.responsable?.email) return;
    const persona = this.responsables.find((u) => u.email === this.nuevoResponsable);
    this.guardar({ responsableEmail: this.nuevoResponsable }, `Caso reasignado a ${persona?.nombre || this.nuevoResponsable}. Le llega un correo con el aviso.`, () => {
      this.nuevoResponsable = '';
    });
  }

  agregarNota(): void {
    const texto = this.nota.trim();
    if (!texto) return;
    this.guardar({ nota: texto.slice(0, MAX_NOTA) }, 'Nota agregada', () => (this.nota = ''));
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
          ? 'Este caso lo atienden su responsable y los administradores de tu empresa.'
          : mensajeError(e, 'No pudimos guardar el cambio. Intenta de nuevo.'));
      },
    });
  }

  private pedirNotaCierre(estado: EstadoCaso): Observable<string | null> {
    return from(Swal.fire({
      title: estado === 'resuelto' ? 'Marcar como resuelto' : 'Cerrar sin solución',
      text: estado === 'resuelto'
        ? '¿Qué se hizo con el cliente? Queda en el historial del caso.'
        : '¿Por qué se cierra sin solución? Queda en el historial del caso.',
      input: 'textarea',
      inputPlaceholder: estado === 'resuelto' ? 'Ej.: se le reenvió el pedido' : 'Ej.: no respondió después de tres intentos',
      inputAttributes: { maxlength: String(MAX_NOTA), 'aria-label': 'Nota de cierre' },
      showCancelButton: true,
      confirmButtonText: 'Cerrar el caso',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
      cancelButtonColor: '#5A6B78',
      reverseButtons: true,
      inputValidator: (v) => (String(v || '').trim() ? null : 'Escribe la nota de cierre.'),
    })).pipe(
      map((r) => (r.isConfirmed ? String(r.value || '').trim().slice(0, MAX_NOTA) : null)),
      catchError(() => of(null)),
    );
  }

  accion(h: HistorialCaso): string {
    return ACCIONES[h.accion] || h.accion;
  }

  /** "de Nuevo a Contactado" con los nombres de los estados cuando aplican. */
  detalle(h: HistorialCaso): string {
    const nombre = (v?: string) => (v && (NOMBRE_ESTADO_CASO as Record<string, string>)[v]) || v || '';
    if (h.de && h.a) return `de ${nombre(h.de)} a ${nombre(h.a)}`;
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
