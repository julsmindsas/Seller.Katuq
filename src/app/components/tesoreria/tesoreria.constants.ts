/**
 * Spec 013 — Tesorería MVP. Constantes de UI del módulo de tesorería.
 * La matriz de transiciones (CA-09) se valida en el SERVIDOR; aquí solo se usa
 * para mostrar las opciones disponibles y evitar clicks inútiles.
 */

/** Roles con permiso para decidir (informativo en FE; el enforcement es server-side). */
export const TREASURY_ROLES: string[] = ['Tesorero', 'Tesoreria', 'Administrador', 'Super Administrador'];

/** Presets de estadosPago por pestaña del listado de pedidos. */
export const PRESET_POR_REVISAR: string[] = ['Pospendiente'];
// Ticket 1448: el saldo de un pedido en Crédito también es «Sin pago» (sin pedidos en Crédito la lista es la de siempre).
export const PRESET_SIN_PAGO: string[] = ['Pendiente', 'PreAprobado', 'Credito'];
export const PRESET_RECHAZADOS: string[] = ['Rechazado'];

/** "YYYY-MM-DD" de una fecha. */
export function fechaIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Suma días a una fecha "YYYY-MM-DD" y retorna "YYYY-MM-DD". */
export function sumarDias(isoDate: string, dias: number): string {
  if (!isoDate) return isoDate;
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return fechaIso(d);
}

/**
 * Rango por defecto de las listas de pedidos: último año → hoy (la cola de
 * tesorería no debe ocultar pedidos pendientes antiguos). La tarjeta "Sin pago"
 * cuenta con este mismo rango (ticket 1127).
 */
export function rangoPorDefecto(hoy: Date = new Date()): { desde: string; hasta: string } {
  const haceUnAnio = new Date(hoy);
  haceUnAnio.setFullYear(hoy.getFullYear() - 1);
  return { desde: fechaIso(haceUnAnio), hasta: fechaIso(hoy) };
}

/**
 * Filtro de pedidos por estado de pago y fecha de creación. Lo usan la lista de
 * cada pestaña y la tarjeta "Sin pago": antes la tarjeta contaba otra cosa
 * (solo "Pendiente", de toda la historia) y no cuadraba con la lista (ticket 1127).
 */
export function filtroPedidosTesoreria(company: string, estadosPago: string[], desde: string, hasta: string): any {
  return {
    company,
    estadosPago,
    tipoFecha: 'fechaCreacion',
    fechaInicial: desde,
    // El backend compara strings: `fechaCreacion <= fechaFinal`. Con la fecha
    // sola ("2026-07-02") los pedidos de ESE día quedan fuera porque su ISO trae
    // hora ("2026-07-02T19:42..." > "2026-07-02"). Se envía el día siguiente
    // para que el rango sea inclusivo (incidente Almara: los pedidos de hoy no
    // aparecían en la cola Por revisar).
    fechaFinal: sumarDias(hasta, 1),
  };
}

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

/**
 * Ticket 1448: transiciones que suma Crédito. Espejo de CREDITO_TRANSITIONS del backend; solo se ofrecen con la
 * bandera `estadoCredito` encendida (el servidor las valida y responde 409 si no). Desde un pedido en Crédito
 * la salida es de Tesorería; la entrada, de Pendiente, PreAprobado o Rechazado (no de Pospendiente: ahí se decide primero el pago).
 */
export const CREDITO_TRANSITIONS: { [estadoActual: string]: string[] } = {
  Pendiente: ['Credito'],
  PreAprobado: ['Credito'],
  Rechazado: ['Credito'],
  Credito: ['Aprobado', 'PreAprobado', 'Pendiente', 'Precancelado'],
};

/** Destinos manuales permitidos desde un estado; con `estadoCredito` apagada es exactamente la matriz de siempre. */
export function transicionesDesde(estadoActual: string, estadoCredito: boolean): string[] {
  const base = PAYMENT_STATE_TRANSITIONS[estadoActual] || [];
  // Salir de Crédito se ofrece siempre: si la bandera se apaga después, Tesorería igual debe poder sacar los pedidos.
  if (estadoCredito !== true && estadoActual !== 'Credito') return base;
  return [...base, ...(CREDITO_TRANSITIONS[estadoActual] || []).filter((e) => !base.includes(e))];
}

export interface PaymentStateMeta {
  label: string;
  icon: string;
  badgeClass: string;
  descripcion: string;
}

/** Metadatos visuales por estado de pago (badge, icono, texto de ayuda). */
export const PAYMENT_STATE_META: { [estado: string]: PaymentStateMeta } = {
  Pendiente:    { label: 'Pendiente',     icon: 'pi-clock',        badgeClass: 'tk-badge-pendiente',    descripcion: 'Sin pago verificado' },
  // Ticket 1448: el estado del pedido se llama «Pago en revisión» (solo el texto; el valor guardado sigue siendo Pospendiente).
  // La cola de Tesorería conserva su nombre «Por revisar».
  Pospendiente: { label: 'Pago en revisión', icon: 'pi-hourglass',  badgeClass: 'tk-badge-pospendiente', descripcion: 'Comprobante en revisión de tesorería' },
  PreAprobado:  { label: 'Pre-aprobado',  icon: 'pi-eye',          badgeClass: 'tk-badge-preaprobado',  descripcion: 'Pago parcial verificado, con saldo pendiente' },
  Credito:      { label: 'Crédito',       icon: 'pi-calendar',     badgeClass: 'tk-badge-preaprobado',  descripcion: 'Se produce, despacha y entrega sin cobrar; el saldo queda en Cartera' },
  Aprobado:     { label: 'Aprobado',      icon: 'pi-check-circle', badgeClass: 'tk-badge-aprobado',     descripcion: 'Pago total verificado' },
  Rechazado:    { label: 'Rechazado',     icon: 'pi-times-circle', badgeClass: 'tk-badge-rechazado',    descripcion: 'Comprobante rechazado' },
  Anulado:      { label: 'Anulado',       icon: 'pi-undo',         badgeClass: 'tk-badge-cancelado',    descripcion: 'Pago aprobado que Tesorería deshizo (ticket 1361)' },
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
  { label: 'Anulado', value: 'Anulado' },
];
