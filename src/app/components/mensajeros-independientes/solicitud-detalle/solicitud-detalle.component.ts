import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';
import { Observable, Subject, timer } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import {
  AccionSolicitud,
  RespuestaAccionSolicitud,
  RespuestaDetalleSolicitud,
  SolicitudMensajero,
} from '../mensajeros-independientes.models';
import { MensajerosIndependientesService } from '../mensajeros-independientes.service';
import {
  accionesDisponibles,
  AccionesDisponibles,
  accionPideMotivo,
  construirDocumentos,
  DocumentoVista,
  etiquetaEstado,
  etiquetaVehiculo,
  FilaSolicitud,
  interpretarError,
  MOTIVO_MAX,
  muestraMotivoDeRevision,
  nombreCompleto,
  normalizarFecha,
  placaVisible,
  ResultadoMotivo,
  segundosRestantes,
  textoVencimiento,
  tonoEstado,
  TonoEstado,
  urlsDeImagenes,
  validarMotivo,
} from '../mensajeros-independientes.utils';

export interface EventoAccionCompletada {
  accion: AccionSolicitud;
  nombre: string;
}

export interface EventoTransicionObsoleta {
  /** Texto del backend, tal cual. */
  texto: string;
  nombre: string;
}

/** Por encima del diálogo de PrimeNG (que arranca en 1100), para que la confirmación no quede detrás. */
const Z_INDEX_CONFIRMACION = '10050';

/**
 * Detalle de una solicitud: datos de la persona, documentos (miniaturas que se agrandan) y acciones
 * según el estado. Los enlaces de los documentos son firmados y vencen a los 10 minutos: viven solo en
 * memoria de este componente, que se destruye al cerrar. No se escriben en consola ni en el almacenamiento.
 */
@Component({
  selector: 'app-mensajeros-solicitud-detalle',
  templateUrl: './solicitud-detalle.component.html',
  styleUrls: ['./solicitud-detalle.component.scss'],
})
export class SolicitudDetalleComponent implements OnInit, OnDestroy {
  @Input() solicitudId = '';
  /** Fila de la lista: sirve para poner el nombre en el título mientras carga el detalle. */
  @Input() resumen: FilaSolicitud | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() accionCompletada = new EventEmitter<EventoAccionCompletada>();
  @Output() transicionObsoleta = new EventEmitter<EventoTransicionObsoleta>();

  readonly motivoMax = MOTIVO_MAX;

  // Carga
  cargando = true;
  errorCarga: string | null = null;
  recargandoDocumentos = false;
  errorRecarga: string | null = null;

  // Datos
  solicitud: SolicitudMensajero | null = null;
  documentos: DocumentoVista[] = [];
  imagenes: string[] = [];
  acciones: AccionesDisponibles = accionesDisponibles(null, []);
  estadoEtiqueta = '';
  estadoTono: TonoEstado = 'neutro';
  vehiculo = '';
  placa = '';
  fechaRegistro: Date | null = null;
  fechaEnvio: Date | null = null;
  mostrarRevision = false;
  revisionConMotivo = false;
  fechaRevision: Date | null = null;

  // Vencimiento de los enlaces
  textoVencimiento = '';
  enlacesVencidos = false;
  private cargadoEn = 0;
  private vencenEnSegundos: number | undefined;

  // Imágenes con error (enlace vencido o archivo roto)
  private readonly imagenesConError = new Set<string>();

  // Visor con zoom
  visorVisible = false;
  visorIndice = 0;

