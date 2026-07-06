/**
 * Spec 013 — Tesorería MVP. Constantes de UI del módulo de tesorería.
 * La matriz de transiciones (CA-09) se valida en el SERVIDOR; aquí solo se usa
 * para mostrar las opciones disponibles y evitar clicks inútiles.
 */

/** Roles con permiso para decidir (informativo en FE; el enforcement es server-side). */
export const TREASURY_ROLES: string[] = ['Tesorero', 'Administrador', 'Super Administrador'];

/** Presets de estadosPago por pestaña del listado de pedidos. */
export const PRESET_POR_REVISAR: string[] = ['Pospendiente'];
export const PRESET_SIN_PAGO: string[] = ['Pendiente', 'PreAprobado'];
export const PRESET_RECHAZADOS: string[] = ['Rechazado'];

/** Matriz de transiciones manuales permitidas (CA-09).
 * Espejo de treasuryConstants.js del backend — el enforcement real es server-side.
 * D-077: Pospendiente permite Precancelado (cancelar pedido con pago en revisión;
 * el servidor resuelve los pagos Pendientes como Rechazados con auditoría). */
export const PAYMENT_STATE_TRANSITIONS: { [estadoActual: string]: string[] } = {
  Pendiente: ['PreAprobado', 'Precancelado'],
  Pospendiente: ['Aprobado', 'PreAprobado', 'Rechazado', 'Precancelado'],
  PreAprobado: ['Aprobado', 'Pendiente', 'Precancelado'],
  Rechazado: ['Pendiente', 'PreAprobado', 'Precancelado'],
};

export interface PaymentStateMeta {
  label: string;
  icon: string;
  badgeClass: string;
  descripcion: string;
}

/** Metadatos visuales por estado de pago (badge, icono, texto de ayuda). */
export const PAYMENT_STATE_META: { [estado: string]: PaymentStateMeta } = {
  Pendiente:    { label: 'Pendiente',     icon: 'pi-clock',        badgeClass: 'tk-badge-pendiente',    descripcion: 'Sin pago verificado' },
  Pospendiente: { label: 'Por revisar',   icon: 'pi-hourglass',    badgeClass: 'tk-badge-pospendiente', descripcion: 'Comprobante en revisión de tesorería' },
  PreAprobado:  { label: 'Pre-aprobado',  icon: 'pi-eye',          badgeClass: 'tk-badge-preaprobado',  descripcion: 'Pago parcial verificado, con saldo pendiente' },
  Aprobado:     { label: 'Aprobado',      icon: 'pi-check-circle', badgeClass: 'tk-badge-aprobado',     descripcion: 'Pago total verificado' },
  Rechazado:    { label: 'Rechazado',     icon: 'pi-times-circle', badgeClass: 'tk-badge-rechazado',    descripcion: 'Comprobante rechazado' },
  Precancelado: { label: 'Pre-cancelado', icon: 'pi-ban',          badgeClass: 'tk-badge-cancelado',    descripcion: 'Pedido pre-cancelado' },
  Cancelado:    { label: 'Cancelado',     icon: 'pi-ban',          badgeClass: 'tk-badge-cancelado',    descripcion: 'Pedido cancelado' },
};

/** Devuelve los metadatos de un estado, con fallback seguro. */
export function metaEstado(estado: string): PaymentStateMeta {
  return PAYMENT_STATE_META[estado] || { label: estado || '—', icon: 'pi-circle', badgeClass: 'tk-badge-cancelado', descripcion: '' };
}

/** Motivos predefinidos para cambio manual de estado (más "Otro" con texto libre). */
export const MOTIVOS_CAMBIO_ESTADO: string[] = [
  'Verifiqué el dinero directamente en el banco',
  'Autorización de entrega contraentrega',
  'Acuerdo de pago con el cliente',
  'Corrección de un estado registrado por error',
  'El cliente desistió de la compra',
];

/** Estados de verificación para el filtro del historial. */
export const HISTORIAL_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Pendiente', value: 'Pendiente' },
  { label: 'Aprobado', value: 'Aprobado' },
  { label: 'Rechazado', value: 'Rechazado' },
];
