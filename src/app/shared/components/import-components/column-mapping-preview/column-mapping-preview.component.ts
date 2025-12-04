import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
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

  ngOnChanges(): void {
    this.processMappingResult();
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
      isRequired: !this.mappingResult!.unmappedRequired.includes(katuqField),
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
