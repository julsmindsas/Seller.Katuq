import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { TreasuryService } from '../../services/treasury/treasury.service';
import { MaestroService } from '../../services/maestros/maestro.service';
import {
  PagoGrupoPayload,
  PedidoAbiertoGrupo,
  ResultadoParteGrupo,
  VistaPreviaPagoGrupo,
} from '../../services/treasury/treasury.models';
import { CENTAVO, redondear2, repartirPago } from '../../utils/reparto-pago';
import { metaEstado } from '../../../components/tesoreria/tesoreria.constants';

/** Qué se le pide a la ventana de «Registrar pago a varios pedidos». */
export interface OpcionesPagoGrupo {
  /** Documento del cliente TAL COMO viene en sus pedidos (el servidor compara el documento exacto). */
  documento: string;
  cliente?: string;
  /** Pedidos marcados en la lista: arrancan incluidos; si no hay, arrancan todos los abiertos del cliente. */
  orderIds?: string[];
  /** Si se manda, la ventana ofrece «Registrar el pago de un solo pedido» y llama a esto al elegirlo. */
  alUnSoloPedido?: () => void;
}

/**
 * Ticket 1453 (D-661 propuesta): ventana de «Registrar pago a varios pedidos». Una sola transferencia (valor,
 * referencia, comprobante y fecha) repartida entre los pedidos abiertos de UN cliente. La usan «Sin pago» de
 * Tesorería y «Registrar pago» de Cartera, solo con la bandera `pagoVariosPedidos`.
 *
 * Lo que muestra de plata (saldo, tope por pedido, reparto sugerido) lo calcula el servidor: aquí solo se
 * escoge qué pedidos entran y se ajusta cada parte a mano. El reparto en vivo usa el mismo algoritmo del
 * servidor, pero el servidor lo vuelve a calcular y valida; nada se escribe hasta que la persona confirma.
 * Cada pedido queda en «Pago en revisión» y Tesorería decide el pago completo en un paso.
 */
@Component({
  selector: 'app-pago-grupo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './pago-grupo-modal.component.html',
  styleUrls: ['./pago-grupo-modal.component.scss'],
})
export class PagoGrupoModalComponent implements OnInit {
  @Input() documento = '';
  @Input() cliente = '';
  @Input() orderIdsIniciales: string[] = [];
  @Input() alUnSoloPedido?: () => void;

  cargando = true;
  errorCarga = '';
  vista: VistaPreviaPagoGrupo | null = null;
  pedidos: PedidoAbiertoGrupo[] = [];
  incluido = new Set<string>();
  /** Parte de cada pedido (orderId -> valor). */
  partes: { [orderId: string]: number } = {};
  /** La persona cambió alguna parte a mano: el reparto deja de recalcularse solo al cambiar el valor. */
  manual = false;

  formasPago: any[] = [];
  pago: { fecha: string; formaPago: string; valor: number | null; referencia: string; notas: string } = {
    fecha: this.fechaLocal(new Date()),
    formaPago: '',
    valor: null,
    referencia: '',
    notas: '',
  };
  archivo: File | null = null;
  arrastrando = false;
  private archivoSubido: { file: File; url: string; hash: string } | null = null;

  guardando = false;
  error = '';
  /** Lista de líneas de error por pedido (cuando el servidor devuelve el detalle). */
  detalleErrores: string[] = [];
  resultados: ResultadoParteGrupo[] = [];
  incompleto = false;
  /** Alguna parte falló por una razón que reintentar no arregla (el saldo o el estado del pedido cambió). */
  bloqueado = false;
  /** Una llave por apertura: un reintento con la misma llave no duplica el pago en el servidor. */
  private llave = this.nuevaLlave();

  constructor(
    public activeModal: NgbActiveModal,
    private treasury: TreasuryService,
    private maestro: MaestroService,
    private storage: AngularFireStorage,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.maestro.consultarFormaPago().subscribe({
      next: (fp: any) => (this.formasPago = Array.isArray(fp) ? fp : []),
      error: () => (this.formasPago = []),
    });
    this.cargar(true);
  }

