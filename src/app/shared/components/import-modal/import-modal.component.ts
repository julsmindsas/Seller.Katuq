import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import { ColumnMappingService } from '../../services/import/column-mapping.service';
import {
  ColumnMappingResult,
  ColumnMappingRequest,
  ImportResult,
  MappingField,
  TemplateColumn,
  getConfidenceSeverity,
  getConfidenceIcon
} from '../../models/column-mapping.model';
import { MobileFileUploadComponent } from '../import-components/mobile-file-upload/mobile-file-upload.component';

interface ImportConfig {
  title: string;
  endpoint: string;
  payloadKey: string;
  maxFileSize: number;
  templateColumns: TemplateColumn[];
  fieldLabels: { [key: string]: string };
}

// Valores por defecto para productos que no vienen en el Excel
const PRODUCT_DEFAULTS = {
  identificacion: {
    tipoProducto: 'propio',
    tipoReferencia: 'propio',
    marca: '',
    codigoBarras: '',
    referencia: ''
  },
  crearProducto: {
    titulo: '',
    descripcion: '',
    garantiasProducto: '',
    restriccionesProducto: '',
    fechaInicial: new Date().toISOString().split('T')[0],
    fechaFinal: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    caracAdicionales: '',
    cuidadoConsumo: '',
    imagenesPrincipales: [],
    imagenesSecundarias: [],
    paraProduccion: false
  },
  precio: {
    precioUnitarioSinIva: 0,
    precioUnitarioIva: '0',
    valorIva: 0,
    precioUnitarioConIva: 0,
    precioPorVolumenSinIva: '',
    precioIvaPorVolumen: '',
    precioTotalVolumenConIva: '',
    preciosVolumen: []
  },
  disponibilidad: {
    tipoEntrega: 'seleccione',
    tiempoEntrega: 'seleccione',
    cantidadDisponible: 0,
    cantidadMinVenta: 1,
    inventarioSeguridad: 0,
    inventariable: true
  },
  dimensiones: {
    largoProductoCm: '',
    altoProductoCm: '',
    anchoProductoCm: '',
    pesoUnitarioProductoKg: ''
  },
  exposicion: {
    activar: false,
    posicion: 0,
    disponible: false,
    recomendado: false,
    destacado: false,
    oferta: false,
    nuevo: false,
    masvendido: false,
    etiquetas: []
  },
  marketplace: {
    sellerCenter: false,
    paginaWeb: false,
    puntoDeVenta: true,
    campos: []
  },
  ciudades: {
    ciudadesOrigen: [],
    ciudadesEntrega: []
  },
  procesoComercial: {
    aceptaOcasion: false,
    ocasion: [],
    aceptaGenero: false,
    genero: [],
    generoMap: null,
    ocasionesMap: null,
    aceptaComentarios: false,
    aceptaColorDecoracion: false,
    colorDecoracion: [],
    llevaTarjeta: false,
    llevaArchivo: false,
    aceptaVariable: false,
    aceptaAdiciones: false,
    pago: [],
    variablesForm: '',
    llevaCalendario: false,
    configProcesoComercialActivo: false
  }
};

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.scss'],
  providers: [MessageService]
})
export class ImportModalComponent implements OnInit, OnDestroy {
  @ViewChild(MobileFileUploadComponent) mobileFileUpload: MobileFileUploadComponent;

  @Input() type: 'customer' | 'product' = 'customer';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() importComplete = new EventEmitter<ImportResult>();

  private destroy$ = new Subject<void>();

  config: ImportConfig | null = null;

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

