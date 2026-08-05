import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  ColumnMappingResult,
  getConfidenceSeverity,
  getConfidenceIcon
} from '../../../models/column-mapping.model';

interface MappingRow {
  katuqField: string;
  sourceColumn: string;
  confidence: number;
  reasoning: string;
  severity: 'success' | 'warning' | 'danger';
  icon: string;
  isRequired: boolean;
  isManuallyAdjusted: boolean;
}

@Component({
  selector: 'app-column-mapping-preview',
  templateUrl: './column-mapping-preview.component.html',
  styleUrls: ['./column-mapping-preview.component.scss']
})
export class ColumnMappingPreviewComponent implements OnInit, OnChanges {
  @Input() mappingResult: ColumnMappingResult | null = null;
  @Input() sourceColumns: string[] = [];
  @Input() type: 'customer' | 'product' = 'customer';

  /**
   * Campos que la plantilla marca como obligatorios (`templateColumns[].required`).
   *
   * Lo manda el modal, que es quien conoce la configuración. Antes se deducía
   * de `unmappedRequired`, que es la lista de obligatorios **sin mapear**: como
   * toda fila de la tabla YA está mapeada, la comprobación daba `true` siempre
   * y **todos** los campos salían con el sello rojo "Obligatorio", incluidos
   * los opcionales.
   */
  @Input() requiredFields: string[] = [];

  /**
   * De dónde salió el mapeo: `kai` (el modelo lo sugirió) o `plantilla` (se
   * reconocieron los encabezados por nombre, sin IA). Solo cambia el texto,
   * pero decir "KAI sugirió" cuando el aviso de al lado dice "no se pudo
   * contactar a KAI" hace dudar de todo lo que muestra la pantalla.
   */
  @Input() origenMapeo: 'kai' | 'plantilla' = 'kai';

  /**
   * Etiquetas legibles de la plantilla activa (`ImportConfig.fieldLabels`).
   *
   * Abajo hay dos diccionarios propios, solo para clientes y productos: con
   * categorías o inventario `getFieldLabel` caía al nombre interno y la
   * pantalla mostraba `categoria_nivel1` en vez de "Nombre de Categoría".
   * La plantilla ya trae las etiquetas buenas; se usan primero.
   */
  @Input() fieldLabels: { [key: string]: string } = {};

  @Output() mappingsAdjusted = new EventEmitter<{ [katuqField: string]: string }>();
  @Output() mappingsConfirmed = new EventEmitter<{ [katuqField: string]: string }>();

  mappingRows: MappingRow[] = [];
  unmappedRequiredFields: string[] = [];
  warnings: string[] = [];
  suggestions: string[] = [];

  // Para dropdowns de ajuste manual
  availableColumns: { label: string; value: string }[] = [];

  constructor() {}

  ngOnInit(): void {
    this.processMappingResult();
  }

  /**
   * Solo reconstruye si cambió algo de verdad.
   *
   * Antes reprocesaba en CADA `ngOnChanges`, y como `processMappingResult`
   * genera arreglos nuevos (`mappingRows`, `availableColumns`) que alimentan la
   * tabla, bastaba que un `@Input` llegara con referencia nueva en cada ciclo
   * para entrar en un bucle de detección de cambios que congela la pestaña.
   * Ya pasó una vez; esta guarda evita que vuelva a pasar por otra vía.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const relevante = ['mappingResult', 'sourceColumns', 'requiredFields', 'type'];
    const cambio = relevante.some(k => changes[k] && changes[k].currentValue !== changes[k].previousValue);
    if (cambio) this.processMappingResult();
  }

  private processMappingResult(): void {
    if (!this.mappingResult) {
      return;
    }

    // Preparar opciones para dropdowns
    this.availableColumns = this.sourceColumns.map(col => ({
      label: col,
      value: col
    }));

    // Convertir mappings a filas de tabla
    this.mappingRows = Object.entries(this.mappingResult.mappings || {}).map(([katuqField, mapping]) => ({
      katuqField,
      sourceColumn: mapping.sourceColumn,
      confidence: mapping.confidence,
      reasoning: mapping.reasoning,
      severity: getConfidenceSeverity(mapping.confidence),
      icon: getConfidenceIcon(mapping.confidence),
      isRequired: this.requiredFields.includes(katuqField),
      isManuallyAdjusted: false
    }));

    // Ordenar por confidence descendente
    this.mappingRows.sort((a, b) => b.confidence - a.confidence);

    this.unmappedRequiredFields = this.mappingResult.unmappedRequired || [];
    this.warnings = this.mappingResult.warnings || [];
    this.suggestions = this.mappingResult.suggestions || [];
  }

  onMappingChange(row: MappingRow, newSourceColumn: string): void {
    row.sourceColumn = newSourceColumn;
    row.isManuallyAdjusted = true;
    row.confidence = 100;
    row.severity = 'success';
    row.icon = 'pi-check-circle';
    row.reasoning = 'Mapeo ajustado manualmente';

    this.emitAdjustments();
  }

  private emitAdjustments(): void {
    const adjustedMappings: { [katuqField: string]: string } = {};

    this.mappingRows.forEach(row => {
      adjustedMappings[row.katuqField] = row.sourceColumn;
    });

    this.mappingsAdjusted.emit(adjustedMappings);
  }

  confirmMappings(): void {
    const finalMappings: { [katuqField: string]: string } = {};

    this.mappingRows.forEach(row => {
      finalMappings[row.katuqField] = row.sourceColumn;
    });

    this.mappingsConfirmed.emit(finalMappings);
  }

  getSeverityClass(severity: 'success' | 'warning' | 'danger'): string {
    const classMap = {
      'success': 'p-tag-success',
      'warning': 'p-tag-warning',
      'danger': 'p-tag-danger'
    };
    return classMap[severity] || '';
  }

  getFieldLabel(katuqField: string): string {
    // La plantilla activa manda: es la única fuente que cubre las 4 entidades.
    if (this.fieldLabels?.[katuqField]) return this.fieldLabels[katuqField];

    if (this.type === 'customer') {
      const customerLabels: { [key: string]: string } = {
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
      };
      return customerLabels[katuqField] || katuqField;
    } else {
      const productLabels: { [key: string]: string } = {
        'identificacion.referencia': 'Referencia/SKU',
        'identificacion.marca': 'Marca',
        'identificacion.tipoProducto': 'Tipo de Producto',
        'identificacion.codigoBarras': 'Codigo de Barras',
        'crearProducto.titulo': 'Titulo del Producto',
        'crearProducto.descripcion': 'Descripcion',
        'crearProducto.garantiasProducto': 'Garantias',
        'precio.precioUnitarioSinIva': 'Precio sin IVA',
        'precio.valorIva': 'Valor IVA (%)',
        'precio.precioUnitarioConIva': 'Precio con IVA',
        'disponibilidad.cantidadDisponible': 'Cantidad Disponible',
        'disponibilidad.cantidadMinVenta': 'Cantidad Minima de Venta',
        'disponibilidad.inventarioSeguridad': 'Inventario de Seguridad'
      };
      return productLabels[katuqField] || katuqField;
    }
  }

  hasUnmappedRequired(): boolean {
    return this.unmappedRequiredFields.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  canConfirm(): boolean {
    return !this.hasUnmappedRequired() && this.mappingRows.length > 0;
  }
}
