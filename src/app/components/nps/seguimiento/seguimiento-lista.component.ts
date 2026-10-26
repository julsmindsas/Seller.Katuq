import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NpsService } from '../../../shared/services/nps/nps.service';
import { Caso, Encuesta, EstadoCaso, IndicadoresCasos, UsuarioResponsable } from '../../../shared/services/nps/nps.models';
import {
  ESTADOS_CASO, NOMBRE_CANAL, NOMBRE_ESTADO_CASO, casoAbierto, duracionHoras, esAdministradorSesion, fechaCorta, mensajeError,
} from '../nps-comun';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
type FiltroEstado = 'abiertos' | 'todos' | EstadoCaso;

/** Abiertos primero y, entre ellos, los vencidos; dentro de cada grupo, lo más reciente arriba. */
function orden(a: Caso, b: Caso): number {
  const grupo = (c: Caso) => (casoAbierto(c.estado) ? (c.vencido ? 0 : 1) : 2);
  const g = grupo(a) - grupo(b);
  if (g !== 0) return g;
  return (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0);
}

/**
 * Pestaña Seguimiento (D-490): cada detractor es un caso. Indicadores de 90 días y la lista
 * con filtros por estado, responsable y encuesta. Quien no es de la familia Administrador
 * ve solo los casos a su nombre (lo filtra el servidor).
 */
@Component({
  selector: 'app-nps-seguimiento-lista',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './seguimiento-lista.component.html',
  styleUrls: ['./seguimiento-lista.component.scss'],
})
export class SeguimientoListaComponent implements OnInit, OnDestroy {
  readonly NOMBRE_ESTADO = NOMBRE_ESTADO_CASO;
  readonly NOMBRE_CANAL = NOMBRE_CANAL;
  readonly ESTADOS = ESTADOS_CASO;
  readonly esAdmin = esAdministradorSesion();

  casos: Caso[] = [];
  visibles: Caso[] = [];
  indicadores: IndicadoresCasos | null = null;
  encuestas: Encuesta[] = [];
  responsables: UsuarioResponsable[] = [];
  cargando = false;
  error: string | null = null;

  filtroEstado: FiltroEstado = 'abiertos';
  filtroResponsable = '';
  filtroEncuesta = '';
  /** El estado con que se hizo la última consulta (null si falló). */
  private estadoConsultado: EstadoCaso | '' | null = null;

  private destroy$ = new Subject<void>();

  constructor(private nps: NpsService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    if (this.esAdmin) {
      this.nps.encuestas().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => (this.encuestas = r?.encuestas || []),
        error: () => (this.encuestas = []),
      });
      this.nps.responsables().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => (this.responsables = r?.usuarios || []),
        error: () => (this.responsables = []),
      });
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    const estado = this.estadoServidor();
    this.nps.casos({ estado, responsable: this.filtroResponsable, encuesta: this.filtroEncuesta })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.casos = (r?.casos || []).slice().sort(orden);
          this.indicadores = r?.indicadores || null;
          this.estadoConsultado = estado;
          this.cargando = false;
          this.aplicar();
        },
        error: (e) => {
          this.cargando = false;
          this.casos = [];
          this.visibles = [];
          this.estadoConsultado = null;
          this.error = mensajeError(e, this.translate.instant('nps.seguimientoLista.noPudimosCargarLosCasos'), this.translate);
        },
      });
  }

  aplicar(): void {
    this.visibles = this.filtroEstado === 'abiertos' ? this.casos.filter((c) => casoAbierto(c.estado)) : this.casos;
  }

  /** Pasar entre "Abiertos" y "Todos" no vuelve al servidor: los dos usan la misma consulta. */
  cambiarEstado(): void {
    if (this.estadoServidor() === this.estadoConsultado) this.aplicar();
    else this.cargar();
  }

  /** "Abiertos" y "Todos" se filtran aquí; un estado puntual lo filtra el servidor. */
  private estadoServidor(): EstadoCaso | '' {
    return this.filtroEstado === 'abiertos' || this.filtroEstado === 'todos' ? '' : this.filtroEstado;
  }

  duracion(h: number | null | undefined): string {
    return duracionHoras(h, this.translate);
  }

  quien(c: Caso): string {
    return c.comprador?.nombre || c.empresaQueResponde || c.comprador?.email || this.translate.instant('nps.caso.clienteSinNombre');
  }

  fecha(iso: string): string {
    return fechaCorta(iso);
  }

  porId(_: number, c: Caso): string {
    return c.id;
  }
}
