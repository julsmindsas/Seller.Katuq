import { Pedido } from '../../ventas/modelo/pedido';

/**
 * Interfaz que extiende Pedido para incluir las propiedades necesarias 
 * para mostrar información de entrega y seguimiento
 */
export interface PedidoEntrega extends Pedido {
  // Datos de estado
  estadoEntrega?: string;
  
  // Datos de quien recibe
  quienRecibio?: string;
  telefono?: string;
  
  // Evidencias de entrega
  fotosEvidencia?: string[];
  fotoEvidencia?: string;
  signatureImage?: string;
  
  // Datos adicionales
  observacionesEntrega?: string;
  fechaRecepcion?: string;
  calificacion?: number;
} 