  // Acciones
  accionConMotivo: AccionSolicitud | null = null;
  motivo = '';
  intentoEnvio = false;
  confirmando = false;
  enviando = false;
  errorAccion: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly servicio: MensajerosIndependientesService) {}

  // ---------------------------------------------------------------------------
  // Estado derivado
  // ---------------------------------------------------------------------------

  get titulo(): string {
    return this.solicitud ? nombreCompleto(this.solicitud) : this.resumen?.nombreCompleto || 'Solicitud';
  }

  /** Mientras se confirma o se envía no se puede tocar nada ni cerrar el diálogo. */
  get ocupado(): boolean {
    return this.confirmando || this.enviando;
  }

  get validacionMotivo(): ResultadoMotivo {
    return validarMotivo(this.motivo);
  }

  /** El error del motivo solo aparece cuando la persona ya escribió algo o intentó enviar. */
  get errorMotivo(): string | null {
    const v = this.validacionMotivo;
    return !v.valido && (this.intentoEnvio || this.motivo.length > 0) ? v.error : null;
  }

  get tituloMotivo(): string {
    return this.accionConMotivo === 'suspender' ? 'Motivo de la suspensión' : 'Motivo del rechazo';
  }

  get textoBotonMotivo(): string {
    return this.accionConMotivo === 'suspender' ? 'Suspender mensajero' : 'Rechazar solicitud';
  }

  get tituloRevision(): string {
    switch (this.solicitud?.estadoRegistro) {
      case 'suspendido':
        return 'Motivo de la suspensión';
      case 'aprobado':
        return 'Solicitud aprobada';
      default:
        return 'Motivo del rechazo';
    }
  }

  get claseRevision(): string {
    switch (this.solicitud?.estadoRegistro) {
      case 'suspendido':
        return 'cfg-aviso--warn';
      case 'aprobado':
        return 'cfg-aviso--ok';
      default:
        return 'cfg-aviso--error';
    }
  }

  // ---------------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.cargarDetalle();
    // Mantiene al día el aviso de vencimiento de los enlaces.
    timer(0, 15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.actualizarVencimiento());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------------

  /** Primera carga y reintento: reemplaza todo el contenido. */
  cargarDetalle(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.servicio
      .detalle(this.solicitudId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          this.aplicarDetalle(respuesta);
          this.cargando = false;
        },
        error: (err) => {
          this.errorCarga = interpretarError(err).texto;
          this.cargando = false;
        },
      });
  }

  /** "Recargar documentos": vuelve a pedir el detalle para obtener enlaces nuevos. */
  recargarDocumentos(): void {
    if (this.recargandoDocumentos || this.ocupado) {
      return;
    }
    this.recargandoDocumentos = true;
    this.errorRecarga = null;
    this.servicio
      .detalle(this.solicitudId)
      .pipe(
        finalize(() => (this.recargandoDocumentos = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (respuesta) => this.aplicarDetalle(respuesta),
        error: (err) => (this.errorRecarga = interpretarError(err).texto),
      });
  }

  private aplicarDetalle(respuesta: RespuestaDetalleSolicitud): void {
    const solicitud = respuesta.solicitud;
    this.solicitud = solicitud;
    this.documentos = construirDocumentos(solicitud, respuesta.enlaces);
    this.imagenes = urlsDeImagenes(this.documentos);
    this.imagenesConError.clear();
    this.acciones = accionesDisponibles(solicitud.estadoRegistro, solicitud.documentosFaltantes);
    this.estadoEtiqueta = etiquetaEstado(solicitud.estadoRegistro);
    this.estadoTono = tonoEstado(solicitud.estadoRegistro);
    this.vehiculo = etiquetaVehiculo(solicitud.tipoVehiculo);
    this.placa = placaVisible(solicitud.placa);
    this.fechaRegistro = normalizarFecha(solicitud.creadoAt);
    this.fechaEnvio = normalizarFecha(solicitud.enviadoAt);
    this.revisionConMotivo = muestraMotivoDeRevision(solicitud.estadoRegistro);
    // El motivo y quién decidió se ven en rechazadas y suspendidas; en aprobadas, solo quién aprobó.
    this.mostrarRevision =
      !!solicitud.revision && (this.revisionConMotivo || (solicitud.estadoRegistro === 'aprobado' && !!solicitud.revision.por));
    this.fechaRevision = normalizarFecha(solicitud.revision?.en);
    this.cargadoEn = Date.now();
    this.vencenEnSegundos = respuesta.enlacesVencenEnSegundos;
    this.actualizarVencimiento();

    // Si el estado cambió mientras estaba abierto el panel del motivo, ya no aplica.
    if (this.accionConMotivo && !this.accionDisponible(this.accionConMotivo)) {
      this.cancelarMotivo();
    }
  }

  private actualizarVencimiento(): void {
    if (!this.cargadoEn) {
      return;
    }
    const restantes = segundosRestantes(this.vencenEnSegundos, this.cargadoEn, Date.now());
    this.enlacesVencidos = restantes <= 0;
    this.textoVencimiento = textoVencimiento(restantes);
  }

  // ---------------------------------------------------------------------------
  // Documentos
  // ---------------------------------------------------------------------------

  marcarImagenConError(doc: DocumentoVista): void {
    if (doc.url) {
      this.imagenesConError.add(doc.url);
    }
  }

  imagenConError(doc: DocumentoVista): boolean {
    return !!doc.url && this.imagenesConError.has(doc.url);
  }

  abrirVisor(doc: DocumentoVista): void {
    const indice = doc.url ? this.imagenes.indexOf(doc.url) : -1;
    if (indice < 0) {
      return;
    }
    this.visorIndice = indice;
    this.visorVisible = true;
  }

  cerrarVisor(): void {
    this.visorVisible = false;
  }

  trackPorTipo(_indice: number, doc: DocumentoVista): string {
    return doc.tipo;
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  private accionDisponible(accion: AccionSolicitud): boolean {
    return (
      (accion === 'aprobar' && this.acciones.aprobarHabilitado) ||
      (accion === 'rechazar' && this.acciones.rechazar) ||
      (accion === 'suspender' && this.acciones.suspender)
    );
  }

  /** Aprobar pide confirmación; rechazar y suspender abren primero el panel del motivo. */
  iniciarAccion(accion: AccionSolicitud): void {
    if (this.ocupado || !this.solicitud || !this.accionDisponible(accion)) {
      return;
    }
    this.errorAccion = null;
    if (accionPideMotivo(accion)) {
      this.accionConMotivo = accion;
      this.motivo = '';
      this.intentoEnvio = false;
      return;
    }
    void this.confirmarYEnviar(accion);
  }

  cancelarMotivo(): void {
    if (this.ocupado) {
      return;
    }
    this.accionConMotivo = null;
    this.motivo = '';
    this.intentoEnvio = false;
  }

  /** Envío del panel del motivo: valida antes de pedir la confirmación. */
  confirmarMotivo(): void {
    if (this.ocupado || !this.accionConMotivo) {
      return;
    }
    this.intentoEnvio = true;
    const validacion = this.validacionMotivo;
    if (!validacion.valido) {
      return;
    }
    void this.confirmarYEnviar(this.accionConMotivo, validacion.texto);
  }

  private async confirmarYEnviar(accion: AccionSolicitud, motivo?: string): Promise<void> {
    if (!this.solicitud) {
      return;
    }
    const nombre = nombreCompleto(this.solicitud);
    this.confirmando = true;
    let aceptada = false;
    try {
      aceptada = await this.pedirConfirmacion(accion, nombre, motivo);
    } finally {
      this.confirmando = false;
    }
    if (aceptada) {
      this.enviar(accion, nombre, motivo);
    }
  }

  private enviar(accion: AccionSolicitud, nombre: string, motivo?: string): void {
    if (this.enviando) {
      return;
    }
    this.enviando = true;
    this.errorAccion = null;

    this.peticion(accion, motivo ?? '')
      .pipe(
        finalize(() => (this.enviando = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.accionCompletada.emit({ accion, nombre }),
        error: (err) => {
          const error = interpretarError(err);
          if (error.transicionObsoleta) {
            this.transicionObsoleta.emit({ texto: error.texto, nombre });
          } else {
            this.errorAccion = error.texto;
          }
        },
      });
  }

  private peticion(accion: AccionSolicitud, motivo: string): Observable<RespuestaAccionSolicitud> {
    switch (accion) {
      case 'aprobar':
        return this.servicio.aprobar(this.solicitudId);
      case 'rechazar':
        return this.servicio.rechazar(this.solicitudId, motivo);
      case 'suspender':
        return this.servicio.suspender(this.solicitudId, motivo);
    }
  }

  /**
   * Confirmación con SweetAlert2. El nombre y el motivo son texto de personas: van en `titleText` y
   * `text` (texto plano), nunca en `title` ni `html`, que interpretan HTML.
   */
  private async pedirConfirmacion(accion: AccionSolicitud, nombre: string, motivo?: string): Promise<boolean> {
    const textos: Record<AccionSolicitud, { titulo: string; texto: string; boton: string; peligro: boolean }> = {
      aprobar: {
        titulo: `¿Aprobar a ${nombre}?`,
        texto: 'Confirma que revisaste sus datos y sus documentos.',
        boton: 'Sí, aprobar',
        peligro: false,
      },
      rechazar: {
        titulo: `¿Rechazar la solicitud de ${nombre}?`,
        texto: `Motivo: ${motivo ?? ''}`,
        boton: 'Sí, rechazar',
        peligro: true,
      },
      suspender: {
        titulo: `¿Suspender a ${nombre}?`,
        texto: `Motivo: ${motivo ?? ''}`,
        boton: 'Sí, suspender',
        peligro: true,
      },
    };
    const t = textos[accion];
    const resultado = await Swal.fire({
      titleText: t.titulo,
      text: t.texto,
      icon: t.peligro ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: t.boton,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: t.peligro ? '#D64545' : '#5F3FE0',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      focusCancel: true,
      didOpen: () => {
        const contenedor = Swal.getContainer();
        if (contenedor) {
          contenedor.style.zIndex = Z_INDEX_CONFIRMACION;
        }
      },
    });
    return resultado.isConfirmed;
  }

  // ---------------------------------------------------------------------------
  // Cierre
  // ---------------------------------------------------------------------------

  alCambiarVisibilidad(visible: boolean): void {
    if (!visible && !this.ocupado) {
      this.cerrar.emit();
    }
  }
}
