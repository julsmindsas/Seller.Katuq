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
    tipoEntrega: '',
    tiempoEntrega: '',
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
    activar: true,
    posicion: 0,
    disponible: true,
    recomendado: false,
    destacado: false,
    oferta: false,
    nuevo: true,
    masvendido: false,
    etiquetas: []
  },
  marketplace: {
    sellerCenter: true,
    paginaWeb: true,
    puntoDeVenta: true,
    campos: []
  },
  ciudades: {
    ciudadesOrigen: [],
    ciudadesEntrega: [],
    coberturaNacionalOrigen: false,
    coberturaNacionalEntrega: false
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

  @Input() type: 'customer' | 'product' | 'inventory' | 'category' = 'customer';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() importComplete = new EventEmitter<ImportResult>();

  private destroy$ = new Subject<void>();

  config: ImportConfig | null = null;

  isUploading = false;
  isDeleting = false;
  uploadedFile: File | null = null;
  importResult: ImportResult | null = null;
  importTotalRecords = 0;
  deleteResult: { deleted: number } | null = null;
  previewData: any[] = [];
  showPreview = false;

  // KAI Integration
  isAnalyzingColumns = false;
  parsedData: any[] = [];
  sourceColumns: string[] = [];
  mappingResult: ColumnMappingResult | null = null;
  confirmedMappings: { [katuqField: string]: string } = {};
  showMappingPreview = false;

  // Produccion: checkboxes globales
  todosParaProduccion = false;
  todosIntegranProduccion = false;

  // Import mode: create-only, update-only, or upsert (default)
  importMode: 'create' | 'update' | 'upsert' = 'upsert';

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
    maxFileSize: 50000000, // 50MB para importaciones masivas
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
      { field: 'disponible', header: 'Disponible (SI/NO)', required: false, example: 'SI' },
      { field: 'seProduceInternamente', header: 'Se Produce? (SI/NO)', required: false, example: 'NO' },
      { field: 'integraConProduccion', header: 'Integra Software Produccion? (SI/NO)', required: false, example: 'NO' },
      { field: 'tiempoProduccion', header: 'Tiempo Produccion', required: false, example: '3 dias' },
      { field: 'softwareProduccion', header: 'Software Produccion', required: false, example: 'ERP Interno' }
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
      'categoria': 'Categoria/Grupo/Linea/Familia',
      'garantiasProducto': 'Garantias',
      'caracAdicionales': 'Caracteristicas Adicionales',
      'tipoEntrega': 'Tipo/Forma de Entrega',
      'tiempoEntrega': 'Tiempo/Plazo de Entrega',
      'activar': 'Activo',
      'disponible': 'Disponible',
      'seProduceInternamente': 'Se Produce Internamente',
      'integraConProduccion': 'Integra con Software de Produccion',
      'tiempoProduccion': 'Tiempo de Produccion',
      'softwareProduccion': 'Software de Produccion',
      'procesoComercial.seProduceInternamente': 'Se Produce Internamente',
      'procesoComercial.integraConProduccion': 'Integra con Produccion',
      'procesoComercial.tiempoProduccion': 'Tiempo de Produccion',
      'procesoComercial.softwareProduccion': 'Software de Produccion'
    }
  };

  private inventoryConfig: ImportConfig = {
    title: 'Importar Inventario',
    endpoint: '/v1/onboarding/import-inventory',
    payloadKey: 'inventory',
    maxFileSize: 10000000,
    templateColumns: [
      { field: 'referencia', header: 'Referencia/SKU', required: true, example: 'PROD001' },
      { field: 'cantidad', header: 'Cantidad/Stock', required: true, example: '100' },
      { field: 'bodega', header: 'Bodega', required: false, example: 'Bodega Principal' },
      { field: 'costoUnitario', header: 'Costo Unitario', required: false, example: '12500' },
      { field: 'observaciones', header: 'Observaciones', required: false, example: 'Inventario inicial' }
    ],
    fieldLabels: {
      'referencia': 'Referencia/SKU',
      'cantidad': 'Cantidad/Stock',
      'bodega': 'Bodega',
      'costoUnitario': 'Costo Unitario',
      'observaciones': 'Observaciones'
    }
  };

  private categoryConfig: ImportConfig = {
    title: 'Importar Categorías',
    endpoint: '/v1/onboarding/import-categories',
    payloadKey: 'categories',
    maxFileSize: 5000000,
    templateColumns: [
      { field: 'categoria_nivel1', header: 'Nombre', required: true, example: 'Ropa' },
      { field: 'codigo', header: 'Código', required: false, example: 'ROPa' },
      { field: 'categoria_nivel2', header: 'Subcategoría (Nivel 2)', required: false, example: 'Hombre' },
      { field: 'categoria_nivel3', header: 'Sub-subcategoría (Nivel 3)', required: false, example: 'Camisetas' },
      { field: 'categoria_padre', header: 'Categoría Padre (nombre o código)', required: false, example: 'Ropa' },
      { field: 'imagen', header: 'URL Imagen', required: false, example: 'https://example.com/imagen.jpg' },
      { field: 'activo', header: 'Activo', required: false, example: 'SI' },
      { field: 'posicion', header: 'Posición', required: false, example: '1' },
    ],
    fieldLabels: {
      'categoria_nivel1': 'Nombre de Categoría',
      'codigo': 'Código / Referencia',
      'categoria_nivel2': 'Subcategoría (Nivel 2)',
      'categoria_nivel3': 'Sub-subcategoría (Nivel 3)',
      'categoria_padre': 'Categoría Padre (nombre o código)',
      'imagen': 'URL de Imagen',
      'activo': 'Activo (SI/NO)',
      'posicion': 'Posición / Orden',
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
    if (this.type === 'customer') {
      this.config = this.customerConfig;
    } else if (this.type === 'inventory') {
      this.config = this.inventoryConfig;
    } else if (this.type === 'category') {
      this.config = this.categoryConfig;
    } else {
      this.config = this.productConfig;
    }
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
    this.importTotalRecords = 0;
    this.deleteResult = null;
    this.parsedData = [];
    this.sourceColumns = [];
    this.mappingResult = null;
    this.confirmedMappings = {};
    this.showMappingPreview = false;
    this.mappingFields = [];
    this.availableColumns = [];
    this.importMode = 'upsert';
    this.isUploading = false;
    this.isDeleting = false;
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
      // Enviar hasta 10 filas de muestra para mejor detección de patrones
      const sampleRows = this.columnMappingService.getSampleRows(this.parsedData, 10);
      console.log('[ImportModal] 📊 Enviando', sampleRows.length, 'filas de muestra a KAI');

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
    console.log('[ImportModal] 🔧 Preparando campos de mapeo...');
    console.log('[ImportModal] 📊 mappingResult:', this.mappingResult);

    if (!this.mappingResult) {
      console.log('[ImportModal] ⚠️ No hay mappingResult!');
      return;
    }

    this.availableColumns = this.sourceColumns.map(col => ({
      label: col,
      value: col
    }));

    console.log('[ImportModal] 📋 Columnas disponibles:', this.availableColumns);
    console.log('[ImportModal] 🗺️ Mappings del resultado:', this.mappingResult.mappings);

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

    console.log('[ImportModal] ✅ mappingFields generados:', this.mappingFields.length);
    console.log('[ImportModal] 📋 Campos:', this.mappingFields.map(f => `${f.katuqField} ← ${f.sourceColumn}`));

    this.mappingFields.sort((a, b) => {
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return b.confidence - a.confidence;
    });

    // Auto-confirmar los mapeos para que estén disponibles
    this.updateConfirmedMappings();
    console.log('[ImportModal] 🗺️ Mapeos confirmados automáticamente:', this.confirmedMappings);
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
      detail: `Los mapeos han sido confirmados. Ahora puedes importar los ${this.type === 'customer' ? 'clientes' : this.type === 'inventory' ? 'inventario' : 'productos'}.`
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
      detail: `Ahora puedes importar los ${this.type === 'customer' ? 'clientes' : this.type === 'inventory' ? 'inventario' : 'productos'} con el mapeo confirmado`
    });
  }

  async importData(): Promise<void> {
    console.log('[ImportModal] 🚀 Iniciando importación...');
    console.log('[ImportModal] 📁 Archivo:', this.uploadedFile?.name);
    console.log('[ImportModal] 📊 Datos parseados:', this.parsedData?.length, 'filas');
    console.log('[ImportModal] 🗺️ Mapeos confirmados:', this.confirmedMappings);

    if (!this.uploadedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin archivo',
        detail: 'Por favor selecciona un archivo para importar'
      });
      return;
    }

    if (!this.confirmedMappings || Object.keys(this.confirmedMappings).length === 0) {
      console.log('[ImportModal] ⚠️ No hay mapeos confirmados');
      this.messageService.add({
        severity: 'warn',
        summary: 'Mapeo no confirmado',
        detail: 'Por favor confirma el mapeo de columnas antes de importar'
      });
      return;
    }

    this.isUploading = true;
    this.importTotalRecords = this.parsedData.length;

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

      console.log('[ImportModal] 🏢 Company:', companyId);
      console.log('[ImportModal] 🔄 Transformando datos con mapeo...');

      const transformedData = this.transformDataWithMapping(this.parsedData, this.confirmedMappings, this.mappingResult?.mappings);

      console.log('[ImportModal] ✅ Datos transformados:', transformedData.length, 'registros');
      console.log('[ImportModal] 📋 Muestra de datos transformados (primeros 3):', JSON.stringify(transformedData.slice(0, 3), null, 2));

      const batchId = `imp_${Date.now()}`;
      const headers = new HttpHeaders({ 'company': companyId });

      // Particion por lotes de 500 registros
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(transformedData.length / BATCH_SIZE);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      console.log(`[ImportModal] 📦 Enviando en ${totalBatches} lotes de ${BATCH_SIZE} (${transformedData.length} total)`);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const start = batchIdx * BATCH_SIZE;
        const batchData = transformedData.slice(start, start + BATCH_SIZE);

        const payload: any = {
          companyId: companyId,
          mappings: this.confirmedMappings,
          importBatchId: batchId,
          batchIndex: batchIdx,
          totalBatches: totalBatches,
          mode: this.importMode
        };
        payload[this.config!.payloadKey] = batchData;

        console.log(`[ImportModal] 📤 Lote ${batchIdx + 1}/${totalBatches}: ${batchData.length} registros`);

        // Timeout de 5 minutos por lote
        const BATCH_TIMEOUT_MS = 300000;
        let timeoutHandle: any = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error(`Lote ${batchIdx + 1} tardó demasiado (5min). ${totalCreated + totalUpdated} procesados hasta ahora.`)), BATCH_TIMEOUT_MS);
        });

        try {
          const httpPromise = this.http.post<any>(
            `${environment.urlApi}${this.config!.endpoint}`,
            payload,
            { headers }
          ).toPromise();

          const response: any = await Promise.race([httpPromise, timeoutPromise]);
          clearTimeout(timeoutHandle);

          const data = response?.data || response || {};
          totalCreated += data.created || 0;
          totalUpdated += data.updated || 0;
          totalFailed += data.failed || 0;
          if (data.errors?.length) allErrors.push(...data.errors);

          // Notificar progreso entre lotes
          if (totalBatches > 1) {
            this.messageService.add({
              severity: 'info',
              summary: `Lote ${batchIdx + 1}/${totalBatches}`,
              detail: `${data.created || 0} creados, ${data.updated || 0} actualizados`,
              life: 3000
            });
          }
        } catch (batchError: any) {
          clearTimeout(timeoutHandle);
          totalFailed += batchData.length;
          allErrors.push(`Lote ${batchIdx + 1}: ${batchError?.message || 'Error desconocido'}`);
          console.error(`[ImportModal] ❌ Lote ${batchIdx + 1} fallo:`, batchError);
          // Continuar con el siguiente lote
        }
      }

      this.importResult = {
        success: totalCreated + totalUpdated,
        failed: totalFailed,
        errors: allErrors.slice(0, 50),
        batchId: batchId,
        created: totalCreated || undefined,
        updated: totalUpdated || undefined
      };

      const entity = this.type === 'customer' ? 'clientes' : this.type === 'inventory' ? 'inventario' : this.type === 'category' ? 'categorías' : 'productos';
      let detail = '';
      if (totalCreated > 0 && totalUpdated > 0) {
        detail = `${totalCreated} ${entity} creados, ${totalUpdated} actualizados`;
      } else if (totalCreated > 0) {
        detail = `${totalCreated} ${entity} creados`;
      } else if (totalUpdated > 0) {
        detail = `${totalUpdated} ${entity} actualizados`;
      } else {
        detail = `${this.importResult.success} ${entity} procesados`;
      }
      if (totalFailed > 0) detail += `, ${totalFailed} fallidos`;
      if (totalBatches > 1) detail += ` (${totalBatches} lotes)`;

      this.messageService.add({
        severity: 'success',
        summary: 'Importacion Completada',
        detail
      });

      this.importComplete.emit(this.importResult);
      // No cierra automáticamente: el usuario puede revisar errores o eliminar

    } catch (error: any) {
      console.error('Error importing data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Importacion',
        detail: error?.error?.message || `No se pudieron importar los ${this.type === 'customer' ? 'clientes' : this.type === 'inventory' ? 'inventario' : 'productos'}`
      });
    } finally {
      this.isUploading = false;
    }
  }

  async deleteImport(): Promise<void> {
    if (!this.importResult?.batchId) return;
    this.isDeleting = true;
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = company.nomComercial;
      const headers = new HttpHeaders({ 'company': companyId });
      const response = await this.http.delete<{ success: boolean; deleted: number }>(
        `${environment.urlApi}/v1/onboarding/import-customers/${this.importResult.batchId}`,
        { headers }
      ).toPromise();
      this.deleteResult = { deleted: response?.deleted || 0 };
      this.importResult = null;
      this.messageService.add({
        severity: 'warn',
        summary: 'Importacion eliminada',
        detail: `Se eliminaron ${this.deleteResult.deleted} clientes importados`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al eliminar',
        detail: error?.error?.error || 'No se pudo eliminar la importacion'
      });
    } finally {
      this.isDeleting = false;
    }
  }

  async deleteAllClients(): Promise<void> {
    if (!confirm('⚠️ ESTO ELIMINARÁ TODOS LOS CLIENTES DE LA EMPRESA. ¿Estás seguro?')) return;
    this.isDeleting = true;
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyId = company.nomComercial;
      const headers = new HttpHeaders({ 'company': companyId });
      const response = await this.http.delete<{ success: boolean; deleted: number }>(
        `${environment.urlApi}/v1/onboarding/delete-all-clients`,
        { headers }
      ).toPromise();
      this.deleteResult = { deleted: response?.deleted || 0 };
      this.importResult = null;
      this.messageService.add({
        severity: 'warn',
        summary: 'Clientes eliminados',
        detail: `Se eliminaron ${this.deleteResult.deleted} clientes de la empresa`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al eliminar',
        detail: error?.error?.error || 'No se pudieron eliminar los clientes'
      });
    } finally {
      this.isDeleting = false;
    }
  }

  private transformDataWithMapping(
    data: any[],
    mappings: { [katuqField: string]: string },
    fullMappings?: { [katuqField: string]: any }
  ): any[] {
    console.log('[ImportModal] 🔄 Transformando', data.length, 'filas con mappings:', mappings);

    return data.map((row, index) => {
      let transformedRow: any = this.type === 'product'
        ? this.getProductDefaults(index)
        : {};

      if (index === 0) {
        console.log('[ImportModal] 📝 Fila original (primera):', row);
      }

      Object.entries(mappings).forEach(([katuqField, sourceColumn]) => {
        const fullMapping = fullMappings?.[katuqField];

        // Caso 1: valor por defecto fijo (sin sourceColumn, ej: indicativo '+57')
        if (fullMapping?.defaultValue !== undefined && (!sourceColumn || sourceColumn === '')) {
          this.setNestedValue(transformedRow, katuqField, fullMapping.defaultValue, index);
          return;
        }

        // Obtener valor principal con trim para manejar espacios en nombres de columna
        let value = this.getRowValue(row, sourceColumn);

        // Caso 2: concatenar columnas adicionales (ej: Primer Nombre + Segundo Nombre)
        if (fullMapping?.additionalColumns?.length) {
          const separator = fullMapping.joinSeparator ?? ' ';
          const parts = [value];
          for (const extraCol of fullMapping.additionalColumns) {
            const extra = this.getRowValue(row, extraCol);
            if (extra !== undefined && extra !== null && String(extra).trim() !== '') {
              parts.push(String(extra).trim());
            }
          }
          value = parts.filter(p => p !== undefined && p !== null && String(p).trim() !== '').join(separator).trim();
        }

        if (index === 0) {
          console.log(`[ImportModal]   ${katuqField} ← "${sourceColumn}" = "${value}"`);
        }

        if (value === undefined || value === null || String(value).trim() === '') {
          // Aun sin valor del Excel, aplicar defaultValue si existe
          if (fullMapping?.defaultValue !== undefined) {
            this.setNestedValue(transformedRow, katuqField, fullMapping.defaultValue, index);
          }
          return;
        }

        value = this.convertFieldValue(katuqField, value);
        this.setNestedValue(transformedRow, katuqField, value, index);
      });

      // Defaults automáticos para clientes
      if (this.type === 'customer') {
        if (!transformedRow.indicativo_celular_comprador) {
          transformedRow.indicativo_celular_comprador = '+57';
        }
      }

      // Pasar campos raw no mapeados para que el backend pueda buscar aliases (ej: "Grupo Inventario" -> categoria)
      if (this.type === 'product') {
        const mappedSourceColumns = new Set(Object.values(mappings).filter(v => v));
        Object.keys(row).forEach(col => {
          if (!mappedSourceColumns.has(col) && row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== '') {
            // Pasar con el nombre original de la columna del Excel
            transformedRow[col] = row[col];
          }
        });

        this.calculateDerivedFields(transformedRow);

        // Aplicar flags globales de produccion si estan activos
        if (this.todosParaProduccion) {
          transformedRow.seProduceInternamente = true;
          transformedRow.crearProducto = transformedRow.crearProducto || {};
          transformedRow.crearProducto.paraProduccion = true;
          transformedRow.procesoComercial = transformedRow.procesoComercial || {};
          transformedRow.procesoComercial.seProduceInternamente = true;
        }
        if (this.todosIntegranProduccion) {
          transformedRow.integraConProduccion = true;
          transformedRow.procesoComercial = transformedRow.procesoComercial || {};
          transformedRow.procesoComercial.integraConProduccion = true;
        }

        // Detectar cobertura nacional en campo ciudad
        const ciudadVal = (
          transformedRow.ciudad ||
          transformedRow.ciudadOrigen ||
          transformedRow.disponibilidad?.ciudadOrigen || ''
        ).toString().toLowerCase().trim();
        const esNacional = ['todas', 'todo el pais', 'nacional', 'cobertura nacional', 'todo el país', 'all', 'todos'].includes(ciudadVal);
        if (esNacional) {
          transformedRow.ciudades = transformedRow.ciudades || {};
          transformedRow.ciudades.coberturaNacionalOrigen = true;
          transformedRow.ciudades.coberturaNacionalEntrega = true;
          transformedRow.ciudades.ciudadesOrigen = [];
          transformedRow.ciudades.ciudadesEntrega = [];
        }

        // Canales de venta siempre activos
        transformedRow.marketplace = transformedRow.marketplace || {};
        transformedRow.marketplace.sellerCenter = true;
        transformedRow.marketplace.paginaWeb = true;
        transformedRow.marketplace.puntoDeVenta = true;

        // Exposicion activa por defecto
        transformedRow.exposicion = transformedRow.exposicion || {};
        transformedRow.exposicion.activar = true;
        transformedRow.exposicion.disponible = true;
        transformedRow.exposicion.activo = true;
      }

      if (index === 0) {
        console.log('[ImportModal] ✅ Fila transformada (primera):', transformedRow);
      }

      return transformedRow;
    });
  }

  /** Obtiene valor de una fila con matching robusto (trim + case-insensitive) */
  private getRowValue(row: any, columnName: string): any {
    if (!row || !columnName) return undefined;
    // Exacto
    if (row.hasOwnProperty(columnName)) return row[columnName];
    // Con trim
    const trimmed = columnName.trim();
    const key = Object.keys(row).find(k => k?.trim() === trimmed);
    if (key) return row[key];
    // Case-insensitive
    const lower = trimmed.toLowerCase();
    const keyCI = Object.keys(row).find(k => k?.trim().toLowerCase() === lower);
    return keyCI ? row[keyCI] : undefined;
  }

  /** Escribe un valor en un campo anidado (notación de punto) o simple */
  private setNestedValue(obj: any, katuqField: string, value: any, index: number): void {
    if (katuqField.includes('.')) {
      const parts = katuqField.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      if (this.type === 'product') {
        this.mapSimpleFieldToProductStructure(obj, katuqField, value);
      } else {
        obj[katuqField] = value;
      }
    }
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

    // Tiempo de entrega: convertir texto a minDias (numero)
    if (katuqField === 'tiempoEntrega' || katuqField === 'disponibilidad.tiempoEntrega') {
      if (typeof value === 'number') return value;
      const lower = String(value).toLowerCase().trim();
      // Mapeo de texto comun a minDias
      if (['inmediato', 'inmediata', 'immediate', '0', 'hoy', 'mismo dia'].includes(lower)) return 0;
      if (['1', '1-2', '1_2', '1-2 dias', '1 dia', '1 a 2'].includes(lower)) return 1;
      if (['3', '3-5', '3_5', '3-5 dias', '3 a 5'].includes(lower)) return 3;
      if (['5', '5-7', '5_7', '5-7 dias', '5 a 7', 'una semana', '1 semana'].includes(lower)) return 5;
      if (['7', '7-10', '7_10', '7-10 dias'].includes(lower)) return 7;
      if (['10', '10-15', '10_15'].includes(lower)) return 10;
      if (['15', '15-20', '15_20'].includes(lower)) return 15;
      // Si es un numero directo
      const parsed = parseInt(lower);
      if (!isNaN(parsed)) return parsed;
      // Default: inmediato
      return 0;
    }

    // Tipo de entrega: normalizar texto a nombreInterno
    if (katuqField === 'tipoEntrega' || katuqField === 'disponibilidad.tipoEntrega') {
      const lower = String(value).toLowerCase().trim();
      if (['domicilio', 'envio', 'envío', 'delivery', 'envio a domicilio', 'solo domicilio'].includes(lower)) return 'SOLO DOMICILIO';
      if (['recoge', 'recogida', 'pickup', 'tienda', 'solo recoge', 'punto de venta'].includes(lower)) return 'SOLO RECOGE';
      if (['ambos', 'domicilio y recoge', 'envio y recoge', 'todos'].includes(lower)) return 'ENVIO A DOMICILIO Y RECOGE';
      // Si ya viene con el valor correcto, dejarlo
      return value;
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
      'tiempo_entrega': 'disponibilidad.tiempoEntrega',
      'plazoEntrega': 'disponibilidad.tiempoEntrega',
      'plazo_entrega': 'disponibilidad.tiempoEntrega',
      'deliveryTime': 'disponibilidad.tiempoEntrega',
      'delivery_time': 'disponibilidad.tiempoEntrega',
      'formaEntrega': 'disponibilidad.tipoEntrega',
      'forma_entrega': 'disponibilidad.tipoEntrega',
      'metodoEntrega': 'disponibilidad.tipoEntrega',
      'metodo_entrega': 'disponibilidad.tipoEntrega',
      'deliveryType': 'disponibilidad.tipoEntrega',
      'delivery_type': 'disponibilidad.tipoEntrega',
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
      'masvendido': 'exposicion.masvendido',
      'categoria': 'categoriaNombre',
      'categoría': 'categoriaNombre',
      'category': 'categoriaNombre',
      'grupo': 'categoriaNombre',
      'grupoInventario': 'categoriaNombre',
      'grupo_inventario': 'categoriaNombre',
      'grupo inventario': 'categoriaNombre',
      'grupoProducto': 'categoriaNombre',
      'grupo_producto': 'categoriaNombre',
      'linea': 'categoriaNombre',
      'lineaProducto': 'categoriaNombre',
      'familia': 'categoriaNombre',
      'clasificacion': 'categoriaNombre',
      'tipo': 'categoriaNombre'
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
    link.download = `plantilla_${this.type === 'customer' ? 'clientes' : this.type === 'inventory' ? 'inventario' : 'productos'}_katuq.csv`;
    link.click();

    this.messageService.add({
      severity: 'success',
      summary: 'Plantilla Descargada',
      detail: `Completa la plantilla con tus ${this.type === 'customer' ? 'clientes' : this.type === 'inventory' ? 'inventario' : 'productos'} y subela para importar`
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