  // Configurations for each type
  private customerConfig: ImportConfig = {
    title: 'Importar Clientes',
    endpoint: '/v1/onboarding/import-customers',
    payloadKey: 'customers',
    maxFileSize: 5000000, // 5MB
    templateColumns: [
      { field: 'documento', header: 'Documento/NIT', required: true, example: '1234567890' },
      { field: 'nombres_completos', header: 'Nombres Completos', required: true, example: 'Juan Perez' },
      { field: 'correo_electronico_comprador', header: 'Email', required: true, example: 'juan@example.com' },
      { field: 'numero_celular_comprador', header: 'Celular', required: true, example: '3001234567' },
      { field: 'tipo_documento_comprador', header: 'Tipo Documento', required: false, example: 'CC' },
      { field: 'ciudad', header: 'Ciudad', required: false, example: 'Bogota' },
      { field: 'direccion', header: 'Direccion', required: false, example: 'Calle 123 #45-67' }
    ],
    fieldLabels: {
      'documento': 'Documento/NIT',
      'nombres_completos': 'Nombres Completos',
      'correo_electronico_comprador': 'Correo Electronico',
      'numero_celular_comprador': 'Numero de Celular',
      'tipo_documento_comprador': 'Tipo de Documento',
      'datosFacturacionElectronica.tipoDocumento': 'Tipo Documento (Facturacion)',
      'datosFacturacionElectronica.documento': 'Documento (Facturacion)',
      'datosFacturacionElectronica.nombres': 'Nombres (Facturacion)',
      'datosFacturacionElectronica.correoElectronico': 'Email (Facturacion)',
      'datosFacturacionElectronica.celular': 'Celular (Facturacion)',
      'datosFacturacionElectronica.direccion': 'Direccion (Facturacion)',
      'datosFacturacionElectronica.ciudad': 'Ciudad (Facturacion)',
      'datosFacturacionElectronica.departamento': 'Departamento (Facturacion)',
      'datosFacturacionElectronica.pais': 'Pais (Facturacion)',
      'datosEntrega.direccion': 'Direccion de Entrega',
      'datosEntrega.ciudad': 'Ciudad de Entrega',
      'datosEntrega.departamento': 'Departamento de Entrega'
    }
  };

