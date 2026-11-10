/**
 * Un canal de atención previsto.
 *
 * `disponibleConBandera` (D-709): con esa bandera de la empresa encendida el canal deja de ser «Próximamente»
 * porque ya existe de verdad (su entrada y su tarjeta salen en otro lugar); la lista visible la arma
 * `canalesFuturosVisibles`.
 */
export interface CanalFuturo {
  id: string;
  title: string;
  /** El de Feather (buscador del encabezado). */
  icon: string;
  /** El Tabler del menú lateral (D-546). */
  menuIcon: string;
  description: string;
  disponibleConBandera?: string;
}

/**
 * Canales de atención previstos: sólo información, sin rutas ni configuración.
 * `icon` es el de Feather (buscador del encabezado); `menuIcon`, el Tabler del menú lateral (D-546).
 */
export const FUTURE_MESSAGE_CHANNELS: readonly CanalFuturo[] = [
  { id: 'tiktok_messages', title: 'TikTok', icon: 'message-circle', menuIcon: 'brand-tiktok', description: 'Atiende los mensajes que recibes en TikTok.', disponibleConBandera: 'tiktokMensajes' },
  { id: 'email_messages', title: 'Correo', icon: 'mail', menuIcon: 'mail', description: 'Recibe y responde los correos de tus clientes.' },
  { id: 'cloud_calls', title: 'Llamadas', icon: 'phone', menuIcon: 'phone', description: 'Habla con tus clientes desde Katuq con telefonía en la nube.' },
];

/**
 * Los canales que siguen como «Próximamente» para la empresa: todos, salvo los que ya existen porque su
 * bandera está encendida. Con todas las banderas apagadas devuelve la lista tal cual.
 */
export function canalesFuturosVisibles(banderaEncendida: (bandera: string) => boolean): CanalFuturo[] {
  return FUTURE_MESSAGE_CHANNELS.filter((canal) => !canal.disponibleConBandera || !banderaEncendida(canal.disponibleConBandera));
}
