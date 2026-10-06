import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  CarteraCliente,
  CarteraPedido,
  CarteraResponse,
} from '../../../../shared/services/cartera/cartera.models';
import {
  AGING_BUCKETS,
  ANTIGUEDAD_OPTIONS,
  AntiguedadFiltro,
  metaPago,
  ORDEN_OPTIONS,
  OrdenCartera,
  PagoBadgeMeta,
  RANGO_ANTIGUEDAD_LABEL,
  rangoAntiguedad,
  RISK_OPTIONS,
  RiskFilter,
} from '../../cartera.constants';

/** Una fila de la descarga: un pedido con saldo (ticket 1130). */
interface FilaCartera {
  cliente: string;
  documento: string;
  vendedor: string;
  plazo: string;
  pedido: string;
  entrega: string;
  limite: string;
  total: number;
  pagado: number;
  saldo: number;
  diasVencido: number;
  antiguedad: string;
}

/** Un segmento de la mini-barra de aging de un cliente. */
interface AgingSegment {
  cssClass: string;
  pct: number;
  label: string;
  monto: number;
}

/** Entrada de la leyenda de antigüedad (los 4 rangos, con o sin monto). */
interface AgingLegendItem {
  cssClass: string;
  short: string;
  monto: number;
}

/** Etiqueta de riesgo derivada de los datos que ya trae el cliente. */
interface RiesgoMeta {
  label: string;
  cssClass: string;
}

/**
 * Spec 014 — CxC. Tab "Cartera por Cliente" (CA-09 / CA-11).
 * Recibe la respuesta agregada por @Input y filtra client-side (búsqueda,
 * riesgo, vendedor y, desde el ticket 1130, antigüedad por pedido). Cada card
 * muestra saldo, semáforo de cupo, mini-barra de aging y DSO; al hacer click
 * expande el detalle de pedidos con saldo. Lo que se ve se puede ordenar y
 * descargar en Excel o PDF.
 */
