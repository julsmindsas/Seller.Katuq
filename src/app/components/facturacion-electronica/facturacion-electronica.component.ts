import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { defer, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
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
}

interface OrderReadiness { ok: boolean; blocked: boolean; label: string; tone: 'success' | 'warning' | 'error' }

const AVATAR_PALETTE = ['#6C4CE0', '#14B8A6', '#E0891B', '#2F6FE0', '#C43E74', '#17994F', '#7A6BC0', '#D6455B'];

@Component({
  selector: 'app-facturacion-electronica',
  templateUrl: './facturacion-electronica.component.html',
  styleUrls: ['./facturacion-electronica.component.scss'],
})
export class FacturacionElectronicaComponent implements OnInit {
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
  typeFilter: 'all' | 'notes' = 'all';
  openMenu = '';

  constructor(
    private integrationsService: IntegrationsService,
    private ventasService: VentasService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
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
    return this.documents.filter((document) => {
      const matchesStatus = this.statusFilter === 'all' || this.statusGroup(document) === this.statusFilter;
      const matchesType = this.typeFilter === 'all' || document.type !== 'invoice';
      const haystack = [
        document.number,
        document.orderId,
        document.reference?.number,
        document.cufe,
        document.cude,
        document.correction?.description,
        document.emailDelivery?.recipient,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && matchesType && (!term || haystack.includes(term));
    });
  }

  get selectableOrders(): any[] {
    return this.pendingOrders.filter((order) => !this.orderReadiness(order).blocked && !this.isQueued(order));
  }

  get allSelected(): boolean {
    const selectable = this.selectableOrders;
    return selectable.length > 0 && selectable.every((order) => this.selectedOrders.has(this.orderId(order)));
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

  createNote(document: DianDocument): void {
    this.openMenu = '';
    if (document.type !== 'invoice' || document.status !== 'accepted') return;
    if (!document.orderId || !document.number || !document.cufe) {
      Swal.fire({
        icon: 'error',
        title: 'Factura incompleta',
        text: 'No se encontró el pedido o el CUFE de la factura original.',
      });
      return;
    }

    Swal.fire({
      title: '¿Qué necesitas corregir?',
      input: 'select',
      inputOptions: {
        credit_adjust: 'Disminuir un valor (nota crédito)',
        debit: 'Aumentar un valor (nota débito)',
        credit_full: 'Anular toda la factura (nota crédito)',
      },
      inputPlaceholder: 'Selecciona una opción',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => value ? null : 'Selecciona lo que necesitas hacer',
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      if (result.value === 'credit_full') this.confirmFullCreditNote(document);
      else this.openAdjustmentForm(document, result.value === 'debit' ? 'debit' : 'credit');
    });
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

  documentCustomer(document: DianDocument): string {
    return document.emailDelivery?.recipient || '';
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

  private openAdjustmentForm(document: DianDocument, noteType: 'credit' | 'debit'): void {
    const causes = noteType === 'credit'
      ? [['1', 'Devolución parcial'], ['3', 'Rebaja o descuento'], ['4', 'Ajuste de precio'], ['5', 'Otro motivo']]
      : [['1', 'Intereses'], ['2', 'Gastos por cobrar'], ['3', 'Cambio del valor'], ['4', 'Otro motivo']];
    const options = causes.map(([code, label]) => `<option value="${code}">${code} — ${label}</option>`).join('');

    Swal.fire({
      title: noteType === 'credit' ? 'Nueva nota crédito' : 'Nueva nota débito',
      html: `
        <div class="dian-note-form">
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
      preConfirm: () => {
        const popup = Swal.getPopup();
        const code = (popup?.querySelector('#dian-note-cause') as HTMLSelectElement)?.value;
        const description = (popup?.querySelector('#dian-note-description') as HTMLInputElement)?.value.trim();
        const baseAmount = Number((popup?.querySelector('#dian-note-base') as HTMLInputElement)?.value);
        const taxRate = Number((popup?.querySelector('#dian-note-tax') as HTMLSelectElement)?.value);
        if (!description) return Swal.showValidationMessage('Escribe por qué necesitas el ajuste');
        if (!Number.isFinite(baseAmount) || baseAmount <= 0) return Swal.showValidationMessage('Ingresa un valor mayor que cero');
        return { code, description, baseAmount, taxRate };
      },
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      const value = result.value as { code: string; description: string; baseAmount: number; taxRate: number };
      this.sendNote(document, noteType, value, {
        description: value.description,
        baseAmount: value.baseAmount,
        taxRate: value.taxRate,
      });
    });
  }

  private sendNote(
    document: DianDocument,
    noteType: 'credit' | 'debit',
    correction: { code: string; description: string },
    adjustment?: { description: string; baseAmount: number; taxRate: number },
  ): void {
    const issueDate = document.issueDate || this.dateOnly(document.createdAt);
    if (!document.orderId || !document.number || !document.cufe || !issueDate) {
      Swal.fire({ icon: 'error', title: 'Faltan datos fiscales', text: 'No se pudo identificar completamente la factura original.' });
      return;
    }
    Swal.fire({ title: 'Transmitiendo a la DIAN…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.integrationsService.createDianNote(noteType, {
      orderId: document.orderId,
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
