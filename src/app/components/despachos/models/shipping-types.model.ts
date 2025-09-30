/**
 * Tipos de envío soportados en el sistema logístico
 *
 * @description
 * Define los tipos de envío disponibles para cotización y creación de envíos.
 * Algunos tipos requieren información adicional como distancia en kilómetros.
 *
 * @author Katuq Team
 * @version 1.0.0
 */

/**
 * Tipos de envío disponibles
 *
 * - **estandar**: Envío estándar (3-5 días hábiles)
 * - **express**: Envío express (1-2 días hábiles) - **Requiere distancia en km**
 * - **prioritario**: Envío prioritario (24 horas)
 * - **sameday**: Entrega el mismo día (solo ciudades principales)
 * - **nextday**: Entrega al día siguiente
 * - **logistica-inversa**: Para devoluciones y retornos de productos
 */
export type ShippingType =
  | 'estandar'
  | 'express'
  | 'prioritario'
  | 'sameday'
  | 'nextday'
  | 'logistica-inversa';

/**
 * Etiquetas legibles para cada tipo de envío
 */
export const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = {
  'estandar': 'Estándar (3-5 días)',
  'express': 'Express (1-2 días)',
  'prioritario': 'Prioritario (24h)',
  'sameday': 'Mismo Día',
  'nextday': 'Día Siguiente',
  'logistica-inversa': 'Logística Inversa'
};

/**
 * Tipos de envío que requieren ingreso manual de distancia
 *
 * @description
 * Estos tipos necesitan que el usuario ingrese la distancia en kilómetros
 * entre origen y destino para calcular correctamente la cotización.
 */
export const REQUIRES_DISTANCE_INPUT: ShippingType[] = ['express'];

/**
 * Verifica si un tipo de envío requiere distancia
 *
 * @param shippingType - Tipo de envío a validar
 * @returns true si requiere distancia, false en caso contrario
 *
 * @example
 * ```typescript
 * if (requiresDistanceInput('express')) {
 *   // Mostrar campo de distancia
 * }
 * ```
 */
export function requiresDistanceInput(shippingType: ShippingType): boolean {
  return REQUIRES_DISTANCE_INPUT.includes(shippingType);
}

/**
 * Obtiene la etiqueta legible de un tipo de envío
 *
 * @param shippingType - Tipo de envío
 * @returns Etiqueta legible
 *
 * @example
 * ```typescript
 * const label = getShippingTypeLabel('express'); // "Express (1-2 días)"
 * ```
 */
export function getShippingTypeLabel(shippingType: ShippingType): string {
  return SHIPPING_TYPE_LABELS[shippingType];
}

/**
 * Obtiene todos los tipos de envío disponibles
 *
 * @returns Array con todos los tipos de envío
 */
export function getAllShippingTypes(): ShippingType[] {
  return Object.keys(SHIPPING_TYPE_LABELS) as ShippingType[];
}