import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { defer, forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IntegrationsService } from '../integrations/integrations.service';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { splitDianDocumentList } from './dian-document-list';
import { InvoiceComposerComponent } from './composer/invoice-composer.component';

type DianDocumentType = 'invoice' | 'creditNote' | 'debitNote';
type DianStatus = 'accepted' | 'rejected' | 'failed' | string;
type DianStatusGroup = 'accepted' | 'rejected' | 'pending';
type DashboardTab = 'documents' | 'invoice' | 'compose' | 'guide';

interface DianDocument {
  id?: string;
  type: DianDocumentType;
  status: DianStatus;
  number?: string;
  cufe?: string;
  cude?: string;
  issueDate?: string;
  amount?: number;
  orderId?: string;
  environment?: string;
  createdAt?: any;
  reference?: { number?: string; cufe?: string; issueDate?: string };
  correction?: { code?: string; description?: string };
  artifacts?: any;
  error?: { code?: string; message?: string };
  emailDelivery?: { requested?: boolean; sent?: boolean; recipient?: string };
  dianResponse?: any;
  /** Ticket 1276: cliente resuelto por el servidor (nombre o razón social y documento). */
  cliente?: { nombre?: string; documento?: string; tipoDocumento?: string } | null;
  /** Ticket 1276: pedido del que salió la factura, con su número. */
  pedido?: { id?: string; numero?: string } | null;
  /** Ticket 1262: enlace de consulta en la DIAN (es lo que codifica el QR del PDF). */
  qrUrl?: string;
  /** Ticket 1262: reenvíos por correo. */
  emailResends?: { fecha: string; recipient: string; sent: boolean; error?: string }[];
  /** Ticket 1269: el rechazo se cerró como reemplazado por esta factura aceptada. */
  reemplazadaPor?: string;
  reemplazadaEn?: string;
  /** Ticket 1279: saldo de la factura después de sus notas aceptadas (calculado en el servidor). */
  saldo?: { total: number; notasCredito: number; notasDebito: number; notas: number; saldo: number };
}

/** Ticket 1279: línea de la factura para la nota por línea. */
interface LineaFactura { linea: number; descripcion: string; cantidad: number; valorUnitario: number; valorLinea: number; tarifaIva: number }

interface OrderReadiness { ok: boolean; blocked: boolean; label: string; tone: 'success' | 'warning' | 'error' }

const AVATAR_PALETTE = ['#6C4CE0', '#14B8A6', '#E0891B', '#2F6FE0', '#C43E74', '#17994F', '#7A6BC0', '#D6455B'];

@Component({
  selector: 'app-facturacion-electronica',
  templateUrl: './facturacion-electronica.component.html',
  styleUrls: ['./facturacion-electronica.component.scss'],
})
export class FacturacionElectronicaComponent implements OnInit, OnDestroy {
  activeTab: DashboardTab = 'documents';
  composerOpened = false;
  @ViewChild('composerPanel', { static: true }) composerPanel: ElementRef<HTMLElement>;
  @ViewChild(InvoiceComposerComponent) composer?: InvoiceComposerComponent;
  documents: DianDocument[] = [];
  technicalHistory: any[] = [];
  historyOpen = false;
  configurationError = '';
  pendingOrders: any[] = [];
  queuedOrders = new Set<string>();
  selectedOrders = new Set<string>();
  integration: any = null;
  loading = false;
  lastSync: Date | null = null;
  documentsError = '';
  ordersError = '';
  search = '';
  statusFilter: 'all' | DianStatusGroup = 'all';
  typeFilter: 'all' | 'notes' | DianDocumentType = 'all';
  // Ticket 1276: más filtros de la bandeja (fecha, valor y tipo), además del estado y la búsqueda.
  masFiltros = false;
  fechaDesde = '';
  fechaHasta = '';
  valorMinimo: number | null = null;
  valorMaximo: number | null = null;
  private readonly COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  // Ticket 1266 (FE-13): indicadores en dinero del período.
  periodoFe: 'hoy' | 'mes' | 'mesAnterior' | 'personalizado' = 'mes';
  feDesde = '';
  feHasta = '';
  indicadoresFe: any = null;
  cargandoIndicadores = false;
  // Ticket 1262 (FE-05): documento abierto en el detalle.
  detalle: DianDocument | null = null;
  reenviando = false;
  openMenu = '';

  private destroy$ = new Subject<void>();