  private productConfig: ImportConfig = {
    title: 'Importar Productos',
    endpoint: '/v1/onboarding/import-products',
    payloadKey: 'products',
    maxFileSize: 10000000, // 10MB
    templateColumns: [
      { field: 'referencia', header: 'Referencia/SKU', required: true, example: 'PROD001' },
      { field: 'titulo', header: 'Titulo', required: true, example: 'Camiseta Basica' },
      { field: 'descripcion', header: 'Descripcion', required: false, example: 'Camiseta de algodon' },
      { field: 'precioUnitarioSinIva', header: 'Precio Sin IVA', required: true, example: '50000' },
      { field: 'valorIva', header: 'IVA (%)', required: false, example: '19' },
      { field: 'cantidadDisponible', header: 'Cantidad Disponible', required: false, example: '100' },
      { field: 'marca', header: 'Marca', required: false, example: 'MiMarca' },
      { field: 'codigoBarras', header: 'Codigo de Barras', required: false, example: '7701234567890' },
      { field: 'categoria', header: 'Categoria', required: false, example: 'Ropa' },
      { field: 'cantidadMinVenta', header: 'Cantidad Minima Venta', required: false, example: '1' },
      { field: 'inventarioSeguridad', header: 'Inventario Seguridad', required: false, example: '10' },
      { field: 'garantiasProducto', header: 'Garantias', required: false, example: 'Garantia de 1 año' },
      { field: 'caracAdicionales', header: 'Caracteristicas Adicionales', required: false, example: 'Material 100% algodon' },
      { field: 'tipoEntrega', header: 'Tipo de Entrega', required: false, example: 'Envio nacional' },
      { field: 'tiempoEntrega', header: 'Tiempo de Entrega', required: false, example: '3-5 dias' },
      { field: 'activar', header: 'Activo (SI/NO)', required: false, example: 'SI' },
      { field: 'disponible', header: 'Disponible (SI/NO)', required: false, example: 'SI' }
    ],
    fieldLabels: {
      'identificacion.referencia': 'Referencia/SKU',
      'identificacion.marca': 'Marca',
      'identificacion.tipoProducto': 'Tipo de Producto',
      'identificacion.codigoBarras': 'Codigo de Barras',
      'crearProducto.titulo': 'Titulo del Producto',
      'crearProducto.descripcion': 'Descripcion',
      'crearProducto.garantiasProducto': 'Garantias',
      'crearProducto.caracAdicionales': 'Caracteristicas Adicionales',
      'crearProducto.restriccionesProducto': 'Restricciones',
      'crearProducto.cuidadoConsumo': 'Cuidado y Consumo',
      'precio.precioUnitarioSinIva': 'Precio sin IVA',
      'precio.precioUnitarioIva': 'Porcentaje IVA',
      'precio.valorIva': 'Valor IVA ($)',
      'precio.precioUnitarioConIva': 'Precio con IVA',
      'disponibilidad.cantidadDisponible': 'Cantidad Disponible',
      'disponibilidad.cantidadMinVenta': 'Cantidad Minima de Venta',
      'disponibilidad.inventarioSeguridad': 'Inventario de Seguridad',
      'disponibilidad.tipoEntrega': 'Tipo de Entrega',
      'disponibilidad.tiempoEntrega': 'Tiempo de Entrega',
      'disponibilidad.inventariable': 'Es Inventariable',
      'exposicion.activar': 'Activo',
      'exposicion.disponible': 'Disponible',
      'exposicion.posicion': 'Posicion',
      'exposicion.nuevo': 'Producto Nuevo',
      'exposicion.oferta': 'En Oferta',
      'exposicion.destacado': 'Destacado',
      'exposicion.recomendado': 'Recomendado',
      'exposicion.masvendido': 'Mas Vendido',
      'marketplace.puntoDeVenta': 'Disponible en POS',
      'marketplace.paginaWeb': 'Disponible en Web',
      'referencia': 'Referencia/SKU',
      'titulo': 'Titulo',
      'descripcion': 'Descripcion',
      'precioUnitarioSinIva': 'Precio Sin IVA',
      'valorIva': 'IVA (%)',
      'cantidadDisponible': 'Cantidad Disponible',
      'cantidadMinVenta': 'Cantidad Minima Venta',
      'inventarioSeguridad': 'Inventario Seguridad',
      'marca': 'Marca',
      'codigoBarras': 'Codigo de Barras',
      'categoria': 'Categoria',
      'garantiasProducto': 'Garantias',
      'caracAdicionales': 'Caracteristicas Adicionales',
      'tipoEntrega': 'Tipo de Entrega',
      'tiempoEntrega': 'Tiempo de Entrega',
      'activar': 'Activo',
      'disponible': 'Disponible'
    }
  };

  constructor(
    private messageService: MessageService,
    private http: HttpClient,
    private columnMappingService: ColumnMappingService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConfig(): void {
    this.config = this.type === 'customer' ? this.customerConfig : this.productConfig;
  }

  onDialogShow(): void {
    this.loadConfig();
  }

  onDialogHide(): void {
    this.resetState();
    this.visibleChange.emit(false);
  }

  private resetState(): void {
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
    this.isUploading = false;
    this.isAnalyzingColumns = false;
  }

  onMobileFileSelected(file: File): void {
    this.onFileSelect({ files: [file] });
  }

  onFileSelect(event: any): void {
    const file = event.files[0];
    if (!file) return;

    if (file.size > (this.config?.maxFileSize || 5000000)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: `El archivo no debe superar ${(this.config?.maxFileSize || 5000000) / 1000000}MB`
      });
      return;
    }

