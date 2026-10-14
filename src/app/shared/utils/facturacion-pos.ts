/**
 * D-419 (ticket 1171): datos de facturación de una venta POS.
 *
 * El cajero elige un perfil del cliente (`clients.datosFacturacionElectronica[]`),
 * Consumidor Final o "No requiere factura". Esta utilidad no tiene Angular: la
 * usan PosCheckoutService, el modal de facturación del POS y sus pruebas.
 */

export type ModoFacturacionPos = 'perfil' | 'consumidorFinal' | 'ninguna';

export interface FacturacionPos {
  modo: ModoFacturacionPos;
  /** Perfil elegido (solo en modo 'perfil'). */
  perfil?: any;
}

/** Datos de Consumidor Final, los mismos que usa la venta asistida (pedido-facturacion). */
export const CONSUMIDOR_FINAL = Object.freeze({
  alias: 'Consumidor Final',
  nombres: 'CONSUMIDOR FINAL',
  tipoDocumento: 'CC',
  documento: '222222222222',
  indicativoCel: '57',
  celular: '0000000000',
  correoElectronico: 'consumidorfinal@katuq.com',
  direccion: 'N/A',
  pais: 'Colombia',
  departamento: 'N/A',
  ciudad: 'N/A',
  codigoPostal: '000000',
});

export const SIN_FACTURA: FacturacionPos = Object.freeze({ modo: 'ninguna' }) as FacturacionPos;

const s = (v: any): string => (v === null || v === undefined ? '' : String(v)).trim();

/** Perfiles de facturación del cliente (sin elementos vacíos). */
export function perfilesDelCliente(cliente: any): any[] {
  const lista = cliente?.datosFacturacionElectronica;
  return Array.isArray(lista) ? lista.filter((p) => p && typeof p === 'object') : [];
}

/**
 * Opción con la que arranca la venta para este cliente: su perfil
 * predeterminado; si no tiene, "No requiere factura" (D-419).
 */
export function facturacionInicial(cliente: any): FacturacionPos {
  const perfil = perfilesDelCliente(cliente).find((p) => p.predeterminado);
  return perfil ? { modo: 'perfil', perfil } : SIN_FACTURA;
}

/**
 * Qué le falta al perfil para emitir la factura. Mismas reglas que
 * `PedidoFacturacionComponent.validarDatosFacturacion` (venta asistida), salvo
 * el celular, que la DIAN no exige. Lista vacía = el perfil sirve.
 */
export function faltantesPerfil(perfil: any): string[] {
  const faltan: string[] = [];
  const razon = s(perfil?.nombres || perfil?.razonSocial);
  const tipo = s(perfil?.tipoDocumento);
  const doc = s(perfil?.documento);
  const correo = s(perfil?.correo || perfil?.correoElectronico);
  const ciudad = s(perfil?.ciudad);

  if (razon.length < 3) faltan.push('Razón social o nombre completo');
  if (!tipo) faltan.push('Tipo de documento');
  if (!doc) {
    faltan.push('Número de documento');
  } else {
    const limpio = doc.replace(/[\s.]/g, '').toUpperCase();
    const valido =
      tipo === 'NIT' ? /^\d{6,12}(-\d)?$/.test(limpio)
      : tipo === 'PA' ? /^[A-Z0-9]{4,20}$/.test(limpio)
      : /^\d{4,15}$/.test(limpio.split('-')[0]);
    if (!valido) faltan.push(tipo === 'NIT' ? 'NIT válido (ej: 901072822-4)' : 'Número de documento válido');
  }
  if (!ciudad || ciudad.toUpperCase() === 'N/A') faltan.push('Ciudad');
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) faltan.push('Correo electrónico válido');
  return faltan;
}

/** Faltantes de la opción elegida: Consumidor Final y "No requiere factura" no se validan. */
export function faltantesFacturacion(f: FacturacionPos | null | undefined): string[] {
  return f?.modo === 'perfil' ? faltantesPerfil(f.perfil) : [];
}

/** Lleva un perfil del formulario único a la forma `Facturacion` del pedido. */
export function perfilAFacturacion(perfil: any): any {
  const p = perfil || {};
  return {
    alias: s(p.alias),
    nombres: s(p.nombres || p.razonSocial),
    tipoDocumento: s(p.tipoDocumento),
    documento: s(p.documento),
    correoElectronico: s(p.correoElectronico || p.correo),
    indicativoCel: s(p.indicativoCel) || '57',
    celular: s(p.celular),
    direccion: s(p.direccion),
    ciudad: s(p.ciudad),
    departamento: s(p.departamento),
    pais: s(p.pais) || 'Colombia',
    codigoPostal: s(p.codigoPostal),
  };
}

/** Campos del pedido según la opción elegida. */
export function camposPedido(f: FacturacionPos | null | undefined): { facturacion?: any; generarFacturaElectronica: boolean } {
  if (f?.modo === 'perfil' && f.perfil) {
    return { facturacion: perfilAFacturacion(f.perfil), generarFacturaElectronica: true };
  }
  if (f?.modo === 'consumidorFinal') {
    return { facturacion: { ...CONSUMIDOR_FINAL }, generarFacturaElectronica: true };
  }
  return { generarFacturaElectronica: false };
}

/** Texto corto para mostrar la opción junto al cliente. */
export function resumenFacturacion(f: FacturacionPos | null | undefined): string {
  if (f?.modo === 'perfil') {
    const p = f.perfil || {};
    const nombre = s(p.alias) || s(p.nombres);
    const doc = s(p.documento);
    return [nombre, doc].filter(Boolean).join(' · ') || 'Perfil del cliente';
  }
  if (f?.modo === 'consumidorFinal') return 'Consumidor Final';
  return 'No requiere factura';
}