  constructor(
    private integrationsService: IntegrationsService,
    private ventasService: VentasService,
    private router: Router,
    private route: ActivatedRoute,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadDashboard();

    // `?documento=<número o CUFE>` abre directamente la lista buscando ese
    // documento. Lo usa la consola de plataforma para saltar desde el cobro de
    // una membresía a su factura electrónica; sin esto el operador aterrizaba
    // en el tablero y tenía que buscarla a mano.
    //
    // Va como búsqueda y no como ruta propia a propósito: la pantalla no tiene
    // vista de detalle por documento, y fabricarle una para esto sería un
    // módulo nuevo. La lista filtrada muestra lo mismo que se necesita ver.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const documento = (params.get('documento') || '').trim();
      if (!documento) return;
      this.statusFilter = 'all';
      this.typeFilter = 'all';
      this.search = documento;
      this.selectTab('documents');
    });
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: Event): void {
    if (!this.openMenu) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-menu-cell]')) return;
    this.openMenu = '';
  }

  get isConfigured(): boolean {
    return this.integration?.enabled === true;
  }

  get isProduction(): boolean {
    return this.integration?.config?.environment === 'produccion';
  }

  get hasAcceptedInvoice(): boolean {
    return this.documents.some((document) => document.type === 'invoice' && document.status === 'accepted');
  }

  get commerceName(): string {
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      return company.nomComercial || company.nombreComercial || company.razonSocial || 'este comercio';
    } catch (_) {
      return 'este comercio';
    }
  }

  get environmentLabel(): string {
    const environment = this.integration?.config?.environment;
    if (environment === 'produccion') return 'Producción';
    if (environment === 'habilitacion') return 'Pruebas';
    return 'Sin configurar';
  }

  get environmentTone(): 'success' | 'warning' | 'muted' {
    if (this.isConfigured && this.isProduction) return 'success';
    if (this.isConfigured) return 'warning';
    return 'muted';
  }

  get nextNumber(): string {
    const numbering = this.integration?.config?.numbering;
    return numbering?.prefix && numbering?.current ? numbering.prefix + numbering.current : '';
  }

  get nextTask(): { tone: 'warning' | 'danger' | 'success' | 'info'; icon: string; title: string; description: string; button: string } {
    if (this.configurationError) {
      return { tone: 'warning', icon: 'pi-refresh', title: 'No pudimos cargar tu configuración',
        description: 'No significa que tus datos se hayan borrado. Vuelve a consultar antes de facturar o configurar.',
        button: 'Volver a consultar' };
    }
    if (!this.isConfigured) {
      return {
        tone: 'warning', icon: 'pi-cog', title: 'Primero conecta este comercio con la DIAN',
        description: 'El asistente pide los datos del comercio, el certificado y la numeración. Puedes hacerlo con tu contador.',
        button: 'Comenzar configuración',
      };
    }
    if (!this.isProduction) {
      return {
        tone: 'info', icon: 'pi-verified', title: 'Termina las pruebas de habilitación',
        description: 'La conexión está guardada, pero sigue en pruebas. Completa el set de habilitación y pasa a Producción.',
        button: 'Continuar habilitación',
      };
    }
    if (this.rejectedCount > 0) {
      const n = this.rejectedCount;
      return {
        tone: 'danger', icon: 'pi-exclamation-triangle', title: `${n} documento${n === 1 ? '' : 's'} necesita${n === 1 ? '' : 'n'} revisión`,
        description: n === 1
          ? 'Ábrelo, lee el mensaje de la DIAN y corrige el pedido antes de intentar de nuevo.'
          : 'Ábrelos, lee el mensaje de la DIAN y corrige los pedidos antes de intentar de nuevo.',
        button: 'Revisar inconvenientes',
      };
    }
    if (this.pendingOrders.length > 0) {
      const n = this.pendingOrders.length;
      return {
        tone: 'warning', icon: 'pi-send', title: `${n} pedido${n === 1 ? '' : 's'} sin factura`,
        description: 'Revisa el cliente, los productos y los impuestos. Después emítelos y Katuq hace el envío a la DIAN.',
        button: 'Ver pedidos',
      };
    }
    return {
      tone: 'success', icon: 'pi-check-circle', title: 'Todo está al día',
      description: 'No hay pedidos recientes pendientes ni documentos con inconvenientes. Puedes consultar o descargar lo emitido.',
      button: 'Ver documentos',
    };
  }

  get acceptedCount(): number {
    return this.documents.filter((document) => document.status === 'accepted').length;
  }

  get rejectedCount(): number {
    return this.documents.filter((document) => this.statusGroup(document) === 'rejected').length;
  }

  get pendingCount(): number {
    return this.documents.filter((document) => this.statusGroup(document) === 'pending').length;
  }

  get notesCount(): number {
    return this.documents.filter((document) => document.type === 'creditNote' || document.type === 'debitNote').length;
  }

  get filteredDocuments(): DianDocument[] {
    const term = this.search.trim().toLowerCase();
    const desde = this.fechaDesde ? new Date(this.fechaDesde + 'T00:00:00') : null;
    const hasta = this.fechaHasta ? new Date(this.fechaHasta + 'T23:59:59') : null;
    return this.documents.filter((document) => {
      const matchesStatus = this.statusFilter === 'all' || this.statusGroup(document) === this.statusFilter;
      const matchesType = this.typeFilter === 'all'
        || (this.typeFilter === 'notes' ? document.type !== 'invoice' : document.type === this.typeFilter);
      const fecha = this.documentDate(document);
      const matchesDate = (!desde || (!!fecha && fecha >= desde)) && (!hasta || (!!fecha && fecha <= hasta));
      const valor = Number(document.amount);
      const matchesAmount = (this.valorMinimo == null || valor >= this.valorMinimo) && (this.valorMaximo == null || valor <= this.valorMaximo);
      const haystack = [
        document.number,
        document.orderId,
        document.pedido?.numero,
        document.reference?.number,
        document.cufe,
        document.cude,
        document.correction?.description,
        document.emailDelivery?.recipient,
        document.cliente?.nombre,
        document.cliente?.documento,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && matchesType && matchesDate && matchesAmount && (!term || haystack.includes(term));
    });
  }

  /** Ticket 1276: cuántos filtros extra hay puestos (para el botón "Más filtros"). */
  get filtrosExtraActivos(): number {
    return [this.fechaDesde, this.fechaHasta, this.valorMinimo != null, this.valorMaximo != null, this.typeFilter !== 'all'].filter(Boolean).length;
  }

  limpiarFiltros(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.valorMinimo = null;
    this.valorMaximo = null;
    this.typeFilter = 'all';
    this.statusFilter = 'all';
    this.search = '';
  }

  /** Ticket 1276: pesos con punto de miles, como en Colombia ($ 12.738.346). */
  money(value: number | null | undefined): string {
    return value == null || isNaN(Number(value)) ? '—' : this.COP.format(Math.round(Number(value)));
  }

  /** Ticket 1276: abre el pedido de la factura en la lista de pedidos. */
  verPedido(document: DianDocument): void {
    const numero = document.pedido?.numero;
    if (numero) this.router.navigate(['/ventas/pedidos'], { queryParams: { nroPedido: numero } });
  }

  get selectableOrders(): any[] {
    return this.pendingOrders.filter((order) => !this.orderReadiness(order).blocked && !this.isQueued(order));
  }

  get allSelected(): boolean {
    const selectable = this.selectableOrders;
    return selectable.length > 0 && selectable.every((order) => this.selectedOrders.has(this.orderId(order)));
  }

  // ---- Ticket 1266 (FE-13): indicadores en dinero por período ----

  setPeriodoFe(valor: string): void {
    this.periodoFe = valor as any;
    const hoy = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (valor === 'hoy') { this.feDesde = iso(hoy); this.feHasta = iso(hoy); }
    if (valor === 'mes') { this.feDesde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); this.feHasta = iso(hoy); }
    if (valor === 'mesAnterior') { this.feDesde = iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)); this.feHasta = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0)); }
    if (valor !== 'personalizado' || (this.feDesde && this.feHasta)) this.cargarIndicadores();
  }

  setFechaFe(campo: 'feDesde' | 'feHasta', valor: string): void {
    this[campo] = valor || '';
    this.periodoFe = 'personalizado';
    if (this.feDesde && this.feHasta) this.cargarIndicadores();
  }

  cargarIndicadores(): void {
    if (!this.feDesde || !this.feHasta) this.setPeriodoFe(this.periodoFe === 'personalizado' ? 'mes' : this.periodoFe);
    this.cargandoIndicadores = true;
    this.integrationsService.getDianIndicadores(this.feDesde, this.feHasta).subscribe({
      next: (res) => { this.cargandoIndicadores = false; this.indicadoresFe = (res && res.data) || null; },
      error: () => { this.cargandoIndicadores = false; this.indicadoresFe = null; },
    });
  }

  variacionFe(campo: string): string {
    const v = this.indicadoresFe && this.indicadoresFe.variacion && this.indicadoresFe.variacion[campo];
    if (v === null || v === undefined) return '';
    return (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '') + Math.abs(v).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%';
  }

  claseVariacionFe(campo: string, bajarEsBueno = false): string {
    const v = this.indicadoresFe && this.indicadoresFe.variacion && this.indicadoresFe.variacion[campo];
    if (!v) return '';
    return (v > 0) !== bajarEsBueno ? 'fe-var-buena' : 'fe-var-mala';
  }

  // ---- Ticket 1262 (FE-05): detalle del documento ----

  abrirDetalle(document: DianDocument): void {
    this.openMenu = '';
    this.detalle = document;
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  @HostListener('document:keydown.escape')
  cerrarDetalleConEscape(): void {
    if (this.detalle) this.detalle = null;
  }

  copiarCufe(document: DianDocument): void {
    const cufe = document.cufe || document.cude || '';
    if (!cufe) return;
    navigator.clipboard?.writeText(cufe).then(
      () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'CUFE copiado', showConfirmButton: false, timer: 1800 }),
      () => undefined,
    );
  }

  /** Enlace de consulta en la DIAN: el del documento o el estándar con el CUFE. */
  enlaceDian(document: DianDocument): string {
    const cufe = document.cufe || document.cude || '';
    return document.qrUrl || (cufe ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${encodeURIComponent(cufe)}` : '');
  }

  /** WhatsApp con el número, el valor y el enlace de consulta (el comprador lo abre con su teléfono). */
  enlaceWhatsApp(document: DianDocument): string {
    const texto = `${this.documentTypeLabel(document.type)} ${document.number || ''} por ${this.money(document.amount)}. Consúltala en la DIAN: ${this.enlaceDian(document)}`;
    return 'https://wa.me/?text=' + encodeURIComponent(texto);
  }

  async reenviarCorreo(document: DianDocument): Promise<void> {
    if (!document.number || document.status !== 'accepted') return;
    const r = await Swal.fire({
      title: 'Reenviar por correo',
      input: 'email',
      inputLabel: 'Correo del comprador',
      inputValue: document.emailDelivery?.recipient || '',
      showCancelButton: true,
      confirmButtonText: 'Reenviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
      validationMessage: 'Escribe un correo válido.',
    });
    if (!r.isConfirmed || !r.value) return;
    this.reenviando = true;
    this.integrationsService.resendDianDocument(document.number, String(r.value)).subscribe({
      next: (res) => {
        this.reenviando = false;
        const envio = res && res.data;
        if (envio) document.emailResends = [...(document.emailResends || []), envio];
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Documento reenviado a ' + r.value, showConfirmButton: false, timer: 2500 });
      },
      error: (e) => {
        this.reenviando = false;
        const envio = e?.error?.data;
        if (envio) document.emailResends = [...(document.emailResends || []), envio];
        Swal.fire({ icon: 'error', title: 'No se pudo reenviar', text: e?.error?.message || 'Intenta de nuevo.' });
      },
    });
  }

  /** Ticket 1262: línea de tiempo del documento con lo que guarda la auditoría. */
  lineaDocumento(document: DianDocument): { texto: string; fecha: Date | null; tono: string; detalle?: string }[] {
    const lista: { texto: string; fecha: Date | null; tono: string; detalle?: string }[] = [];
    lista.push({ texto: 'Registrado en Katuq', fecha: this.asDate(document.createdAt), tono: 'neutro' });
    if (document.issueDate) lista.push({ texto: 'Fecha de emisión', fecha: this.documentDate(document), tono: 'neutro' });
    const g = this.statusGroup(document);
    lista.push({
      texto: g === 'accepted' ? 'Aceptado por la DIAN' : g === 'rejected' ? 'Rechazado por la DIAN' : 'En proceso en la DIAN',
      fecha: this.asDate(document.createdAt), tono: g === 'accepted' ? 'ok' : g === 'rejected' ? 'error' : 'neutro',
      detalle: g === 'rejected' ? this.rejectionMessage(document) : undefined,
    });
    const e = document.emailDelivery;
    if (e && e.requested) {
      lista.push({ texto: e.sent ? `Correo enviado a ${e.recipient || 'el comprador'}` : 'El correo al comprador no salió', fecha: this.asDate(document.createdAt), tono: e.sent ? 'ok' : 'error', detalle: e.sent ? undefined : ((e as any).error || '') });
    }
    for (const r of document.emailResends || []) {
      lista.push({ texto: r.sent ? `Reenviado a ${r.recipient}` : `No se pudo reenviar a ${r.recipient}`, fecha: r.fecha ? new Date(r.fecha) : null, tono: r.sent ? 'ok' : 'error', detalle: r.error });
    }
    return lista;
  }

  /** Ticket 1262: el correo al comprador falló y no se ha reenviado con éxito. */
  correoFallido(document: DianDocument): boolean {
    const e = document.emailDelivery;
    if (!e || !e.requested || e.sent) return false;
    return !(document.emailResends || []).some((r) => r.sent);
  }

  loadDashboard(): void {
    if (this.loading) return;
    this.loading = true;
    this.configurationError = '';
    this.documentsError = '';
    this.ordersError = '';

    // `defer` también convierte en error observable los fallos sincrónicos de
    // contexto (por ejemplo, mientras cambia el comercio activo). Así la vista
    // conserva su estado amigable en lugar de dejar el router-outlet en blanco.
    const integration$ = defer(() => this.integrationsService.getIntegration('dian')).pipe(
      catchError((error) => {
        if (error?.status !== 404) this.configurationError = 'No pudimos consultar la configuración guardada.';
        return of(null);
      }),
    );
    const documents$ = defer(() => this.integrationsService.listDianDocuments(undefined, 200)).pipe(
      catchError((error) => {
        this.documentsError = this.errorMessage(error, 'No fue posible cargar los documentos DIAN.');
        return of(null);
      }),
    );
    const orders$ = defer(() => this.ventasService.getOrdersByFilterOptimized(
      { sortField: 'fechaCreacion', sortOrder: -1 },
      1,
      100,
      false,
    )).pipe(
      catchError((error) => {
        this.ordersError = this.errorMessage(error, 'No fue posible cargar los pedidos pendientes.');
        return of({ orders: [], pagination: null } as any);
      }),
    );

    forkJoin({ integration: integration$, documents: documents$, orders: orders$ })
      .pipe(finalize(() => this.loading = false))
      .subscribe(({ integration, documents, orders }) => {
        this.integration = integration;
        const documentData = documents?.data || documents;
        const list = splitDianDocumentList(documentData?.invoices);
        this.documents = list.documents;
        this.technicalHistory = list.history;
        const orderList = Array.isArray(orders?.orders) ? orders.orders : [];
        this.pendingOrders = orderList.filter((order: any) => this.isPendingInvoice(order));
        const ids = new Set(this.pendingOrders.map((order) => this.orderId(order)));
        this.selectedOrders.forEach((id) => { if (!ids.has(id)) this.selectedOrders.delete(id); });
        this.lastSync = new Date();
      });
    // Ticket 1266: los indicadores del período se cargan aparte (no frenan la bandeja).
    this.cargarIndicadores();
  }

  selectTab(tab: DashboardTab): void {
    this.activeTab = tab;
    this.openMenu = '';
    if (tab === 'compose') {
      this.composerOpened = true;
      // Render before focusing: the panel can still be hidden on the first click.
      this.changeDetector.detectChanges();
      this.composer?.requestNewInvoice();
      const panel = this.composerPanel.nativeElement;
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }

  showDocuments(status: 'all' | DianStatusGroup, type: 'all' | 'notes' = 'all'): void {
    this.statusFilter = status;
    this.typeFilter = type;
    this.search = '';
    this.selectTab('documents');
  }

  doNextTask(): void {
    if (this.configurationError) { this.loadDashboard(); return; }
    if (!this.isConfigured || !this.isProduction) {
      this.goToConfiguration();
      return;
    }
    if (this.rejectedCount > 0) {
      this.showDocuments('rejected');
      return;
    }
    if (this.pendingOrders.length > 0) this.selectTab('invoice');
    else this.showDocuments('all');
  }

  toggleHistory(event?: Event): void {
    event?.preventDefault();
    this.historyOpen = !this.historyOpen;
  }

  toggleMenu(document: DianDocument, event: Event): void {
    event.stopPropagation();
    const key = this.trackByDocument(0, document);
    this.openMenu = this.openMenu === key ? '' : key;
  }

  isMenuOpen(document: DianDocument): boolean {
    return this.openMenu === this.trackByDocument(0, document);
  }

  goToConfiguration(): void {
    this.router.navigate(['/integrations/configure'], { queryParams: { provider: 'dian' } });
  }

  // ===== Pedidos sin factura =====

  toggleOrder(order: any): void {
    const readiness = this.orderReadiness(order);
    if (readiness.blocked || this.isQueued(order)) return;
    const id = this.orderId(order);
    if (this.selectedOrders.has(id)) this.selectedOrders.delete(id);
    else this.selectedOrders.add(id);
  }

  toggleAllOrders(): void {
    if (this.allSelected) { this.selectedOrders.clear(); return; }
    this.selectableOrders.forEach((order) => this.selectedOrders.add(this.orderId(order)));
  }

  isSelected(order: any): boolean {
    return this.selectedOrders.has(this.orderId(order));
  }

  orderReadiness(order: any): OrderReadiness {
    if (['Cancelado', 'Precancelado'].includes(order?.estadoPago)) return { ok: false, blocked: true, label: 'Cancelado', tone: 'error' };
    if (!this.orderEmail(order)) return { ok: false, blocked: true, label: 'Falta correo', tone: 'warning' };
    if (order?.estadoPago && order.estadoPago !== 'Aprobado') return { ok: true, blocked: false, label: 'Pago pendiente', tone: 'warning' };
    return { ok: true, blocked: false, label: 'Sí', tone: 'success' };
  }

  emitSelected(): void {
    const orders = this.pendingOrders.filter((order) => this.selectedOrders.has(this.orderId(order)) && !this.isQueued(order));
    if (!orders.length) return;
    if (!this.isConfigured) { this.askForConfiguration(); return; }
    const total = orders.reduce((sum, order) => sum + this.orderTotal(order), 0);
    Swal.fire({
      icon: 'question',
      title: orders.length === 1 ? '¿Enviar esta factura a la DIAN?' : `¿Enviar ${orders.length} facturas a la DIAN?`,
      html: `<p>${orders.length === 1 ? 'Pedido' : 'Pedidos'} <strong>${orders.map((order) => this.escapeHtml(order.nroPedido || this.orderId(order))).join(', ')}</strong></p>`
        + `<p>Total ${this.escapeHtml(this.formatCop(total))}. Cada pedido consume un consecutivo real. Revisa cliente, productos e impuestos antes de confirmar.</p>`,
      showCancelButton: true,
      confirmButtonText: orders.length === 1 ? 'Sí, facturar' : 'Sí, emitir todos',
      cancelButtonText: 'Todavía no',
      confirmButtonColor: '#6c4ce0',
    }).then((confirmation) => {
      if (!confirmation.isConfirmed) return;
      orders.forEach((order) => this.queueInvoice(order));
      this.selectedOrders.clear();
      Swal.fire({
        icon: 'success',
        title: orders.length === 1 ? 'Factura enviada a procesar' : `${orders.length} facturas enviadas a procesar`,
        text: 'Katuq las firmará, las enviará a la DIAN y actualizará cada pedido. Puedes seguir trabajando.',
        confirmButtonText: 'Entendido',
      });
    });
  }

  invoiceOrder(order: any): void {
    if (!this.isConfigured) { this.askForConfiguration(); return; }
    const orderId = this.orderId(order);
    if (!orderId) {
      Swal.fire({ icon: 'error', title: 'Pedido sin identificación', text: 'No fue posible identificar este pedido.' });
      return;
    }
    Swal.fire({
      icon: 'question',
      title: '¿Enviar esta factura a la DIAN?',
      html: `<p>Pedido <strong>${this.escapeHtml(order.nroPedido || orderId)}</strong></p><p>Revisa antes que el cliente, los productos y los impuestos estén correctos.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, facturar',
      cancelButtonText: 'Todavía no',
      confirmButtonColor: '#6c4ce0',
    }).then((confirmation) => {
      if (!confirmation.isConfirmed) return;
      this.queueInvoice(order, true);
    });
  }

  /**
   * Ticket 1269 (FE-18): KAI explica el rechazo en lenguaje simple. Si ya hay
   * una factura aceptada del mismo cliente y valor, ofrece cerrarlo como
   * reemplazado (con confirmación; no reenvía ni anula nada).
   */
  explicarRechazo(document: DianDocument): void {
    if (!document.number) return;
    Swal.fire({ title: 'KAI está revisando el rechazo…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.integrationsService.explicarRechazoDian(document.number).subscribe({
      next: (response: any) => {
        const r = response?.data || {};
        const reemplazo = r.reemplazo?.numero ? String(r.reemplazo.numero) : '';
        Swal.fire({
          title: `Por qué la DIAN rechazó ${this.escapeHtml(document.number || '')}`,
          html: `<div class="kai-rechazo"><p>${this.escapeHtml(r.explicacion || '')}</p>`
            + `<p><strong>Qué hacer:</strong> ${this.escapeHtml(r.correccion || '')}</p>`
            + (r.mensajes?.length ? `<p class="kai-rechazo__dian">DIAN: ${this.escapeHtml(r.mensajes.join(' · '))}</p>` : '')
            + '</div>',
          showCancelButton: !!reemplazo,
          confirmButtonText: reemplazo ? `Marcar como reemplazada por ${this.escapeHtml(reemplazo)}` : 'Entendido',
          cancelButtonText: 'Ahora no',
        }).then((res) => {
          if (res.isConfirmed && reemplazo) this.marcarReemplazada(document, reemplazo);
        });
      },
      error: (error) => Swal.fire({ icon: 'error', title: 'KAI no pudo revisarlo', text: this.errorMessage(error, 'Intenta de nuevo en un momento.') }),
    });
  }

  private marcarReemplazada(document: DianDocument, por: string): void {
    this.integrationsService.marcarRechazoReemplazado(document.number || '', por).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Listo', text: `${document.number} quedó cerrada como reemplazada por ${por}.` });
        this.loadDashboard();
      },
      error: (error) => Swal.fire({ icon: 'error', title: 'No se pudo marcar', text: this.errorMessage(error, 'Revisa que tengas permiso de facturación.') }),
    });
  }

  /** Ticket 1269: la factura aceptada que reemplazó a este rechazo, si está en la bandeja. */
  facturaQueReemplaza(document: DianDocument): DianDocument | null {
    if (!document.reemplazadaPor) return null;
    return this.documents.find((d) => d.type === 'invoice' && d.number === document.reemplazadaPor) || null;
  }

  retryDocument(document: DianDocument): void {
    if (document.orderId) {
      this.invoiceOrder({ _id: document.orderId, nroPedido: document.orderId });
      return;
    }
    this.selectTab('compose');
  }

  private queueInvoice(order: any, notify = false): void {
    const orderId = this.orderId(order);
    this.queuedOrders.add(orderId);
    this.integrationsService.createAccountingInvoiceAsync('dian', orderId).subscribe({
      next: () => {
        if (notify) {
          Swal.fire({
            icon: 'success',
            title: 'Factura enviada a procesar',
            text: 'Katuq la firmará, la enviará a la DIAN y actualizará el pedido. Puedes continuar trabajando.',
            confirmButtonText: 'Entendido',
          });
        }
      },
      error: (error) => {
        this.queuedOrders.delete(orderId);
        Swal.fire({
          icon: 'error',
          title: `No se pudo iniciar la factura del pedido ${order.nroPedido || orderId}`,
          text: this.errorMessage(error, 'Revisa los datos del pedido e inténtalo nuevamente.'),
        });
      },
    });
  }

  private askForConfiguration(): void {
    Swal.fire({
      icon: 'info',
      title: 'Primero activa la conexión con la DIAN',
      text: 'Abre Configuración DIAN y completa el asistente del comercio.',
      showCancelButton: true,
      confirmButtonText: 'Ir a configuración',
      cancelButtonText: 'Ahora no',
    }).then((result) => {
      if (result.isConfirmed) this.goToConfiguration();
    });
  }

  // ===== Documentos =====

  checkStatus(document: DianDocument): void {
    this.openMenu = '';
    const trackId = document.cufe || document.cude;
    if (!trackId) {
      Swal.fire({ icon: 'info', title: 'Sin código de seguimiento', text: 'Este intento no alcanzó a generar CUFE o CUDE.' });
      return;
    }
    Swal.fire({ title: 'Consultando a la DIAN…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.integrationsService.getDianDocumentStatus(trackId).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        const accepted = data?.isValid === true;
        const messages = data?.errorMessages || data?.statusMessages || [];
        Swal.fire({
          icon: accepted ? 'success' : 'info',
          title: accepted ? 'Documento aceptado por la DIAN' : 'Respuesta de la DIAN',
          html: `<p><strong>${this.escapeHtml(document.number || '')}</strong></p><p>${this.escapeHtml(messages.length ? messages.join(' · ') : (data?.statusDescription || 'Consulta completada.'))}</p>`,
        });
      },
      error: (error) => Swal.fire({
        icon: 'error',
        title: 'No se pudo consultar la DIAN',
        text: this.errorMessage(error, 'Inténtalo nuevamente.'),
      }),
    });
  }

  download(document: DianDocument, kind: 'xml' | 'pdf' | 'applicationResponse' | 'attachedDocument'): void {
    this.openMenu = '';
    if (!document.number) return;
    if (document.status !== 'accepted') {
      Swal.fire({ icon: 'info', title: 'Archivo no disponible', text: 'Solo los documentos aceptados por la DIAN tienen PDF y XML.' });
      return;
    }
    this.integrationsService.downloadDianArtifact(document.number, kind).subscribe({
      next: (blob: Blob) => {
        const extension = kind === 'pdf' ? 'pdf' : 'xml';
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.number}-${kind}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => Swal.fire({
        icon: 'error',
        title: 'Archivo no disponible',
        text: this.errorMessage(error, 'El documento no tiene todavía este archivo.'),
      }),
    });
  }

  /** Ticket 1267 (FE-15): descarga lo que pide el contador del período elegido. */
  descargandoContador: 'excel' | 'zip' | null = null;

  descargarParaContador(formato: 'excel' | 'zip'): void {
    if (!this.feDesde || !this.feHasta || this.descargandoContador) return;
    this.descargandoContador = formato;
    this.integrationsService.descargarLibroVentas(this.feDesde, this.feHasta, formato).subscribe({
      next: (blob: Blob) => {
        this.descargandoContador = null;
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = formato === 'excel'
          ? `libro-ventas-${this.feDesde}-a-${this.feHasta}.xlsx`
          : `facturacion-${this.feDesde}-a-${this.feHasta}.zip`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.descargandoContador = null;
        Swal.fire({
          icon: 'error',
          title: 'No pudimos descargarlo',
          text: formato === 'zip'
            ? 'Si el período tiene muchos documentos, prueba con uno más corto.'
            : 'Intenta de nuevo en un momento.',
        });
      },
    });
  }

  /**
   * Ticket 1279: nota "desde afuera". Busca la factura aceptada a citar por
   * número, cliente o CUFE entre las de la bandeja y sigue con la misma nota.
   */
  notaDesdeAfuera(tipo: 'credit' | 'debit'): void {
    const facturas = this.documents.filter((d) => d.type === 'invoice' && d.status === 'accepted' && d.number && d.cufe);
    Swal.fire({
      title: tipo === 'credit' ? 'Nota crédito: ¿qué factura corriges?' : 'Nota débito: ¿qué factura corriges?',
      input: 'text',
      inputLabel: 'Número de la factura, nombre o documento del cliente, o CUFE',
      inputPlaceholder: 'Ejemplo: JULS41',
      showCancelButton: true,
      confirmButtonText: 'Buscar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (value || '').trim() ? null : 'Escribe qué factura buscas',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const texto = String(result.value || '').trim().toLowerCase();
      const exacta = facturas.find((d) => (d.number || '').toLowerCase() === texto || (d.cufe || '').toLowerCase() === texto);
      const encontradas = exacta ? [exacta] : facturas.filter((d) =>
        (d.number || '').toLowerCase().includes(texto)
        || (d.cliente?.nombre || '').toLowerCase().includes(texto)
        || (d.cliente?.documento || '').toLowerCase().includes(texto));
      if (!encontradas.length) {
        Swal.fire({ icon: 'info', title: 'No la encontramos', text: 'Solo se citan facturas aceptadas por la DIAN. Revisa el número o búscala en «Facturas y notas».' });
        return;
      }
      if (encontradas.length === 1) {
        this.iniciarNota(encontradas[0], tipo);
        return;
      }
      const opciones: Record<string, string> = {};
      // SweetAlert pinta las opciones como HTML: todo dato del comercio va escapado.
      encontradas.slice(0, 30).forEach((d) => {
        opciones[d.number || ''] = this.escapeHtml(`${d.number} · ${d.cliente?.nombre || 'sin cliente'} · ${this.money(d.saldo ? d.saldo.saldo : d.amount)}`);
      });
      Swal.fire({
        title: 'Elige la factura',
        input: 'select',
        inputOptions: opciones,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
      }).then((r) => {
        const elegida = r.isConfirmed ? encontradas.find((d) => d.number === r.value) : null;
        if (elegida) this.iniciarNota(elegida, tipo);
      });
    });
  }

  /** Ticket 1279: nota crédito o débito directa sobre una factura (fila y detalle). */
  iniciarNota(document: DianDocument, tipo: 'credit' | 'debit'): void {
    this.openMenu = '';
    if (!this.facturaCitable(document)) return;
    if (tipo === 'debit') {
      this.openAdjustmentForm(document, 'debit');
      return;
    }
    Swal.fire({
      title: '¿La nota crédito es por toda la factura?',
      input: 'select',
      inputOptions: { credit_adjust: 'No: una parte (por línea o por valor)', credit_full: 'Sí: anular toda la factura' },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (result.value === 'credit_full') this.confirmFullCreditNote(document);
      else this.openAdjustmentForm(document, 'credit');
    });
  }

  /** Ticket 1279: notas de la bandeja que citan esta factura. */
  notasDeFactura(document: DianDocument): DianDocument[] {
    if (document.type !== 'invoice' || !document.number) return [];
    return this.documents.filter((n) => n.type !== 'invoice' && n.reference?.number === document.number);
  }

  /** Ticket 1279: la factura que cita una nota, si está en la bandeja. */
  facturaDeNota(document: DianDocument): DianDocument | null {
    if (document.type === 'invoice' || !document.reference?.number) return null;
    return this.documents.find((f) => f.type === 'invoice' && f.number === document.reference?.number) || null;
  }

  private facturaCitable(document: DianDocument): boolean {
    if (document.type !== 'invoice' || document.status !== 'accepted') return false;
    if (!document.number || !document.cufe) {
      Swal.fire({ icon: 'error', title: 'Factura incompleta', text: 'No se encontró el número o el CUFE de la factura original.' });
      return false;
    }
    return true;
  }

  documentTypeLabel(type: DianDocumentType): string {
    if (type === 'creditNote') return 'Nota crédito';
    if (type === 'debitNote') return 'Nota débito';
    return 'Factura';
  }

  statusGroup(document: DianDocument): DianStatusGroup {
    if (document.status === 'accepted') return 'accepted';
    if (document.status === 'rejected' || document.status === 'failed') return 'rejected';
    return 'pending';
  }

  statusLabel(status: DianStatus): string {
    if (status === 'accepted') return 'Aceptada';
    if (status === 'rejected') return 'Rechazada';
    if (status === 'failed') return 'No enviada';
    if (status === 'processing' || status === 'pending') return 'En proceso';
    return status || 'En proceso';
  }

  statusIcon(document: DianDocument): string {
    const group = this.statusGroup(document);
    return group === 'accepted' ? 'pi-check' : group === 'rejected' ? 'pi-times' : 'pi-clock';
  }

  rejectionCode(document: DianDocument): string {
    return document.error?.code || document.dianResponse?.statusCode || '';
  }

  rejectionMessage(document: DianDocument): string {
    const response = document.dianResponse || {};
    const messages = Array.isArray(response.errorMessages) ? response.errorMessages : [];
    return document.error?.message
      || (messages.length ? messages.join(' · ') : '')
      || response.statusDescription
      || 'La DIAN no aceptó el documento. Consulta el detalle y corrige los datos antes de reintentar.';
  }

  /** Ticket 1276: razón social o nombre del cliente; el correo solo si no se pudo resolver. */
  documentCustomer(document: DianDocument): string {
    return document.cliente?.nombre || document.emailDelivery?.recipient || '';
  }

  /** Ticket 1276: "NIT 901072822-4" o "CC 1039449871". */
  documentCustomerId(document: DianDocument): string {
    const c = document.cliente;
    if (!c || !c.documento) return '';
    return [c.tipoDocumento || '', c.documento].filter(Boolean).join(' ');
  }

  historyLabel(entry: any): string {
    if (entry?.type === 'habilitationSet') return 'Set de pruebas';
    if (entry?.type === 'habilitationStatus') return 'Consulta';
    return 'Registro';
  }

  historyMessage(entry: any): string {
    if (entry?.type === 'habilitationSet') return 'Envío del set de pruebas de habilitación a la DIAN.';
    if (entry?.type === 'habilitationStatus') return 'Consulta del estado del set de pruebas.';
    return entry?.message || entry?.error?.message || 'Registro técnico de la integración.';
  }

  historyTone(entry: any): 'success' | 'error' | 'info' {
    if (entry?.status === 'accepted' || entry?.status === 'success') return 'success';
    if (entry?.status === 'rejected' || entry?.status === 'failed' || entry?.error) return 'error';
    return 'info';
  }

  documentDate(document: DianDocument): Date | null {
    if (document.issueDate) return new Date(`${document.issueDate}T12:00:00`);
    return this.asDate(document.createdAt);
  }

  entryDate(entry: any): Date | null {
    return this.asDate(entry?.createdAt);
  }

  orderDate(order: any): Date | null {
    return this.asDate(order?.fechaCreacion || order?.createdAt || order?.fecha);
  }

  orderCustomer(order: any): string {
    return order?.facturacion?.nombres
      || order?.cliente?.nombres_completos
      || order?.cliente?.nombre
      || order?.datosFacturacion?.nombres_completos
      || 'Cliente sin nombre';
  }

  orderEmail(order: any): string {
    return order?.facturacion?.correoElectronico
      || order?.cliente?.correo_electronico_comprador
      || order?.cliente?.correoElectronico
      || order?.cliente?.email
      || '';
  }

  orderTotal(order: any): number {
    return Number(order?.totalPedididoConDescuento ?? order?.totalPedido ?? order?.total ?? 0);
  }

  orderId(order: any): string {
    return String(order?._id || order?.id || order?.cd || '');
  }

  isQueued(order: any): boolean {
    return this.queuedOrders.has(this.orderId(order));
  }

  initial(value: string): string {
    return (value || '?').trim().charAt(0).toUpperCase() || '?';
  }

  avatarColor(value: string): string {
    const text = value || '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }

  hasAcceptedCreditNote(document: DianDocument): boolean {
    return this.documents.some((item) =>
      item.type === 'creditNote'
      && item.status === 'accepted'
      && item.reference?.number === document.number,
    );
  }

  trackByDocument(index: number, document: DianDocument): string {
    return document.id || document.number || String(index);
  }

  trackByOrder(index: number, order: any): string {
    // Angular invokes trackBy as a standalone callback, so it must not depend
    // on the component's `this` context.
    return String(order?._id || order?.id || order?.cd || order?.nroPedido || index);
  }

  private confirmFullCreditNote(document: DianDocument): void {
    if (this.hasAcceptedCreditNote(document)) {
      Swal.fire({ icon: 'info', title: 'Esta factura ya tiene nota crédito', text: 'Revisa la nota en la bandeja antes de generar otra corrección.' });
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: '¿Anular toda la factura?',
      html: `<p>Se enviará una nota crédito por el total de <strong>${this.escapeHtml(document.number || '')}</strong>.</p><p>Esta operación fiscal no se puede deshacer.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, anular factura',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c23934',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.sendNote(document, 'credit', {
        code: '2',
        description: 'Anulación de factura electrónica',
      });
    });
  }

  /** Ticket 1279: carga las líneas de la factura (si se puede) y abre la nota. */
  private openAdjustmentForm(document: DianDocument, noteType: 'credit' | 'debit'): void {
    Swal.fire({ title: 'Cargando la factura…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.integrationsService.getDianInvoiceLines(document.number || '').subscribe({
      next: (response: any) => this.mostrarFormularioNota(document, noteType, response?.data?.lineas || []),
      // Sin líneas la nota sigue disponible por valor.
      error: () => this.mostrarFormularioNota(document, noteType, []),
    });
  }

  private mostrarFormularioNota(document: DianDocument, noteType: 'credit' | 'debit', lineas: LineaFactura[]): void {
    const causes = noteType === 'credit'
      ? [['1', 'Devolución parcial'], ['3', 'Rebaja o descuento'], ['4', 'Ajuste de precio'], ['5', 'Otro motivo']]
      : [['1', 'Intereses'], ['2', 'Gastos por cobrar'], ['3', 'Cambio del valor'], ['4', 'Otro motivo']];
    const options = causes.map(([code, label]) => `<option value="${code}">${code} — ${label}</option>`).join('');
    const saldo = document.saldo ? document.saldo.saldo : Number(document.amount || 0);
    const opcionesLinea = lineas.map((l) =>
      `<option value="${Number(l.linea)}">${Number(l.linea)} — ${this.escapeHtml(String(l.descripcion || ''))} · ${Number(l.cantidad)} × ${this.escapeHtml(this.money(l.valorUnitario))} + IVA ${Number(l.tarifaIva)}%</option>`).join('');
    const bloqueLinea = lineas.length ? `
          <label for="dian-note-line">¿Sobre qué línea de la factura?</label>
          <select id="dian-note-line" class="swal2-select"><option value="">Ninguna: escribo el valor</option>${opcionesLinea}</select>
          <div id="dian-note-qty-box" style="display:none">
            <label for="dian-note-qty">Cantidad</label>
            <input id="dian-note-qty" type="number" min="0.001" step="any" class="swal2-input">
          </div>` : '';
    const textoSaldo = noteType === 'credit'
      ? `<p class="dian-note-saldo">Saldo disponible de ${this.escapeHtml(document.number || 'la factura')}: <strong>${this.escapeHtml(this.money(saldo))}</strong></p>`
      : '';

    Swal.fire({
      title: noteType === 'credit' ? 'Nueva nota crédito' : 'Nueva nota débito',
      html: `
        <div class="dian-note-form">
          ${textoSaldo}
          ${bloqueLinea}
          <label for="dian-note-cause">Motivo</label>
          <select id="dian-note-cause" class="swal2-select">${options}</select>
          <label for="dian-note-description">Explica el ajuste</label>
          <input id="dian-note-description" class="swal2-input" placeholder="Ejemplo: descuento acordado con el cliente">
          <label for="dian-note-base">Valor antes de IVA</label>
          <input id="dian-note-base" type="number" min="0.01" step="0.01" class="swal2-input" placeholder="0">
          <label for="dian-note-tax">IVA</label>
          <select id="dian-note-tax" class="swal2-select"><option value="0">0%</option><option value="5">5%</option><option value="19">19%</option></select>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Revisar y enviar',
      cancelButtonText: 'Cancelar',
      didOpen: (popup) => this.conectarLineaDeNota(popup, lineas, noteType),
      preConfirm: () => {
        const popup = Swal.getPopup();
        const code = (popup?.querySelector('#dian-note-cause') as HTMLSelectElement)?.value;
        const description = (popup?.querySelector('#dian-note-description') as HTMLInputElement)?.value.trim();
        const baseAmount = Number((popup?.querySelector('#dian-note-base') as HTMLInputElement)?.value);
        const taxRate = Number((popup?.querySelector('#dian-note-tax') as HTMLSelectElement)?.value);
        const linea = lineas.find((l) => String(l.linea) === (popup?.querySelector('#dian-note-line') as HTMLSelectElement)?.value);
        const cantidad = Number((popup?.querySelector('#dian-note-qty') as HTMLInputElement)?.value);
        if (linea && (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > linea.cantidad)) {
          return Swal.showValidationMessage(`La cantidad debe estar entre 0 y ${linea.cantidad}`);
        }
        if (!description) return Swal.showValidationMessage('Escribe por qué necesitas el ajuste');
        if (!Number.isFinite(baseAmount) || baseAmount <= 0) return Swal.showValidationMessage('Ingresa un valor mayor que cero');
        const total = Math.round(baseAmount * (1 + taxRate / 100) * 100) / 100;
        if (noteType === 'credit' && total > saldo + 1) {
          return Swal.showValidationMessage(`Con IVA son ${this.money(total)} y el saldo de la factura es ${this.money(saldo)}`);
        }
        return { code, description, baseAmount, taxRate };
      },
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      const value = result.value as { code: string; description: string; baseAmount: number; taxRate: number };
      this.sendNote(document, noteType, { code: value.code, description: value.description }, {
        description: value.description,
        baseAmount: value.baseAmount,
        taxRate: value.taxRate,
      });
    });
  }

  /**
   * Ticket 1279: al elegir una línea y su cantidad se llenan el valor sin IVA,
   * la tarifa y la descripción; siguen editables.
   */
  private conectarLineaDeNota(popup: HTMLElement, lineas: LineaFactura[], noteType: 'credit' | 'debit'): void {
    const linea = popup.querySelector('#dian-note-line') as HTMLSelectElement | null;
    if (!linea) return;
    const caja = popup.querySelector('#dian-note-qty-box') as HTMLElement;
    const cantidad = popup.querySelector('#dian-note-qty') as HTMLInputElement;
    const base = popup.querySelector('#dian-note-base') as HTMLInputElement;
    const iva = popup.querySelector('#dian-note-tax') as HTMLSelectElement;
    const descripcion = popup.querySelector('#dian-note-description') as HTMLInputElement;
    let descripcionAutomatica = '';
    const llenar = () => {
      const l = lineas.find((x) => String(x.linea) === linea.value);
      caja.style.display = l ? '' : 'none';
      if (!l) return;
      const n = Number(cantidad.value);
      if (!Number.isFinite(n) || n <= 0) return;
      // La línea completa usa su valor exacto; una parte, el unitario neto por la cantidad.
      base.value = String(n === l.cantidad ? l.valorLinea : Math.round(l.valorUnitario * n * 100) / 100);
      iva.value = String(l.tarifaIva);
      if (!descripcion.value.trim() || descripcion.value === descripcionAutomatica) {
        descripcionAutomatica = `${noteType === 'credit' ? 'Devolución' : 'Ajuste'} de ${n} × ${l.descripcion}`.slice(0, 200);
        descripcion.value = descripcionAutomatica;
      }
    };
    linea.addEventListener('change', () => {
      const l = lineas.find((x) => String(x.linea) === linea.value);
      if (l) cantidad.value = String(l.cantidad);
      llenar();
    });
    cantidad.addEventListener('input', llenar);
  }

  private sendNote(
    document: DianDocument,
    noteType: 'credit' | 'debit',
    correction: { code: string; description: string },
    adjustment?: { description: string; baseAmount: number; taxRate: number },
  ): void {
    const issueDate = document.issueDate || this.dateOnly(document.createdAt);
    if (!document.number || !document.cufe || !issueDate) {
      Swal.fire({ icon: 'error', title: 'Faltan datos fiscales', text: 'No se pudo identificar completamente la factura original.' });
      return;
    }
    Swal.fire({ title: 'Transmitiendo a la DIAN…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.integrationsService.createDianNote(noteType, {
      // Ticket 1279: una factura libre no tiene pedido; el servidor la ubica por número y CUFE.
      ...(document.orderId ? { orderId: document.orderId } : {}),
      reference: { number: document.number, cufe: document.cufe, issueDate },
      correction,
      adjustment,
    }).subscribe({
      next: (response: any) => {
        const note = response?.data || response;
        Swal.fire({
          icon: 'success',
          title: noteType === 'credit' ? 'Nota crédito aceptada' : 'Nota débito aceptada',
          text: `${note?.number || 'La nota'} fue recibida por la DIAN.`,
        }).then(() => this.loadDashboard());
      },
      error: (error) => Swal.fire({
        icon: 'error',
        title: 'La nota no pudo completarse',
        text: this.errorMessage(error, 'Revisa los datos e inténtalo nuevamente.'),
      }),
    });
  }

  private isPendingInvoice(order: any): boolean {
    if (!order || order.nroFactura || order.facturacionElectronica?.invoiceId) return false;
    if (!Array.isArray(order.carrito) || order.carrito.length === 0) return false;
    return true;
  }

  private asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000);
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private dateOnly(value: any): string {
    const date = this.asDate(value);
    return date ? date.toISOString().slice(0, 10) : '';
  }

  private formatCop(value: number): string {
    return '$' + Math.round(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
