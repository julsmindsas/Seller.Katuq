import { Component, Input, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CarteraService } from '../../../../shared/services/cartera/cartera.service';
import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import {
  CanalGestion,
  CarteraCliente,
  CreditoVistaPrevia,
  CuentaBancaria,
  EstadoCuentaVistaPrevia,
  EventoCobro,
} from '../../../../shared/services/cartera/cartera.models';

export type ModoAccionCartera = 'pago' | 'estadoCuenta' | 'compromiso' | 'gestion' | 'credito' | 'castigo';

/**
 * Ticket 1463: ventana de cada acción de cobro de la tarjeta del cliente. Una sola pieza con seis modos para no
 * repetir el encabezado, el manejo de errores y el cierre. Todo lo que muestra de plata lo calcula el servidor:
 * aquí solo se escoge el cliente, los pedidos y lo que la persona escribe.
 */
@Component({
  selector: 'app-cartera-accion-modal',
  templateUrl: './cartera-accion-modal.component.html',
  styleUrls: ['./cartera-accion-modal.component.scss'],
})
export class CarteraAccionModalComponent implements OnInit {
  @Input() modo: ModoAccionCartera = 'estadoCuenta';
  @Input() cliente!: CarteraCliente;
  @Input() esAdmin = false;

  guardando = false;
  /** Aviso de lo que salió bien (se lee con lectores de pantalla). */
  exito = '';
  /** Mensaje de error para mostrar dentro de la ventana (texto ya en español sencillo). */
  error = '';
  /** Algo se guardó: al cerrar se avisa a la pantalla para que vuelva a pedir la cartera. */
  private huboCambio = false;

  readonly hoy = this.fechaLocal(new Date());

  // ── Selección de pedidos (estado de cuenta, castigo, pago) ────────────────
  seleccion = new Set<string>();
  get pedidos() {
    return this.cliente?.pedidos || [];
  }
  get saldoCliente(): number {
    return this.pedidos.reduce((s, p) => s + (Number(p.saldo) || 0), 0);
  }

  // ── Estado de cuenta ──────────────────────────────────────────────────────
  vista: EstadoCuentaVistaPrevia | null = null;
  cargandoVista = false;
  confirmarInterno = false;
  pideConfirmarInterno = false;
  confirmandoCorreo = false;
  editandoCuentas = false;
  cuentas: CuentaBancaria[] = [];
  mensajeEstadoCuenta = '';
  private recargarVista$ = new Subject<void>();

  // ── Compromiso ────────────────────────────────────────────────────────────
  compromiso = { fecha: '', valor: 0, nota: '' };

  // ── Gestión ───────────────────────────────────────────────────────────────
  readonly canales: { value: CanalGestion; clave: string }[] = [
    { value: 'llamada', clave: 'cartera.acciones.canalLlamada' },
    { value: 'whatsapp', clave: 'cartera.acciones.canalWhatsapp' },
    { value: 'mensaje', clave: 'cartera.acciones.canalMensaje' },
    { value: 'correo', clave: 'cartera.acciones.canalCorreo' },
    { value: 'visita', clave: 'cartera.acciones.canalVisita' },
    { value: 'otro', clave: 'cartera.acciones.canalOtro' },
  ];
  gestion: { canal: CanalGestion; resultado: string; nota: string } = { canal: 'llamada', resultado: '', nota: '' };
  historial: EventoCobro[] = [];
  cargandoHistorial = false;

  // ── Cupo y plazo ──────────────────────────────────────────────────────────
  credito = { creditLimit: 0, payTermDays: 0 };
  vistaCredito: CreditoVistaPrevia | null = null;
  private recalcularCredito$ = new Subject<void>();

  // ── Castigo ───────────────────────────────────────────────────────────────
  motivoCastigo = '';

  // ── Registrar pago ────────────────────────────────────────────────────────
  formasPago: any[] = [];
  pago = { fecha: this.fechaLocal(new Date()), formaPago: '', valor: 0, numeroComprobante: '', notas: '' };
  archivo: File | null = null;
  pedidoPago = '';
  /** orderId -> valor de pagos que Tesorería tiene por revisar (de la vista previa del estado de cuenta). */
  private enRevisionPorPedido = new Map<string, number>();

