/**
 * Canales de atención previstos: sólo información, sin rutas ni configuración.
 * `icon` es el de Feather (buscador del encabezado); `menuIcon`, el Tabler del menú lateral (D-546).
 */
export const FUTURE_MESSAGE_CHANNELS = [
  { id: 'tiktok_messages', title: 'TikTok', icon: 'message-circle', menuIcon: 'brand-tiktok', description: 'Atiende los mensajes que recibes en TikTok.' },
  { id: 'email_messages', title: 'Correo', icon: 'mail', menuIcon: 'mail', description: 'Recibe y responde los correos de tus clientes.' },
  { id: 'cloud_calls', title: 'Llamadas', icon: 'phone', menuIcon: 'phone', description: 'Habla con tus clientes desde Katuq con telefonía en la nube.' },
] as const;
