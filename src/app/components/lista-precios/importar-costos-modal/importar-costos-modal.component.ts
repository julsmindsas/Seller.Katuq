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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        this.extractRows(wb);
        this.extractAlerts(wb);
        if (this.parsedRows.length === 0) {
          this.parseErrors.push('No se encontraron filas válidas en la hoja "Inventario y Precios".');
        }
      } catch (err: any) {
        this.parseErrors.push(`Error leyendo Excel: ${err?.message || err}`);
      }
    };
    reader.onerror = () => this.parseErrors.push('No se pudo leer el archivo.');
    reader.readAsArrayBuffer(file);
  }

  private extractRows(wb: XLSX.WorkBook) {
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('inventario'));
    if (!sheetName) {
      this.parseErrors.push('No se encontró la hoja "Inventario y Precios".');
      return;
    }
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: null });

    for (const row of json) {
      const codigo = (row['Código'] || row['Codigo'] || '').toString().trim();
      if (!codigo || codigo.toUpperCase() === 'TOTAL') continue;

      const costoUnitario = Number(row['Costo unitario'] || row['Costo Unitario'] || 0);
      if (!Number.isFinite(costoUnitario)) continue;

      this.parsedRows.push({
        codigo,
        nombre: (row['Nombre'] || '').toString().trim() || undefined,
        costoUnitario,
        stocks: {
          BOGOTA: this.numOrZero(row['BOGOTA']),
          BUCARAMANGA: this.numOrZero(row['BUCARAMANGA']),
          CALI: this.numOrZero(row['CALI']),
          MEDELLIN: this.numOrZero(row['MEDELLIN']),
          PEREIRA: this.numOrZero(row['PEREIRA']),
          Principal: this.numOrZero(row['Principal']),
          total: this.numOrZero(row['Total existencias']),
        },
        precios: {
          mayorista: this.numOrUndef(row['P. Mayorista']),
          modelo: this.numOrUndef(row['P. Modelo']),
          publico: this.numOrUndef(row['P. Público'] || row['P. Publico']),
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
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private numOrUndef(v: any): number | undefined {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
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
      fuente: 'prindel-excel',
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
      fuente: 'prindel-excel',
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
