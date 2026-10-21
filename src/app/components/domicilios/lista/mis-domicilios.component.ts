import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, combineLatest, EMPTY, fromEvent, interval, merge, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ErrorDomicilios, interpretarErrorDomicilios } from '../domicilios.errores';
import { EstadoDomicilio, ESTADOS_DOMICILIO, FiltrosListado, RespuestaListaDomicilios } from '../domicilios.models';
import { descargarTexto } from '../domicilios.navegador';
import {
  construirFilas, csvDelListado, fechaIsoLocal, FilaDomicilio, filtrarFilas, formatearPesos, nombreArchivoListado, rangoPorDefecto,
  TonoDomicilio, tonoEstadoDomicilio, iconoEstadoDomicilio, validarRangoFechas
} from '../domicilios.presentacion';
import { DomiciliosService } from '../domicilios.service';
import { etiquetaEstadoDomicilio } from '../domicilios.utils';

/** Cada cuánto se refresca la lista mientras la pestaña esté a la vista. */
export const INTERVALO_REFRESCO_MS = 20000;

interface OpcionEstado {
  valor: EstadoDomicilio | '';
  texto: string;
  /** `null` en «Todos»: no es un estado y usa el color de marca. */
  tono: TonoDomicilio | null;
  icono: string;
}

/**
 * Pestaña «Mis domicilios»: tabla con filtro de estado, rango de fechas y búsqueda local. Se refresca sola
 * cada 20 segundos mientras la pestaña esté activa y la ventana visible; al salir se detiene (el intervalo
 * vive dentro de un `switchMap` que se cancela solo) y no se acumulan suscripciones.
 */
@Component({
  selector: 'app-domicilios-lista',
  templateUrl: './mis-domicilios.component.html',
  styleUrls: ['./mis-domicilios.component.scss']
})
export class MisDomiciliosComponent implements OnInit, OnChanges, OnDestroy {
  /** La pestaña está a la vista: solo entonces se refresca sola. */
  @Input() activa = false;
  /** Texto para la búsqueda, cuando se llega desde «Nuevo domicilio» con el número recién creado. */
  @Input() busqueda = '';

  readonly pesos = formatearPesos;
  readonly intervaloSegundos = INTERVALO_REFRESCO_MS / 1000;
  readonly opcionesEstado: OpcionEstado[] = [
    { valor: '', texto: 'Todos', tono: null, icono: 'pi-list' },
    ...ESTADOS_DOMICILIO.map(e => ({
      valor: e,
      texto: etiquetaEstadoDomicilio(e),
      tono: tonoEstadoDomicilio(e),
      icono: iconoEstadoDomicilio(e)
    }))
  ];

  estado: EstadoDomicilio | '' = '';
  desde = rangoPorDefecto().desde;
  hasta = rangoPorDefecto().hasta;
  texto = '';
  errorRango: string | null = null;

  filas: FilaDomicilio[] = [];
  /** Lo que se ve: las filas con la búsqueda local aplicada. */
  visibles: FilaDomicilio[] = [];
  hayMas = false;
  cargando = false;
  yaCargo = false;
  error: ErrorDomicilios | null = null;
  avisoRefresco: string | null = null;
  ultimaActualizacion: Date | null = null;

  seleccionada: FilaDomicilio | null = null;

  /** Domicilio que se está por cancelar (diálogo de confirmación). */
  porCancelar: FilaDomicilio | null = null;
  cancelando = false;
  errorCancelar: string | null = null;

