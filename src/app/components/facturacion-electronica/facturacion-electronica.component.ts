import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IntegrationsService } from '../integrations/integrations.service';
import { VentasService } from '../../shared/services/ventas/ventas.service';

type DianDocumentType = 'invoice' | 'creditNote' | 'debitNote';
type DianStatus = 'accepted' | 'rejected' | 'failed' | string;

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
  dianResponse?: any;
}

@Component({
  selector: 'app-facturacion-electronica',
  templateUrl: './facturacion-electronica.component.html',
  styleUrls: ['./facturacion-electronica.component.scss'],
})
export class FacturacionElectronicaComponent implements OnInit {
  activeTab: 'documents' | 'invoice' | 'guide' = 'documents';
  documents: DianDocument[] = [];
  pendingOrders: any[] = [];
  queuedOrders = new Set<string>();
  integration: any = null;
  loading = false;
  documentsError = '';
  ordersError = '';
  search = '';
  statusFilter = 'all';
  typeFilter = 'all';

  constructor(
    private integrationsService: IntegrationsService,
    private ventasService: VentasService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
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

  get setupProgress(): number {
    return [this.isConfigured, this.isProduction, this.hasAcceptedInvoice].filter(Boolean).length;
  }

  get commerceName(): string {
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      return company.nomComercial || company.nombreComercial || company.razonSocial || 'este comercio';
    } catch (_) {
      return 'este comercio';
    }
  }

  get nextTask(): { tone: 'warning' | 'danger' | 'success' | 'info'; icon: string; title: string; description: string; button: string } {
    if (!this.isConfigured) {
      return {
        tone: 'warning', icon: 'pi-cog', title: 'Primero: conecte este comercio con la DIAN',
        description: 'El asistente le pedirá los datos del comercio, el certificado y la numeración. Puede hacerlo acompañado de su contador.',
        button: 'Comenzar configuración',
      };
    }
    if (!this.isProduction) {
      return {
        tone: 'info', icon: 'pi-verified', title: 'Siguiente paso: terminar las pruebas de habilitación',
        description: 'La conexión está guardada, pero todavía está en pruebas. Complete el set de habilitación y luego cambie a Producción.',
        button: 'Continuar habilitación',
      };
    }
    if (this.rejectedCount > 0) {
      return {
        tone: 'danger', icon: 'pi-exclamation-triangle', title: `${this.rejectedCount} documento${this.rejectedCount === 1 ? '' : 's'} necesita${this.rejectedCount === 1 ? '' : 'n'} revisión`,
        description: 'Abra los documentos con inconvenientes, lea el mensaje y corrija el pedido antes de intentar nuevamente.',
        button: 'Revisar inconvenientes',
      };
    }
    if (this.pendingOrders.length > 0) {
      return {
        tone: 'warning', icon: 'pi-send', title: `${this.pendingOrders.length} pedido${this.pendingOrders.length === 1 ? '' : 's'} listo${this.pendingOrders.length === 1 ? '' : 's'} para facturar`,
        description: 'Revise el cliente, los productos y los impuestos. Después pulse Facturar; Katuq hará el envío a la DIAN.',
        button: 'Ver pedidos',
      };
    }
    return {
      tone: 'success', icon: 'pi-check-circle', title: 'Todo está al día',
      description: 'No hay pedidos recientes pendientes ni documentos con inconvenientes. Puede consultar o descargar lo emitido.',
      button: 'Ver documentos',
    };
  }

  get environmentLabel(): string {
    const environment = this.integration?.config?.environment;
    if (environment === 'produccion') return 'Producción';
    if (environment === 'habilitacion') return 'Pruebas';
    return 'Sin definir';
  }

  get acceptedCount(): number {
    return this.documents.filter((document) => document.status === 'accepted').length;
  }

  get rejectedCount(): number {
    return this.documents.filter((document) => document.status === 'rejected' || document.status === 'failed').length;
  }

  get notesCount(): number {
    return this.documents.filter((document) => document.type !== 'invoice').length;
  }

  get filteredDocuments(): DianDocument[] {
    const term = this.search.trim().toLowerCase();
    return this.documents.filter((document) => {
      const matchesStatus = this.statusFilter === 'all' || document.status === this.statusFilter;
      const matchesType = this.typeFilter === 'all' || document.type === this.typeFilter;
      const haystack = [
        document.number,
        document.orderId,
        document.reference?.number,
        document.cufe,
        document.cude,
        document.correction?.description,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && matchesType && (!term || haystack.includes(term));
    });
  }

  loadDashboard(): void {
    this.loading = true;
    this.documentsError = '';
    this.ordersError = '';

    const integration$ = this.integrationsService.getIntegration('dian').pipe(
      catchError(() => of(null)),
    );
    const documents$ = this.integrationsService.listDianDocuments(undefined, 200).pipe(
      catchError((error) => {
        this.documentsError = this.errorMessage(error, 'No fue posible cargar los documentos DIAN.');
        return of(null);
      }),
    );
    const orders$ = this.ventasService.getOrdersByFilterOptimized(
      { sortField: 'fechaCreacion', sortOrder: -1 },
      1,
      100,
      false,
    ).pipe(
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
        this.documents = Array.isArray(documentData?.invoices) ? documentData.invoices : [];
        const orderList = Array.isArray(orders?.orders) ? orders.orders : [];
        this.pendingOrders = orderList.filter((order: any) => this.isPendingInvoice(order));
      });
  }

  selectTab(tab: 'documents' | 'invoice' | 'guide'): void {
    this.activeTab = tab;
  }

