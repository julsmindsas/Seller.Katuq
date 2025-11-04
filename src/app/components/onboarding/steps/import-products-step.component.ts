import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import { ColumnMappingService } from '../services/column-mapping.service';
import {
  ColumnMappingResult,
  ColumnMappingRequest,
  getConfidenceSeverity,
  getConfidenceIcon
} from '../models/column-mapping.model';
import { MobileFileUploadComponent } from '../components/mobile-file-upload/mobile-file-upload.component';
import { MappingField } from '../components/column-mapping-card/column-mapping-card.component';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  importedProducts?: any[];
}

@Component({
  selector: 'app-import-products-step',
  templateUrl: './import-products-step.component.html',
  styleUrls: ['./import-products-step.component.scss']
})
export class ImportProductsStepComponent implements OnInit, OnDestroy {
  @ViewChild(MobileFileUploadComponent) mobileFileUpload: MobileFileUploadComponent;

  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;
  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  isUploading = false;
  uploadedFile: File | null = null;
  importResult: ImportResult | null = null;
  previewData: any[] = [];
  showPreview = false;

  // KAI Integration
  isAnalyzingColumns = false;
  parsedData: any[] = [];
  sourceColumns: string[] = [];
  mappingResult: ColumnMappingResult | null = null;
  confirmedMappings: { [katuqField: string]: string } = {};
  showMappingPreview = false;

  // Mobile: Mapping Fields for Cards
  mappingFields: MappingField[] = [];
  availableColumns: { label: string; value: string }[] = [];

  acceptedFormats = '.xlsx,.xls,.json';
  maxFileSize = 10000000; // 10MB para productos (pueden tener imágenes)

  // Template columns for Excel/JSON
  templateColumns = [
    { field: 'referencia', header: 'Referencia/SKU', required: true, example: 'PROD001' },
    { field: 'titulo', header: 'Título', required: true, example: 'Camiseta Básica' },
    { field: 'descripcion', header: 'Descripción', required: true, example: 'Camiseta de algodón...' },
    { field: 'precioUnitarioSinIva', header: 'Precio Sin IVA', required: true, example: '25000' },
    { field: 'valorIva', header: 'IVA %', required: true, example: '19' },
    { field: 'cantidadDisponible', header: 'Cantidad Disponible', required: true, example: '100' },
    { field: 'marca', header: 'Marca', required: false, example: 'Mi Marca' },
    { field: 'codigoBarras', header: 'Código de Barras', required: false, example: '7501234567890' },
    { field: 'pesoKg', header: 'Peso (kg)', required: false, example: '0.5' },
    { field: 'categoria', header: 'Categoría', required: false, example: 'Ropa' }
  ];

  constructor(
    private messageService: MessageService,
    private http: HttpClient,
    private columnMappingService: ColumnMappingService
  ) {}