  private readonly activa$ = new BehaviorSubject<boolean>(false);
  private readonly pedir$ = new Subject<{ silencioso: boolean }>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly servicio: DomiciliosService,
    private readonly toastr: ToastrService
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['busqueda'] && this.busqueda) this.irAlDomicilioNuevo(this.busqueda);
    if (cambios['activa']) this.activa$.next(this.activa);
  }

  ngOnInit(): void {
    // Las cargas van por un solo canal: si llega otra mientras una está en vuelo, la vieja se descarta.
    this.pedir$
      .pipe(
        tap(p => {
          if (!p.silencioso) {
            this.cargando = true;
            this.error = null;
          }
        }),
        switchMap(p =>
          this.servicio.listar(this.filtros()).pipe(
            catchError(err => {
              this.alFallar(err, p.silencioso);
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(respuesta => this.alLlegar(respuesta));

    // Refresco automático: arranca al mostrarse la pestaña con la ventana visible y se corta al esconderse.
    const ventanaVisible$ = fromEvent(document, 'visibilitychange').pipe(
      map(() => !document.hidden),
      startWith(!document.hidden)
    );
    combineLatest([this.activa$, ventanaVisible$])
      .pipe(
        map(([activa, visible]) => activa && visible),
        distinctUntilChanged(),
        // Al activarse carga de una vez y después cada 20 s; al esconderse el `switchMap` corta el intervalo.
        switchMap(activo => (activo ? merge(of(0), interval(INTERVALO_REFRESCO_MS)) : EMPTY)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.cargar(this.yaCargo));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Carga --------------------------------------------------------------

  private filtros(): FiltrosListado {
    return { estado: this.estado, desde: this.desde, hasta: this.hasta };
  }

  /** `silencioso`: refresco de fondo, sin tapar la tabla con el «cargando». */
  cargar(silencioso = false): void {
    this.errorRango = validarRangoFechas(this.desde, this.hasta);
    if (this.errorRango) return;
    this.pedir$.next({ silencioso });
  }

  private alLlegar(respuesta: RespuestaListaDomicilios): void {
    this.filas = construirFilas(respuesta?.domicilios);
    this.hayMas = respuesta?.hayMas === true;
    this.yaCargo = true;
    this.cargando = false;
    this.error = null;
    this.avisoRefresco = null;
    this.ultimaActualizacion = new Date();
    this.aplicarBusqueda();
    // Si hay un detalle abierto, se actualiza con lo último (la línea de tiempo avanza sola).
    if (this.seleccionada) {
      const id = this.seleccionada.id;
      this.seleccionada = this.filas.find(f => f.id === id) || this.seleccionada;
    }
  }

  private alFallar(err: unknown, silencioso: boolean): void {
    this.cargando = false;
    if (silencioso && this.yaCargo) {
      this.avisoRefresco = 'No pudimos actualizar la lista. Mostramos lo último que se cargó y lo intentamos de nuevo en unos segundos.';
      return;
    }
    this.error = interpretarErrorDomicilios(err);
  }

  // --- Filtros ------------------------------------------------------------

  cambiarEstado(estado: EstadoDomicilio | ''): void {
    if (estado === this.estado && !this.error) return;
    this.estado = estado;
    this.vaciar();
    this.cargar();
  }

  cambiarFecha(campo: 'desde' | 'hasta', valor: string): void {
    this[campo] = valor;
    this.errorRango = validarRangoFechas(this.desde, this.hasta);
    if (!this.errorRango) {
      this.vaciar();
      this.cargar();
    }
  }

  /** «Hoy», «7 días», «31 días»: los últimos N días contando hoy. */
  usarUltimosDias(dias: number): void {
    const hoy = new Date();
    this.hasta = fechaIsoLocal(hoy);
    this.desde = fechaIsoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1)));
    this.vaciar();
    this.cargar();
  }

  cambiarTexto(valor: string): void {
    this.texto = valor;
    this.aplicarBusqueda();
  }

  private aplicarBusqueda(): void {
    this.visibles = filtrarFilas(this.filas, this.texto);
  }

  /** Limpia la tabla antes de pedir otra consulta, para no mostrar filas de la consulta anterior. */
  private vaciar(): void {
    this.filas = [];
    this.visibles = [];
    this.hayMas = false;
    this.yaCargo = false;
  }

  /** Llegar desde «Nuevo domicilio»: se busca el número nuevo en todos los estados y con el rango al día. */
  private irAlDomicilioNuevo(numero: string): void {
    this.texto = numero;
    this.estado = '';
    if (this.hasta < fechaIsoLocal(new Date())) {
      const r = rangoPorDefecto();
      this.desde = r.desde;
      this.hasta = r.hasta;
    }
    this.vaciar();
  }

  // --- Detalle, cancelar y descarga ---------------------------------------------

  abrir(fila: FilaDomicilio): void {
    this.seleccionada = fila;
  }

  cerrarDetalle(): void {
    this.seleccionada = null;
  }

  pedirCancelar(fila: FilaDomicilio): void {
    if (!fila.puedeCancelar) return;
    this.errorCancelar = null;
    this.porCancelar = fila;
  }

  cerrarCancelar(): void {
    if (!this.cancelando) this.porCancelar = null;
  }

  confirmarCancelar(motivo: string): void {
    const fila = this.porCancelar;
    if (!fila || this.cancelando) return;
    this.cancelando = true;
    this.errorCancelar = null;
    this.servicio
      .cancelar(fila.id, motivo)
      .pipe(
        finalize(() => (this.cancelando = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.toastr.success(`Cancelamos el domicilio ${fila.numero}.`, 'Domicilio cancelado');
          this.porCancelar = null;
          this.seleccionada = null;
          this.cargar(true);
        },
        error: err => {
          const e = interpretarErrorDomicilios(err);
          this.errorCancelar = e.texto;
          // Cambió de estado mientras tanto: se trae lo nuevo para que la tabla diga la verdad.
          if (e.codigo === 'NO_SE_PUEDE_CANCELAR') this.cargar(true);
        }
      });
  }

  descargarCsv(): void {
    if (!this.visibles.length) return;
    descargarTexto(nombreArchivoListado(this.desde, this.hasta), csvDelListado(this.visibles));
  }

  get textoConteo(): string {
    const n = this.visibles.length;
    const total = this.filas.length;
    const base = `${n} ${n === 1 ? 'domicilio' : 'domicilios'}`;
    return n === total ? base : `${base} de ${total}`;
  }

  trackPorId(_i: number, f: FilaDomicilio): string {
    return f.id;
  }

  trackPorOpcion(_i: number, o: OpcionEstado): string {
    return o.valor;
  }
}
