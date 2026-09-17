import { Pedido } from '../../ventas/modelo/pedido';

/**
 * Interfaz que extiende Pedido para incluir las propiedades necesarias 
 * para mostrar información de entrega y seguimiento
 */
export interface PedidoEntrega extends Pedido {
  // Datos de estado
  
  // Datos de quien recibe
  quienRecibio?: string;
  telefono?: string;
  parentesco?: string;
  
  // Evidencias de entrega
  fotosEvidencia?: string[];
  fotoEvidencia?: string;
  signatureImage?: string;
  
  /**
   * Momento en que el mensajero cerró la entrega, que NO es lo mismo que
   * `fechaEntrega` (la pactada con el cliente). Ticket 1022: esta pantalla venía
   * mostrando la pactada con formato de hora, así que toda entrega salía a las
   * 00:00 aunque la hora real estuviera guardada. Lo escribe la app del mensajero
   * vía `buildTransporterUpdate` (D-283) y también el webhook de Enviame.
   */
  fechaEntregaReal?: string;

  // Datos adicionales
  observacionesEntrega?: string;
  fechaRecepcion?: string;
  calificacion?: number;
} 