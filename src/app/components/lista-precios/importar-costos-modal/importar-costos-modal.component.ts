import { Component, ViewChild, ElementRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  ProductCostsService,
  CostPreviewResponse,
  PrindelExcelRow,
} from 'src/app/shared/services/lista-precios/product-costs.service';

type Step = 'upload' | 'preview' | 'applying' | 'done';
type CostImportSource = 'prindel-excel' | 'costos-excel';

@Component({
  selector: 'app-importar-costos-modal',
  templateUrl: './importar-costos-modal.component.html',
  styleUrls: ['./importar-costos-modal.component.scss'],
})
export class ImportarCostosModalComponent {
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  step: Step = 'upload';

  fileName = '';
  parsedRows: PrindelExcelRow[] = [];
  parsedAlerts: any[] = [];
  parseErrors: string[] = [];
  filasIgnoradas = 0;
  detectedSource: CostImportSource = 'costos-excel';

  preview: CostPreviewResponse | null = null;
  applyResult: { processed: number; failed: number; errors: any[]; message: string } | null = null;

  dragOver = false;

  constructor(
    public activeModal: NgbActiveModal,
    private costsService: ProductCostsService,
  ) {}

  // ── Drag and drop ──
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  triggerFileInput() {
    this.fileInput?.nativeElement?.click();
  }

