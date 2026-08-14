/**
 * Modelos de los buzones de Meta (Instagram Direct y Messenger).
 *
 * Una sola implementación para los dos canales: el usuario ve dos buzones
 * separados (dos rutas, dos entradas de menú), pero el código es uno solo
 * parametrizado por `canal`. Duplicarlo sería duplicar el mantenimiento sin
 * darle nada al usuario.
 *
 * Diferencia clave con el buzón de WhatsApp: aquí el hilo NO se identifica por
 * teléfono (Meta no lo entrega) sino por `identidadHash`, y el cliente NO se
 * resuelve solo — hay que vincularlo a mano.
 */

export type MetaCanal = 'instagram' | 'facebook';

export type MetaDireccion = 'inbound' | 'outbound';

export type MetaEstadoEnvio = 'sent' | 'delivered' | 'read' | 'failed';

/** Estado de la conexión de un canal con Meta. */
export type MetaEstadoConexion = 'sin_conectar' | 'conectado' | 'reconectar';

/**
 * Ventana de mensajería de Meta. Fuera de ella no se puede responder hasta que
 * el contacto vuelva a escribir.
 */
export interface MetaVentana {
  abierta: boolean;
  minutosRestantes: number;
  expiraEn: string | null;
}

/** Hilo resumido para el listado. */
export interface MetaHilo {
  identidadHash: string;
  canal: MetaCanal;
  contactoNombre: string | null;
  ultimoMensajeEn: string;
  ultimoMensajeResumen: string;
  ultimaDireccion: MetaDireccion;
  totalMensajes: number;
  ventana: MetaVentana;
}

/** Mensaje individual dentro de un hilo. */
export interface MetaMensaje {
  id: string;
  direccion: MetaDireccion;
  tipo: string;
  body: string;
  mediaUrl: string | null;
  sentAt: string;
  estado: MetaEstadoEnvio | null;
  errorMotivo: string | null;
}

/** Pedido del cliente vinculado, para el panel derecho. */
export interface MetaPedido {
  orderId: string;
  nroPedido: string;
  fechaCreacion: string | null;
  estado: string | null;
  total: number;
  deepLink: string;
}

/** Lead del CRM del cliente vinculado. */
export interface MetaLead {
  leadId: string;
  name: string | null;
  stage: string | null;
  ownerName: string | null;
}

/**
 * Panel de contacto. `vinculado=false` es el estado normal de un contacto
 * nuevo: sin vínculo NO se muestran pedidos de nadie.
 */
export interface MetaPerfilContacto {
  identidadHash: string;
  canal: MetaCanal;
  perfilNombre: string | null;
  vinculado: boolean;
  /** `manual` hoy; `sugerido_ia` cuando exista la sugerencia automática. */
  origenVinculo: string | null;
  cliente: { id: string; nombre: string | null } | null;
  lead: MetaLead | null;
  pedidos: MetaPedido[];
}

/** Estado público de la conexión de un canal. */
export interface MetaConexion {
  estado: MetaEstadoConexion;
  cuentaNombre: string | null;
  cuentaId: string | null;
  conectadoEn: string | null;
}

export interface MetaConexiones {
  instagram: MetaConexion;
  facebook: MetaConexion;
}

/** Etiquetas de canal para la UI. Un solo lugar donde se nombran. */
export const META_CANAL_LABEL: Record<MetaCanal, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
};
