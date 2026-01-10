import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import { ColumnMappingService } from '../../../shared/services/import/column-mapping.service';
import {
  ColumnMappingResult,
  ColumnMappingRequest,
  ImportResult,
  MappingField,
  getConfidenceSeverity,
  getConfidenceIcon
} from '../../../shared/models/column-mapping.model';
import { MobileFileUploadComponent } from '../../../shared/components/import-components/mobile-file-upload/mobile-file-upload.component';

@Component({
  selector: 'app-import-customers-step',
  templateUrl: './import-customers-step.component.html',
  styleUrls: ['./import-customers-step.component.scss']
})
export class ImportCustomersStepComponent implements OnInit, OnDestroy {
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
  maxFileSize = 5000000; // 5MB

  // Template columns for Excel/JSON
  templateColumns = [
    { field: 'documento', header: 'Documento/NIT', required: true, example: '1234567890' },
    { field: 'nombres_completos', header: 'Nombres Completos', required: true, example: 'Juan Pérez' },
    { field: 'correo_electronico_comprador', header: 'Email', required: true, example: 'juan@example.com' },
    { field: 'numero_celular_comprador', header: 'Celular', required: true, example: '3001234567' },
    { field: 'tipo_documento_comprador', header: 'Tipo Documento', required: false, example: 'CC' },
    { field: 'ciudad', header: 'Ciudad', required: false, example: 'Bogotá' },
    { field: 'direccion', header: 'Dirección', required: false, example: 'Calle 123 #45-67' }
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
      const sampleRows = this.columnMappingService.getSampleRows(this.parsedData, 10);

      const request: ColumnMappingRequest = {
        type: 'customer',
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
      detail: 'Los mapeos han sido confirmados. Ahora puedes importar los clientes.'
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
      detail: 'Ahora puedes importar los clientes con el mapeo confirmado'
    });
  }

  /**
   * Importa los clientes usando el mapeo confirmado
   */
  async importCustomers(): Promise<void> {
    console.log('🚀 Iniciando importación de clientes...');
    console.log('📁 Archivo:', this.uploadedFile?.name);
    console.log('📊 Datos parseados:', this.parsedData?.length, 'filas');
    console.log('🗺️ Mappings confirmados:', this.confirmedMappings);
    console.log('🤖 Mappings KAI:', this.mappingResult?.mappings);

    if (!this.uploadedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin archivo',
        detail: 'Por favor selecciona un archivo para importar'
      });
      return;
    }

    // Si no hay mappings confirmados pero hay mappings sugeridos por KAI, usarlos automáticamente
    if (!this.confirmedMappings || Object.keys(this.confirmedMappings).length === 0) {
      if (this.mappingResult?.mappings && Object.keys(this.mappingResult.mappings).length > 0) {
        // Usar mappings sugeridos por KAI
        this.confirmedMappings = {};
        Object.entries(this.mappingResult.mappings).forEach(([katuqField, mapping]) => {
          this.confirmedMappings[katuqField] = mapping.sourceColumn;
        });
        console.log('📋 Usando mappings sugeridos por KAI:', this.confirmedMappings);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Mapeo no disponible',
          detail: 'Por favor espera el análisis de columnas o confirma el mapeo manualmente'
        });
        return;
      }
    }

    this.isUploading = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = company.nomComercial;

      if (!companyId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de configuracion',
          detail: 'No se encontro la empresa. Por favor cierra sesion e ingresa nuevamente.'
        });
        this.isUploading = false;
        return;
      }

      // Enviar datos RAW + mappings al backend
      // El backend aplicará los mappings y creará la estructura correcta (datosEntrega como array)
      // Convertir confirmedMappings a formato que espera el backend: { katuqField: { sourceColumn: "..." } }
      const mappingsForBackend: { [key: string]: { sourceColumn: string; confidence: number; reasoning: string } } = {};
      Object.entries(this.confirmedMappings).forEach(([katuqField, sourceColumn]) => {
        mappingsForBackend[katuqField] = {
          sourceColumn: sourceColumn,
          confidence: 100,
          reasoning: 'Mapeo confirmado por usuario'
        };
      });

      const payload = {
        customers: this.parsedData,  // Datos RAW sin transformar
        companyId: companyId,
        mappings: mappingsForBackend  // Mappings en formato completo para el backend
      };

      console.log('📤 Enviando payload al backend:', {
        customersCount: payload.customers.length,
        companyId: payload.companyId,
        mappings: payload.mappings
      });

      // Agregar header company explícitamente para onboarding
      const headers = new HttpHeaders({
        'company': companyId
      });

      const response = await this.http.post<ImportResult>(
        `${environment.urlApi}/v1/onboarding/import-customers`,
        payload,
        { headers }
      ).toPromise();

      this.importResult = response || { success: 0, failed: 0, errors: [] };

      this.messageService.add({
        severity: 'success',
        summary: 'Importación Completada',
        detail: `${this.importResult.success} clientes importados correctamente${this.importResult.failed > 0 ? `, ${this.importResult.failed} fallidos` : ''}`
      });

      this.dataChange.emit({ data: this.importResult });
      this.stepComplete.emit({ data: this.importResult });

    } catch (error: any) {
      console.error('Error importing customers:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Importación',
        detail: error?.error?.message || 'No se pudieron importar los clientes'
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

        // Manejar campos nested (ej: "datosFacturacionElectronica.ciudad")
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
    link.download = 'plantilla_clientes_katuq.csv';
    link.click();

    this.messageService.add({
      severity: 'success',
      summary: 'Plantilla Descargada',
      detail: 'Completa la plantilla con tus clientes y súbela para importar'
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
      detail: 'Podrás importar clientes más tarde desde el módulo de ventas'
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
    const customerLabels: { [key: string]: string } = {
      'documento': 'Documento/NIT',
      'nombres_completos': 'Nombres Completos',
      'correo_electronico_comprador': 'Correo Electrónico',
      'numero_celular_comprador': 'Número de Celular',
      'tipo_documento_comprador': 'Tipo de Documento',
      'datosFacturacionElectronica.tipoDocumento': 'Tipo Documento (Facturación)',
      'datosFacturacionElectronica.documento': 'Documento (Facturación)',
      'datosFacturacionElectronica.nombres': 'Nombres (Facturación)',
      'datosFacturacionElectronica.correoElectronico': 'Email (Facturación)',
      'datosFacturacionElectronica.celular': 'Celular (Facturación)',
      'datosFacturacionElectronica.direccion': 'Dirección (Facturación)',
      'datosFacturacionElectronica.ciudad': 'Ciudad (Facturación)',
      'datosFacturacionElectronica.departamento': 'Departamento (Facturación)',
      'datosFacturacionElectronica.pais': 'País (Facturación)',
      'datosEntrega.direccionEntrega': 'Dirección de Entrega',
      'datosEntrega.ciudad': 'Ciudad de Entrega',
      'datosEntrega.departamento': 'Departamento de Entrega',
      'datosEntrega.nombres': 'Nombres (Entrega)',
      'datosEntrega.apellidos': 'Apellidos (Entrega)',
      'datosEntrega.celular': 'Celular (Entrega)'
    };
    return customerLabels[katuqField] || katuqField;
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
    // Permitir importar si hay archivo Y (mappings confirmados O mappings sugeridos por KAI)
    const hasMappings = Object.keys(this.confirmedMappings).length > 0 ||
                        (this.mappingResult?.mappings && Object.keys(this.mappingResult.mappings).length > 0);
    return !!this.uploadedFile &&
           hasMappings &&
           !this.isUploading &&
           !this.isAnalyzingColumns;
  }
}
