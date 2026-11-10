/**
 * Modelos de los buzones de Meta (Instagram Direct y Messenger).
 *
 * Una sola implementación para todos los canales: el usuario ve buzones
 * separados (una ruta y una entrada de menú por canal), pero el código es uno solo
 * parametrizado por `canal`. TikTok (D-709) es el tercero, detrás de la bandera `tiktokMensajes`. Duplicarlo sería duplicar el mantenimiento sin
 * darle nada al usuario.
 *
 * Diferencia clave con el buzón de WhatsApp: aquí el hilo NO se identifica por
 * teléfono (Meta no lo entrega) sino por `identidadHash`, y el cliente NO se
 * resuelve solo — hay que vincularlo a mano.
 */

export type MetaCanal = 'instagram' | 'facebook' | 'tiktok';

export type MetaDireccion = 'inbound' | 'outbound';

export type MetaEstadoEnvio = 'sent' | 'delivered' | 'read' | 'failed';

/** Estado de la conexión de un canal con Meta. */
export type MetaEstadoConexion = 'sin_conectar' | 'conectado' | 'reconectar';

/** Estado de la ventana de TikTok (D-709): 10 mensajes al inicio, sin límite mientras responde, 3 si pasan 48 h. */
export type MetaVentanaEstado = 'inicial' | 'abierta' | 'limitada' | 'cerrada';

/**
 * Ventana de mensajería. Fuera de ella no se puede responder hasta que el contacto vuelva a escribir.
 *
 * Instagram y Facebook usan `abierta`, `minutosRestantes` y `expiraEn`. TikTok trae además `estado`,
 * `restantes` (mensajes que quedan; null si no hay tope) y `venceEn`; el servicio los normaliza a los
 * tres primeros campos para que el resto de la pantalla no tenga que distinguir.
 */
export interface MetaVentana {
  abierta: boolean;
  minutosRestantes: number;
  expiraEn: string | null;
  /** Solo TikTok. */
  estado?: MetaVentanaEstado;
  /** Solo TikTok: mensajes que se pueden enviar todavía; null = sin tope. */
  restantes?: number | null;
  /** Solo TikTok: hasta cuándo vale la ventana; null si no aplica. */
  venceEn?: string | null;
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
  /** Solo TikTok: si el país del cliente deja mandar imágenes en esta conversación. */
  permiteImagen?: boolean;
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
  /** Solo TikTok: por qué hay que reconectar, si el servidor lo dice. */
  motivo?: string | null;
}

export interface MetaConexiones {
  instagram: MetaConexion;
  facebook: MetaConexion;
  /** Solo llega con la bandera `tiktokMensajes` encendida (D-709). */
  tiktok?: MetaConexion;
}

/**
 * Imagen que se adjunta a una respuesta de TikTok: viaja en el cuerpo (JSON), en base64. Si va con texto,
 * el servidor los envía como dos mensajes (la imagen primero) y cada uno gasta cupo de la ventana.
 */
export interface MetaImagenAdjunta {
  base64: string;
  mime: string;
  nombre: string;
  /** Solo para mostrarla en pantalla antes de enviar; no viaja al servidor. */
  vistaPrevia?: string;
}

/** Lo que devuelve el servidor cuando rechaza algo con un motivo en palabras sencillas (código + mensaje). */
export interface MetaErrorServidor {
  code?: string;
  message?: string;
  /** TikTok: salió la imagen pero no el texto; la imagen no se reintenta. */
  parcial?: boolean;
}

/** Etiquetas de canal para la UI. Un solo lugar donde se nombran. */
export const META_CANAL_LABEL: Record<MetaCanal, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};
