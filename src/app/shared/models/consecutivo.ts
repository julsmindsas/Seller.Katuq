/**
 * Modelo de Consecutivo
 * Representa un consecutivo de numeración para documentos (pedidos, facturas, etc.)
 *
 * IMPORTANTE: Este modelo coincide con la estructura REAL del sistema
 * almacenada en la colección 'consecutives' de Firestore.
 */

export interface Consecutivo {
  /**
   * ID del documento en Firestore (opcional)
   */
  id?: string;

  /**
   * Nombre comercial de la empresa
   */
  company: string;

  /**
   * Número consecutivo actual
   * Se incrementa automáticamente cada vez que se genera un nuevo documento
   */
  numero: number;

  /**
   * Tipo de consecutivo
   * - 'orders': Pedidos normales (formato: EMP-000001)
   * - 'ordersPOS': Pedidos del punto de venta (formato: POS-000001)
   */
  tipoConsecutivo: 'orders' | 'ordersPOS';
}

/**
 * Tipos de consecutivo disponibles en el sistema
 */
export type TipoConsecutivo = 'orders' | 'ordersPOS';

/**
 * Información descriptiva de cada tipo de consecutivo
 */
export const TIPOS_CONSECUTIVO_INFO = {
  orders: {
    label: 'Pedidos Web',
    descripcion: 'Consecutivo para pedidos creados desde la plataforma web',
    ejemplo: 'EMP-000001',
    icon: 'pi-shopping-cart'
  },
  ordersPOS: {
    label: 'Pedidos POS',
    descripcion: 'Consecutivo para pedidos creados desde el punto de venta',
    ejemplo: 'POS-000001',
    icon: 'pi-calculator'
  }
};

/**
 * Consecutivos por defecto que se crean durante el onboarding
 */
export const CONSECUTIVOS_DEFAULT: Omit<Consecutivo, 'company' | 'id'>[] = [
  {
    numero: 1,
    tipoConsecutivo: 'orders'
  },
  {
    numero: 1,
    tipoConsecutivo: 'ordersPOS'
  }
];