    this.uploadedFile = file;
    this.previewFile(file);
  }

  private async previewFile(file: File): Promise<void> {
    const reader = new FileReader();

    reader.onload = async (e: any) => {
      try {
        let data: any[] = [];

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(e.target.result);
          data = Array.isArray(jsonData) ? jsonData : [jsonData];
        } else {
          const arrayBuffer = e.target.result;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet);
        }

        if (data.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Archivo vacio',
            detail: 'El archivo no contiene datos'
          });
          return;
        }

        this.parsedData = data;
        this.sourceColumns = this.columnMappingService.extractColumns(data);
        this.previewData = data.slice(0, 5);
        this.showPreview = true;

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

  private async analyzeColumnsWithKAI(): Promise<void> {
    this.isAnalyzingColumns = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const sampleRows = this.columnMappingService.getSampleRows(this.parsedData, 3);

      const request: ColumnMappingRequest = {
        type: this.type,
        sourceColumns: this.sourceColumns,
        sampleRows: sampleRows,
        companyId: company.cd || company._id
      };

      this.mappingResult = await this.columnMappingService
        .suggestColumnMapping(request, company.nomComercial || company.nombre)
        .toPromise() || null;

      this.showMappingPreview = true;
      this.prepareMappingFields();

      this.messageService.add({
        severity: 'success',
        summary: 'Analisis Completado',
        detail: `KAI analizo ${this.sourceColumns.length} columnas y sugirio ${Object.keys(this.mappingResult?.mappings || {}).length} mapeos`
      });

    } catch (error: any) {
      console.error('Error analyzing columns with KAI:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Analisis',
        detail: error?.error?.message || 'No se pudo analizar el archivo con KAI'
      });
    } finally {
      this.isAnalyzingColumns = false;
    }
  }

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

    this.mappingFields.sort((a, b) => {
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return b.confidence - a.confidence;
    });
  }

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

    this.updateConfirmedMappings();
  }

  private updateConfirmedMappings(): void {
    this.confirmedMappings = {};
    this.mappingFields.forEach(field => {
      this.confirmedMappings[field.katuqField] = field.sourceColumn;
    });
  }

  confirmAllMappings(): void {
    this.updateConfirmedMappings();
    this.messageService.add({
      severity: 'success',
      summary: 'Mapeo Confirmado',
      detail: `Los mapeos han sido confirmados. Ahora puedes importar los ${this.type === 'customer' ? 'clientes' : 'productos'}.`
    });
  }

  onMappingsAdjusted(adjustedMappings: { [katuqField: string]: string }): void {
    this.confirmedMappings = adjustedMappings;
  }

  onMappingsConfirmed(finalMappings: { [katuqField: string]: string }): void {
    this.confirmedMappings = finalMappings;
    this.messageService.add({
      severity: 'info',
      summary: 'Mapeo Confirmado',
      detail: `Ahora puedes importar los ${this.type === 'customer' ? 'clientes' : 'productos'} con el mapeo confirmado`
    });
  }

  async importData(): Promise<void> {
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

      const transformedData = this.transformDataWithMapping(this.parsedData, this.confirmedMappings);

      const payload: any = {
        companyId: companyId,
        mappings: this.confirmedMappings
      };
      payload[this.config!.payloadKey] = transformedData;

      const headers = new HttpHeaders({
        'company': companyId
      });

      const response = await this.http.post<ImportResult>(
        `${environment.urlApi}${this.config!.endpoint}`,
        payload,
        { headers }
      ).toPromise();

      this.importResult = response || { success: 0, failed: 0, errors: [] };

      this.messageService.add({
        severity: 'success',
        summary: 'Importacion Completada',
        detail: `${this.importResult.success} ${this.type === 'customer' ? 'clientes' : 'productos'} importados correctamente${this.importResult.failed > 0 ? `, ${this.importResult.failed} fallidos` : ''}`
      });

      this.importComplete.emit(this.importResult);

      // Close modal after short delay
      setTimeout(() => {
        this.visible = false;
        this.visibleChange.emit(false);
      }, 1500);

    } catch (error: any) {
      console.error('Error importing data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Importacion',
        detail: error?.error?.message || `No se pudieron importar los ${this.type === 'customer' ? 'clientes' : 'productos'}`
      });
    } finally {
      this.isUploading = false;
    }
  }

  private transformDataWithMapping(data: any[], mappings: { [katuqField: string]: string }): any[] {
    return data.map((row, index) => {
      // Para productos, iniciar con los valores por defecto
      let transformedRow: any = this.type === 'product'
        ? this.getProductDefaults(index)
        : {};

      Object.entries(mappings).forEach(([katuqField, sourceColumn]) => {
        let value = row[sourceColumn];

        // No procesar si el valor es undefined, null o string vacío
        if (value === undefined || value === null || value === '') {
          return;
        }

        // Convertir tipos de datos según el campo
        value = this.convertFieldValue(katuqField, value);

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
          // Mapear campos simples a su estructura correcta para productos
          if (this.type === 'product') {
            this.mapSimpleFieldToProductStructure(transformedRow, katuqField, value);
          } else {
            transformedRow[katuqField] = value;
          }
        }
      });

      // Calcular campos derivados para productos
      if (this.type === 'product') {
        this.calculateDerivedFields(transformedRow);
      }

      return transformedRow;
    });
  }

  /**
   * Obtiene una copia de los valores por defecto para un producto
   */
  private getProductDefaults(index: number): any {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    const companyPrefix = company.nomComercial
      ? company.nomComercial.toString().substring(company.nomComercial.toString().length - 3).toUpperCase()
      : 'IMP';

    const timestamp = Date.now();
    const paddedIndex = (index + 1).toString().padStart(6, '0');
    const autoRef = `${companyPrefix}-IMP-${paddedIndex}-${timestamp.toString().slice(-4)}`;

    return {
      identificacion: {
        ...PRODUCT_DEFAULTS.identificacion,
        referencia: autoRef,
        codigoBarras: autoRef
      },
      crearProducto: {
        ...PRODUCT_DEFAULTS.crearProducto,
        fechaInicial: new Date().toISOString().split('T')[0],
        fechaFinal: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      },
      precio: { ...PRODUCT_DEFAULTS.precio },
      disponibilidad: { ...PRODUCT_DEFAULTS.disponibilidad },
      dimensiones: { ...PRODUCT_DEFAULTS.dimensiones },
      exposicion: { ...PRODUCT_DEFAULTS.exposicion },
      marketplace: { ...PRODUCT_DEFAULTS.marketplace },
      ciudades: { ...PRODUCT_DEFAULTS.ciudades },
      procesoComercial: { ...PRODUCT_DEFAULTS.procesoComercial }
    };
  }

  /**
   * Convierte el valor según el tipo de campo esperado
   */
  private convertFieldValue(katuqField: string, value: any): any {
    // Campos booleanos
    const booleanFields = [
      'activar', 'disponible', 'recomendado', 'destacado', 'oferta', 'nuevo',
      'masvendido', 'paraProduccion', 'inventariable', 'sellerCenter',
      'paginaWeb', 'puntoDeVenta', 'exposicion.activar', 'exposicion.disponible',
      'exposicion.recomendado', 'exposicion.destacado', 'exposicion.oferta',
      'exposicion.nuevo', 'exposicion.masvendido', 'crearProducto.paraProduccion',
      'disponibilidad.inventariable', 'marketplace.sellerCenter',
      'marketplace.paginaWeb', 'marketplace.puntoDeVenta'
    ];

    if (booleanFields.includes(katuqField)) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return lower === 'si' || lower === 'sí' || lower === 'yes' ||
               lower === 'true' || lower === '1' || lower === 'activo' ||
               lower === 'disponible';
      }
      return !!value;
    }

    // Campos numéricos
    const numericFields = [
      'precioUnitarioSinIva', 'valorIva', 'precioUnitarioConIva', 'cantidadDisponible',
      'cantidadMinVenta', 'inventarioSeguridad', 'posicion',
      'precio.precioUnitarioSinIva', 'precio.valorIva', 'precio.precioUnitarioConIva',
      'precio.precioUnitarioIva', 'disponibilidad.cantidadDisponible',
      'disponibilidad.cantidadMinVenta', 'disponibilidad.inventarioSeguridad',
      'exposicion.posicion'
    ];

    if (numericFields.includes(katuqField)) {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remover separadores de miles y convertir comas decimales
        const cleaned = value.replace(/[,$]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    }

    return value;
  }

  /**
   * Mapea campos simples del Excel a la estructura anidada del producto
   */
  private mapSimpleFieldToProductStructure(product: any, field: string, value: any): void {
    const fieldMappings: { [key: string]: string } = {
      'referencia': 'identificacion.referencia',
      'titulo': 'crearProducto.titulo',
      'descripcion': 'crearProducto.descripcion',
      'marca': 'identificacion.marca',
      'codigoBarras': 'identificacion.codigoBarras',
      'precioUnitarioSinIva': 'precio.precioUnitarioSinIva',
      'valorIva': 'precio.precioUnitarioIva',
      'cantidadDisponible': 'disponibilidad.cantidadDisponible',
      'cantidadMinVenta': 'disponibilidad.cantidadMinVenta',
      'inventarioSeguridad': 'disponibilidad.inventarioSeguridad',
      'tipoEntrega': 'disponibilidad.tipoEntrega',
      'tiempoEntrega': 'disponibilidad.tiempoEntrega',
      'garantiasProducto': 'crearProducto.garantiasProducto',
      'caracAdicionales': 'crearProducto.caracAdicionales',
      'restriccionesProducto': 'crearProducto.restriccionesProducto',
      'cuidadoConsumo': 'crearProducto.cuidadoConsumo',
      'activar': 'exposicion.activar',
      'disponible': 'exposicion.disponible',
      'posicion': 'exposicion.posicion',
      'nuevo': 'exposicion.nuevo',
      'oferta': 'exposicion.oferta',
      'destacado': 'exposicion.destacado',
      'recomendado': 'exposicion.recomendado',
      'masvendido': 'exposicion.masvendido'
    };

    const targetPath = fieldMappings[field];
    if (targetPath) {
      const parts = targetPath.split('.');
      let current = product;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    }
  }

  /**
   * Calcula campos derivados como precio con IVA
   */
  private calculateDerivedFields(product: any): void {
    if (product.precio) {
      const precioSinIva = parseFloat(product.precio.precioUnitarioSinIva) || 0;
      const porcentajeIva = parseFloat(product.precio.precioUnitarioIva) || 0;

      const valorIva = precioSinIva * (porcentajeIva / 100);
      const precioConIva = precioSinIva + valorIva;

      product.precio.valorIva = valorIva;
      product.precio.precioUnitarioConIva = precioConIva;
    }

    // Asegurar que el código de barras tenga valor si la referencia tiene
    if (product.identificacion) {
      if (!product.identificacion.codigoBarras && product.identificacion.referencia) {
        product.identificacion.codigoBarras = product.identificacion.referencia;
      }
    }

    // Asegurar que el título tenga valor
    if (product.crearProducto && !product.crearProducto.titulo) {
      product.crearProducto.titulo = product.identificacion?.referencia || 'Producto Importado';
    }
  }

  downloadTemplate(): void {
    if (!this.config) return;

    const headers = this.config.templateColumns.map(col => col.header).join(',');
    const example = this.config.templateColumns.map(col => col.example).join(',');
    const csvContent = `${headers}\n${example}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plantilla_${this.type === 'customer' ? 'clientes' : 'productos'}_katuq.csv`;
    link.click();

    this.messageService.add({
      severity: 'success',
      summary: 'Plantilla Descargada',
      detail: `Completa la plantilla con tus ${this.type === 'customer' ? 'clientes' : 'productos'} y subela para importar`
    });
  }

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

  getFieldLabel(katuqField: string): string {
    return this.config?.fieldLabels[katuqField] || katuqField;
  }

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

  canImport(): boolean {
    return !!this.uploadedFile &&
           Object.keys(this.confirmedMappings).length > 0 &&
           !this.isUploading &&
           !this.isAnalyzingColumns;
  }
}
