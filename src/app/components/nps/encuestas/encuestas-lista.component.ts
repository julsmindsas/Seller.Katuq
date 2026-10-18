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

/**
 * Pestaña Encuestas (D-490): las encuestas de la empresa con su canal, estado y responsable.
 * Crear, editar, activar, pausar y eliminar es de la familia Administrador; la encuesta de
 * Julsmind a sus comercios (canal "seller") es de solo lectura y muestra su etapa.
 */
@Component({
  selector: 'app-nps-encuestas-lista',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  constructor(private nps: NpsService, private toastr: ToastrService) {}

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
      this.error = 'Las encuestas las ven y las cambian los administradores de tu empresa.';
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
        this.error = mensajeError(e, 'No pudimos cargar las encuestas. Intenta de nuevo en unos minutos.');
      },
    });
  }

  alternarEstado(e: Encuesta): void {
    if (this.ocupada) return;
    this.ocupada = e.id;
    const nuevo = e.estado === 'activa' ? 'pausada' : 'activa';
    cambiarEstadoEncuesta(this.nps, e, nuevo).pipe(takeUntil(this.destroy$)).subscribe((r) => {
      this.ocupada = null;
      if (!r.encuesta) return;
      this.toastr.success(nuevo === 'activa' ? `"${e.nombre}" quedó activa` : `"${e.nombre}" quedó pausada`);
      if (r.pausada) this.toastr.info(`"${r.pausada.nombre}" quedó pausada`);
      this.cargar();
    });
  }

  eliminar(e: Encuesta): void {
    if (this.ocupada) return;
    this.ocupada = e.id;
    eliminarEncuesta(this.nps, e).pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      this.ocupada = null;
      if (!ok) return;
      this.toastr.success(`"${e.nombre}" quedó eliminada`);
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
      () => this.toastr.success('Enlace copiado'),
      () => this.toastr.info(url, 'Copia el enlace'),
    );
  }

  async qr(e: Encuesta): Promise<void> {
    const url = this.enlace(e);
    if (url && !(await descargarQr(url, nombreArchivo(e.nombre)))) {
      this.toastr.error('No pudimos generar el QR. Intenta de nuevo.');
    }
  }

  detalle(e: Encuesta): string {
    if (e.canal === 'entrega') return `${e.diasEspera || 3} ${e.diasEspera === 1 ? 'día' : 'días'} después de la entrega`;
    if (e.canal === 'enlace') return 'Se responde desde el enlace o el QR';
    return e.etapa ? `Etapa: ${NOMBRE_ETAPA[e.etapa] || e.etapa}` : 'Dentro del Seller';
  }

  fecha(iso?: string): string {
    return fechaCorta(iso);
  }

  porId(_: number, e: Encuesta): string {
    return e.id;
  }
}
