/**
 * Domicilios: pedidos de entrega que un comercio monta a mano o por archivo, y que toman los mensajeros
 * (de la empresa o independientes). Los mismos campos que recibe la API pública `/v1/domicilios`.
 */

export interface PuntoDomicilio {
  nombre: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  barrio: string;
  indicaciones: string;
}

export interface DomicilioNuevo {
  /** Número del pedido en el sistema del comercio o del marketplace; repetirlo no crea otro domicilio. */
  idExterno: string;
  recogida: PuntoDomicilio;
  entrega: PuntoDomicilio;
  /** Lo que cuesta el domicilio (el servidor lo guarda como `totalEnvio`); sobre esto se calcula la comisión. */
  valorDomicilio: number;
  /** Valor del pedido; solo informativo. */
  valorPedido: number;
  /** Lo que el mensajero cobra al cliente al entregar; 0 si ya está pago. */
  cobrarAlEntregar: number;
  descripcion: string;
}

/** Estados que ven el comercio y los marketplaces; no son los internos del pedido. */
export type EstadoDomicilio = 'pendiente' | 'asignado' | 'en_camino' | 'entregado' | 'no_entregado' | 'cancelado';

export const ESTADOS_DOMICILIO: EstadoDomicilio[] = ['pendiente', 'asignado', 'en_camino', 'entregado', 'no_entregado', 'cancelado'];

export interface Domicilio {
  id: string;
  numero: string;
  idExterno: string;
  estado: EstadoDomicilio;
  creado: string;
  valorDomicilio: number;
  valorPedido: number;
  cobrarAlEntregar: number;
  descripcion: string;
  recogida: Partial<PuntoDomicilio>;
  entrega: Partial<PuntoDomicilio>;
  /** Solo el nombre de pila, el vehículo y la placa; nunca documento, celular ni ubicación. */
  mensajero?: { nombre: string; vehiculo?: string; placa?: string; independiente?: boolean } | null;
  asignadoEn?: string | null;
  recogidoEn?: string | null;
  entregadoEn?: string | null;
  canceladoEn?: string | null;
  motivoCancelacion?: string | null;
}

export interface RespuestaListaDomicilios {
  success: boolean;
  domicilios: Domicilio[];
  hayMas?: boolean;
}

export interface RespuestaDomicilio {
  success: boolean;
  domicilio: Domicilio;
  /** 200 en vez de 201 cuando el `idExterno` ya existía y se devolvió el mismo domicilio. */
  repetido?: boolean;
}

export interface ResultadoLote {
  indice: number;
  success: boolean;
  domicilio?: Domicilio;
  /** El `idExterno` ya existía y se devolvió el mismo domicilio. */
  repetido?: boolean;
  codigo?: string;
  error?: string;
  /** Campo que falló, como `entrega.ciudad`. */
  campo?: string;
}

export interface RespuestaLote {
  success: boolean;
  resultados: ResultadoLote[];
  creados: number;
  fallidos: number;
}

export interface LlaveApi {
  id: string;
  /** Primeros caracteres de la llave, para reconocerla; la llave completa solo se ve al crearla. */
  prefijo: string;
  nombre: string;
  creada: string;
  ultimoUso?: string | null;
}

export interface RespuestaLlaveNueva {
  success: boolean;
  llave: LlaveApi;
  /** La llave completa: solo llega en esta respuesta y no se puede volver a ver. */
  secreto: string;
}

export interface ConfiguracionDomicilios {
  /** Interruptor del comercio: sin él la API y la pantalla no crean domicilios. */
  habilitado: boolean;
  webhookUrl: string;
  /** El secreto con el que se firman los avisos; solo se muestra al crearlo o cambiarlo. */
  webhookSecretoDefinido: boolean;
  recogidaPorDefecto: Partial<PuntoDomicilio>;
}

/** Rango y filtros de la lista de domicilios (las fechas son `YYYY-MM-DD`). */
export interface FiltrosListado {
  /** Vacío = todos los estados. */
  estado: EstadoDomicilio | '';
  desde: string;
  hasta: string;
  limite?: number;
}

/** Cómo respondió la URL del comercio a la prueba de aviso, ya interpretado para mostrarlo. */
export interface PruebaAviso {
  exitosa: boolean;
  /** Frase para quien mira la pantalla. */
  texto: string;
  /** Código HTTP con el que respondió la URL; `null` si no llegó a responder. */
  estadoHttp: number | null;
  milisegundos: number | null;
}
