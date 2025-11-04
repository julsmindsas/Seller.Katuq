/**
 * Modelos para el sistema de mapeo inteligente de columnas
 * Usado en los pasos de importación de clientes y productos
 */

export interface ColumnMapping {
  sourceColumn: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface ColumnMappingResult {
  success: boolean;
  type: 'customer' | 'product';
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
  type: 'customer' | 'product';
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