  // ── Carga de pedidos abiertos ─────────────────────────────────────────────
  private cargar(inicial: boolean): void {
    this.cargando = true;
    this.errorCarga = '';
    this.treasury.previewGroupPayment(this.documento, 0).subscribe({
      next: (v) => {
        this.vista = v;
        this.pedidos = v.pedidos || [];
        if (!this.cliente) this.cliente = v.cliente || '';
        const validos = new Set(this.pedidos.filter((p) => p.tope > 0).map((p) => p.orderId));
        const previos = inicial ? (this.orderIdsIniciales || []).filter((id) => validos.has(id)) : Array.from(this.incluido).filter((id) => validos.has(id));
        this.incluido = new Set(previos.length ? previos : Array.from(validos));
        this.partes = {};
        this.manual = false;
        this.autoRepartir();
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.errorCarga = this.mensajeDe(err);
      },
    });
  }

  // ── Reparto ───────────────────────────────────────────────────────────────
  get valor(): number {
    return redondear2(this.pago.valor);
  }

  get elegidos(): PedidoAbiertoGrupo[] {
    return this.pedidos.filter((p) => this.incluido.has(p.orderId) && p.tope > 0);
  }

  get repartido(): number {
    return redondear2(this.elegidos.reduce((acc, p) => acc + (Number(this.partes[p.orderId]) || 0), 0));
  }

  get sinRepartir(): number {
    return redondear2(this.valor - this.repartido);
  }

  /** Lo que sobra del valor aun poniendo a cada pedido elegido su tope (el sobrante no se registra por ahora). */
  get sobrante(): number {
    const topes = redondear2(this.elegidos.reduce((acc, p) => acc + p.tope, 0));
    return this.valor > topes + CENTAVO ? redondear2(this.valor - topes) : 0;
  }

  get maxPedidos(): number {
    return this.vista?.maxPedidos || 50;
  }

  get todosElegidos(): boolean {
    const posibles = this.pedidos.filter((p) => p.tope > 0);
    return posibles.length > 0 && posibles.every((p) => this.incluido.has(p.orderId));
  }

  parteSupera(p: PedidoAbiertoGrupo): boolean {
    return (Number(this.partes[p.orderId]) || 0) > p.tope + CENTAVO;
  }

  /** Los pedidos que de verdad reciben algo de este pago (un pedido incluido con parte 0 no se manda). */
  get conParte(): PedidoAbiertoGrupo[] {
    return this.elegidos.filter((p) => (Number(this.partes[p.orderId]) || 0) > 0);
  }

  get hayParteInvalida(): boolean {
    return this.elegidos.some((p) => this.parteSupera(p) || (Number(this.partes[p.orderId]) || 0) < 0);
  }

  autoRepartir(): void {
    this.manual = false;
    const r = repartirPago(this.valor, this.elegidos);
    const nuevas: { [orderId: string]: number } = {};
    this.elegidos.forEach((p) => (nuevas[p.orderId] = 0));
    r.reparto.forEach((x) => (nuevas[x.orderId] = x.valor));
    this.partes = nuevas;
  }

  alCambiarValor(valor: number | null): void {
    this.pago.valor = valor;
    if (!this.manual) this.autoRepartir();
  }

  alCambiarParte(orderId: string, valor: unknown): void {
    this.partes[orderId] = redondear2(valor);
    this.manual = true;
  }

  alternar(orderId: string): void {
    if (this.incluido.has(orderId)) {
      this.incluido.delete(orderId);
      delete this.partes[orderId];
    } else {
      this.incluido.add(orderId);
      this.partes[orderId] = 0;
    }
    if (!this.manual) this.autoRepartir();
  }

  alternarTodos(): void {
    const posibles = this.pedidos.filter((p) => p.tope > 0);
    if (this.todosElegidos) {
      this.incluido.clear();
      this.partes = {};
    } else {
      posibles.forEach((p) => this.incluido.add(p.orderId));
    }
    if (!this.manual) this.autoRepartir();
  }