@Component({
  selector: 'app-cartera-clientes',
  templateUrl: './cartera-clientes.component.html',
  styleUrls: ['./cartera-clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraClientesComponent implements OnChanges {
  @Input() data: CarteraResponse | null = null;

  readonly riskOptions = RISK_OPTIONS;
  readonly agingBuckets = AGING_BUCKETS;
  readonly antiguedadOptions = ANTIGUEDAD_OPTIONS;
  readonly ordenOptions = ORDEN_OPTIONS;

  // Filtros (client-side)
  searchTerm = '';
  riskFilter: RiskFilter = 'todos';
  vendorFilter = '';
  vendorOptions: string[] = [];
  antiguedadFilter: AntiguedadFiltro = 'todas';
  orden: OrdenCartera = 'saldo';

  clientes: CarteraCliente[] = [];
  filtered: CarteraCliente[] = [];

  /** Saldo de lo que se ve con los filtros (todos los clientes de la lista). */
  totalVisible = 0;
  generandoPdf = false;

  /** Pedidos de cada cliente que entran en el rango de antigüedad elegido. */
  private pedidosEnRango = new Map<string, CarteraPedido[]>();

  /** Documento del cliente cuyo detalle está expandido (null = ninguno). */
  expandedDoc: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.clientes = this.data?.clientes || [];
      this.vendorOptions = this.buildVendorOptions(this.clientes);
      this.expandedDoc = null;
      this.applyFilters();
    }
  }

  private buildVendorOptions(clientes: CarteraCliente[]): string[] {
    const set = new Set<string>();
    clientes.forEach((c) => {
      const v = (c.vendedor || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.pedidosEnRango = new Map();
    const filtrados = this.clientes.filter((c) => {
      if (term) {
        const nombre = (c.nombre || '').toLowerCase();
        const doc = (c.documento || '').toLowerCase();
        if (!nombre.includes(term) && !doc.includes(term)) return false;
      }
      switch (this.riskFilter) {
        case 'vencida':
          if (!(c.vencido > 0)) return false;
          break;
        case 'cupo80':
          if (c.cupoUsadoPct == null || c.cupoUsadoPct <= 80) return false;
          break;
        case 'excede':
          if (!c.excedeCupo) return false;
          break;
      }
      if (this.vendorFilter && (c.vendedor || '') !== this.vendorFilter) return false;
      // Antigüedad (ticket 1130): el cliente entra si tiene pedidos con saldo en ese rango.
      if (this.antiguedadFilter !== 'todas') {
        const enRango = (c.pedidos || []).filter(
          (p) => rangoAntiguedad(p.diasVencido) === this.antiguedadFilter,
        );
        if (enRango.length === 0) return false;
        this.pedidosEnRango.set(this.claveCliente(c), enRango);
      }
      return true;
    });
    this.filtered = this.ordenar(filtrados);
    this.totalVisible = this.filtered.reduce((suma, c) => suma + this.saldoVisible(c), 0);
  }

  // ── Antigüedad y orden (ticket 1130) ──────────────────────────────────────
  /** Pedidos del cliente que se muestran: todos, o solo los del rango elegido. */
  pedidosVisibles(cliente: CarteraCliente): CarteraPedido[] {
    if (this.antiguedadFilter === 'todas') return cliente.pedidos || [];
    return this.pedidosEnRango.get(this.claveCliente(cliente)) || [];
  }

  /** Saldo del cliente que se muestra: el total, o solo el del rango elegido. */
  saldoVisible(cliente: CarteraCliente): number {
    if (this.antiguedadFilter === 'todas') return Number(cliente.saldoPendiente) || 0;
    return this.pedidosVisibles(cliente).reduce((suma, p) => suma + (Number(p.saldo) || 0), 0);
  }

  private claveCliente(cliente: CarteraCliente): string {
    return cliente.documento || cliente.nombre || '';
  }

  private maxDiasVencido(cliente: CarteraCliente): number {
    return this.pedidosVisibles(cliente).reduce(
      (max, p) => Math.max(max, Number(p.diasVencido) || 0),
      Number.MIN_SAFE_INTEGER,
    );
  }

  private ordenar(lista: CarteraCliente[]): CarteraCliente[] {
    const copia = [...lista];
    switch (this.orden) {
      case 'nombre':
        return copia.sort((a, b) =>
          (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }),
        );
      case 'vencido':
        return copia.sort(
          (a, b) =>
            this.maxDiasVencido(b) - this.maxDiasVencido(a) ||
            this.saldoVisible(b) - this.saldoVisible(a),
        );
      default:
        return copia.sort((a, b) => this.saldoVisible(b) - this.saldoVisible(a));
    }
  }

  // ── Descargas (ticket 1130) ───────────────────────────────────────────────
  /** Una fila por pedido con saldo, en el mismo orden y con los mismos filtros de la pantalla. */
  private filasParaDescargar(): FilaCartera[] {
    const filas: FilaCartera[] = [];
    for (const c of this.filtered) {
      for (const p of this.pedidosVisibles(c)) {
        const dias = Number(p.diasVencido) || 0;
        filas.push({
          cliente: c.nombre || '',
          documento: c.documento || '',
          vendedor: c.vendedor || '',
          plazo: this.textoPlazo(c),
          pedido: p.nroPedido || '',
          entrega: this.fechaCorta(p.fechaEntrega),
          limite: this.fechaCorta(p.payDueDate),
          total: Number(p.total) || 0,
          pagado: Number(p.pagado) || 0,
          saldo: Number(p.saldo) || 0,
          diasVencido: dias > 0 ? dias : 0,
          antiguedad: RANGO_ANTIGUEDAD_LABEL[rangoAntiguedad(dias)],
        });
      }
    }
    return filas;
  }

  descargarExcel(): void {
    const filas = this.filasParaDescargar();
    if (!filas.length) return;
    const datos: { [columna: string]: string | number }[] = filas.map((f) => ({
      'Cliente': f.cliente,
      'Documento': f.documento,
      'Vendedor': f.vendedor,
      'Plazo': f.plazo,
      'Pedido': f.pedido,
      'Fecha de entrega': f.entrega,
      'Límite de pago': f.limite,
      'Total': f.total,
      'Pagado': f.pagado,
      'Saldo': f.saldo,
      'Días vencido': f.diasVencido,
      'Antigüedad': f.antiguedad,
    }));
    const suma = (campo: 'total' | 'pagado' | 'saldo') => filas.reduce((s, f) => s + f[campo], 0);
    datos.push({
      'Cliente': 'TOTAL',
      'Documento': '',
      'Vendedor': '',
      'Plazo': '',
      'Pedido': '',
      'Fecha de entrega': '',
      'Límite de pago': '',
      'Total': suma('total'),
      'Pagado': suma('pagado'),
      'Saldo': suma('saldo'),
      'Días vencido': '',
      'Antigüedad': '',
    });
    const hoja = XLSX.utils.json_to_sheet(datos);
    hoja['!cols'] = [34, 14, 22, 12, 14, 15, 15, 14, 14, 14, 12, 22].map((wch) => ({ wch }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Cartera');
    XLSX.writeFile(libro, `${this.nombreArchivo()}.xlsx`);
  }

  async descargarPdf(): Promise<void> {
    const filas = this.filasParaDescargar();
    if (!filas.length || this.generandoPdf) return;
    this.generandoPdf = true;
    this.cdr.markForCheck();
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const margen = 28;
      const dinero = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
      const suma = (campo: 'total' | 'pagado' | 'saldo') => filas.reduce((s, f) => s + f[campo], 0);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.setTextColor(42, 46, 60);
      pdf.text(`Cartera por cliente · ${this.nombreEmpresa()}`, margen, 36);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(82, 88, 107);
      pdf.text(`${this.descripcionFiltros()} · Generado el ${this.fechaCorta(new Date().toISOString())}`, margen, 52);

      autoTable(pdf, {
        head: [['Cliente', 'Documento', 'Vendedor', 'Plazo', 'Pedido', 'Entrega', 'Límite de pago',
          'Total', 'Pagado', 'Saldo', 'Días vencido', 'Antigüedad']],
        body: filas.map((f) => [f.cliente, f.documento, f.vendedor, f.plazo, f.pedido, f.entrega, f.limite,
          dinero(f.total), dinero(f.pagado), dinero(f.saldo), String(f.diasVencido), f.antiguedad]),
        foot: [['TOTAL', '', '', '', '', '', '', dinero(suma('total')), dinero(suma('pagado')),
          dinero(suma('saldo')), '', '']],
        showFoot: 'lastPage',
        startY: 64,
        margin: { left: margen, right: margen },
        styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak', textColor: [42, 46, 60] as any,
          lineColor: [236, 237, 243] as any, lineWidth: 0.3 },
        headStyles: { fillColor: [108, 76, 224] as any, textColor: [255, 255, 255] as any, fontStyle: 'bold' },
        footStyles: { fillColor: [238, 233, 253] as any, textColor: [42, 46, 60] as any, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 248, 252] as any },
        columnStyles: {
          7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'center' },
        },
      });
      pdf.save(`${this.nombreArchivo()}.pdf`);
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo generar el PDF', text: 'Intenta de nuevo en un momento.' });
    } finally {
      this.generandoPdf = false;
      this.cdr.markForCheck();
    }
  }

  /** Filtros activos en palabras, para el encabezado del PDF. */
  private descripcionFiltros(): string {
    const partes: string[] = [];
    if (this.antiguedadFilter !== 'todas') {
      partes.push(`Antigüedad: ${RANGO_ANTIGUEDAD_LABEL[this.antiguedadFilter]}`);
    }
    if (this.riskFilter !== 'todos') {
      const riesgo = this.riskOptions.find((o) => o.value === this.riskFilter);
      if (riesgo) partes.push(`Riesgo: ${riesgo.label}`);
    }
    if (this.vendorFilter) partes.push(`Vendedor: ${this.vendorFilter}`);
    if (this.searchTerm.trim()) partes.push(`Búsqueda: "${this.searchTerm.trim()}"`);
    return partes.length ? partes.join(' · ') : 'Toda la cartera';
  }

  private nombreEmpresa(): string {
    try {
      return JSON.parse(localStorage.getItem('currentCompany') || '{}').nomComercial || '';
    } catch {
      return '';
    }
  }

  private nombreArchivo(): string {
    const empresa = this.nombreEmpresa()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const fecha = new Date().toISOString().split('T')[0];
    return `Cartera_${empresa || 'empresa'}_${fecha}`;
  }

  /** "dd/mm/aaaa" de una fecha ISO; vacío si no hay fecha. */
  private fechaCorta(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  toggleExpand(cliente: CarteraCliente): void {
    this.expandedDoc = this.expandedDoc === cliente.documento ? null : cliente.documento;
  }

  isExpanded(cliente: CarteraCliente): boolean {
    return this.expandedDoc === cliente.documento;
  }

  // ── Semáforo de cupo ──────────────────────────────────────────────────────
  cupoClass(cliente: CarteraCliente): string {
    const pct = cliente.cupoUsadoPct;
    if (pct == null) return '';
    if (pct > 100) return 'is-danger';
    if (pct >= 80) return 'is-warning';
    return 'is-ok';
  }

  /** Ancho visual de la barra de cupo (clamp 0-100). */
  cupoWidth(cliente: CarteraCliente): number {
    const pct = cliente.cupoUsadoPct;
    if (pct == null) return 0;
    return Math.max(0, Math.min(100, pct));
  }

  // ── Identidad visual de la tarjeta ────────────────────────────────────────
  /** Colores de avatar (se elige uno estable a partir del documento). */
  private static readonly AVATAR_COLORS = [
    '#6C4CE0', '#2F6FE0', '#17994F', '#E0891B', '#D6455B', '#0E9BA4', '#8B5CF6',
  ];

  /** Inicial del nombre para el avatar. */
  initial(cliente: CarteraCliente): string {
    const nombre = (cliente.nombre || '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : '?';
  }

  /** Color de avatar estable por cliente (mismo documento → mismo color). */
  avatarColor(cliente: CarteraCliente): string {
    const key = cliente.documento || cliente.nombre || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const colors = CarteraClientesComponent.AVATAR_COLORS;
    return colors[hash % colors.length];
  }

  /**
   * Etiqueta de riesgo del cliente. NO agrega reglas nuevas: reordena en una
   * píldora lo que ya se calcula server-side (excede cupo, vencido, % de cupo).
   */
  riesgo(cliente: CarteraCliente): RiesgoMeta {
    if (cliente.excedeCupo) return { label: 'Excede cupo', cssClass: 'cx-risk-danger' };
    if ((cliente.vencido || 0) > 0) return { label: 'Vencida', cssClass: 'cx-risk-vencida' };
    if (cliente.cupoUsadoPct != null && cliente.cupoUsadoPct >= 80) {
      return { label: 'Cupo alto', cssClass: 'cx-risk-warning' };
    }
    return { label: 'Al día', cssClass: 'cx-risk-ok' };
  }

  // ── Mini-barra de aging ───────────────────────────────────────────────────
  /** Los 4 rangos con su monto, para la leyenda bajo la barra. */
  agingLegend(cliente: CarteraCliente): AgingLegendItem[] {
    return this.agingBuckets.map((b) => ({
      cssClass: b.cssClass,
      short: b.short,
      monto: cliente.aging?.[b.key] || 0,
    }));
  }

  agingSegments(cliente: CarteraCliente): AgingSegment[] {
    const total = cliente.saldoPendiente || 0;
    if (total <= 0) return [];
    return this.agingBuckets
      .map((b) => {
        const monto = cliente.aging?.[b.key] || 0;
        return { cssClass: b.cssClass, pct: (monto / total) * 100, label: b.label, monto };
      })
      .filter((s) => s.monto > 0);
  }

  // ── Plazo y vencimiento (ticket 1129) ─────────────────────────────────────
  /** El plazo de pago que se le puso al cliente al crearlo o editarlo. */
  textoPlazo(cliente: CarteraCliente): string {
    const dias = Number(cliente.payTermDays) || 0;
    if (dias <= 0) return 'Contado';
    return `Plazo ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  /** Cuánto le falta al pedido para vencer, o cuántos días lleva vencido. */
  textoVencimiento(pedido: CarteraPedido): string {
    const dias = Number(pedido.diasVencido);
    if (!pedido.payDueDate || !Number.isFinite(dias)) return '—';
    if (dias < 0) return `vence en ${-dias} d`;
    if (dias === 0) return 'vence hoy';
    return `${dias} d vencido`;
  }

  // ── Detalle de pedidos ────────────────────────────────────────────────────
  metaPago(estado: string): PagoBadgeMeta {
    return metaPago(estado);
  }

  trackByDoc(_index: number, cliente: CarteraCliente): string {
    return cliente.documento || `row-${_index}`;
  }

  trackByPedido(_index: number, pedido: { orderId?: string; nroPedido?: string }): string {
    return pedido.orderId || pedido.nroPedido || `p-${_index}`;
  }
}
