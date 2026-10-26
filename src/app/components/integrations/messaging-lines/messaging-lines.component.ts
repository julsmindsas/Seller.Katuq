import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { MessagingLinesService } from '../../../shared/services/messaging/messaging-lines.service';
import {
  CambiosLinea,
  MessagingLine,
  MiembroEquipo,
} from '../../../shared/services/messaging/messaging.models';
import {
  MENSAJE_CONEXION,
  MensajeConexion,
  PARAM_CONEXION_PENDIENTE,
  getConnectorConfig,
} from '../connectors/connector-registry';

import { TranslateService } from '@ngx-translate/core';
/** Lo que el administrador está editando en una línea antes de guardar. */
interface EdicionLinea {
  nombre: string;
  vendedores: string[];
}

const PROVEEDOR = 'kapso';
/** Clave del código de un solo uso de la conexión en curso. */
const CLAVE_ESTADO_CONEXION = 'katuq_conexion_kapso';

/**
 * Números de WhatsApp del comercio (D-437), dentro de la tarjeta de WhatsApp.
 *
 * Solo se ve con la bandera `whatsappMultiNumero`; apagada, no llama al servidor
 * y la tarjeta queda como antes. La familia Administrador conecta, edita y
 * desconecta; los demás ven la lista en lectura. Quien decide es el servidor.
 *
 * Conectar: se abre una ventana emergente con el enlace del proveedor; al volver,
 * `IntegrationConnectReturnComponent` avisa por `postMessage` y aquí se confirma
 * con el servidor, que verifica el número con el proveedor.
 */
