import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ErrorDomicilios, interpretarErrorDomicilios } from '../domicilios.errores';
import {
  ejemploCurl, ENCABEZADOS_AVISO, EJEMPLO_VERIFICAR_FIRMA, EVENTOS_AVISO, validarNombreLlave, validarUrlAvisos
} from '../domicilios.integracion';
import { ConfiguracionDomicilios, ESTADOS_DOMICILIO, LlaveApi, PruebaAviso } from '../domicilios.models';
import { copiarAlPortapapeles } from '../domicilios.navegador';
import { DESCRIPCION_ESTADO, fechaDeApi, tonoEstadoDomicilio, iconoEstadoDomicilio } from '../domicilios.presentacion';
import { DomiciliosService } from '../domicilios.service';
import { etiquetaEstadoDomicilio } from '../domicilios.utils';

interface FilaLlave {
  llave: LlaveApi;
  creada: Date | null;
  ultimoUso: Date | null;
}

/**
 * Pestaña «Integración» (solo el administrador del comercio): activar los domicilios, llaves de API,
 * dirección de avisos con su secreto y una guía rápida.
 *
 * Los secretos (llave nueva y secreto de firma) se muestran una sola vez y solo viven en `secretoLlave` /
 * `secretoAvisos` mientras el cuadro esté abierto: al cerrarlo, o al salir de la pestaña, se borran. No se
 * guardan en ningún almacenamiento ni se escriben en la consola.
 */
@Component({
  selector: 'app-domicilios-integracion',
  templateUrl: './integracion.component.html',
  styleUrls: ['./integracion.component.scss']
})
export class IntegracionComponent implements OnInit, OnDestroy {
  @Output() configuracionCambio = new EventEmitter<ConfiguracionDomicilios>();

  // Guía rápida (texto fijo)
  readonly ejemploCurl = ejemploCurl();
  readonly ejemploFirma = EJEMPLO_VERIFICAR_FIRMA;
  readonly eventos = EVENTOS_AVISO;
  readonly encabezados = ENCABEZADOS_AVISO;
  readonly estados = ESTADOS_DOMICILIO.map(e => ({
    clave: e,
    etiqueta: etiquetaEstadoDomicilio(e),
    descripcion: DESCRIPCION_ESTADO[e],
    tono: tonoEstadoDomicilio(e),
    icono: iconoEstadoDomicilio(e)
  }));
  copiadoEjemplo = false;

  cargando = true;
  errorCarga: ErrorDomicilios | null = null;
  /** El servidor respondió 403: este usuario no es administrador del comercio. */
  sinPermiso = false;
  config: ConfiguracionDomicilios | null = null;
  llaves: FilaLlave[] = [];

  // Activar domicilios
  guardandoHabilitado = false;
  errorHabilitado: string | null = null;

  // Llaves
  nombreLlave = '';
  errorNombreLlave: string | null = null;
  creandoLlave = false;
  errorLlave: string | null = null;
  /** La llave completa, solo mientras su cuadro esté abierto. */
  secretoLlave: string | null = null;
  llavePorRevocar: FilaLlave | null = null;
  revocando = false;
  errorRevocar: string | null = null;