  constructor(
    public activeModal: NgbActiveModal,
    private carteraService: CarteraService,
    private treasury: TreasuryService,
    private maestro: MaestroService,
    private storage: AngularFireStorage,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    switch (this.modo) {
      case 'estadoCuenta':
        this.pedidos.forEach((p) => this.seleccion.add(p.orderId));
        this.recargarVista$.pipe(debounceTime(300)).subscribe(() => this.cargarVista());
        this.cargarVista();
        break;
      case 'compromiso':
        this.compromiso = { fecha: '', valor: Math.round(this.saldoCliente), nota: '' };
        break;
      case 'gestion':
        this.cargarHistorial();
        break;
      case 'credito':
        this.credito = { creditLimit: Number(this.cliente?.creditLimit) || 0, payTermDays: Number(this.cliente?.payTermDays) || 0 };
        this.recalcularCredito$.pipe(debounceTime(400)).subscribe(() => this.calcularCredito());
        this.calcularCredito();
        break;
      case 'pago':
        if (this.pedidos.length === 1) this.elegirPedidoPago(this.pedidos[0].orderId);
        this.cargarPagosEnRevision();
        this.maestro.consultarFormaPago().subscribe({
          next: (fp: any) => (this.formasPago = Array.isArray(fp) ? fp : []),
          error: () => (this.formasPago = []),
        });
        break;
      default:
        break;
    }
  }

  // ── Comunes ───────────────────────────────────────────────────────────────
  get tituloClave(): string {
    return {
      pago: 'cartera.acciones.registrarPago',
      estadoCuenta: 'cartera.acciones.estadoCuenta',
      compromiso: 'cartera.acciones.compromiso',
      gestion: 'cartera.acciones.gestion',
      credito: 'cartera.acciones.cupoPlazo',
      castigo: 'cartera.acciones.castigar',
    }[this.modo];
  }

  get iconoTitulo(): string {
    return { pago: 'pi-wallet', estadoCuenta: 'pi-file-pdf', compromiso: 'pi-calendar', gestion: 'pi-comments', credito: 'pi-credit-card', castigo: 'pi-ban' }[this.modo];
  }

  cerrar(): void {
    if (this.huboCambio) this.activeModal.close({ changed: true });
    else this.activeModal.dismiss();
  }