@Component({
  selector: 'app-messaging-lines',
  templateUrl: './messaging-lines.component.html',
  styleUrls: ['./messaging-lines.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingLinesComponent implements OnInit, OnDestroy {
  readonly habilitada: boolean;

  cargando = false;
  errorCarga: string | null = null;
  aviso: { tipo: 'ok' | 'error'; texto: string } | null = null;

  puedeAdministrar = false;
  lineas: MessagingLine[] = [];
  equipo: MiembroEquipo[] = [];

  conectando = false;
  /** Línea con una operación en curso (guardar, bot o desconectar). */
  ocupada: string | null = null;
  ediciones: Record<string, EdicionLinea> = {};

  private ventana: Window | null = null;
  private vigilaVentana?: Subscription;
  private readonly escucha = (e: MessageEvent) => this.alRecibirMensaje(e);
  private readonly destroy$ = new Subject<void>();

  constructor(
    features: CompanyFeaturesService,
    private readonly servicio: MessagingLinesService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly toastr: ToastrService,
    private translate: TranslateService,
  ) {
    this.habilitada = features.isEnabled('whatsappMultiNumero');
  }

  ngOnInit(): void {
    if (!this.habilitada) return;
    window.addEventListener('message', this.escucha);
    this.cargar();
    this.confirmarRegresoPendiente();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.escucha);
    this.vigilaVentana?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.servicio
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.puedeAdministrar = res.puedeAdministrar;
          this.lineas = res.lines;
          this.equipo = res.equipo;
          this.ediciones = {};
          for (const l of res.lines) this.ediciones[l.id] = this.edicionDe(l);
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          this.errorCarga = this.mensajeDe(err, 'No pudimos cargar los números. Intenta de nuevo.');
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Conectar ──────────────────────────────────────────────────────────

  conectar(): void {
    if (this.conectando || !this.puedeAdministrar) return;
    this.aviso = null;
    // La ventana se abre en el clic: abrirla después de la respuesta del
    // servidor la bloquean los navegadores.
    this.ventana = window.open('', 'katuq_conectar_numero', 'width=600,height=740');
    if (!this.ventana) {
      this.aviso = {
        tipo: 'error',
        texto: 'El navegador bloqueó la ventana de conexión. Permite las ventanas emergentes de este sitio e intenta de nuevo.',
      };
      return;
    }
    this.conectando = true;
    this.servicio
      .conectar(PROVEEDOR, this.nuevoEstadoConexion())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ url }) => {
          if (!this.ventana || this.ventana.closed) {
            this.terminarConexion();
            return;
          }
          this.ventana.location.href = url;
          this.vigilarVentana();
        },
        error: (err) => {
          this.ventana?.close();
          this.terminarConexion({
            tipo: 'error',
            texto: this.mensajeDe(err, 'No pudimos abrir la conexión. Intenta de nuevo en un momento.'),
          });
        },
      });
  }

  /** Si la persona cierra la ventana sin terminar, el botón vuelve a quedar libre. */
  private vigilarVentana(): void {
    this.vigilaVentana?.unsubscribe();
    this.vigilaVentana = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.ventana || this.ventana.closed) this.terminarConexion();
      });
  }

  private terminarConexion(aviso?: { tipo: 'ok' | 'error'; texto: string }): void {
    this.vigilaVentana?.unsubscribe();
    this.ventana = null;
    this.conectando = false;
    if (aviso) this.aviso = aviso;
    this.cdr.markForCheck();
  }

  private alRecibirMensaje(e: MessageEvent): void {
    if (e.origin !== window.location.origin) return;
    const data = e.data as MensajeConexion;
    if (!data || data.tipo !== MENSAJE_CONEXION || data.provider !== PROVEEDOR) return;
    this.zone.run(() => {
      this.vigilaVentana?.unsubscribe();
      this.procesarRegreso(data.params || {});
    });
  }

  /** El regreso llegó sin ventana de origen: viene en la URL de /integrations. */
  private confirmarRegresoPendiente(): void {
    const arbol = this.router.parseUrl(this.router.url);
    const query = arbol.queryParams || {};
    if (query[PARAM_CONEXION_PENDIENTE] !== PROVEEDOR) return;
    const params: Record<string, string> = {};
    for (const clave of Object.keys(query)) {
      if (clave !== PARAM_CONEXION_PENDIENTE) params[clave] = String(query[clave]);
    }
    this.router.navigateByUrl(this.router.url.split('?')[0], { replaceUrl: true });
    this.procesarRegreso(params);
  }

  /**
   * Código de un solo uso de la conexión en curso. Vive en localStorage (no en
   * sessionStorage) porque el regreso puede caer en la ventana emergente sin
   * vínculo con esta. Vence a los 30 minutos.
   */
  private nuevoEstadoConexion(): string {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const estado = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    try {
      localStorage.setItem(CLAVE_ESTADO_CONEXION, JSON.stringify({ estado, vence: Date.now() + 30 * 60 * 1000 }));
    } catch {
      // Sin almacenamiento el regreso no se podrá validar y se pedirá reintentar.
    }
    return estado;
  }

  /** ¿El regreso trae el código que se generó aquí? Lo consume en cualquier caso. */
  private consumirEstadoConexion(recibido: string | undefined): boolean {
    let guardado: { estado?: string; vence?: number } | null = null;
    try {
      guardado = JSON.parse(localStorage.getItem(CLAVE_ESTADO_CONEXION) || 'null');
      localStorage.removeItem(CLAVE_ESTADO_CONEXION);
    } catch {
      guardado = null;
    }
    return !!(recibido && guardado && guardado.estado === recibido && (guardado.vence || 0) > Date.now());
  }

  private procesarRegreso(params: Record<string, string>): void {
    if (!this.consumirEstadoConexion(params['estado'])) {
      this.terminarConexion({
        tipo: 'error',
        texto: 'Esta conexión no se inició desde esta pantalla o ya venció. Pulsa "Conectar número" para empezar de nuevo.',
      });
      return;
    }
    const config = getConnectorConfig(PROVEEDOR);
    if (!config || !config.esExitoso(params)) {
      const codigo = params['error_code'];
      this.terminarConexion({
        tipo: 'error',
        texto:
          'No se completó la conexión del número. Si cerraste la ventana antes de terminar, vuelve a intentarlo.' +
          (codigo ? ` (Código: ${codigo})` : ''),
      });
      return;
    }
    this.conectando = true;
    this.cdr.markForCheck();
    this.servicio
      .confirmar(PROVEEDOR, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (linea) => {
          this.ponerLinea(linea);
          this.terminarConexion({
            tipo: 'ok',
            texto: `Listo: ${linea.displayName || linea.displayPhone} quedó conectado. Ahora asígnale vendedores.`,
          });
        },
        error: (err) =>
          this.terminarConexion({
            tipo: 'error',
            texto: this.mensajeDe(err, 'No pudimos confirmar el número con WhatsApp. Intenta conectarlo de nuevo.'),
          }),
      });
  }

  // ─── Editar ────────────────────────────────────────────────────────────

  hayCambios(linea: MessagingLine): boolean {
    const ed = this.ediciones[linea.id];
    if (!ed) return false;
    const actuales = (linea.sellers || []).map((s) => s.email).sort().join('|');
    const nuevos = [...ed.vendedores].sort().join('|');
    return ed.nombre.trim() !== (linea.displayName || '') || actuales !== nuevos;
  }

  descartar(linea: MessagingLine): void {
    this.ediciones[linea.id] = this.edicionDe(linea);
  }

  guardar(linea: MessagingLine): void {
    const ed = this.ediciones[linea.id];
    if (!ed || this.ocupada || !this.hayCambios(linea)) return;
    const nombre = ed.nombre.trim();
    if (!nombre) {
      this.toastr.warning(this.translate.instant('integrations.messagingLines.ponleUnNombreAlNumero'));
      return;
    }
    this.actualizar(linea, { displayName: nombre, sellers: [...ed.vendedores] }, 'Cambios guardados.');
  }

  /** Solo una línea por comercio puede tener el asistente de pedidos. */
  lineaConBot(): MessagingLine | null {
    return this.lineas.find((l) => l.botEnabled) || null;
  }

  botBloqueado(linea: MessagingLine): boolean {
    const conBot = this.lineaConBot();
    return !!conBot && conBot.id !== linea.id;
  }

  cambiarBot(linea: MessagingLine, encendido: boolean): void {
    if (this.ocupada) return;
    this.actualizar(
      linea,
      { botEnabled: encendido },
      encendido ? 'El asistente de pedidos atiende ahora este número.' : 'El asistente de pedidos quedó apagado en este número.',
    );
  }

  private actualizar(linea: MessagingLine, cambios: CambiosLinea, exito: string): void {
    this.ocupada = linea.id;
    this.cdr.markForCheck();
    this.servicio
      .actualizar(linea.id, cambios)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nueva) => {
          this.ocupada = null;
          this.ponerLinea(nueva);
          this.toastr.success(exito);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.ocupada = null;
          this.toastr.error(this.mensajeDe(err, 'No pudimos guardar el cambio. Intenta de nuevo.'));
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Desconectar ───────────────────────────────────────────────────────

  async desconectar(linea: MessagingLine): Promise<void> {
    if (this.ocupada) return;
    const r = await Swal.fire({
      title: this.translate.instant('integrations.messagingLines.desconectarEsteNumero'),
      text: this.translate.instant('integrations.messagingLines.dejaDeRecibirYEnviar', { linea: linea.displayName || linea.displayPhone }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('integrations.messagingLines.siDesconectar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#D64545',
      reverseButtons: true,
    });
    if (!r.isConfirmed) return;
    this.ocupada = linea.id;
    this.cdr.markForCheck();
    this.servicio
      .desconectar(linea.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nueva) => {
          this.ocupada = null;
          this.ponerLinea(nueva);
          this.toastr.success(this.translate.instant('integrations.messagingLines.elNumeroQuedoDesconectado'));
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.ocupada = null;
          this.toastr.error(this.mensajeDe(err, 'No pudimos desconectar el número. Intenta de nuevo.'));
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Presentación ──────────────────────────────────────────────────────

  tipoConexion(linea: MessagingLine): string {
    return linea.connectionType === 'coexistence'
      ? 'En el celular y en Katuq'
      : 'Solo en Katuq';
  }

  nombresVendedores(linea: MessagingLine): string {
    const nombres = (linea.sellers || []).map((s) => s.nombre || s.email);
    return nombres.length ? nombres.join(', ') : 'Sin vendedores asignados';
  }

  fechaConexion(linea: MessagingLine): string {
    const v: any = linea.connectedAt;
    let fecha: Date | null = null;
    if (typeof v === 'string' || typeof v === 'number') fecha = new Date(v);
    else if (v && typeof v._seconds === 'number') fecha = new Date(v._seconds * 1000);
    else if (v && typeof v.seconds === 'number') fecha = new Date(v.seconds * 1000);
    if (!fecha || Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  trackLinea(_: number, linea: MessagingLine): string {
    return linea.id;
  }

  private ponerLinea(linea: MessagingLine): void {
    if (!linea || !linea.id) return;
    const i = this.lineas.findIndex((l) => l.id === linea.id);
    this.lineas = i >= 0
      ? this.lineas.map((l) => (l.id === linea.id ? linea : l))
      : [...this.lineas, linea];
    this.ediciones[linea.id] = this.edicionDe(linea);
  }

  private edicionDe(linea: MessagingLine): EdicionLinea {
    return {
      nombre: linea.displayName || '',
      vendedores: (linea.sellers || []).map((s) => s.email),
    };
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }
}