  ngOnInit(): void {
    // Si ya hay datos importados previamente, marcar como completo
    if (this.initialData?.data) {
      this.importResult = this.initialData.data;
      setTimeout(() => {
        this.stepComplete.emit({ data: this.importResult });
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Maneja la selección de archivo (desde mobile-file-upload)
   */
  onMobileFileSelected(file: File): void {
    this.onFileSelect({ files: [file] });
  }

  /**
   * Maneja la selección de archivo
   */
  onFileSelect(event: any): void {
    const file = event.files[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > this.maxFileSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: `El archivo no debe superar ${this.maxFileSize / 1000000}MB`
      });
      return;
    }

    this.uploadedFile = file;
    this.previewFile(file);
  }

  /**
   * Previsualiza el contenido del archivo y llama a KAI para mapeo inteligente
   */
  private async previewFile(file: File): Promise<void> {
    const reader = new FileReader();

    reader.onload = async (e: any) => {
      try {
        let data: any[] = [];

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(e.target.result);
          data = Array.isArray(jsonData) ? jsonData : [jsonData];
        } else {
          // Parsear Excel
          const arrayBuffer = e.target.result;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet);
        }

        if (data.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo vacío',
            detail: 'El archivo no contiene datos'
          });
          return;
        }

        // Guardar datos parseados
        this.parsedData = data;
        this.sourceColumns = this.columnMappingService.extractColumns(data);
        this.previewData = data.slice(0, 5);
        this.showPreview = true;

        // Llamar a KAI para análisis de columnas
        await this.analyzeColumnsWithKAI();

      } catch (error) {
        console.error('Error previewing file:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo leer el archivo'
        });
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  /**
   * Analiza las columnas usando el agente KAI
   */
  private async analyzeColumnsWithKAI(): Promise<void> {
    this.isAnalyzingColumns = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const sampleRows = this.columnMappingService.getSampleRows(this.parsedData, 3);

      const request: ColumnMappingRequest = {
        type: 'product',
        sourceColumns: this.sourceColumns,
        sampleRows: sampleRows,
        companyId: company.cd || company._id
      };

      this.mappingResult = await this.columnMappingService
        .suggestColumnMapping(request, company.nomComercial || company.nombre)
        .toPromise() || null;

      this.showMappingPreview = true;

      // Convert mappings to mobile-friendly card format
      this.prepareMappingFields();

      this.messageService.add({
        severity: 'success',
        summary: 'Análisis Completado',
        detail: `KAI analizó ${this.sourceColumns.length} columnas y sugirió ${Object.keys(this.mappingResult?.mappings || {}).length} mapeos`
      });

    } catch (error: any) {
      console.error('Error analyzing columns with KAI:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Análisis',
        detail: error?.error?.message || 'No se pudo analizar el archivo con KAI'
      });
    } finally {
      this.isAnalyzingColumns = false;
    }
  }

  /**
   * Prepara los campos de mapeo para las tarjetas móviles
   */
  private prepareMappingFields(): void {
    if (!this.mappingResult) return;

    this.availableColumns = this.sourceColumns.map(col => ({
      label: col,
      value: col
    }));

    this.mappingFields = Object.entries(this.mappingResult.mappings || {}).map(([katuqField, mapping]) => ({
      katuqField,
      katuqLabel: this.getFieldLabel(katuqField),
      sourceColumn: mapping.sourceColumn,
      confidence: mapping.confidence,
      reasoning: mapping.reasoning,
      isRequired: !this.mappingResult!.unmappedRequired.includes(katuqField),
      isManuallyAdjusted: false,
      severity: getConfidenceSeverity(mapping.confidence),
      icon: getConfidenceIcon(mapping.confidence)
    }));

    // Sort by required first, then by confidence
    this.mappingFields.sort((a, b) => {
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Maneja cambios de mapeo desde las tarjetas móviles
   */
  onCardMappingChanged(event: { katuqField: string; sourceColumn: string }): void {
    const field = this.mappingFields.find(f => f.katuqField === event.katuqField);
    if (field) {
      field.sourceColumn = event.sourceColumn;
      field.isManuallyAdjusted = true;
      field.confidence = 100;
      field.severity = 'success';
      field.icon = 'pi-check-circle';
      field.reasoning = 'Mapeo ajustado manualmente';
    }

    // Update confirmed mappings
    this.updateConfirmedMappings();
  }

  /**
   * Actualiza los mapeos confirmados desde las tarjetas
   */
  private updateConfirmedMappings(): void {
    this.confirmedMappings = {};
    this.mappingFields.forEach(field => {
      this.confirmedMappings[field.katuqField] = field.sourceColumn;
    });
  }

  /**
   * Confirma todos los mapeos actuales
   */
  confirmAllMappings(): void {
    this.updateConfirmedMappings();
    this.messageService.add({
      severity: 'success',
      summary: 'Mapeo Confirmado',
      detail: 'Los mapeos han sido confirmados. Ahora puedes importar los productos.'
    });
  }

  /**
   * Maneja los ajustes manuales del mapeo (legacy - para compatibilidad con tabla)
   */
  onMappingsAdjusted(adjustedMappings: { [katuqField: string]: string }): void {
    this.confirmedMappings = adjustedMappings;
  }

  /**
   * Maneja la confirmación del mapeo
   */
  onMappingsConfirmed(finalMappings: { [katuqField: string]: string }): void {
    this.confirmedMappings = finalMappings;
    this.messageService.add({
      severity: 'info',
      summary: 'Mapeo Confirmado',
      detail: 'Ahora puedes importar los productos con el mapeo confirmado'
    });
  }

  /**
   * Importa los productos
   */
  async importProducts(): Promise<void> {
    if (!this.uploadedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin archivo',
        detail: 'Por favor selecciona un archivo para importar'
      });
      return;
    }

    if (!this.confirmedMappings || Object.keys(this.confirmedMappings).length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mapeo no confirmado',
        detail: 'Por favor confirma el mapeo de columnas antes de importar'
      });
      return;
    }

    this.isUploading = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = company.cd || company._id || company.nit;

      // Transformar datos usando el mapeo confirmado
      const transformedData = this.transformDataWithMapping(this.parsedData, this.confirmedMappings);

      const payload = {
        products: transformedData,
        companyId: companyId,
        mappings: this.confirmedMappings
      };

      // Agregar header company explícitamente para onboarding
      const headers = new HttpHeaders({
        'company': companyId
      });

      const response = await this.http.post<ImportResult>(
        `${environment.urlApi}/v1/onboarding/import-products`,
        payload,
        { headers }
      ).toPromise();

      this.importResult = response || { success: 0, failed: 0, errors: [] };

      this.messageService.add({
        severity: 'success',
        summary: 'Importación Completada',
        detail: `${this.importResult.success} productos importados correctamente${this.importResult.failed > 0 ? `, ${this.importResult.failed} fallidos` : ''}`
      });

      this.dataChange.emit({ data: this.importResult });
      this.stepComplete.emit({ data: this.importResult });

    } catch (error: any) {
      console.error('Error importing products:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Importación',
        detail: error?.error?.message || 'No se pudieron importar los productos'
      });
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Transforma los datos usando el mapeo confirmado
   */
  private transformDataWithMapping(data: any[], mappings: { [katuqField: string]: string }): any[] {
    return data.map(row => {
      const transformedRow: any = {};

      // Aplicar mapeos
      Object.entries(mappings).forEach(([katuqField, sourceColumn]) => {
        const value = row[sourceColumn];

        // Manejar campos nested (ej: "identificacion.referencia", "precio.precioUnitarioSinIva")
        if (katuqField.includes('.')) {
          const parts = katuqField.split('.');
          let current = transformedRow;

          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }

          current[parts[parts.length - 1]] = value;
        } else {
          transformedRow[katuqField] = value;
        }
      });

      return transformedRow;
    });
  }

  /**
   * Descarga plantilla Excel
   */
  downloadTemplate(): void {
    // Crear CSV con las columnas de ejemplo
    const headers = this.templateColumns.map(col => col.header).join(',');
    const example = this.templateColumns.map(col => col.example).join(',');
    const csvContent = `${headers}\n${example}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_productos_katuq.csv';
    link.click();

    this.messageService.add({
      severity: 'success',
      summary: 'Plantilla Descargada',
      detail: 'Completa la plantilla con tus productos y súbela para importar'
    });
  }

  /**
   * Omite este paso
   */
  skipStep(): void {
    this.stepComplete.emit({ data: { skipped: true } });
    this.messageService.add({
      severity: 'info',
      summary: 'Paso Omitido',
      detail: 'Podrás importar productos más tarde desde el módulo de inventarios'
    });
  }

  /**
   * Limpia el archivo seleccionado
   */
  clearFile(): void {
    this.uploadedFile = null;
    this.previewData = [];
    this.showPreview = false;
    this.importResult = null;
    this.parsedData = [];
    this.sourceColumns = [];
    this.mappingResult = null;
    this.confirmedMappings = {};
    this.showMappingPreview = false;
    this.mappingFields = [];
    this.availableColumns = [];
  }

  /**
   * Gets field label for display
   */
  private getFieldLabel(katuqField: string): string {
    const productLabels: { [key: string]: string } = {
      'identificacion.referencia': 'Referencia/SKU',
      'titulo': 'Título del Producto',
      'descripcion': 'Descripción',
      'precio.precioUnitarioSinIva': 'Precio Sin IVA',
      'precio.valorIva': '% IVA',
      'stock.cantidadDisponible': 'Stock Disponible',
      'caracteristicas.marca': 'Marca',
      'caracteristicas.categoria': 'Categoría',
      'caracteristicas.codigoBarras': 'Código de Barras',
      'dimensiones.pesoKg': 'Peso (kg)',
      'dimensiones.alto': 'Alto (cm)',
      'dimensiones.ancho': 'Ancho (cm)',
      'dimensiones.largo': 'Largo (cm)',
      'precio.precioUnitarioConIva': 'Precio Con IVA',
      'stock.cantidadMinima': 'Stock Mínimo',
      'stock.cantidadMaxima': 'Stock Máximo'
    };
    return productLabels[katuqField] || katuqField;
  }

  /**
   * Gets summary counts for mobile sticky footer
   */
  getMappedCount(): number {
    return this.mappingFields.filter(f => f.sourceColumn).length;
  }

  getRequiredCount(): number {
    return this.mappingFields.filter(f => f.isRequired).length;
  }

  getMappedRequiredCount(): number {
    return this.mappingFields.filter(f => f.isRequired && f.sourceColumn).length;
  }

  getAdjustedCount(): number {
    return this.mappingFields.filter(f => f.isManuallyAdjusted).length;
  }

  hasUnmappedRequired(): boolean {
    return this.getMappedRequiredCount() < this.getRequiredCount();
  }

  /**
   * Verifica si se puede importar
   */
  canImport(): boolean {
    return !!this.uploadedFile &&
           Object.keys(this.confirmedMappings).length > 0 &&
           !this.isUploading &&
           !this.isAnalyzingColumns;
  }
}