  private fechaLocal(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /** Mensaje de un error de la API: el del servidor (ya viene en español) o uno genérico. */
  private mensajeDe(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) return this.translate.instant('cartera.acciones.errorPermiso');
      const m = err.error && typeof err.error.message === 'string' ? err.error.message : '';
      if (m && err.status >= 400 && err.status < 500) return m;
    }
    return this.translate.instant('cartera.acciones.errorGeneral');
  }

  alternarPedido(orderId: string): void {
    if (this.seleccion.has(orderId)) this.seleccion.delete(orderId);
    else this.seleccion.add(orderId);
    if (this.modo === 'estadoCuenta') this.recargarVista$.next(); // la vista anterior queda a la vista mientras se recalcula
  }

  get todosElegidos(): boolean {
    return this.pedidos.length > 0 && this.pedidos.every((p) => this.seleccion.has(p.orderId));
  }

  alternarTodos(): void {
    if (this.todosElegidos) this.seleccion.clear();
    else this.pedidos.forEach((p) => this.seleccion.add(p.orderId));
    if (this.modo === 'estadoCuenta') this.recargarVista$.next();
  }

  trackByOrder(_i: number, p: { orderId: string }): string {
    return p.orderId;
  }

  // ── Estado de cuenta ──────────────────────────────────────────────────────
  private idsElegidos(): string[] | undefined {
    // Todos elegidos = sin lista (el servidor toma todos los pedidos con saldo en ese momento).
    return this.todosElegidos ? undefined : Array.from(this.seleccion);
  }

  cargarVista(): void {
    if (!this.seleccion.size) {
      this.vista = null;
      return;
    }
    this.cargandoVista = true;
    this.error = '';
    this.carteraService.estadoCuentaVistaPrevia(this.cliente.documento, this.idsElegidos(), this.confirmarInterno).subscribe({
      next: (v) => {
        this.vista = v;
        this.cargandoVista = false;
        this.pideConfirmarInterno = false;
        this.confirmandoCorreo = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoVista = false;
        if (err.status === 409 && err.error && err.error.code === 'CLIENTE_INTERNO') {
          this.pideConfirmarInterno = true;
          return;
        }
        this.vista = null;
        this.error = this.mensajeDe(err);
      },
    });
  }

  confirmarEsInterno(): void {
    this.confirmarInterno = true;
    this.cargarVista();
  }

  get hayPagoEnRevision(): boolean {
    return !!this.vista && this.vista.estado.totalEnRevision > 0;
  }

  descargarPdf(): void {
    if (this.guardando || !this.seleccion.size) return;
    this.guardando = true;
    this.error = '';
    this.carteraService.estadoCuentaPdf(this.cliente.documento, this.idsElegidos(), this.confirmarInterno).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.vista?.archivo || 'estado-de-cuenta.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.guardando = false;
      },
      error: async (err: HttpErrorResponse) => {
        this.guardando = false;
        // Con responseType blob el cuerpo del error también llega como blob.
        let e: any = err;
        try {
          if (err.error instanceof Blob) e = new HttpErrorResponse({ status: err.status, error: JSON.parse(await err.error.text()) });
        } catch {
          e = err;
        }
        this.error = this.mensajeDe(e);
      },
    });
  }

  enviarWhatsApp(): void {
    const w = this.vista?.whatsapp;
    if (!w || !w.disponible || !w.enlace) return;
    // El estado de cuenta se descarga y la persona lo adjunta en el chat: WhatsApp no recibe archivos por enlace.
    window.open(w.enlace, '_blank', 'noopener');
    this.carteraService.estadoCuentaRegistrarEnvioWhatsApp(this.cliente.documento).subscribe({
      next: () => (this.huboCambio = true),
      error: () => {
        /* si no queda en el historial, el chat igual se abrió */
      },
    });
  }

  pedirConfirmarCorreo(): void {
    this.confirmandoCorreo = true;
  }

  enviarCorreo(): void {
    if (this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.carteraService.estadoCuentaEnviarCorreo(this.cliente.documento, this.idsElegidos(), true, this.confirmarInterno).subscribe({
      next: () => {
        this.guardando = false;
        this.confirmandoCorreo = false;
        this.huboCambio = true;
        this.cargarVista();
        this.exito = this.translate.instant('cartera.acciones.correoEnviado', { correo: this.vista?.correo.destino || '' });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.confirmandoCorreo = false;
        this.error = this.mensajeDe(err);
      },
    });
  }

  // Cuentas bancarias del estado de cuenta (solo Administrador).
  abrirCuentas(): void {
    this.editandoCuentas = true;
    this.error = '';
    this.carteraService.getConfigEstadoCuenta().subscribe({
      next: (c) => {
        this.cuentas = (c.cuentas || []).map((x) => ({ ...x }));
        this.mensajeEstadoCuenta = c.mensaje || '';
        if (!this.cuentas.length) this.agregarCuenta();
      },
      error: (err) => (this.error = this.mensajeDe(err)),
    });
  }

  agregarCuenta(): void {
    if (this.cuentas.length < 10) this.cuentas.push({ banco: '', tipo: '', numero: '', titular: '', documentoTitular: '' });
  }

  quitarCuenta(i: number): void {
    this.cuentas.splice(i, 1);
  }

  guardarCuentas(): void {
    if (this.guardando) return;
    this.guardando = true;
    this.error = '';
    const limpias = this.cuentas.filter((c) => (c.banco || '').trim() || (c.numero || '').trim());
    this.carteraService.guardarConfigEstadoCuenta({ cuentas: limpias, mensaje: this.mensajeEstadoCuenta }).subscribe({
      next: () => {
        this.guardando = false;
        this.editandoCuentas = false;
        this.cargarVista();
      },
      error: (err) => {
        this.guardando = false;
        this.error = this.mensajeDe(err);
      },
    });
  }

  // ── Compromiso ────────────────────────────────────────────────────────────
  get compromisoValido(): boolean {
    const v = Number(this.compromiso.valor);
    return !!this.compromiso.fecha && this.compromiso.fecha >= this.hoy && v > 0 && v <= Math.ceil(this.saldoCliente) + 1;
  }

  guardarCompromiso(): void {
    if (!this.compromisoValido || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.carteraService.registrarCompromiso(this.cliente.documento, this.compromiso.fecha, Number(this.compromiso.valor), this.compromiso.nota).subscribe({
      next: () => {
        this.huboCambio = true;
        this.guardando = false;
        this.cerrar();
      },
      error: (err) => {
        this.guardando = false;
        this.error = this.mensajeDe(err);
      },
    });
  }

  // ── Gestión ───────────────────────────────────────────────────────────────
  get gestionValida(): boolean {
    return !!this.gestion.resultado.trim();
  }

  cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.carteraService.historialCobro(this.cliente.documento).subscribe({
      next: (r) => {
        this.historial = r.eventos || [];
        this.cargandoHistorial = false;
      },
      error: () => {
        this.historial = [];
        this.cargandoHistorial = false;
      },
    });
  }

  guardarGestion(): void {
    if (!this.gestionValida || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.carteraService.registrarGestion(this.cliente.documento, this.gestion.canal, this.gestion.resultado, this.gestion.nota).subscribe({
      next: () => {
        this.huboCambio = true;
        this.guardando = false;
        this.gestion = { canal: this.gestion.canal, resultado: '', nota: '' };
        this.cargarHistorial();
        this.exito = this.translate.instant('cartera.acciones.gestionGuardada');
      },
      error: (err) => {
        this.guardando = false;
        this.error = this.mensajeDe(err);
      },
    });
  }

  claveTipoEvento(tipo: string): string {
    const claves: { [k: string]: string } = {
      cobroGestion: 'cartera.acciones.eventoGestion',
      cobroCompromiso: 'cartera.acciones.eventoCompromiso',
      cobroEstadoCuenta: 'cartera.acciones.eventoEstadoCuenta',
      cobroCastigo: 'cartera.acciones.eventoCastigo',
      cobroReactivacion: 'cartera.acciones.eventoReactivacion',
      cobroCredito: 'cartera.acciones.eventoCredito',
    };
    return claves[tipo] || 'cartera.acciones.eventoOtro';
  }

  /** Resumen en una línea de lo que dejó cada evento del historial. */
  resumenEvento(e: EventoCobro): string {
    const d = e.detalle || {};
    switch (e.tipo) {
      case 'cobroGestion':
        return [d.canal, d.resultado, d.nota].filter(Boolean).join(' · ');
      case 'cobroCompromiso':
        return `${Number(d.valor || 0).toLocaleString('es-CO')} · ${d.fecha || ''}${d.nota ? ' · ' + d.nota : ''}`;
      case 'cobroEstadoCuenta':
        return `${d.canal || ''} · ${d.resultado || ''}`;
      case 'cobroCredito':
        return `${Number(d.creditLimit || 0).toLocaleString('es-CO')} · ${d.payTermDays} d`;
      default:
        return e.motivo || '';
    }
  }

  // ── Cupo y plazo ──────────────────────────────────────────────────────────
  alEscribirCredito(): void {
    this.recalcularCredito$.next();
  }

  get creditoValido(): boolean {
    const c = Number(this.credito.creditLimit);
    const p = Number(this.credito.payTermDays);
    return Number.isFinite(c) && c >= 0 && Number.isInteger(p) && p >= 0 && p <= 365;
  }

  calcularCredito(): void {
    if (!this.creditoValido) {
      this.vistaCredito = null;
      return;
    }
    this.error = '';
    this.carteraService.cambiarCredito(this.cliente.documento, Number(this.credito.creditLimit), Number(this.credito.payTermDays), false).subscribe({
      next: (v) => (this.vistaCredito = v),
      error: (err) => {
        this.vistaCredito = null;
        this.error = this.mensajeDe(err);
      },
    });
  }

  guardarCredito(): void {
    if (!this.creditoValido || this.guardando || !this.vistaCredito || this.vistaCredito.sinCambios) return;
    this.guardando = true;
    this.error = '';
    this.carteraService.cambiarCredito(this.cliente.documento, Number(this.credito.creditLimit), Number(this.credito.payTermDays), true).subscribe({
      next: () => {
        this.huboCambio = true;
        this.guardando = false;
        this.cerrar();
      },
      error: (err) => {
        this.guardando = false;
        this.error = this.mensajeDe(err);
      },
    });
  }

  // ── Castigo ───────────────────────────────────────────────────────────────
  get saldoElegido(): number {
    return this.pedidos.filter((p) => this.seleccion.has(p.orderId)).reduce((s, p) => s + (Number(p.saldo) || 0), 0);
  }

  get castigoValido(): boolean {
    return this.seleccion.size > 0 && !!this.motivoCastigo.trim();
  }

  castigar(): void {
    if (!this.castigoValido || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.carteraService.castigar(this.cliente.documento, Array.from(this.seleccion), this.motivoCastigo).subscribe({
      next: () => {
        this.huboCambio = true;
        this.guardando = false;
        this.cerrar();
      },
      error: (err) => {
        this.guardando = false;
        this.error = this.mensajeDe(err);
      },
    });
  }

  // ── Registrar pago (queda «Por revisar» en Tesorería) ─────────────────────
  elegirPedidoPago(orderId: string): void {
    this.pedidoPago = orderId;
    const p = this.pedidos.find((x) => x.orderId === orderId);
    this.pago.valor = p ? Math.round(Number(p.saldo) || 0) : 0;
  }

  /** Solo informa (nunca bloquea): si no se puede consultar, simplemente no hay aviso. */
  private cargarPagosEnRevision(): void {
    this.carteraService.estadoCuentaVistaPrevia(this.cliente.documento, undefined, true).subscribe({
      next: (v) => {
        this.enRevisionPorPedido = new Map((v?.estado?.pedidos || []).filter((p) => Number(p.enRevision) > 0).map((p) => [p.orderId, Number(p.enRevision)] as [string, number]));
      },
      error: () => (this.enRevisionPorPedido = new Map()),
    });
  }

  get pagoEnRevisionActual(): number {
    return this.enRevisionPorPedido.get(this.pedidoPago) || 0;
  }

  get pedidoPagoActual() {
    return this.pedidos.find((p) => p.orderId === this.pedidoPago) || null;
  }

  get pagoExcedido(): boolean {
    const p = this.pedidoPagoActual;
    return !!p && Number(this.pago.valor) > Math.ceil(Number(p.saldo) || 0) + 1;
  }

  get pagoValido(): boolean {
    return !!this.pedidoPagoActual && !!this.pago.fecha && !!this.pago.formaPago && Number(this.pago.valor) > 0 &&
      !!this.pago.numeroComprobante.trim() && !this.pagoExcedido;
  }

  alElegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivo = input.files && input.files[0] ? input.files[0] : null;
  }

  async registrarPago(): Promise<void> {
    const pedido = this.pedidoPagoActual;
    if (!this.pagoValido || !pedido || this.guardando) return;
    this.guardando = true;
    this.error = '';
    try {
      let archivoUrl = '';
      let archivoHash = '';
      if (this.archivo) {
        archivoHash = await this.calcularHash(this.archivo);
        archivoUrl = await this.subirArchivo(this.archivo, pedido.nroPedido);
      }
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const forma = this.formasPago.find((f: any) => f?.id == this.pago.formaPago);
      this.treasury.submitPayment({
        orderId: pedido.orderId,
        pago: {
          valor: Number(this.pago.valor) || 0,
          formaPago: (forma?.nombre || this.pago.formaPago || '').toString(),
          numeroComprobante: this.pago.numeroComprobante,
          fechaTransaccion: new Date().toISOString(),
          archivo: archivoUrl,
          archivoEvidencia: '',
          archivoHash,
          notas: this.pago.notas || '',
          fecha: this.pago.fecha,
          usuarioRegistro: user?.name || user?.email || '',
        },
      }).subscribe({
        next: () => {
          this.huboCambio = true;
          this.guardando = false;
          this.exito = this.translate.instant('cartera.acciones.pagoRegistrado');
          this.cerrarConAviso();
        },
        error: (err) => {
          this.guardando = false;
          this.error = this.mensajeDe(err);
        },
      });
    } catch {
      this.guardando = false;
      this.error = this.translate.instant('cartera.acciones.errorArchivo');
    }
  }

  private cerrarConAviso(): void {
    setTimeout(() => this.cerrar(), 1200);
  }

  private async calcularHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '';
    }
  }

  private subirArchivo(file: File, nroPedido: string): Promise<string> {
    const path = `comprobatensPago/${nroPedido}/${Date.now()}_${file.name}`;
    const ref = this.storage.ref(path);
    return this.storage.upload(path, file).then(() => ref.getDownloadURL().toPromise());
  }
}
