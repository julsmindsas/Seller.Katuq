import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import { ColumnMappingService } from '../../services/import/column-mapping.service';
import { MaestroService } from '../../services/maestros/maestro.service';
import { resolverNombreApellido } from '../../utils/nombre-apellido.util';
import {
  ColumnMapping,
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
    // Por defecto en `true` a propósito, aunque el formulario manual arranque
    // en `false`: hasta D-148 el backend forzaba la cobertura nacional a `true`
    // en TODO producto importado (`(x === true) || true`, que da true siempre).
    // Ahora la columna del Excel manda, pero quien no traiga la columna tiene
    // que seguir entrando como antes — si no, una importación sin esa columna
    // dejaría el catálogo sin ciudades de origen ni de entrega.
    coberturaNacionalOrigen: true,
    coberturaNacionalEntrega: true
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

  /**
   * De dónde salió el mapeo que se está mostrando: `kai` si lo sugirió el
   * modelo, `plantilla` si se reconocieron los encabezados por su nombre
   * (archivo bajado de la plantilla, o un export de Katuq).
   */
  origenMapeo: 'kai' | 'plantilla' = 'kai';

  /**
   * Campos que la plantilla activa marca como obligatorios. Se lo pasa a la
   * tabla de mapeo, que antes lo deducía mal y sellaba TODAS las filas como
   * "Obligatorio".
   *
   * ⚠️ Es un CAMPO, no un getter, y tiene que seguir siéndolo. Como getter
   * devolvía un arreglo NUEVO en cada llamada, y al estar enlazado con
   * `[requiredFields]` Angular lo evalúa en cada ciclo de detección de
   * cambios: referencia nueva → `ngOnChanges` del hijo → el hijo reconstruye
   * `mappingRows` (otro arreglo nuevo) → la tabla se redibuja → otro ciclo…
   * Bucle infinito de detección de cambios, que congela la pestaña entera
   * ("La página no responde"). Se calcula una sola vez, al cargar la config.
   */
  camposObligatorios: string[] = [];

  /** Etiquetas legibles de la plantilla activa. Campo, no getter, por lo mismo. */
  etiquetasCampos: { [key: string]: string } = {};

  // Produccion: checkboxes globales
  todosParaProduccion = false;
  todosIntegranProduccion = false;

  // Import mode: create-only, update-only, or upsert (default)
  importMode: 'create' | 'update' | 'upsert' = 'upsert';

  // --- Categorías: aviso antes y resumen después (D-148) ---
  //
  // El buen orden es importar categorías primero y productos después, pero NO
  // es un requisito técnico: un producto sin categoría se vende igual y al
  // mismo precio. Lo que pierde es aparecer al filtrar por categoría y
  // calificar para promociones segmentadas por categoría. Por eso esto AVISA,
  // nunca bloquea.
  /** El usuario ya vio el aviso y eligió importar igual. */
  avisoCategoriaAceptado = false;
  /** Categorías que nacieron del último archivo importado (solo el nombre). */
  categoriasCreadasEnImport: string[] = [];
  /** Productos del último archivo que entraron sin categoría. */
  productosSinCategoria = 0;

  /**
   * Filas del archivo sin categoría. `-1` = no hay columna de categoría mapeada.
   *
   * Memoizado: el getter lo consume el template a través de
   * `debeAvisarCategoria`, o sea que Angular lo evalúa en CADA ciclo de
   * detección de cambios. Recorrer 5.000 filas del Excel en cada ciclo colgaría
   * el modal. Se recalcula solo cuando cambia el archivo o el mapeo.
   */
  private _sinCategoriaCache: { firma: string; valor: number } | null = null;

  get filasSinCategoria(): number {
    if (this.type !== 'product' || !this.parsedData.length) return 0;
    const col = this.confirmedMappings['categoria'];
    const firma = `${this.parsedData.length}|${col ?? ''}`;
    if (this._sinCategoriaCache?.firma === firma) return this._sinCategoriaCache.valor;

    const valor = !col
      ? -1
      : this.parsedData.filter(row => {
          const v = this.getRowValue(row, col);
          return v === undefined || v === null || String(v).trim() === '';
        }).length;

    this._sinCategoriaCache = { firma, valor };
    return valor;
  }

  /** ¿Hay que mostrar el aviso de categorías antes de importar? */
  get debeAvisarCategoria(): boolean {
    if (this.type !== 'product' || this.avisoCategoriaAceptado) return false;
    return this.filasSinCategoria !== 0;
  }

  get textoAvisoCategoria(): string {
    const total = this.parsedData.length;
    const sin = this.filasSinCategoria;
    if (sin === -1) {
      return `Ninguna columna quedó asignada a Categoría, así que los ${total} productos van a entrar sin categoría.`;
    }
    return `${sin} de ${total} filas no tienen categoría.`;
  }

  // Mobile: Mapping Fields for Cards
  mappingFields: MappingField[] = [];
  availableColumns: { label: string; value: string }[] = [];

  acceptedFormats = '.xlsx,.xls,.json';

  // Plantilla UNIFICADA estándar de clientes (todas las empresas usan la misma).
  // Mapea cada encabezado (normalizado) al campo destino, usando los nombres EXACTOS
  // que leen los formularios de Facturación y Entrega (ej: facturación usa `correo`,
  // entrega usa `codigoPV`) para que los datos carguen bien en sus respectivos forms.
  // '__regimenIva' y '__etiquetas' se guardan como ETIQUETAS (no como campos nuevos).
  private readonly STANDARD_CUSTOMER_HEADERS: { [normHeader: string]: string } = {
    // Datos básicos del cliente (fuente única de documento / tipo doc / correo / nombre / celular)
    'nombre/razon social': 'nombres_completos',
    'apellidos': 'apellidos_completos',
    'apellidos completos': 'apellidos_completos',
    'tipo': 'tipo_documento_comprador',
    'cedula/nit': 'documento',
    'digito verificacion': '__digitoVerificacion',
    'correo electronico': 'correo_electronico_comprador',
    'correo electronico de contacto comercial': 'correo_electronico_comprador',
    // Dos teléfonos separados: propio (llamadas) y WhatsApp. Se aceptan alias
    // y la columna combinada antigua ('celular/whatsapp') por compatibilidad.
    'telefono propio': 'numero_celular_comprador',
    'celular': 'numero_celular_comprador',
    'celular/whatsapp': 'numero_celular_comprador',
    'telefono whatsapp': 'numero_celular_whatsapp',
    'whatsapp': 'numero_celular_whatsapp',
    // Datos de facturación (razón social, tipo doc, NIT/documento y correo). Pueden
    // diferir del básico — el NIT de facturación suele ser distinto. Si se dejan
    // vacíos, heredan del básico. Sin teléfono (no se usa en facturación).
    'alias facturacion': 'datosFacturacionElectronica.alias',
    'razon social facturacion': 'datosFacturacionElectronica.nombres',
    'tipo documento facturacion': 'datosFacturacionElectronica.tipoDocumento',
    'documento facturacion': 'datosFacturacionElectronica.documento',
    'documento/nit facturacion': 'datosFacturacionElectronica.documento',
    'nit facturacion': 'datosFacturacionElectronica.documento',
    'correo electronico facturacion': 'datosFacturacionElectronica.correo',
    // Datos de entrega (nombres de campo del formulario)
    'alias entrega': 'datosEntrega.alias',
    'nombres entrega': 'datosEntrega.nombres',
    'apellidos entrega': 'datosEntrega.apellidos',
    'celular entrega': 'datosEntrega.celular',
    'direccion de entrega': 'datosEntrega.direccionEntrega',
    'barrio': 'datosEntrega.barrio',
    'nombre unidad / edificio': 'datosEntrega.nombreUnidad',
    'unidad/conjunto': 'datosEntrega.nombreUnidad',
    'torre / apto / oficina': 'datosEntrega.especificacionesInternas',
    'especificaciones internas': 'datosEntrega.especificacionesInternas',
    'observaciones': 'datosEntrega.observaciones',
    'pais': 'datosEntrega.pais',
    'departamento': 'datosEntrega.departamento',
    'ciudad': 'datosEntrega.ciudad',
    'codigo postal': 'datosEntrega.codigoPV',
    // Etiquetas
    'regimen iva etiqueta': '__regimenIva',
    'tipo de regimen iva': '__regimenIva',
    'etiquetas': '__etiquetas',
  };

  // Se activa cuando el archivo subido coincide con la plantilla estándar de clientes.
  private standardCustomerTemplate = false;
  // normHeader → nombre real de la columna en el archivo subido.
  private standardColResolver: { [normHeader: string]: string } = {};

  /** Normaliza un encabezado para matching: minúsculas, sin acentos, espacios colapsados.
   *  También corrige mojibake (UTF-8 leído como Latin-1 cuando Excel abre un CSV sin BOM). */
  private normHeader(h: string): string {
    return String(h == null ? '' : h)
      .toLowerCase()
      // Mojibake común: é→ã©, ó→ã³, á→ã¡, í→ã­, ñ→ã±, ú→ãº
      .replace(/ã©/g, 'e').replace(/ã³/g, 'o').replace(/ã¡/g, 'a')
      .replace(/ã­/g, 'i').replace(/ã±/g, 'n').replace(/ãº/g, 'u')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 /]+/g, '') // limpia cualquier resto no-ASCII (©, ³, etc.)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Si las columnas del archivo coinciden con la plantilla estándar de clientes,
   * construye el mapeo determinísticamente (sin IA). Devuelve null si no aplica.
   */
  /**
   * Coincidencias exactas entre los encabezados del archivo y los de la
   * plantilla activa. Sin IA: comparación de nombres normalizados.
   */
  private matchTemplateHeaders(): { [field: string]: ColumnMapping } {
    const mappings: { [field: string]: ColumnMapping } = {};
    if (!this.config) return mappings;

    const porEncabezado = new Map<string, string>();
    for (const col of this.config.templateColumns) {
      porEncabezado.set(this.normHeader(col.header), col.field);
    }

    for (const col of this.sourceColumns) {
      const field = porEncabezado.get(this.normHeader(col));
      if (field && !mappings[field]) {
        mappings[field] = {
          sourceColumn: col,
          confidence: 100,
          reasoning: 'Coincide con la plantilla estándar de Katuq',
        };
      }
    }
    return mappings;
  }

  private construirResultadoMapeo(mappings: { [field: string]: ColumnMapping }): ColumnMappingResult {
    return {
      success: true,
      type: this.type,
      mappings,
      unmappedRequired: [],
      warnings: [],
      suggestions: [],
      metadata: {
        columnsAnalyzed: this.sourceColumns.length,
        sampleRowsUsed: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Atajo determinístico para la plantilla de PRODUCTOS, equivalente al que ya
   * existía para clientes.
   *
   * Los encabezados de la plantilla son fijos y son los mismos que produce el
   * export de productos, así que reconocerlos no necesita IA. Gana en tres
   * frentes: el archivo exportado se reimporta sin intervención, es instantáneo
   * y no gasta llamadas al modelo, y el importador deja de depender de que KAI
   * esté arriba (en local KAI ni siquiera corre: vive en otro repo, puerto 3890).
   *
   * Devuelve null si el archivo no se parece a la plantilla, para que lo
   * resuelva KAI como hasta ahora.
   */
  private buildStandardProductMapping(): ColumnMappingResult | null {
    if (this.type !== 'product') return null;

    const mappings = this.matchTemplateHeaders();
    // Sin referencia y sin título no es nuestra plantilla: que decida KAI.
    if (!mappings['referencia'] || !mappings['titulo']) return null;

    return this.construirResultadoMapeo(mappings);
  }

  /**
   * Atajo determinístico para las plantillas que NO tienen uno propio:
   * categorías e inventario.
   *
   * Clientes y productos ya lo tenían (`buildStandardCustomerMapping` /
   * `buildStandardProductMapping`) y por eso "importan de una". Categorías e
   * inventario no, así que llamaban a KAI SIEMPRE — incluso con un archivo
   * bajado de la propia plantilla, donde los encabezados coinciden exactos y
   * no hay nada que deducir. El usuario se quedaba mirando "analizando" hasta
   * que la llamada fallaba, y recién ahí aparecía este mismo mapeo por nombre.
   *
   * Se acepta el atajo solo si TODOS los campos obligatorios de la plantilla
   * quedaron reconocidos; si falta alguno, el archivo no es la plantilla y que
   * lo resuelva KAI.
   */
  private buildStandardGenericMapping(): ColumnMappingResult | null {
    if (this.type !== 'category' && this.type !== 'inventory') return null;
    if (!this.config) return null;

    const mappings = this.matchTemplateHeaders();
    const obligatorios = this.config.templateColumns.filter(c => c.required).map(c => c.field);
    const faltaAlguno = obligatorios.some(f => !mappings[f]);
    if (faltaAlguno || Object.keys(mappings).length < 2) return null;

    return this.construirResultadoMapeo(mappings);
  }

  private buildStandardCustomerMapping(): ColumnMappingResult | null {
    if (this.type !== 'customer') return null;
    const resolver: { [k: string]: string } = {};
    const mappings: { [k: string]: ColumnMapping } = {};
    let matched = 0;
    for (const col of this.sourceColumns) {
      const nh = this.normHeader(col);
      const field = this.STANDARD_CUSTOMER_HEADERS[nh];
      if (field && !resolver[nh]) {
        resolver[nh] = col;
        if (!mappings[field]) {
          mappings[field] = { sourceColumn: col, confidence: 100, reasoning: 'Plantilla estándar Katuq' };
        }
        matched++;
      }
    }
    const hasKey = !!resolver['nombre/razon social'] && !!resolver['cedula/nit'];
    if (!hasKey || matched < 4) { this.standardCustomerTemplate = false; return null; }
    this.standardColResolver = resolver;
    this.standardCustomerTemplate = true;
    return {
      success: true,
      type: 'customer',
      mappings,
      unmappedRequired: [],
      warnings: [],
      suggestions: [],
      metadata: { columnsAnalyzed: this.sourceColumns.length, sampleRowsUsed: 0, timestamp: new Date().toISOString() },
    };
  }

  /**
   * Transform propio de la plantilla estándar: construye cada cliente con la estructura
   * EXACTA que leen los formularios — datosFacturacionElectronica[] y datosEntrega[] como
   * arrays con los nombres de campo del form (facturación usa `correo`, entrega `codigoPV`).
   * El backend preserva los arrays tal cual. Las etiquetas se separan por coma y el
   * régimen de IVA se agrega como una etiqueta más.
   */
  private transformStandardCustomerTemplate(rows: any[]): any[] {
    const resolver = this.standardColResolver;
    return rows.map(row => {
      const g = (normKey: string): string => {
        const colName = resolver[normKey];
        if (!colName) return '';
        const v = row[colName];
        return v == null ? '' : String(v).trim();
      };

      const nombreRaw = g('nombre/razon social');
      const tipoDoc = g('tipo');
      // Persona natural: si la columna "Apellidos" viene vacía se parte el nombre
      // completo. Con tipo NIT no se toca (razón social). El formulario de cliente
      // exige apellidos, así que sin esto el registro importado no se puede editar
      // sin retipearlos a mano. Ver shared/utils/nombre-apellido.util.
      const { nombres, apellidos } = resolverNombreApellido(
        nombreRaw, g('apellidos') || g('apellidos completos'), tipoDoc);
      // Documento: si viene el dígito de verificación en columna aparte, se concatena
      // con guión (815003461 + 2 → "815003461-2"). Idempotente si ya trae guión.
      const docBase = g('cedula/nit');
      const dv = g('digito verificacion');
      const doc = (docBase && dv && !docBase.includes('-')) ? `${docBase}-${dv}` : docBase;
      const correoCom = g('correo electronico') || g('correo electronico de contacto comercial');
      // Teléfono propio (llamadas) y WhatsApp por separado. Si solo viene uno,
      // WhatsApp cae al propio (convención previa: no dejar el WhatsApp vacío).
      const cel = g('telefono propio') || g('celular') || g('celular/whatsapp');
      const whatsapp = g('telefono whatsapp') || g('whatsapp') || cel;

      // Etiquetas: régimen IVA (si viene) + columna "Etiquetas" separada por coma.
      const regimenIva = g('regimen iva etiqueta') || g('tipo de regimen iva');
      const etiquetasRaw = g('etiquetas');
      const etiquetas = [
        ...(regimenIva ? [regimenIva] : []),
        ...etiquetasRaw.split(',').map(s => s.trim()).filter(s => s !== ''),
      ];

      // Facturación tiene UN solo campo de nombre ("Razón Social / Nombre"), que el
      // formulario arma como nombres + apellidos → aquí va el nombre COMPLETO, no
      // el de pila suelto.
      const nombreCompleto = [nombres, apellidos].filter(Boolean).join(' ');

      // Facturación: identidad se auto-rellena desde los básicos (sin redundancia en la
      // plantilla); lo propio es el correo de facturación (puede diferir del comercial).
      const datosFacturacion = {
        alias: g('alias facturacion') || 'Principal',
        nombres: g('razon social facturacion') || nombreCompleto,
        tipoDocumento: g('tipo documento facturacion') || tipoDoc,
        documento: g('documento facturacion') || g('documento/nit facturacion') || g('nit facturacion') || doc,
        correo: g('correo electronico facturacion') || correoCom,
      };

      // Entrega SÍ tiene nombres y apellidos separados en el formulario: si no
      // vienen columnas propias de entrega, heredan los del cliente ya separados.
      const datosEntrega = {
        alias: g('alias entrega') || 'Principal',
        nombres: g('nombres entrega') || nombres,
        apellidos: g('apellidos entrega') || apellidos,
        indicativoCel: '57',
        celular: g('celular entrega') || cel,
        direccionEntrega: g('direccion de entrega'),
        barrio: g('barrio'),
        nombreUnidad: g('nombre unidad / edificio') || g('unidad/conjunto'),
        especificacionesInternas: g('torre / apto / oficina') || g('especificaciones internas'),
        observaciones: g('observaciones'),
        pais: g('pais') || 'Colombia',
        departamento: g('departamento'),
        ciudad: g('ciudad'),
        codigoPV: g('codigo postal'),
      };

      return {
        nombres_completos: nombres,
        apellidos_completos: apellidos,
        tipo_documento_comprador: tipoDoc,
        documento: doc,
        correo_electronico_comprador: correoCom,
        numero_celular_comprador: cel,
        numero_celular_whatsapp: whatsapp,
        etiquetas: Array.from(new Set(etiquetas)),
        datosFacturacionElectronica: [datosFacturacion],
        datosEntrega: [datosEntrega],
      };
    });
  }

  // Configurations for each type
  private customerConfig: ImportConfig = {
    title: 'Importar Clientes',
    endpoint: '/v1/onboarding/import-customers',
    payloadKey: 'customers',
    maxFileSize: 5000000, // 5MB
    templateColumns: [
      // ── Datos básicos del cliente (documento, tipo doc y correo van UNA sola vez;
      //    se reutilizan automáticamente en facturación y entrega) ──
      { field: 'nombres_completos', header: 'Nombre/Razon Social', required: true, example: 'TRIADA EMA S.A.' },
      // Persona natural: apellidos van acá. Si se deja vacía y el tipo NO es NIT,
      // el importador parte el nombre completo (heurística Colombia).
      { field: 'apellidos_completos', header: 'Apellidos', required: false, example: '' },
      { field: 'tipo_documento_comprador', header: 'Tipo', required: false, example: 'NIT' },
      { field: 'documento', header: 'Cédula/NIT', required: true, example: '815003461' },
      { field: '__digitoVerificacion', header: 'Digito Verificación', required: false, example: '2' },
      { field: 'correo_electronico_comprador', header: 'Correo Electrónico', required: true, example: 'contacto@empresa.com' },
      { field: 'numero_celular_comprador', header: 'Teléfono Propio', required: true, example: '3001234567' },
      { field: 'numero_celular_whatsapp', header: 'Teléfono WhatsApp', required: false, example: '3007654321' },
      // ── Datos de facturación (pueden diferir del básico; el NIT de facturación suele
      //    ser distinto). Si se dejan vacíos, heredan del básico. Sin teléfono. ──
      { field: 'datosFacturacionElectronica.nombres', header: 'Razón Social Facturación', required: false, example: 'TRIADA EMA S.A.' },
      { field: 'datosFacturacionElectronica.tipoDocumento', header: 'Tipo Documento Facturación', required: false, example: 'NIT' },
      { field: 'datosFacturacionElectronica.documento', header: 'Documento/NIT Facturación', required: false, example: '901555444-3' },
      { field: 'datosFacturacionElectronica.correo', header: 'Correo Electrónico Facturación', required: false, example: 'facturacion@empresa.com' },
      // ── Datos de entrega (contacto que recibe + dirección + detalles). Si los
      //    nombres/apellidos de entrega se dejan vacíos, heredan los del cliente. ──
      { field: 'datosEntrega.nombres', header: 'Nombres Entrega', required: false, example: '' },
      { field: 'datosEntrega.apellidos', header: 'Apellidos Entrega', required: false, example: '' },
      { field: 'datosEntrega.celular', header: 'Celular Entrega', required: false, example: '' },
      { field: 'datosEntrega.direccionEntrega', header: 'Direccion De Entrega', required: false, example: 'Calle 123 # 45 - 67' },
      { field: 'datosEntrega.barrio', header: 'Barrio', required: false, example: 'El Poblado' },
      { field: 'datosEntrega.nombreUnidad', header: 'Nombre Unidad / Edificio', required: false, example: 'Conjunto Los Robles' },
      { field: 'datosEntrega.especificacionesInternas', header: 'Torre / Apto / Oficina', required: false, example: 'Torre 4 Apto 514' },
      { field: 'datosEntrega.observaciones', header: 'Observaciones', required: false, example: '' },
      { field: 'datosEntrega.pais', header: 'Pais', required: false, example: 'Colombia' },
      { field: 'datosEntrega.departamento', header: 'Departamento', required: false, example: 'Antioquia' },
      { field: 'datosEntrega.ciudad', header: 'Ciudad', required: false, example: 'Medellin' },
      { field: 'datosEntrega.codigoPV', header: 'Codigo Postal', required: false, example: '050021' },
      // ── Etiquetas (ambas se guardan en el array `etiquetas` del cliente). El régimen
      //    de IVA es una etiqueta más; tiene su propia columna para asegurar el valor estándar. ──
      { field: '__regimenIva', header: 'Régimen IVA (etiqueta)', required: false, example: 'Responsable de IVA' },
      { field: '__etiquetas', header: 'Etiquetas', required: false, example: 'VIP, Frecuente' }
    ],
    fieldLabels: {
      // Básicos
      'documento': 'Documento/NIT',
      '__digitoVerificacion': 'Dígito de Verificación',
      'nombres_completos': 'Nombre/Razón Social',
      'apellidos_completos': 'Apellidos',
      'correo_electronico_comprador': 'Correo Contacto Comercial',
      'numero_celular_comprador': 'Teléfono Propio',
      'numero_celular_whatsapp': 'Teléfono WhatsApp',
      'tipo_documento_comprador': 'Tipo de Documento',
      // Facturación (nombres del formulario)
      'datosFacturacionElectronica.alias': 'Alias (Facturación)',
      'datosFacturacionElectronica.nombres': 'Razón Social (Facturación)',
      'datosFacturacionElectronica.tipoDocumento': 'Tipo Documento (Facturación)',
      'datosFacturacionElectronica.documento': 'Documento (Facturación)',
      'datosFacturacionElectronica.correo': 'Correo (Facturación)',
      // Entrega (nombres del formulario)
      'datosEntrega.alias': 'Alias (Entrega)',
      'datosEntrega.nombres': 'Nombres (Entrega)',
      'datosEntrega.apellidos': 'Apellidos (Entrega)',
      'datosEntrega.celular': 'Celular (Entrega)',
      'datosEntrega.direccionEntrega': 'Dirección (Entrega)',
      'datosEntrega.barrio': 'Barrio (Entrega)',
      'datosEntrega.nombreUnidad': 'Nombre Unidad / Edificio (Entrega)',
      'datosEntrega.especificacionesInternas': 'Torre / Apto / Oficina (Entrega)',
      'datosEntrega.observaciones': 'Observaciones (Entrega)',
      'datosEntrega.pais': 'País (Entrega)',
      'datosEntrega.departamento': 'Departamento (Entrega)',
      'datosEntrega.ciudad': 'Ciudad (Entrega)',
      'datosEntrega.codigoPV': 'Código Postal (Entrega)',
      // Etiquetas
      '__regimenIva': 'Régimen de IVA (etiqueta)',
      '__etiquetas': 'Etiquetas'
    }
  };

  private productConfig: ImportConfig = {
    title: 'Importar Productos',
    endpoint: '/v1/onboarding/import-products',
    payloadKey: 'products',
    maxFileSize: 50000000, // 50MB para importaciones masivas
    // Contrato de columnas compartido con el EXPORT de productos
    // (`components/productos/productos.component.ts` → `exportColumnas`).
    // Los encabezados son idénticos allá y acá, para que el ciclo
    // exportar → corregir en Excel → reimportar funcione: el import hace upsert
    // por referencia. Si cambiás un encabezado acá, cambialo allá también.
    //
    // Cada encabezado dice qué se escribe en la celda: `(SI/NO)` en los
    // booleanos y la unidad en los numéricos.
    //
    // NO va `Cantidad Disponible`: escribía en `disponibilidad.cantidadDisponible`,
    // que es un campo muerto (nadie lo lee). El stock real vive en la colección
    // `inventory` por bodega y se carga con "Importar inventario", que sí resuelve
    // referencia → producto y bodega.
    templateColumns: [
      { field: 'referencia', header: 'Referencia (SKU)', required: true, example: 'PROD001' , help: "El código único del producto. Es la llave: si ya existe, el producto se actualiza en vez de duplicarse." },
      { field: 'codigoBarras', header: 'Codigo de Barras', required: false, example: '7701234567890' },
      { field: 'titulo', header: 'Titulo', required: true, example: 'Camiseta Basica' , help: "El nombre del producto tal como lo ve el cliente." },
      { field: 'descripcion', header: 'Descripcion', required: false, example: 'Camiseta de algodon' },
      { field: 'marca', header: 'Marca', required: false, example: 'MiMarca' },
      { field: 'fechaInicial', header: 'Fecha Inicial (AAAA-MM-DD)', required: false, example: '2026-01-01' , help: "Desde cuándo se vende. Formato AAAA-MM-DD (2026-01-31)." },
      { field: 'fechaFinal', header: 'Fecha Final (AAAA-MM-DD)', required: false, example: '2026-12-31' , help: "Hasta cuándo se vende. Formato AAAA-MM-DD." },
      // Categorías: los tres niveles del árbol. Nivel 2 y 3 son opcionales —
      // las empresas que no manejan subcategorías dejan las celdas vacías y
      // el producto queda colgado del nivel que sí llenaron.
      { field: 'categoria', header: 'Categoria', required: false, example: 'Ropa' , help: "La categoría principal. Si no existe, se crea sola y se te avisa al terminar." },
      { field: 'subcategoria', header: 'Subcategoria (Nivel 2)', required: false, example: 'Hombre' , help: "Opcional. Solo si tu empresa maneja subcategorías; si no, dejala vacía." },
      { field: 'subsubcategoria', header: 'Sub-subcategoria (Nivel 3)', required: false, example: 'Camisetas' , help: "Opcional. Tercer nivel del árbol de categorías." },
      { field: 'categoriaConsecutivo', header: 'Id Categoria (opcional, enlace a SIIGO)', required: false, example: '1005' , help: "Solo si enlazás la categoría con SIIGO. Si no usás SIIGO, dejala vacía." },
      { field: 'precioUnitarioSinIva', header: 'Precio sin IVA', required: true, example: '50000' , help: "Precio base, sin impuesto. El precio con IVA lo calcula el sistema." },
      { field: 'valorIva', header: 'IVA (%)', required: false, example: '19' },
      { field: 'cantidadMinVenta', header: 'Cantidad Minima de Venta', required: false, example: '1' },
      { field: 'inventarioSeguridad', header: 'Inventario de Seguridad', required: false, example: '10' },
      { field: 'inventariable', header: 'Inventariable (SI/NO)', required: false, example: 'SI' },
      { field: 'activar', header: 'Activo (SI/NO)', required: false, example: 'SI' },
      { field: 'disponible', header: 'Disponible (SI/NO)', required: false, example: 'SI' },
      // Los dos son SELECTS que se llenan del maestro de la empresa, y cada
      // empresa define los suyos con texto libre. El ejemplo se completa con
      // una opción REAL de la empresa al descargar la plantilla; el que había
      // acá ("Envio a domicilio y recoge", "3") no existe en ninguna y hacía
      // que el campo entrara vacío.
      { field: 'tipoEntrega', header: 'Tipo de Entrega', required: false, example: '', help: 'Tiene que ser una de las opciones de tu empresa (ver abajo). Se configuran en Maestros.' },
      { field: 'tiempoEntrega', header: 'Tiempo de Entrega', required: false, example: '', help: 'Tiene que ser una de las opciones de tu empresa (ver abajo). Se configuran en Maestros.' },
      { field: 'largoProductoCm', header: 'Largo (cm)', required: false, example: '30' },
      { field: 'altoProductoCm', header: 'Alto (cm)', required: false, example: '10' },
      { field: 'anchoProductoCm', header: 'Ancho (cm)', required: false, example: '20' },
      { field: 'pesoUnitarioProductoKg', header: 'Peso (kg)', required: false, example: '0.5' },
      { field: 'etiquetas', header: 'Etiquetas (separadas por coma)', required: false, example: 'algodon, basica, unisex' },
      { field: 'garantiasProducto', header: 'Garantias', required: false, example: 'Garantia de 1 año' },
      { field: 'caracAdicionales', header: 'Caracteristicas Adicionales', required: false, example: 'Material 100% algodon' },
      { field: 'restriccionesProducto', header: 'Restricciones', required: false, example: 'No apto para menores de 3 años' },
      { field: 'cuidadoConsumo', header: 'Cuidado y Consumo', required: false, example: 'Lavar en agua fria' },
      { field: 'seProduceInternamente', header: 'Requiere Produccion (SI/NO)', required: false, example: 'NO' },
      { field: 'integraConProduccion', header: 'Integra Software Produccion? (SI/NO)', required: false, example: 'NO' },
      { field: 'tiempoProduccion', header: 'Tiempo Produccion', required: false, example: '3 dias' },
      { field: 'softwareProduccion', header: 'Software Produccion', required: false, example: 'ERP Interno' },
      // --- Exposición (las casillas de la pestaña Exposición del formulario) ---
      { field: 'posicion', header: 'Posicion', required: false, example: '1' },
      { field: 'oferta', header: 'En Oferta (SI/NO)', required: false, example: 'NO' },
      { field: 'recomendado', header: 'Recomendado (SI/NO)', required: false, example: 'NO' },
      { field: 'destacado', header: 'Destacado (SI/NO)', required: false, example: 'NO' },
      { field: 'nuevo', header: 'Nuevo (SI/NO)', required: false, example: 'SI' },
      { field: 'masvendido', header: 'Mas Vendido (SI/NO)', required: false, example: 'NO' },
      // --- Canales de venta ---
      { field: 'sellerCenter', header: 'Seller Center (SI/NO)', required: false, example: 'SI' },
      { field: 'paginaWeb', header: 'Pagina Web (SI/NO)', required: false, example: 'SI' },
      { field: 'puntoDeVenta', header: 'Punto de Venta (SI/NO)', required: false, example: 'SI' },
      // --- Ciudad ---
      // Si la cobertura nacional va en SI, la lista de ciudades se ignora
      // (mismo comportamiento que el toggle en pantalla, que limpia la lista).
      { field: 'coberturaNacionalOrigen', header: 'Cobertura Nacional Origen (SI/NO)', required: false, example: 'SI' , help: "SI = se despacha desde todo el país (y se ignora la lista de ciudades de origen)." },
      { field: 'coberturaNacionalEntrega', header: 'Cobertura Nacional Entrega (SI/NO)', required: false, example: 'SI' , help: "SI = se entrega a todo el país (y se ignora la lista de ciudades de entrega)." },
      { field: 'ciudadesOrigen', header: 'Ciudades de Origen (separadas por coma)', required: false, example: 'Bogota, Medellin' , help: "Ciudades desde donde se despacha, separadas por coma. Se ignora si la cobertura nacional de origen va en SI." },
      { field: 'ciudadesEntrega', header: 'Ciudades de Entrega (separadas por coma)', required: false, example: 'Bogota, Cali' , help: "Ciudades a donde se entrega, separadas por coma. Se ignora si la cobertura nacional de entrega va en SI." }
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
      'referencia': 'Referencia (SKU)',
      'titulo': 'Titulo',
      'descripcion': 'Descripcion',
      'precioUnitarioSinIva': 'Precio sin IVA',
      'valorIva': 'IVA (%)',
      'cantidadDisponible': 'Cantidad Disponible (se ignora: el stock va por Importar inventario)',
      'cantidadMinVenta': 'Cantidad Minima de Venta',
      'inventarioSeguridad': 'Inventario de Seguridad',
      'inventariable': 'Inventariable (SI/NO)',
      'largoProductoCm': 'Largo (cm)',
      'altoProductoCm': 'Alto (cm)',
      'anchoProductoCm': 'Ancho (cm)',
      'pesoUnitarioProductoKg': 'Peso (kg)',
      'etiquetas': 'Etiquetas (separadas por coma)',
      'dimensiones.largoProductoCm': 'Largo (cm)',
      'dimensiones.altoProductoCm': 'Alto (cm)',
      'dimensiones.anchoProductoCm': 'Ancho (cm)',
      'dimensiones.pesoUnitarioProductoKg': 'Peso (kg)',
      'exposicion.etiquetas': 'Etiquetas (separadas por coma)',
      'marca': 'Marca',
      'codigoBarras': 'Codigo de Barras',
      'categoria': 'Categoria/Grupo/Linea/Familia',
      'subcategoria': 'Subcategoria (Nivel 2)',
      'subsubcategoria': 'Sub-subcategoria (Nivel 3)',
      'categoriaConsecutivo': 'Id Categoria (enlace a SIIGO, opcional)',
      'fechaInicial': 'Fecha Inicial',
      'fechaFinal': 'Fecha Final',
      'crearProducto.fechaInicial': 'Fecha Inicial',
      'crearProducto.fechaFinal': 'Fecha Final',
      'posicion': 'Posicion',
      'oferta': 'En Oferta (SI/NO)',
      'recomendado': 'Recomendado (SI/NO)',
      'destacado': 'Destacado (SI/NO)',
      'nuevo': 'Nuevo (SI/NO)',
      'masvendido': 'Mas Vendido (SI/NO)',
      'sellerCenter': 'Seller Center (SI/NO)',
      'paginaWeb': 'Pagina Web (SI/NO)',
      'puntoDeVenta': 'Punto de Venta (SI/NO)',
      'coberturaNacionalOrigen': 'Cobertura Nacional Origen (SI/NO)',
      'coberturaNacionalEntrega': 'Cobertura Nacional Entrega (SI/NO)',
      'ciudadesOrigen': 'Ciudades de Origen (separadas por coma)',
      'ciudadesEntrega': 'Ciudades de Entrega (separadas por coma)',
      'garantiasProducto': 'Garantias',
      'caracAdicionales': 'Caracteristicas Adicionales',
      'restriccionesProducto': 'Restricciones',
      'cuidadoConsumo': 'Cuidado y Consumo',
      'tipoEntrega': 'Tipo/Forma de Entrega',
      'tiempoEntrega': 'Tiempo/Plazo de Entrega',
      'activar': 'Activo (SI/NO)',
      'disponible': 'Disponible (SI/NO)',
      'seProduceInternamente': 'Requiere Produccion (SI/NO)',
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
    // ⚠️ Dos formas EXCLUYENTES de expresar la misma jerarquía. Hay que elegir
    // una para todo el archivo; mezclarlas hace que se ignore la otra:
    //
    //  A) Por niveles — una fila = una ruta completa:
    //     | Categoría (Nivel 1) | Subcategoría (Nivel 2) | Sub-subcategoría |
    //     | Ropa                | Hombre                 | Camisetas        |
    //
    //  B) Por padre — una fila = una categoría, que apunta a la de arriba:
    //     | Categoría (Nivel 1) | Código | Categoría Padre |
    //     | Ropa                | ROPA   |                 |
    //     | Hombre              | HOM    | Ropa            |
    //     | Camisetas           | CAM    | Hombre          |
    //
    // El encabezado del nivel 1 decía solo "Nombre", y al lado de "Categoría
    // Padre" se leía como si el padre fuera la categoría principal y "Nombre"
    // una subcategoría. Es al revés: el nivel 1 ES la categoría principal.
    templateColumns: [
      {
        field: 'categoria_nivel1', header: 'Categoría (Nivel 1)', required: true, example: 'Ropa',
        help: 'La categoría principal. Es lo único obligatorio: sin esto la fila no dice qué categoría estás creando.',
      },
      {
        field: 'categoria_nivel2', header: 'Subcategoría (Nivel 2) - opcional', required: false, example: 'Hombre',
        help: 'Cuelga de la categoría del Nivel 1. Dejala vacía si esa categoría no tiene subcategorías.',
      },
      {
        field: 'categoria_nivel3', header: 'Sub-subcategoría (Nivel 3) - opcional', required: false, example: 'Camisetas',
        help: 'Cuelga de la subcategoría del Nivel 2. Es el último nivel que maneja el catálogo.',
      },
      {
        field: 'codigo', header: 'Código - opcional', required: false, example: 'ROPA',
        help: 'Código interno tuyo para la categoría. No lo usa el catálogo; sirve para referenciarla desde otro archivo.',
      },
      {
        field: 'imagen', header: 'URL Imagen - opcional', required: false, example: 'https://ejemplo.com/imagen.jpg',
        help: 'Dirección web de la imagen de la categoría.',
      },
      {
        field: 'activo', header: 'Activo (SI/NO) - opcional', required: false, example: 'SI',
        help: 'SI o NO. Si la dejás vacía, la categoría entra activa.',
      },
      {
        field: 'posicion', header: 'Posición - opcional', required: false, example: '1',
        help: 'En qué orden aparece dentro de su nivel. Vacío = al final.',
      },
      {
        field: 'consecutivo', header: 'Id Categoria - opcional', required: false, example: '1005',
        help: 'Solo si enlazás esta categoría con SIIGO. Si no usás SIIGO, dejala vacía.',
      },
      // Va ÚLTIMA y con el nombre más explícito posible: es de un formato
      // alternativo y llenarla junto con los niveles hace que el importador
      // procese el archivo por el otro camino y descarte los niveles 2 y 3.
      {
        field: 'categoria_padre', header: 'DEJAR VACÍA - Categoría Padre (otro formato)', required: false, example: '',
        help: 'NO la llenes si usás las columnas de Nivel 1/2/3. Es una forma ALTERNATIVA de armar el árbol, para archivos que vienen de otro sistema: una fila por categoría, indicando de cuál cuelga. Usá una forma o la otra, nunca las dos.',
      },
    ],
    fieldLabels: {
      'categoria_nivel1': 'Categoría principal (Nivel 1)',
      'codigo': 'Código / Referencia',
      'categoria_nivel2': 'Subcategoría (Nivel 2)',
      'categoria_nivel3': 'Sub-subcategoría (Nivel 3)',
      'categoria_padre': 'Categoría Padre (otro formato — dejar vacía)',
      'imagen': 'URL de Imagen',
      'activo': 'Activo (SI/NO)',
      'posicion': 'Posición / Orden',
      'consecutivo': 'Id Categoria (enlace a SIIGO, opcional)',
    }
  };

  constructor(
    private messageService: MessageService,
    private http: HttpClient,
    private columnMappingService: ColumnMappingService,
    private maestroService: MaestroService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.cargarMaestrosEntrega();
  }

  /**
   * Maestros de entrega de la empresa (`/v1/tipoentrega/all`,
   * `/v1/tiemposentrega/all`).
   *
   * Los dos campos son SELECTS en el formulario y sus opciones salen de estas
   * colecciones, **definidas por empresa y con texto libre**: hay empresas con
   * `nacional`/`express`/`estandar` y otras con `DOMICILIO` o `PEDIDO AL POR
   * MAYOR`; en tiempos hay `1_2`, `24_horas` y hasta `Solicítalo con 1 día`.
   *
   * Antes el importador escribía valores INVENTADOS (`SOLO DOMICILIO`,
   * `ENVIO A DOMICILIO Y RECOGE`, o un número para el tiempo), que no existen
   * en el maestro de ninguna empresa. El producto quedaba con un valor que el
   * select no puede mostrar, así que los dos campos salían vacíos siempre.
   */
  private tiposEntrega: any[] = [];
  private tiemposEntrega: any[] = [];
  /** Valores del Excel que no existen en el maestro, para reportarlos. */
  entregaSinHomologar: string[] = [];

  private cargarMaestrosEntrega(): void {
    if (this.type !== 'product') return;
    this.maestroService.getTipoEntrega().subscribe({
      next: (r: any) => {
        this.tiposEntrega = Array.isArray(r) ? r : [];
        this.opcionesTipoEntrega = this.tiposEntrega.map(t => t?.nombreInterno).filter(Boolean);
      },
      error: () => { this.tiposEntrega = []; this.opcionesTipoEntrega = []; },
    });
    this.maestroService.getTiempoEntrega().subscribe({
      next: (r: any) => {
        this.tiemposEntrega = Array.isArray(r) ? r : [];
        this.opcionesTiempoEntrega = this.tiemposEntrega.map(t => t?.nombreInterno).filter(Boolean);
      },
      error: () => { this.tiemposEntrega = []; this.opcionesTiempoEntrega = []; },
    });
  }

  /**
   * Opciones válidas de la empresa, para mostrarlas cuando algo no coincide.
   *
   * Campos y no getters: van enlazados al template y un getter que arma un
   * arreglo nuevo en cada ciclo de detección de cambios ya congeló esta
   * pantalla una vez. Se llenan al cargar los maestros.
   */
  opcionesTipoEntrega: string[] = [];
  opcionesTiempoEntrega: string[] = [];

  /**
   * Busca el valor del Excel dentro del maestro y devuelve el `nombreInterno`
   * EXACTO, que es contra lo que compara el `<option>` del formulario.
   *
   * Match tolerante: sin mayúsculas, sin tildes y tratando `_`, `-` y espacios
   * como equivalentes, así "1-2" encuentra "1_2" y "Solicitalo con 1 dia"
   * encuentra "Solicítalo con 1 día". Se busca por `nombreInterno` y también
   * por el nombre visible, porque en la pantalla de Maestros se ven los dos.
   */
  private homologarEntrega(valor: any, maestro: any[], porDias = false): string | null {
    const crudo = String(valor ?? '').trim();
    if (!crudo || !maestro.length) return null;

    const norm = (s: any) => String(s ?? '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[_\-\s]+/g, ' ')
      .trim();

    const objetivo = norm(crudo);
    const exacto = maestro.find(m => norm(m?.nombreInterno) === objetivo || norm(m?.nombre) === objetivo);
    if (exacto?.nombreInterno) return exacto.nombreInterno;

    // Tiempo de entrega: si el Excel trae un número suelto ("3"), se busca la
    // opción cuyos días mínimos coincidan. Es lo que la gente escribe.
    if (porDias) {
      const n = parseInt(crudo, 10);
      if (!isNaN(n)) {
        const porMinDias = maestro.find(m => Number(m?.minDias) === n);
        if (porMinDias?.nombreInterno) return porMinDias.nombreInterno;
      }
    }

    // Último intento: que uno contenga al otro ("domicilio" ↔ "SOLO DOMICILIO").
    const parcial = maestro.find(m => {
      const ni = norm(m?.nombreInterno);
      return ni && (ni.includes(objetivo) || objetivo.includes(ni));
    });
    return parcial?.nombreInterno || null;
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
    // Una sola vez por config: la referencia tiene que ser estable porque va
    // enlazada a un @Input (ver el comentario de `camposObligatorios`).
    this.camposObligatorios = this.config.templateColumns
      .filter(col => col.required)
      .map(col => col.field);
    this.etiquetasCampos = this.config.fieldLabels || {};
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
    this.avisoCategoriaAceptado = false;
    this.categoriasCreadasEnImport = [];
    this.productosSinCategoria = 0;
    this.preciosVolumenPorRef.clear();
    this.erroresVolumen = [];
    this.productosConVolumen = 0;
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

  /**
   * Nombre de la hoja de precios por volumen y sus encabezados.
   *
   * Los títulos son EXACTAMENTE los de la tabla del formulario ("Añadir precio
   * por volumen"), para no tener que traducir entre lo que se ve en pantalla y
   * lo que se escribe en el Excel.
   *
   * "Valor IVA" y "Precio unitario Total (con IVA)" NO están: en el formulario
   * tampoco se escriben, se calculan al poner el precio sin IVA y el
   * porcentaje. Pedirlos a mano obligaría a hacer la cuenta, y un error ahí
   * entra directo al cobro.
   */
  static readonly HOJA_VOLUMEN = 'Precios por volumen';
  static readonly COLS_VOLUMEN = {
    referencia: 'Referencia (SKU)',
    desde: 'Numero de unidades Inicial',
    hasta: 'Numero limite de Unidades',
    precioSinIva: 'Precio Unitario (sin IVA)',
    porcentajeIva: 'Porcentaje IVA',
  };

  /** referencia → rangos de precio por volumen leídos del archivo. */
  private preciosVolumenPorRef = new Map<string, any[]>();
  /** Problemas encontrados en la hoja de rangos, para avisarlos antes de importar. */
  erroresVolumen: string[] = [];
  /** Cuántos productos del archivo traen rangos. */
  productosConVolumen = 0;

  private aNumero(v: any): number | null {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const limpio = String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    const n = parseFloat(limpio);
    return isNaN(n) ? null : n;
  }

  /**
   * Lee la hoja de precios por volumen y la valida.
   *
   * Se replican las dos reglas que el backend ya aplica
   * (`utils/priceCalculations.js` → validación de rangos): el límite no puede
   * ser menor que el inicial, y dos rangos del mismo producto no se pueden
   * solapar. Un archivo con rangos superpuestos cobraría distinto según cuál
   * se evalúe primero, y eso es plata.
   */
  private leerHojaPreciosVolumen(workbook: XLSX.WorkBook): void {
    this.preciosVolumenPorRef.clear();
    this.erroresVolumen = [];
    this.productosConVolumen = 0;
    if (this.type !== 'product') return;

    const C = ImportModalComponent.COLS_VOLUMEN;
    const nombreHoja = workbook.SheetNames.find(
      n => this.normHeader(n) === this.normHeader(ImportModalComponent.HOJA_VOLUMEN),
    );
    if (!nombreHoja) return;

    const filas: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja]);
    if (!filas.length) return;

    filas.forEach((fila, i) => {
      const nroFila = i + 2; // +1 por el encabezado, +1 porque Excel cuenta desde 1
      const ref = String(this.getRowValue(fila, C.referencia) ?? '').trim();
      const desde = this.aNumero(this.getRowValue(fila, C.desde));
      const hasta = this.aNumero(this.getRowValue(fila, C.hasta));
      const sinIva = this.aNumero(this.getRowValue(fila, C.precioSinIva));
      const pctIva = this.aNumero(this.getRowValue(fila, C.porcentajeIva)) ?? 0;

      // Fila totalmente vacía: se ignora sin ruido (Excel suele dejarlas).
      if (!ref && desde === null && hasta === null && sinIva === null) return;

      if (!ref) {
        this.erroresVolumen.push(`Fila ${nroFila}: falta la Referencia (SKU), no se sabe a qué producto pertenece el rango.`);
        return;
      }
      if (desde === null || hasta === null || sinIva === null) {
        this.erroresVolumen.push(`Fila ${nroFila} (${ref}): faltan datos. Se necesitan unidades inicial, límite y precio sin IVA.`);
        return;
      }
      if (hasta < desde) {
        this.erroresVolumen.push(`Fila ${nroFila} (${ref}): el límite (${hasta}) es menor que el inicial (${desde}).`);
        return;
      }

      const previos = this.preciosVolumenPorRef.get(ref) || [];
      const solapa = previos.find(
        r => !(hasta < r.numeroUnidadesInicial || r.numeroUnidadesLimite < desde),
      );
      if (solapa) {
        this.erroresVolumen.push(
          `Fila ${nroFila} (${ref}): el rango ${desde}-${hasta} se cruza con ${solapa.numeroUnidadesInicial}-${solapa.numeroUnidadesLimite}. Los rangos no se pueden superponer.`,
        );
        return;
      }

      // Las dos derivadas se calculan igual que en el formulario. `valorIVAPorVolumen`
      // es el PORCENTAJE y `valorUnitarioPorVolumenIva` el valor en pesos — este
      // último lo multiplica por cantidad el cálculo del pedido, así que no puede
      // quedar en cero.
      const ivaEnPesos = sinIva * (pctIva / 100);
      previos.push({
        numeroUnidadesInicial: desde,
        numeroUnidadesLimite: hasta,
        valorUnitarioPorVolumenSinIVA: sinIva,
        valorIVAPorVolumen: pctIva,
        valorUnitarioPorVolumenIva: ivaEnPesos,
        valorUnitarioPorVolumenConIVA: sinIva + ivaEnPesos,
      });
      this.preciosVolumenPorRef.set(ref, previos);
    });

    // Orden por rango: el cálculo recorre el arreglo y toma el primero que
    // encaja, así que conviene que estén de menor a mayor.
    this.preciosVolumenPorRef.forEach(rangos =>
      rangos.sort((a, b) => a.numeroUnidadesInicial - b.numeroUnidadesInicial),
    );
    this.productosConVolumen = this.preciosVolumenPorRef.size;

    console.log(`[ImportModal] 💲 Precios por volumen: ${this.productosConVolumen} productos, ${this.erroresVolumen.length} problemas`);
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
          // La plantilla trae dos hojas: "Plantilla" (los datos) e
          // "Instrucciones" (la ayuda de cada columna). Se busca la de datos
          // por nombre y solo se cae a la primera si no está: si alguien mueve
          // las hojas en Excel, se importaría la ayuda como si fueran filas.
          const hojaDatos = workbook.SheetNames.find(n => n.trim().toLowerCase() === 'plantilla')
            ?? workbook.SheetNames[0];
          data = XLSX.utils.sheet_to_json(workbook.Sheets[hojaDatos]);

          // Hoja opcional de precios por volumen (D-148). Un producto puede
          // tener N rangos, así que no entran como columnas de la fila del
          // producto: van en su propia hoja, una fila por rango, enlazadas por
          // referencia — igual que se ven en el formulario.
          this.leerHojaPreciosVolumen(workbook);
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
      // Atajo determinístico: si es la plantilla estándar de clientes, mapear directo (sin IA).
      const standard = this.buildStandardCustomerMapping();
      if (standard) {
        this.mappingResult = standard;
        this.origenMapeo = 'plantilla';
        this.showMappingPreview = true;
        this.prepareMappingFields();
        this.messageService.add({
          severity: 'success',
          summary: 'Plantilla estándar detectada',
          detail: `Se mapearon ${Object.keys(standard.mappings).length} columnas automáticamente.`
        });
        return;
      }

      // Mismo atajo, para la plantilla de productos.
      const estandarProductos = this.buildStandardProductMapping();
      if (estandarProductos) {
        this.mappingResult = estandarProductos;
        this.origenMapeo = 'plantilla';
        this.showMappingPreview = true;
        this.prepareMappingFields();
        this.messageService.add({
          severity: 'success',
          summary: 'Plantilla estándar detectada',
          detail: `Se mapearon ${Object.keys(estandarProductos.mappings).length} columnas automáticamente, sin necesidad de análisis.`
        });
        return;
      }

      // Mismo atajo para categorías e inventario, que no tenían uno propio.
      const estandarGenerico = this.buildStandardGenericMapping();
      if (estandarGenerico) {
        this.mappingResult = estandarGenerico;
        this.origenMapeo = 'plantilla';
        this.showMappingPreview = true;
        this.prepareMappingFields();
        this.messageService.add({
          severity: 'success',
          summary: 'Plantilla estándar detectada',
          detail: `Se mapearon ${Object.keys(estandarGenerico.mappings).length} columnas automáticamente, sin necesidad de análisis.`
        });
        return;
      }

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

      // Techo de espera. El proxy del backend le da 60s a KAI, y si KAI no
      // responde (o ni siquiera está levantado) la pantalla se quedaba
      // "analizando" todo ese rato sin ninguna salida. El mapeo automático es
      // una ayuda: pasados 12s conviene mucho más caer al reconocimiento por
      // nombre y dejar que la persona ajuste lo que falte, que hacerla esperar.
      const KAI_TIMEOUT_MS = 12000;
      let kaiTimeoutHandle: any = null;
      const kaiTimeout = new Promise<never>((_, reject) => {
        kaiTimeoutHandle = setTimeout(
          () => reject(new Error(`KAI no respondió en ${KAI_TIMEOUT_MS / 1000}s`)),
          KAI_TIMEOUT_MS,
        );
      });

      this.origenMapeo = 'kai';
      try {
        this.mappingResult = await Promise.race([
          this.columnMappingService
            .suggestColumnMapping(request, company.nomComercial || company.nombre)
            .toPromise(),
          kaiTimeout,
        ]) as ColumnMappingResult || null;
      } finally {
        clearTimeout(kaiTimeoutHandle);
      }

      this.showMappingPreview = true;
      this.prepareMappingFields();

      this.messageService.add({
        severity: 'success',
        summary: 'Analisis Completado',
        detail: `KAI analizo ${this.sourceColumns.length} columnas y sugirio ${Object.keys(this.mappingResult?.mappings || {}).length} mapeos`
      });

    } catch (error: any) {
      console.error('Error analyzing columns with KAI:', error);

      // KAI caído NO puede dejar el importador sin salida. Antes se mostraba el
      // error y `showMappingPreview` quedaba en false: el usuario se quedaba
      // atascado en el paso 1, sin forma de continuar. El mapeo automático es
      // una ayuda, no un requisito — la pantalla de mapeo permite asignar las
      // columnas a mano.
      //
      // Se abre igual, precargada con lo que se pueda reconocer por nombre de
      // columna (si el archivo salió del export de Katuq, eso ya es todo).
      const porNombre = this.matchTemplateHeaders();
      this.origenMapeo = 'plantilla';
      this.mappingResult = this.construirResultadoMapeo(porNombre);
      this.showMappingPreview = true;
      this.prepareMappingFields();

      const reconocidas = Object.keys(porNombre).length;
      this.messageService.add({
        severity: 'warn',
        summary: 'Mapeo automático no disponible',
        detail: reconocidas > 0
          ? `No se pudo contactar a KAI, pero se reconocieron ${reconocidas} columnas por su nombre. Revisá el mapeo y completá lo que falte a mano.`
          : 'No se pudo contactar a KAI. Asigná las columnas a mano; el resto de la importación funciona igual.',
        life: 10000
      });
    } finally {
      this.isAnalyzingColumns = false;
    }
  }

  /**
   * Revisa los valores de entrega del archivo contra el maestro ANTES de
   * importar, que es cuando todavía se puede corregir el Excel (o crear la
   * opción que falta en Maestros). Si se dejara para el momento de importar,
   * el usuario se enteraría con los productos ya guardados y los campos vacíos.
   */
  private revisarEntregaContraMaestro(): void {
    this.entregaSinHomologar = [];
    if (this.type !== 'product' || !this.parsedData.length) return;

    const mapeos = this.mappingResult?.mappings || {};
    const revisar = (campo: string, maestro: any[], etiqueta: string, porDias = false) => {
      const columna = mapeos[campo]?.sourceColumn;
      if (!columna || !maestro.length) return;
      const distintos = new Set<string>();
      this.parsedData.forEach(fila => {
        const v = String(this.getRowValue(fila, columna) ?? '').trim();
        if (v) distintos.add(v);
      });
      distintos.forEach(v => {
        if (!this.homologarEntrega(v, maestro, porDias)) {
          if (!this.entregaSinHomologar.includes(`${etiqueta}: "${v}"`)) this.entregaSinHomologar.push(`${etiqueta}: "${v}"`);
        }
      });
    };

    revisar('tipoEntrega', this.tiposEntrega, 'Tipo de entrega');
    revisar('tiempoEntrega', this.tiemposEntrega, 'Tiempo de entrega', true);
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

    this.revisarEntregaContraMaestro();

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

    // Aviso de categorías (D-148): hay que marcarlo antes de seguir. No es un
    // bloqueo de verdad —basta con tildar "Entiendo, importar igual"— pero
    // obliga a leerlo. El importador se usa una sola vez, al arrancar una
    // empresa: no hay repetición que genere el hábito de acordarse.
    if (this.debeAvisarCategoria) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Revisá el aviso de categorías',
        detail: 'Marcá "Entiendo, importar igual" para continuar, o volvé y completá la columna Categoria.',
        life: 8000
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

      // Plantilla estándar de clientes → transform propio (estructura exacta de los forms).
      // Otros archivos → transform genérico basado en el mapeo (KAI/manual).
      const transformedData = (this.type === 'customer' && this.standardCustomerTemplate)
        ? this.transformStandardCustomerTemplate(this.parsedData)
        : this.transformDataWithMapping(this.parsedData, this.confirmedMappings, this.mappingResult?.mappings);

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
      let totalOmitted = 0;
      const allErrors: string[] = [];
      const allOmitted: string[] = [];
      // Trabajo pendiente que deja la importación de productos (D-148).
      // Se acumula entre lotes: el backend los reporta por lote.
      const categoriasCreadas = new Set<string>();
      let totalSinCategoria = 0;

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
          // Omitidos por el modo elegido ("solo crear nuevos" / "solo
          // actualizar existentes"). No son fallas, pero hay que contarlos y
          // decirlos: si no, el usuario ve "0 procesados" sin ninguna
          // explicación de por qué su archivo no hizo nada.
          totalOmitted += data.omitted || 0;
          if (data.omittedDetails?.length) allOmitted.push(...data.omittedDetails);
          if (data.errors?.length) allErrors.push(...data.errors);
          if (data.categoriasCreadas?.length) {
            data.categoriasCreadas.forEach((c: string) => categoriasCreadas.add(c));
          }
          totalSinCategoria += data.sinCategoria || 0;

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

      // Trabajo pendiente de categorías (D-148). Va en la pantalla de
      // resultado, no en un toast: el toast se cierra y el usuario se entera
      // semanas después, cuando arma una promo por categoría y no le aplica.
      this.categoriasCreadasEnImport = [...categoriasCreadas];
      this.productosSinCategoria = totalSinCategoria;

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
      if (totalOmitted > 0) {
        const porModo = this.importMode === 'create'
          ? 'ya existían y elegiste "Solo crear nuevos"'
          : 'no existían en el catálogo y elegiste "Solo actualizar existentes"';
        detail += `. Se omitieron ${totalOmitted} porque ${porModo}`;
        console.info('[ImportModal] Filas omitidas por el modo elegido:', allOmitted);
      }
      if (totalBatches > 1) detail += ` (${totalBatches} lotes)`;

      this.messageService.add({
        // Si NO se escribió nada y todo quedó omitido, no es un éxito: el
        // usuario tiene que enterarse de que su archivo no cambió nada.
        severity: (totalCreated + totalUpdated) === 0 && totalOmitted > 0 ? 'warn' : 'success',
        summary: (totalCreated + totalUpdated) === 0 && totalOmitted > 0
          ? 'No se importó nada'
          : 'Importacion Completada',
        detail,
        life: totalOmitted > 0 ? 10000 : 5000
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
          // Casilla con la celda vacía = SIN CHULEAR, no "dejá el valor por
          // defecto". Es la lectura natural de un checkbox y es la regla que
          // pidió el usuario para la pestaña Exposición ("SI se chulea, NO
          // queda vacío"). Solo aplica si la columna EXISTE en el archivo: si
          // no está mapeada, nunca se llega acá y manda el default.
          // El export siempre escribe SI o NO explícito, así que reimportar un
          // export no cambia nada.
          if (this.type === 'product' && this.esCasilla(katuqField)) {
            this.setNestedValue(transformedRow, katuqField, false, index);
            return;
          }
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

        // Precios por volumen desde la hoja aparte (D-148). Se enganchan por
        // referencia, después de `calculateDerivedFields` para que la
        // referencia ya esté resuelta (puede venir autogenerada).
        const refProducto = String(transformedRow.identificacion?.referencia ?? '').trim();
        const rangos = this.preciosVolumenPorRef.get(refProducto);
        if (rangos?.length) {
          transformedRow.precio = transformedRow.precio || {};
          transformedRow.precio.preciosVolumen = rangos.map(r => ({ ...r }));
        }

        // La columna "Requiere Produccion (SI/NO)" entra por
        // `procesoComercial.seProduceInternamente`, pero el campo que lee la
        // lista de productos es `crearProducto.paraProduccion`. Se sincronizan
        // acá, ANTES de los flags globales, para que el toggle "todos para
        // producción" siga ganando sobre lo que diga el Excel.
        if (transformedRow.procesoComercial?.seProduceInternamente !== undefined) {
          transformedRow.crearProducto = transformedRow.crearProducto || {};
          transformedRow.crearProducto.paraProduccion =
            !!transformedRow.procesoComercial.seProduceInternamente;
        }

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

        // --- Ciudad (D-148) ---
        transformedRow.ciudades = transformedRow.ciudades || {};

        // Atajo histórico: una columna suelta "ciudad" que dice "todas" /
        // "nacional" activa las dos coberturas. Se conserva para archivos
        // viejos, pero ahora pierde contra las columnas explícitas de abajo.
        const ciudadVal = (
          transformedRow.ciudad ||
          transformedRow.ciudadOrigen ||
          transformedRow.disponibilidad?.ciudadOrigen || ''
        ).toString().toLowerCase().trim();
        const esNacional = ['todas', 'todo el pais', 'nacional', 'cobertura nacional', 'todo el país', 'all', 'todos'].includes(ciudadVal);
        const trajoColumnaOrigen = mappings['coberturaNacionalOrigen'] !== undefined;
        const trajoColumnaEntrega = mappings['coberturaNacionalEntrega'] !== undefined;
        if (esNacional && !trajoColumnaOrigen) transformedRow.ciudades.coberturaNacionalOrigen = true;
        if (esNacional && !trajoColumnaEntrega) transformedRow.ciudades.coberturaNacionalEntrega = true;

        // Cobertura nacional gana sobre la lista de ciudades, igual que el
        // toggle de la pantalla, que limpia la selección al activarse.
        if (transformedRow.ciudades.coberturaNacionalOrigen) transformedRow.ciudades.ciudadesOrigen = [];
        if (transformedRow.ciudades.coberturaNacionalEntrega) transformedRow.ciudades.ciudadesEntrega = [];
        // Y al revés: si el Excel listó ciudades y NO dijo nada de cobertura
        // nacional, cargar una lista con la cobertura prendida no tendría
        // efecto visible en el formulario.
        if (!trajoColumnaOrigen && transformedRow.ciudades.ciudadesOrigen?.length) {
          transformedRow.ciudades.coberturaNacionalOrigen = false;
        }
        if (!trajoColumnaEntrega && transformedRow.ciudades.ciudadesEntrega?.length) {
          transformedRow.ciudades.coberturaNacionalEntrega = false;
        }

        // --- Canales de venta y exposición: el Excel manda (D-148) ---
        //
        // Acá había dos bloques que forzaban los tres canales y `activo` a
        // `true` DESPUÉS de aplicar el mapeo: las columnas se leían, se
        // convertían… y se pisaban. Los valores por defecto ya vienen de
        // PRODUCT_DEFAULTS (los tres canales en true), así que quien no traiga
        // las columnas entra igual que antes.
        transformedRow.marketplace = transformedRow.marketplace || {};
        transformedRow.exposicion = transformedRow.exposicion || {};
        // `activo` es el flag canónico V2 que lee el mapper de Shopify (sin él
        // el producto se publica como DRAFT). Espeja `activar`, que es lo que
        // dice la columna "Activo (SI/NO)".
        transformedRow.exposicion.activo = transformedRow.exposicion.activar !== false;
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
   * Columnas del Excel que son CASILLAS (chuleables) en el formulario.
   *
   * Es una constante de clase y no una variable local porque
   * `transformDataWithMapping` también la necesita: una casilla con la celda
   * VACÍA significa "sin chulear" (false), no "usá el valor por defecto". Ver
   * `esCasilla()`.
   */
  private static readonly BOOLEAN_FIELDS = [
    'activar', 'disponible', 'recomendado', 'destacado', 'oferta', 'nuevo',
    'masvendido', 'paraProduccion', 'inventariable', 'sellerCenter',
    'paginaWeb', 'puntoDeVenta', 'exposicion.activar', 'exposicion.disponible',
    'exposicion.recomendado', 'exposicion.destacado', 'exposicion.oferta',
    'exposicion.nuevo', 'exposicion.masvendido', 'crearProducto.paraProduccion',
    'disponibilidad.inventariable', 'marketplace.sellerCenter',
    'marketplace.paginaWeb', 'marketplace.puntoDeVenta',
    'coberturaNacionalOrigen', 'coberturaNacionalEntrega',
    'ciudades.coberturaNacionalOrigen', 'ciudades.coberturaNacionalEntrega',
  ];

  /** Columnas de fecha: el formulario usa `<input type="date">` → 'AAAA-MM-DD'. */
  private static readonly DATE_FIELDS = [
    'fechaInicial', 'fechaFinal',
    'crearProducto.fechaInicial', 'crearProducto.fechaFinal',
  ];

  /** Columnas de ciudades: texto separado por comas → [{value, label}]. */
  private static readonly CITY_LIST_FIELDS = [
    'ciudadesOrigen', 'ciudadesEntrega',
    'ciudades.ciudadesOrigen', 'ciudades.ciudadesEntrega',
  ];

  private esCasilla(katuqField: string): boolean {
    return ImportModalComponent.BOOLEAN_FIELDS.includes(katuqField);
  }

  /**
   * Normaliza una fecha del Excel a 'AAAA-MM-DD'.
   *
   * El archivo se lee sin `cellDates`, así que una celda con formato de fecha
   * llega como NÚMERO (serial de Excel: días desde 1899-12-30), no como texto.
   * Sin esta conversión, "01/01/2026" entraba al producto como "46023" y el
   * `<input type="date">` del formulario lo mostraba vacío.
   *
   * Acepta además texto ISO ('2026-01-31') y d/m/a ('31/01/2026'). Si no
   * reconoce el formato devuelve el texto tal cual, para no perder el dato.
   */
  private toFechaISO(value: any): string {
    if (value === undefined || value === null || String(value).trim() === '') return '';

    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }

    // Serial de Excel. El epoch es 1899-12-30 (no 1900-01-01) por el bug
    // histórico del año bisiesto 1900 que Excel arrastra a propósito.
    if (typeof value === 'number' && isFinite(value) && value > 0 && value < 2958466) {
      const ms = Math.round(value * 86400000);
      const d = new Date(Date.UTC(1899, 11, 30) + ms);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    }

    const texto = String(value).trim();

    // Ya viene ISO (con o sin hora)
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    // d/m/a o d-m-a (formato colombiano). Año de 2 dígitos → 20xx.
    const dma = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (dma) {
      const dia = dma[1].padStart(2, '0');
      const mes = dma[2].padStart(2, '0');
      const anio = dma[3].length === 2 ? `20${dma[3]}` : dma[3];
      return `${anio}-${mes}-${dia}`;
    }

    const parsed = new Date(texto);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

    return texto;
  }

  /**
   * "Bogota, Medellin" → [{value:'Bogota',label:'Bogota'}, …]
   *
   * Es la forma EXACTA que guarda el selector de ciudades del formulario
   * (`seleccionarMunicipioDaneOrigen`), así que lo importado se ve como chips
   * seleccionados sin que el usuario toque nada.
   */
  private toListaCiudades(value: any): { value: string; label: string }[] {
    const nombres = Array.isArray(value)
      ? value.map(v => (v && typeof v === 'object' ? (v.label ?? v.value ?? '') : v))
      : String(value ?? '').split(',');
    const limpias = nombres.map(n => String(n ?? '').trim()).filter(Boolean);
    return Array.from(new Set(limpias)).map(n => ({ value: n, label: n }));
  }

  /**
   * Convierte el valor según el tipo de campo esperado
   */
  private convertFieldValue(katuqField: string, value: any): any {
    if (ImportModalComponent.BOOLEAN_FIELDS.includes(katuqField)) {
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

    // Fechas de vigencia: el Excel las manda como serial numérico
    if (ImportModalComponent.DATE_FIELDS.includes(katuqField)) {
      return this.toFechaISO(value);
    }

    // Ciudades: texto separado por comas → [{value, label}] como el selector
    if (ImportModalComponent.CITY_LIST_FIELDS.includes(katuqField)) {
      return this.toListaCiudades(value);
    }

    // Etiquetas: en el Excel van separadas por coma, el producto las guarda
    // como arreglo (`exposicion.etiquetas`). Se deduplican, igual que en el
    // importador de clientes (`buildStandardCustomerMapping`) y que en el
    // formulario de producto: una etiqueta repetida no aporta nada y ya hubo
    // productos con la misma etiqueta 80 veces, al punto de reventar el límite
    // de celda de Excel al exportarlos.
    if (katuqField === 'etiquetas' || katuqField === 'tags' || katuqField === 'exposicion.etiquetas') {
      const lista = Array.isArray(value)
        ? value.map(t => String(t ?? '').trim())
        : String(value).split(',').map(t => t.trim());
      return Array.from(new Set(lista.filter(Boolean)));
    }

    // Dimensiones y peso se dejan TAL CUAL (string), igual que cuando se crea el
    // producto a mano. No se pasan por el limpiador numérico a propósito: ese
    // limpiador borra las comas antes de parsear, así que un peso "0,5" se
    // convertiría en 5. Mientras eso no se arregle, mejor no ampliarle el alcance.

    // Tiempo y tipo de entrega: se homologan contra el MAESTRO DE LA EMPRESA.
    //
    // Antes había acá dos tablas de valores escritos a mano
    // (`SOLO DOMICILIO`, `ENVIO A DOMICILIO Y RECOGE`, y números para el
    // tiempo). Ninguno existe en el maestro de ninguna empresa, y el select
    // del formulario compara contra `nombreInterno`: el producto quedaba con
    // un valor que la lista no puede mostrar y los dos campos salían vacíos
    // SIEMPRE. Ahora se busca la opción real; si no aparece, se deja vacío y
    // se reporta, en vez de guardar un valor fantasma.
    if (katuqField === 'tiempoEntrega' || katuqField === 'disponibilidad.tiempoEntrega') {
      const encontrado = this.homologarEntrega(value, this.tiemposEntrega, true);
      if (encontrado) return encontrado;
      if (String(value ?? '').trim() && !this.entregaSinHomologar.includes(`Tiempo de entrega: "${value}"`)) this.entregaSinHomologar.push(`Tiempo de entrega: "${value}"`);
      return '';
    }

    if (katuqField === 'tipoEntrega' || katuqField === 'disponibilidad.tipoEntrega') {
      const encontrado = this.homologarEntrega(value, this.tiposEntrega);
      if (encontrado) return encontrado;
      if (String(value ?? '').trim() && !this.entregaSinHomologar.includes(`Tipo de entrega: "${value}"`)) this.entregaSinHomologar.push(`Tipo de entrega: "${value}"`);
      return '';
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
      'inventariable': 'disponibilidad.inventariable',
      // Dimensiones: sin estas entradas las columnas de la plantilla se
      // descartaban en silencio (un campo plano sin mapeo NO se escribe), y el
      // producto importado quedaba sin medidas ni peso — o sea, imposible de
      // cotizar para envío.
      'largoProductoCm': 'dimensiones.largoProductoCm',
      'altoProductoCm': 'dimensiones.altoProductoCm',
      'anchoProductoCm': 'dimensiones.anchoProductoCm',
      'pesoUnitarioProductoKg': 'dimensiones.pesoUnitarioProductoKg',
      'largo': 'dimensiones.largoProductoCm',
      'alto': 'dimensiones.altoProductoCm',
      'ancho': 'dimensiones.anchoProductoCm',
      'peso': 'dimensiones.pesoUnitarioProductoKg',
      'etiquetas': 'exposicion.etiquetas',
      'tags': 'exposicion.etiquetas',
      // Producción: estas cuatro estaban en la plantilla pero sin mapeo, así que
      // lo que el usuario escribía se perdía. `seProduceInternamente` alimenta
      // además `crearProducto.paraProduccion`, que es el campo que lee la lista
      // de productos (se completa en el post-proceso, más abajo).
      'seProduceInternamente': 'procesoComercial.seProduceInternamente',
      'integraConProduccion': 'procesoComercial.integraConProduccion',
      'tiempoProduccion': 'procesoComercial.tiempoProduccion',
      'softwareProduccion': 'procesoComercial.softwareProduccion',
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
      'tipo': 'categoriaNombre',
      'categoriaConsecutivo': 'categoriaConsecutivo',
      'idCategoria': 'categoriaConsecutivo',
      'consecutivo': 'categoriaConsecutivo',
      // Subcategoría y sub-subcategoría (D-148). Viajan planas al backend, que
      // resuelve la ruta completa contra el árbol canónico de categorías.
      'subcategoria': 'subcategoriaNombre',
      'subcategoría': 'subcategoriaNombre',
      'subcategory': 'subcategoriaNombre',
      'categoria_nivel2': 'subcategoriaNombre',
      'subsubcategoria': 'subsubcategoriaNombre',
      'subsubcategoría': 'subsubcategoriaNombre',
      'subsubcategory': 'subsubcategoriaNombre',
      'categoria_nivel3': 'subsubcategoriaNombre',
      // Vigencia (pestaña Datos básicos)
      'fechaInicial': 'crearProducto.fechaInicial',
      'fechaFinal': 'crearProducto.fechaFinal',
      // Canales de venta (pestaña Canales de Venta)
      'sellerCenter': 'marketplace.sellerCenter',
      'paginaWeb': 'marketplace.paginaWeb',
      'puntoDeVenta': 'marketplace.puntoDeVenta',
      // Ciudad (pestaña Ciudad)
      'coberturaNacionalOrigen': 'ciudades.coberturaNacionalOrigen',
      'coberturaNacionalEntrega': 'ciudades.coberturaNacionalEntrega',
      'ciudadesOrigen': 'ciudades.ciudadesOrigen',
      'ciudadesEntrega': 'ciudades.ciudadesEntrega',
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

  /**
   * Descarga la plantilla de ejemplo en **.xlsx**.
   *
   * Antes salía en CSV, y el uploader sólo acepta `.xlsx,.xls,.json`
   * (`acceptedFormats`): la app entregaba una plantilla que después se negaba a
   * recibir. Quien la llenaba y la subía se topaba con un rechazo sin
   * explicación, o creía que la plantilla no existía.
   *
   * La hoja lleva dos filas: los encabezados y una fila de ejemplo. Los
   * encabezados son los mismos que usa el export de productos, así que un
   * archivo exportado sirve como plantilla ya llena.
   */
  downloadTemplate(): void {
    if (!this.config) return;

    const entidad = this.type === 'customer' ? 'clientes'
      : this.type === 'inventory' ? 'inventario'
      : this.type === 'category' ? 'categorias'
      : 'productos';

    const headers = this.config.templateColumns.map(col => col.header);
    // El ejemplo de tipo/tiempo de entrega sale del maestro REAL de la empresa:
    // son las únicas dos columnas cuyos valores válidos cambian de empresa a
    // empresa, y un ejemplo inventado hace que el campo entre vacío.
    const example = this.config.templateColumns.map(col => {
      if (col.field === 'tipoEntrega') return this.opcionesTipoEntrega[0] ?? '';
      if (col.field === 'tiempoEntrega') return this.opcionesTiempoEntrega[0] ?? '';
      return col.example ?? '';
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    // Ancho de columna según el encabezado: sin esto los títulos largos
    // ("Etiquetas (separadas por coma)") salen cortados y no se entiende qué va.
    ws['!cols'] = headers.map(h => ({ wch: Math.max(14, Math.min(40, String(h).length + 2)) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

    // Segunda hoja: qué es cada columna y si hay que llenarla.
    //
    // Con 46 columnas en productos y dos formatos posibles en categorías, el
    // encabezado solo no alcanza: quien abre el archivo tenía que deducir de un
    // ejemplo de una celda si algo era obligatorio, opcional o directamente de
    // otro formato. Va DENTRO del archivo a propósito — se llena en Excel,
    // lejos de la pantalla donde estaría la ayuda.
    const instrucciones: string[][] = [
      ['Columna', '¿Hay que llenarla?', 'Qué va acá', 'Ejemplo'],
      ...this.config.templateColumns.map(col => [
        col.header,
        col.required ? 'OBLIGATORIA' : 'Opcional',
        col.help || '',
        String(col.example ?? ''),
      ]),
    ];
    const wsAyuda = XLSX.utils.aoa_to_sheet(instrucciones);
    wsAyuda['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 95 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsAyuda, 'Instrucciones');

    // Las opciones válidas de entrega van en la ayuda, con los valores REALES
    // de la empresa: son las únicas columnas donde no alcanza con un ejemplo
    // genérico, porque cada empresa define las suyas en Maestros.
    if (this.type === 'product' && (this.opcionesTipoEntrega.length || this.opcionesTiempoEntrega.length)) {
      XLSX.utils.sheet_add_aoa(wsAyuda, [
        [],
        ['OPCIONES VÁLIDAS DE TU EMPRESA', '', '', ''],
        ['Tipo de Entrega', '', this.opcionesTipoEntrega.join('  ·  ') || '(no hay ninguna configurada en Maestros)', ''],
        ['Tiempo de Entrega', '', this.opcionesTiempoEntrega.join('  ·  ') || '(no hay ninguna configurada en Maestros)', ''],
        ['', '', 'Tienen que coincidir con estas opciones. Si escribís otra cosa, el campo queda vacío y el importador te avisa antes de importar. Para agregar opciones nuevas, andá a Maestros.', ''],
      ], { origin: -1 });
    }

    // Hoja de precios por volumen (solo productos). Va aparte porque un
    // producto puede tener N rangos y no entran como columnas de su fila.
    // Es OPCIONAL: quien no maneje precio por volumen la deja vacía.
    if (this.type === 'product') {
      const C = ImportModalComponent.COLS_VOLUMEN;
      const wsVol = XLSX.utils.aoa_to_sheet([
        [C.referencia, C.desde, C.hasta, C.precioSinIva, C.porcentajeIva],
        ['PROD001', 1, 10, 50000, 19],
        ['PROD001', 11, 50, 45000, 19],
      ]);
      wsVol['!cols'] = [{ wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 24 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsVol, ImportModalComponent.HOJA_VOLUMEN);

      // La ayuda de esta hoja va al final de "Instrucciones", donde la persona
      // ya está mirando qué significa cada columna.
      XLSX.utils.sheet_add_aoa(wsAyuda, [
        [],
        [`HOJA "${ImportModalComponent.HOJA_VOLUMEN}" (opcional)`, '', '', ''],
        ['', '', 'Una fila por rango. Un mismo producto puede tener varios: se repite su Referencia (SKU) en cada fila. Si no manejás precio por volumen, dejá la hoja vacía o borrá las filas de ejemplo.', ''],
        [C.referencia, 'OBLIGATORIA', 'A qué producto pertenece el rango. Tiene que coincidir con la Referencia (SKU) de la hoja "Plantilla".', 'PROD001'],
        [C.desde, 'OBLIGATORIA', 'Desde cuántas unidades aplica este precio.', '1'],
        [C.hasta, 'OBLIGATORIA', 'Hasta cuántas unidades aplica. No puede ser menor que el inicial, y dos rangos del mismo producto no se pueden cruzar.', '10'],
        [C.precioSinIva, 'OBLIGATORIA', 'Precio por unidad dentro de ese rango, sin IVA.', '50000'],
        [C.porcentajeIva, 'Opcional', 'Porcentaje de IVA del rango. Vacío = 0.', '19'],
        ['', '', 'El Valor IVA y el Precio unitario Total (con IVA) NO se escriben: se calculan solos, igual que en el formulario.', ''],
      ], { origin: -1 });
    }

    XLSX.writeFile(wb, `plantilla_${entidad}_katuq.xlsx`);

    const requeridas = this.config.templateColumns
      .filter(col => col.required)
      .map(col => col.header)
      .join(', ');

    this.messageService.add({
      severity: 'success',
      summary: 'Plantilla descargada',
      detail: `Completa la plantilla y subela para importar. Columnas obligatorias: ${requeridas || 'ninguna'}.`,
      life: 8000
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
    this.avisoCategoriaAceptado = false;
    this.categoriasCreadasEnImport = [];
    this.productosSinCategoria = 0;
    this.preciosVolumenPorRef.clear();
    this.erroresVolumen = [];
    this.productosConVolumen = 0;
    this.mappingFields = [];
    this.availableColumns = [];
    this.standardCustomerTemplate = false;
    this.standardColResolver = {};
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
