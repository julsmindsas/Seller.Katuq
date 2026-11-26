import { META_CANAL_LABEL } from "../meta-inbox/models/meta-thread.model";
import { CanalBandeja } from "./bandeja.models";

/** Nombre de cada canal para pintarlo. Son nombres de marca: no se traducen. */
export const CANAL_BANDEJA_LABEL: Record<CanalBandeja, string> = {
  whatsapp: "WhatsApp",
  ...META_CANAL_LABEL,
};

/** Orden en que se ofrecen los canales en los filtros. */
export const CANALES_BANDEJA: readonly CanalBandeja[] = ["whatsapp", "instagram", "facebook", "tiktok"];

/** Ícono de Font Awesome 4 de cada canal (TikTok no tiene: usa la nota musical). */
export const CANAL_BANDEJA_ICONO: Record<CanalBandeja, string> = {
  whatsapp: "fa fa-whatsapp",
  instagram: "fa fa-instagram",
  facebook: "fa fa-facebook",
  tiktok: "fa fa-music",
};

/** Rutas del menú «Mensajes» que dan acceso a cada buzón (el menú las compara por texto, ya normalizadas). */
export const RUTA_MENU_CANAL: Record<CanalBandeja, string> = {
  whatsapp: "notificaciones/whatsapp/inbox",
  instagram: "notificaciones/instagram/inbox",
  facebook: "notificaciones/facebook/inbox",
  tiktok: "notificaciones/tiktok/inbox",
};
