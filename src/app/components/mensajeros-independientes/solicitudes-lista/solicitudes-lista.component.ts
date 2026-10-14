import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { EstadoSolicitud } from '../mensajeros-independientes.models';
import { MensajerosIndependientesService } from '../mensajeros-independientes.service';
import {
  ESTADO_POR_DEFECTO,
  ESTADOS_SOLICITUD,
  etiquetaPestana,
  FilaSolicitud,
  filasPorFechaReciente,
  interpretarError,
  mensajeExito,
  MensajeVacio,
  mensajeVacio,
} from '../mensajeros-independientes.utils';
import { EventoAccionCompletada, EventoTransicionObsoleta } from '../solicitud-detalle/solicitud-detalle.component';

interface AvisoLista {
  titulo: string;
  detalle: string;
}

/**
 * Lista de solicitudes de mensajeros independientes, con filtro por estado. Al tocar una fila se abre
 * el detalle (diálogo), donde se aprueba, rechaza o suspende. Solo la ve el Super Administrador de la
 * operadora (guardia de la ruta); el backend rechaza con 403 a cualquier otro.
 */
@Component({
  selector: 'app-mensajeros-solicitudes',
  templateUrl: './solicitudes-lista.component.html',
  styleUrls: ['./solicitudes-lista.component.scss'],
})
export class SolicitudesListaComponent implements OnInit, OnDestroy {
  readonly estados = ESTADOS_SOLICITUD;
  readonly etiquetaPestana = etiquetaPestana;

  estadoActivo: EstadoSolicitud = ESTADO_POR_DEFECTO;
  filas: FilaSolicitud[] = [];
  total = 0;
  cargando = false;
  error: string | null = null;
  aviso: AvisoLista | null = null;
  vacio: MensajeVacio = mensajeVacio(ESTADO_POR_DEFECTO);

  /** Solicitud abierta en el detalle; `null` si no hay ninguno. */
  seleccionada: FilaSolicitud | null = null;

  private readonly pedirLista$ = new Subject<EstadoSolicitud>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly servicio: MensajerosIndependientesService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    // switchMap: si se cambia de pestaña mientras carga, la respuesta vieja se descarta.
    this.pedirLista$
      .pipe(
        tap(() => {
          this.cargando = true;
          this.error = null;
        }),
        switchMap((estado) =>
          this.servicio.listar(estado).pipe(
            catchError((err) => {
              this.error = interpretarError(err).texto;
              this.filas = [];
              this.total = 0;
              this.cargando = false;
              return EMPTY;
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((respuesta) => {
        this.filas = filasPorFechaReciente(respuesta?.solicitudes);
        this.total = typeof respuesta?.total === 'number' ? respuesta.total : this.filas.length;
        this.cargando = false;
      });

    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.pedirLista$.next(this.estadoActivo);
  }

  cambiarEstado(estado: EstadoSolicitud): void {
    if (estado === this.estadoActivo && !this.error) {
      return;
    }
    this.estadoActivo = estado;
    this.vacio = mensajeVacio(estado);
    this.filas = [];
    this.total = 0;
    this.aviso = null;
    this.cargar();
  }

  abrirDetalle(fila: FilaSolicitud): void {
    this.aviso = null;
    this.seleccionada = fila;
  }

  alCerrarDetalle(): void {
    this.seleccionada = null;
  }

  alCompletarAccion(evento: EventoAccionCompletada): void {
    this.seleccionada = null;
    this.toastr.success(mensajeExito(evento.accion, evento.nombre), 'Solicitud actualizada');
    this.cargar();
  }

  /** 409 `TRANSICION_NO_PERMITIDA`: alguien más ya la movió. Se avisa y se recarga la lista. */
  alTransicionObsoleta(evento: EventoTransicionObsoleta): void {
    this.seleccionada = null;
    this.aviso = {
      titulo: `La solicitud de ${evento.nombre} ya cambió de estado, así que no se aplicó tu acción. Actualizamos la lista.`,
      detalle: evento.texto,
    };
    this.cargar();
  }

  trackPorId(_indice: number, fila: FilaSolicitud): string {
    return fila.id;
  }
}