  trackByPedido(_i: number, p: PedidoAbiertoGrupo): string {
    return p.orderId;
  }

  etiquetaEstado(estado: string): string {
    return metaEstado(estado).label;
  }

  // ── Comprobante ───────────────────────────────────────────────────────────
  alElegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivo = input.files && input.files[0] ? input.files[0] : null;
  }

  alSoltarArchivo(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando = false;
    const f = evento.dataTransfer?.files?.[0];
    if (f) this.archivo = f;
  }

  quitarArchivo(): void {
    this.archivo = null;
    this.archivoSubido = null;
  }

  // ── Confirmar ─────────────────────────────────────────────────────────────
  get puedeRegistrar(): boolean {
    return !this.guardando && !this.cargando && !!this.vista &&
      this.valor > 0 && !!this.pago.formaPago && !!this.pago.referencia.trim() && !!this.pago.fecha && !!this.archivo &&
      this.conParte.length > 0 && this.conParte.length <= this.maxPedidos &&
      !this.hayParteInvalida && Math.abs(this.sinRepartir) <= CENTAVO;
  }

  async registrar(): Promise<void> {
    if (!this.puedeRegistrar || !this.archivo) return;
    this.guardando = true;
    this.error = '';
    this.detalleErrores = [];
    this.resultados = [];
    this.incompleto = false;
    this.bloqueado = false;
    try {
      if (!this.archivoSubido || this.archivoSubido.file !== this.archivo) {
        const hash = await this.calcularHash(this.archivo);
        const url = await this.subirArchivo(this.archivo);
        this.archivoSubido = { file: this.archivo, url, hash };
      }
    } catch {
      this.guardando = false;
      this.error = this.translate.instant('tesoreria.pagoGrupo.errorArchivo');
      return;
    }
    const forma = this.formasPago.find((f: any) => f?.id == this.pago.formaPago);
    const payload: PagoGrupoPayload = {
      documento: this.documento,
      valor: this.valor,
      formaPago: (forma?.nombre || this.pago.formaPago || '').toString(),
      referencia: this.pago.referencia.trim(),
      fechaTransaccion: new Date().toISOString(),
      fecha: this.pago.fecha,
      archivo: this.archivoSubido.url,
      archivoHash: this.archivoSubido.hash,
      notas: (this.pago.notas || '').trim(),
      reparto: this.conParte.map((p) => ({ orderId: p.orderId, valor: redondear2(this.partes[p.orderId]) })),
      idempotencyKey: this.llave,
    };
    this.treasury.registerGroupPayment(payload).subscribe({
      next: (res) => {
        this.guardando = false;
        this.toastr.success(this.translate.instant('tesoreria.pagoGrupo.pagoRegistrado', { n: (res?.resultados || []).length }));
        this.activeModal.close({ changed: true, grupoPagoId: res?.grupoPagoId });
      },
      error: (err) => {
        this.guardando = false;
        this.manejarError(err);
      },
    });
  }

  private manejarError(err: unknown): void {
    const http = err instanceof HttpErrorResponse ? err : null;
    const cuerpo = (http && http.error && typeof http.error === 'object' ? http.error : {}) as any;
    const estado = http ? http.status : 0;
    const codigo = typeof cuerpo.code === 'string' ? cuerpo.code : '';

    // Sin respuesta clara (red caída, tiempo agotado, error del servidor): puede que SÍ se haya registrado. Se conserva
    // la llave y se pide reintentar con el mismo botón: el servidor no duplica nada.
    if (estado === 0 || estado >= 500) {
      this.error = this.translate.instant('tesoreria.pagoGrupo.errorSinRespuesta');
      return;
    }
    if (codigo === 'GRUPO_INCOMPLETO') {
      this.resultados = Array.isArray(cuerpo.resultados) ? cuerpo.resultados : [];
      this.incompleto = true;
      // Un saldo que cambió o un pedido que ya no está abierto no se arreglan reintentando: se avisa la salida.
      this.bloqueado = this.resultados.some((r) => r.estado === 'error' && typeof r.codigo === 'string' && (r.codigo === 'SALDO_CAMBIO' || r.codigo.startsWith('PEDIDO_') || r.codigo === 'OTRO_CLIENTE'));
      const ok = this.resultados.filter((r) => r.estado !== 'error' && r.estado !== 'en_curso').length;
      this.error = this.translate.instant('tesoreria.pagoGrupo.incompleto', { ok, total: this.resultados.length });
      return;
    }
    // El servidor rechazó la validación y NO escribió nada: se puede corregir y volver a confirmar con una llave nueva.
    this.llave = this.nuevaLlave();
    if (estado === 403) {
      this.error = this.translate.instant('cartera.acciones.errorPermiso');
      return;
    }
    const nroDe = (id: string) => (this.pedidos.find((p) => p.orderId === id)?.nroPedido || '');
    const lista: any[] = Array.isArray(cuerpo.errores) ? cuerpo.errores : [];
    this.detalleErrores = lista
      .filter((e) => e && typeof e.mensaje === 'string')
      .map((e) => `${e.orderId && (e.nroPedido || nroDe(e.orderId)) ? this.translate.instant('tesoreria.pagoGrupo.pedidoN', { nro: e.nroPedido || nroDe(e.orderId) }) + ': ' : ''}${e.mensaje}`);
    this.error = typeof cuerpo.message === 'string' && cuerpo.message ? cuerpo.message : this.translate.instant('tesoreria.pagoGrupo.errorGeneral');
    // Los saldos pudieron cambiar: se vuelven a pedir para que la pantalla muestre lo vigente.
    if (codigo === 'SUPERA_SALDO' || codigo === 'PEDIDOS_NO_ADMITIDOS' || codigo === 'REPARTO_DISTINTO') this.cargar(false);
  }

  private mensajeDe(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) return this.translate.instant('cartera.acciones.errorPermiso');
      const m = err.error && typeof err.error.message === 'string' ? err.error.message : '';
      if (m && err.status >= 400 && err.status < 500) return m;
    }
    return this.translate.instant('tesoreria.pagoGrupo.errorCarga');
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }

  unSoloPedido(): void {
    const llamar = this.alUnSoloPedido;
    this.activeModal.dismiss();
    if (llamar) setTimeout(llamar);
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  private nuevaLlave(): string {
    const c: any = typeof crypto !== 'undefined' ? crypto : null;
    if (c && typeof c.randomUUID === 'function') return `pv-${c.randomUUID()}`;
    return `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  private fechaLocal(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
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

  private subirArchivo(file: File): Promise<string> {
    const doc = String(this.documento || 'cliente').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
    const path = `comprobatensPago/grupo_${doc}/${Date.now()}_${file.name}`;
    const ref = this.storage.ref(path);
    return this.storage.upload(path, file).then(() => ref.getDownloadURL().toPromise());
  }
}

/**
 * Abre la ventana de pago a varios pedidos. Devuelve `true` si se registró el pago (la pantalla debe volver a
 * pedir sus datos).
 */
export function abrirPagoGrupo(modal: NgbModal, opciones: OpcionesPagoGrupo): Promise<boolean> {
  const ref = modal.open(PagoGrupoModalComponent, { size: 'lg', centered: true, scrollable: true, backdrop: 'static' });
  const instancia = ref.componentInstance as PagoGrupoModalComponent;
  instancia.documento = opciones.documento;
  instancia.cliente = opciones.cliente || '';
  instancia.orderIdsIniciales = opciones.orderIds || [];
  instancia.alUnSoloPedido = opciones.alUnSoloPedido;
  return ref.result.then(
    (res: { changed?: boolean } | undefined) => !!(res && res.changed),
    () => false,
  );
}