  doNextTask(): void {
    if (!this.isConfigured || !this.isProduction) {
      this.goToConfiguration();
      return;
    }
    if (this.rejectedCount > 0) {
      this.statusFilter = 'rejected';
      this.typeFilter = 'all';
      this.search = '';
      this.activeTab = 'documents';
      return;
    }
    this.activeTab = this.pendingOrders.length > 0 ? 'invoice' : 'documents';
  }

  openGuide(): void {
    this.activeTab = 'guide';
  }

  showConcept(concept: 'invoice' | 'credit' | 'debit' | 'status'): void {
    const concepts = {
      invoice: {
        title: 'Factura electrónica',
        text: 'Es el documento de la venta. Katuq toma un pedido, genera la factura, la firma y la envía a la DIAN.',
      },
      credit: {
        title: 'Nota crédito',
        text: 'Se usa para disminuir el valor o anular una factura ya aceptada. No borra la factura original: deja registrada la corrección.',
      },
      debit: {
        title: 'Nota débito',
        text: 'Se usa para aumentar el valor de una factura ya aceptada, por ejemplo por intereses o un valor adicional.',
      },
      status: {
        title: 'Estados de la DIAN',
        text: 'Aceptada significa válida. Rechazada significa que la DIAN encontró algo por corregir. No enviada significa que Katuq no alcanzó a completar la transmisión.',
      },
    };
    const item = concepts[concept];
    Swal.fire({ icon: 'info', title: item.title, text: item.text, confirmButtonText: 'Entendido' });
  }

  goToConfiguration(): void {
    this.router.navigate(['/integrations/configure'], { queryParams: { provider: 'dian' } });
  }

  invoiceOrder(order: any): void {
    if (!this.isConfigured) {
      Swal.fire({
        icon: 'info',
        title: 'Primero active la conexión con la DIAN',
        text: 'Abra Configuración DIAN y complete el asistente del comercio.',
        confirmButtonText: 'Ir a configuración',
      }).then((result) => {
        if (result.isConfirmed) this.goToConfiguration();
      });
      return;
    }

    const orderId = this.orderId(order);
    if (!orderId) {
      Swal.fire({ icon: 'error', title: 'Pedido sin identificación', text: 'No fue posible identificar este pedido.' });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Enviar esta factura a la DIAN?',
      html: `<p>Pedido <strong>${this.escapeHtml(order.nroPedido || orderId)}</strong></p><p>Revise antes que el cliente, los productos y los impuestos estén correctos.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, facturar',
      cancelButtonText: 'Todavía no',
      confirmButtonColor: '#2f6fed',
    }).then((confirmation) => {
      if (!confirmation.isConfirmed) return;
      this.queuedOrders.add(orderId);
      this.integrationsService.createAccountingInvoiceAsync('dian', orderId).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Factura enviada a procesar',
            text: 'Katuq la firmará, la enviará a la DIAN y actualizará el pedido. Puede continuar trabajando.',
            confirmButtonText: 'Entendido',
          });
        },
        error: (error) => {
          this.queuedOrders.delete(orderId);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo iniciar la factura',
            text: this.errorMessage(error, 'Revise los datos del pedido e inténtelo nuevamente.'),
          });
        },
      });
    });
  }

  checkStatus(document: DianDocument): void {
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
        text: this.errorMessage(error, 'Inténtelo nuevamente.'),
      }),
    });
  }

  download(document: DianDocument, kind: 'xml' | 'pdf' | 'applicationResponse' | 'attachedDocument'): void {
    if (!document.number) return;
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
      title: '¿Qué necesita corregir?',
      input: 'select',
      inputOptions: {
        credit_adjust: 'Disminuir un valor (nota crédito)',
        debit: 'Aumentar un valor (nota débito)',
        credit_full: 'Anular toda la factura (nota crédito)',
      },
      inputPlaceholder: 'Seleccione una opción',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => value ? null : 'Seleccione lo que necesita hacer',
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

  statusLabel(status: DianStatus): string {
    if (status === 'accepted') return 'Aceptada';
    if (status === 'rejected') return 'Rechazada';
    if (status === 'failed') return 'No enviada';
    return status || 'Desconocido';
  }

  statusClass(status: DianStatus): string {
    if (status === 'accepted') return 'status status--accepted';
    if (status === 'rejected' || status === 'failed') return 'status status--error';
    return 'status status--pending';
  }

  documentDate(document: DianDocument): Date | null {
    if (document.issueDate) return new Date(`${document.issueDate}T12:00:00`);
    return this.asDate(document.createdAt);
  }

  orderDate(order: any): Date | null {
    return this.asDate(order?.fechaCreacion || order?.createdAt || order?.fecha);
  }

  orderCustomer(order: any): string {
    return order?.cliente?.nombres_completos
      || order?.cliente?.nombre
      || order?.datosFacturacion?.nombres_completos
      || 'Cliente sin nombre';
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
    return this.orderId(order) || order?.nroPedido || String(index);
  }

  private confirmFullCreditNote(document: DianDocument): void {
    if (this.hasAcceptedCreditNote(document)) {
      Swal.fire({ icon: 'info', title: 'Esta factura ya tiene nota crédito', text: 'Revise la nota en la bandeja antes de generar otra corrección.' });
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
          <label for="dian-note-description">Explique el ajuste</label>
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
        if (!description) return Swal.showValidationMessage('Escriba por qué necesita el ajuste');
        if (!Number.isFinite(baseAmount) || baseAmount <= 0) return Swal.showValidationMessage('Ingrese un valor mayor que cero');
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
        text: this.errorMessage(error, 'Revise los datos e inténtelo nuevamente.'),
      }),
    });
  }

  private isPendingInvoice(order: any): boolean {
    if (!order || order.nroFactura) return false;
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