  // ── Parsing ──
  private handleFile(file: File) {
    this.fileName = file.name;
    this.parseErrors = [];
    this.parsedRows = [];
    this.parsedAlerts = [];
    this.filasIgnoradas = 0;
    this.detectedSource = 'costos-excel';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        this.extractRows(wb);
        this.extractAlerts(wb);
        if (this.parsedRows.length === 0) {
          this.parseErrors.push('No se encontraron filas válidas. Usa columnas "REFERENCIA", "COSTO" y opcionalmente "FECHA_VIGENCIA".');
        }
      } catch (err: any) {
        this.parseErrors.push(`Error leyendo Excel: ${err?.message || err}`);
      }
    };
    reader.onerror = () => this.parseErrors.push('No se pudo leer el archivo.');
    reader.readAsArrayBuffer(file);
  }

  private extractRows(wb: XLSX.WorkBook) {
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('inventario')) || wb.SheetNames[0];
    if (!sheetName) {
      this.parseErrors.push('No se encontró ninguna hoja en el Excel.');
      return;
    }
    this.detectedSource = sheetName.toLowerCase().includes('inventario') ? 'prindel-excel' : 'costos-excel';
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: null });

    for (const row of json) {
      const codigo = (this.getCell(row, ['REFERENCIA', 'Referencia', 'reference', 'ref', 'SKU', 'Código', 'Codigo']) || '').toString().trim();
      if (!codigo || codigo.toUpperCase() === 'TOTAL') {
        this.filasIgnoradas++;
        continue;
      }

      const costoUnitario = this.parseNumber(this.getCell(row, ['COSTO', 'Costo', 'Costo unitario', 'Costo Unitario', 'costoUnitario']));
      if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) {
        this.filasIgnoradas++;
        continue;
      }

      this.parsedRows.push({
        codigo,
        nombre: (this.getCell(row, ['Nombre', 'PRODUCTO', 'Producto', 'Descripción', 'Descripcion']) || '').toString().trim() || undefined,
        costoUnitario,
        fechaVigencia: this.parseDateCell(this.getCell(row, ['FECHA_VIGENCIA', 'Fecha Vigencia', 'fechaVigencia', 'Vigencia'])),
        stocks: {
          BOGOTA: this.numOrZero(this.getCell(row, ['BOGOTA'])),
          BUCARAMANGA: this.numOrZero(this.getCell(row, ['BUCARAMANGA'])),
          CALI: this.numOrZero(this.getCell(row, ['CALI'])),
          MEDELLIN: this.numOrZero(this.getCell(row, ['MEDELLIN'])),
          PEREIRA: this.numOrZero(this.getCell(row, ['PEREIRA'])),
          Principal: this.numOrZero(this.getCell(row, ['Principal'])),
          total: this.numOrZero(this.getCell(row, ['Total existencias', 'TOTAL', 'Total'])),
        },
        precios: {
          mayorista: this.numOrUndef(this.getCell(row, ['P. Mayorista'])),
          modelo: this.numOrUndef(this.getCell(row, ['P. Modelo'])),
          publico: this.numOrUndef(this.getCell(row, ['P. Público', 'P. Publico'])),
        },
      });
    }
  }

  private extractAlerts(wb: XLSX.WorkBook) {
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('alerta'));
    if (!sheetName) return;
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
    for (const row of json) {
      const tipo = (row['Tipo'] || '').toString().trim();
      if (!tipo) continue;
      this.parsedAlerts.push({
        tipo,
        codigo: (row['Código'] || row['Codigo'] || '').toString().trim(),
        descripcion: (row['Descripción'] || row['Descripcion'] || '').toString().trim(),
        accionSugerida: (row['Acción sugerida'] || row['Accion sugerida'] || '').toString().trim(),
      });
    }
  }

  private numOrZero(v: any): number {
    const n = this.parseNumber(v);
    return Number.isFinite(n) ? n : 0;
  }

  private numOrUndef(v: any): number | undefined {
    const n = this.parseNumber(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private getCell(row: any, aliases: string[]): any {
    const entries = Object.entries(row || {});
    for (const alias of aliases) {
      const found = entries.find(([key]) => this.normalizeHeader(key) === this.normalizeHeader(alias));
      if (found) return found[1];
    }
    return undefined;
  }

  private normalizeHeader(value: string): string {
    return (value || '').toString().trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    const raw = (value ?? '').toString().trim();
    if (!raw) return NaN;
    const sanitized = raw
      .replace(/\s/g, '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    return Number(sanitized);
  }

  private parseDateCell(value: any): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const month = String(parsed.m).padStart(2, '0');
        const day = String(parsed.d).padStart(2, '0');
        return `${parsed.y}-${month}-${day}`;
      }
    }
    return value.toString().trim() || undefined;
  }

  // ── Acciones ──
  generarPreview() {
    if (this.parsedRows.length === 0) {
      Swal.fire('Sin datos', 'Sube un archivo Excel válido primero.', 'warning');
      return;
    }

    // Adjuntar alertas detectadas al row correspondiente (si hay match por código).
    const alertsByCode = new Map<string, any>();
    for (const a of this.parsedAlerts) {
      if (a.codigo) alertsByCode.set(a.codigo.toUpperCase(), a);
    }
    const rows = this.parsedRows.map((r) => {
      const a = alertsByCode.get(r.codigo.toUpperCase());
      return a ? { ...r, alerta: { tipo: a.tipo, descripcion: a.descripcion, accionSugerida: a.accionSugerida } } : r;
    });

    // Detectar typos: si Alertas mapea X→Y, generar alias.
    const codeAliases: { [from: string]: string } = {};
    for (const a of this.parsedAlerts) {
      const m = /([A-Z0-9]{4,})/g.exec(a.descripcion || '');
      // Heurística simple: si la alerta menciona explícitamente un "código que existe" se podría inferir.
      // Por ahora no aplicar alias automáticos — dejarlo manual del usuario en v2.
      if (a.tipo?.toLowerCase().includes('typo') && a.codigo && a.accionSugerida) {
        const aliasMatch = /([A-Z]{3}\d{3,})/.exec(a.accionSugerida);
        if (aliasMatch) codeAliases[a.codigo] = aliasMatch[1];
      }
    }

    Swal.fire({ title: 'Generando preview...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    this.costsService.previewImport({
      fileName: this.fileName,
      fuente: this.detectedSource,
      rows,
      codeAliases,
    }).subscribe({
      next: (res) => {
        Swal.close();
        this.preview = res;
        this.step = 'preview';
      },
      error: (err) => {
        Swal.close();
        Swal.fire('Error', err?.error?.error || err?.message || 'Error generando preview', 'error');
      },
    });
  }

  confirmarAplicar() {
    if (!this.preview) return;
    if (this.preview.matched.length === 0) {
      Swal.fire('Nada que aplicar', 'No hay productos con cambios de costo para aplicar.', 'info');
      return;
    }

    Swal.fire({
      title: '¿Confirmar aplicación?',
      html: `Se actualizarán <b>${this.preview.matched.length}</b> productos con un delta total de <b>$${(this.preview.summary.deltaTotal || 0).toLocaleString('es-CO')}</b>. Esta acción crea audit trail pero modifica costos en vivo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d9534f',
    }).then((r) => {
      if (r.isConfirmed) this.aplicar();
    });
  }

  private aplicar() {
    if (!this.preview) return;
    this.step = 'applying';

    Swal.fire({ title: 'Aplicando cambios...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    this.costsService.applyImport({
      importId: this.preview.previewId,
      fileName: this.preview.fileName || this.fileName,
      fuente: this.preview.fuente || this.detectedSource,
      matched: this.preview.matched,
      summary: this.preview.summary,
      alerts: this.preview.alerts,
    }).subscribe({
      next: (res) => {
        Swal.close();
        this.applyResult = res;
        this.step = 'done';
      },
      error: (err) => {
        Swal.close();
        this.step = 'preview';
        Swal.fire('Error aplicando', err?.error?.error || err?.message || 'Error desconocido', 'error');
      },
    });
  }

  reiniciar() {
    this.step = 'upload';
    this.fileName = '';
    this.parsedRows = [];
    this.parsedAlerts = [];
    this.parseErrors = [];
    this.filasIgnoradas = 0;
    this.detectedSource = 'costos-excel';
    this.preview = null;
    this.applyResult = null;
  }

  cerrar(resultado: 'cancelled' | 'applied' = 'cancelled') {
    this.activeModal.close({
      result: resultado,
      importId: this.applyResult ? this.preview?.previewId : null,
      processed: this.applyResult?.processed || 0,
    });
  }

  formatCOP(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return '$0';
    return `$${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  }
}
