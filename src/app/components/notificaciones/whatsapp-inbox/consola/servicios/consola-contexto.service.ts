import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { MessagingLinesService } from '../../../../../shared/services/messaging/messaging-lines.service';
import { MessagingLine, MiembroEquipo } from '../../../../../shared/services/messaging/messaging.models';

export interface EstadoConsola {
  cargando: boolean;
  /** `null` = sin error; texto vacío = falló sin causa legible (la pantalla pone el mensaje general). */
  error: string | null;
  lineas: MessagingLine[];
  equipo: MiembroEquipo[];
  metaDirecto: { habilitada: boolean; modoCelular: boolean };
  puedeAdministrar: boolean;
  /** Número escogido para Plantillas, Envíos y Registro. */
  lineaId: string | null;
}

const ESTADO_INICIAL: EstadoConsola = {
  cargando: false,
  error: null,
  lineas: [],
  equipo: [],
  metaDirecto: { habilitada: false, modoCelular: false },
  puedeAdministrar: false,
  lineaId: null,
};

/**
 * Lo que comparten las secciones de la consola (D-707): los números del comercio, el equipo y cuál
 * número está escogido. Se carga una sola vez cuando se abre la consola (`consola-shell`); las
 * secciones solo leen. No guarda nada en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class ConsolaContextoService {
  private readonly subject = new BehaviorSubject<EstadoConsola>(ESTADO_INICIAL);
  readonly estado$: Observable<EstadoConsola> = this.subject.asObservable();

  /** Número escogido; `null` si el comercio no tiene números. */
  readonly linea$: Observable<MessagingLine | null> = this.estado$.pipe(
    map((e) => e.lineas.find((l) => l.id === e.lineaId) || null),
    distinctUntilChanged((a, b) => (a?.id || null) === (b?.id || null) && (a?.provider || null) === (b?.provider || null)),
  );

  constructor(private readonly lineas: MessagingLinesService) {}

  get actual(): EstadoConsola {
    return this.subject.value;
  }

  /** Carga los números y el equipo. `preferida` es el número que venía en la dirección (`?linea=`). */
  cargar(preferida?: string | null): void {
    this.subject.next({ ...this.actual, cargando: true, error: null });
    this.lineas.listar().subscribe({
      next: (res) => {
        const conectadas = res.lines.filter((l) => l.status === 'connected');
        const sugerida =
          [preferida, this.actual.lineaId].find((id) => !!id && res.lines.some((l) => l.id === id)) ||
          (conectadas[0] || res.lines[0])?.id ||
          null;
        this.subject.next({
          cargando: false,
          error: null,
          lineas: res.lines,
          equipo: res.equipo,
          metaDirecto: res.metaDirecto,
          puedeAdministrar: res.puedeAdministrar,
          lineaId: sugerida,
        });
      },
      error: (err) => {
        const m = err?.error?.message;
        this.subject.next({
          ...this.actual,
          cargando: false,
          error: typeof m === 'string' && m.trim() ? m : '',
        });
      },
    });
  }

  seleccionar(lineaId: string | null): void {
    if (lineaId === this.actual.lineaId) return;
    this.subject.next({ ...this.actual, lineaId });
  }

  /** Pone o reemplaza una línea (por ejemplo, después de conectarla o de cambiar su equipo). */
  poner(linea: MessagingLine): void {
    if (!linea || !linea.id) return;
    const e = this.actual;
    const existe = e.lineas.some((l) => l.id === linea.id);
    const lineas = existe ? e.lineas.map((l) => (l.id === linea.id ? linea : l)) : [...e.lineas, linea];
    this.subject.next({ ...e, lineas, lineaId: e.lineaId || linea.id });
  }

  /** Al salir de la consola: no queda nada del comercio en memoria. */
  limpiar(): void {
    this.subject.next(ESTADO_INICIAL);
  }
}