  // Avisos
  urlAvisos = '';
  errorUrl: string | null = null;
  guardandoUrl = false;
  errorAvisos: string | null = null;
  creandoSecreto = false;
  confirmandoSecreto = false;
  /** El secreto de firma completo, solo mientras su cuadro esté abierto. */
  secretoAvisos: string | null = null;
  probando = false;
  prueba: PruebaAviso | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly servicio: DomiciliosService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    // Al salir de la pestaña, ningún secreto se queda en memoria.
    this.secretoLlave = null;
    this.secretoAvisos = null;
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = null;
    forkJoin({ config: this.servicio.configuracion(), llaves: this.servicio.llaves() })
      .pipe(
        finalize(() => (this.cargando = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ config, llaves }) => {
          this.config = config;
          this.urlAvisos = config.webhookUrl;
          this.llaves = this.filasDeLlaves(llaves);
        },
        error: err => {
          const e = this.interpretar(err);
          if (!this.sinPermiso) this.errorCarga = e;
        }
      });
  }

  private filasDeLlaves(llaves: LlaveApi[]): FilaLlave[] {
    return llaves.map(llave => ({ llave, creada: fechaDeApi(llave.creada), ultimoUso: fechaDeApi(llave.ultimoUso) }));
  }

  private recargarLlaves(): void {
    this.servicio
      .llaves()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: llaves => (this.llaves = this.filasDeLlaves(llaves)), error: err => this.interpretar(err) });
  }

  /** Un 403 en cualquier llamada quiere decir que quien mira no es administrador del comercio. */
  private interpretar(err: unknown): ErrorDomicilios {
    const e = interpretarErrorDomicilios(err);
    if (e.status === 403) this.sinPermiso = true;
    return e;
  }

  private cambioConfig(cambios: Partial<ConfiguracionDomicilios>): void {
    if (!this.config) return;
    this.config = { ...this.config, ...cambios };
    this.configuracionCambio.emit(this.config);
  }

  // --- Activar domicilios -----------------------------------------------------

  alternarHabilitado(): void {
    if (!this.config || this.guardandoHabilitado) return;
    const nuevo = !this.config.habilitado;
    this.guardandoHabilitado = true;
    this.errorHabilitado = null;
    this.servicio
      .guardarConfiguracion({ habilitado: nuevo })
      .pipe(
        finalize(() => (this.guardandoHabilitado = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => this.cambioConfig({ habilitado: nuevo }),
        error: err => (this.errorHabilitado = this.interpretar(err).texto)
      });
  }

  // --- Llaves -----------------------------------------------------------------

  crearLlave(): void {
    if (this.creandoLlave) return;
    const nombre = validarNombreLlave(this.nombreLlave);
    this.errorNombreLlave = nombre.error;
    if (!nombre.valido) return;

    this.creandoLlave = true;
    this.errorLlave = null;
    this.servicio
      .crearLlave(nombre.nombre)
      .pipe(
        finalize(() => (this.creandoLlave = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: secreto => {
          this.secretoLlave = secreto;
          this.nombreLlave = '';
          this.recargarLlaves();
        },
        error: err => (this.errorLlave = this.interpretar(err).texto)
      });
  }

  cerrarSecretoLlave(): void {
    this.secretoLlave = null;
  }

  pedirRevocar(fila: FilaLlave): void {
    this.errorRevocar = null;
    this.llavePorRevocar = fila;
  }

  cerrarRevocar(): void {
    if (!this.revocando) this.llavePorRevocar = null;
  }

  confirmarRevocar(): void {
    const fila = this.llavePorRevocar;
    if (!fila || this.revocando) return;
    this.revocando = true;
    this.errorRevocar = null;
    this.servicio
      .revocarLlave(fila.llave.id)
      .pipe(
        finalize(() => (this.revocando = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.llavePorRevocar = null;
          this.llaves = this.llaves.filter(l => l.llave.id !== fila.llave.id);
          this.toastr.success(`Revocamos la llave «${fila.llave.nombre}».`, 'Llave revocada');
        },
        error: err => (this.errorRevocar = this.interpretar(err).texto)
      });
  }

  // --- Avisos -----------------------------------------------------------------

  /** La dirección escrita es distinta de la guardada. */
  get urlSinGuardar(): boolean {
    return !!this.config && validarUrlAvisos(this.urlAvisos).url !== this.config.webhookUrl;
  }

  guardarUrl(): void {
    if (this.guardandoUrl) return;
    const r = validarUrlAvisos(this.urlAvisos);
    this.errorUrl = r.error;
    if (!r.valida) {
      document.getElementById('integracion-url')?.focus();
      return;
    }
    this.guardandoUrl = true;
    this.errorAvisos = null;
    this.servicio
      .guardarConfiguracion({ webhookUrl: r.url })
      .pipe(
        finalize(() => (this.guardandoUrl = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.urlAvisos = r.url;
          this.prueba = null;
          this.cambioConfig({ webhookUrl: r.url });
          this.toastr.success(r.url ? 'Guardamos la dirección de avisos.' : 'Quitamos la dirección de avisos.', 'Avisos');
        },
        error: err => (this.errorAvisos = this.interpretar(err).texto)
      });
  }

  /** Si ya había un secreto, cambiarlo deja de servir al anterior: primero se confirma. */
  pedirSecreto(): void {
    if (this.config?.webhookSecretoDefinido) {
      this.confirmandoSecreto = true;
    } else {
      this.crearSecreto();
    }
  }

  cerrarConfirmarSecreto(): void {
    if (!this.creandoSecreto) this.confirmandoSecreto = false;
  }

  crearSecreto(): void {
    if (this.creandoSecreto) return;
    this.creandoSecreto = true;
    this.errorAvisos = null;
    this.servicio
      .crearSecretoAvisos()
      .pipe(
        finalize(() => {
          this.creandoSecreto = false;
          this.confirmandoSecreto = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: secreto => {
          this.secretoAvisos = secreto;
          this.cambioConfig({ webhookSecretoDefinido: true });
        },
        error: err => (this.errorAvisos = this.interpretar(err).texto)
      });
  }

  cerrarSecretoAvisos(): void {
    this.secretoAvisos = null;
  }

  probar(): void {
    if (this.probando || !this.config?.webhookUrl || this.urlSinGuardar) return;
    this.probando = true;
    this.prueba = null;
    this.errorAvisos = null;
    this.servicio
      .probarAviso()
      .pipe(
        finalize(() => (this.probando = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: prueba => (this.prueba = prueba),
        error: err => (this.errorAvisos = this.interpretar(err).texto)
      });
  }

  // --- Guía -------------------------------------------------------------------

  async copiarEjemplo(): Promise<void> {
    this.copiadoEjemplo = await copiarAlPortapapeles(this.ejemploCurl);
  }

  trackPorId(_i: number, f: FilaLlave): string {
    return f.llave.id;
  }
}
