/**
 * Modelos para el sistema de mapeo inteligente de columnas
 * Usado en los pasos de importación de clientes y productos
 */

export interface ColumnMapping {
  sourceColumn: string;
  additionalColumns?: string[]; // columnas extra a concatenar (ej: Segundo Nombre)
  joinSeparator?: string;       // separador para concatenar (default: ' ')
  defaultValue?: any;           // valor fijo cuando no hay sourceColumn (ej: '+57')
  confidence: number; // 0-100
  reasoning: string;
}

export interface ColumnMappingResult {
  success: boolean;
  type: 'customer' | 'product' | 'inventory' | 'category';
  mappings: { [katuqField: string]: ColumnMapping };
  unmappedRequired: string[];
  warnings: string[];
  suggestions: string[];
  metadata?: {
    columnsAnalyzed: number;
    sampleRowsUsed: number;
    timestamp: string;
  };
}

export interface ColumnMappingRequest {
  type: 'customer' | 'product' | 'inventory' | 'category';
  sourceColumns: string[];
  sampleRows: any[];
  companyId?: string;
}

export interface MappingAdjustment {
  katuqField: string;
  newSourceColumn: string;
  isManual: boolean;
}

export enum ConfidenceLevel {
  HIGH = 'high',    // 90-100%
  MEDIUM = 'medium', // 70-89%
  LOW = 'low'       // 0-69%
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 90) return ConfidenceLevel.HIGH;
  if (confidence >= 70) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

export function getConfidenceSeverity(confidence: number): 'success' | 'warning' | 'danger' {
  if (confidence >= 90) return 'success';
  if (confidence >= 70) return 'warning';
  return 'danger';
}

export function getConfidenceIcon(confidence: number): string {
  if (confidence >= 90) return 'pi-check-circle';
  if (confidence >= 70) return 'pi-exclamation-triangle';
  return 'pi-times-circle';
}

/**
 * Interface para el resultado de una importación
 */
export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  batchId?: string;
  importedItems?: any[];
  created?: number;
  updated?: number;
}

/**
 * Interface para campos de mapeo en la UI
 */
export interface MappingField {
  katuqField: string;
  katuqLabel: string;
  sourceColumn: string;
  confidence: number;
  reasoning: string;
  isRequired: boolean;
  isManuallyAdjusted: boolean;
  severity: 'success' | 'warning' | 'danger';
  icon: string;
}

/**
 * Configuración de campos para templates de importación
 */
export interface TemplateColumn {
  field: string;
  header: string;
  required: boolean;
  example: string;
}
