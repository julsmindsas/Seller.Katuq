import { DomicilioNuevo, PuntoDomicilio } from './domicilios.models';
import { limpiarTelefono } from './domicilios.utils';

/**
 * Arma lo que se manda al servidor. Lo opcional que está vacío NO se manda: un `idExterno` vacío se
 * tomaría como un número repetido, y una recogida vacía tapa la recogida por defecto del comercio.
 */

/** Límites de la API (API-DOMICILIOS.md, sección 3). */
export const MAX_ID_EXTERNO = 80;
export const MAX_DESCRIPCION = 200;

function textoOpcional(destino: Record<string, unknown>, clave: string, valor: unknown): void {
  const t = String(valor ?? '').trim();
  if (t) destino[clave] = t;
}

function cuerpoPunto(p: Partial<PuntoDomicilio>): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  textoOpcional(salida, 'nombre', p.nombre);
  const tel = limpiarTelefono(p.telefono);
  if (tel) salida['telefono'] = tel;
  textoOpcional(salida, 'direccion', p.direccion);
  textoOpcional(salida, 'ciudad', p.ciudad);
  textoOpcional(salida, 'barrio', p.barrio);
  textoOpcional(salida, 'indicaciones', p.indicaciones);
  return salida;
}

/** El cuerpo de `POST /v1/domicilios` para un domicilio. */
export function cuerpoDomicilio(d: DomicilioNuevo): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  textoOpcional(salida, 'idExterno', String(d.idExterno ?? '').slice(0, MAX_ID_EXTERNO));
  salida['recogida'] = cuerpoPunto(d.recogida);
  salida['entrega'] = cuerpoPunto(d.entrega);
  salida['valorDomicilio'] = Math.round(Number(d.valorDomicilio) || 0);
  if (Number(d.valorPedido) > 0) salida['valorPedido'] = Math.round(Number(d.valorPedido));
  if (Number(d.cobrarAlEntregar) > 0) salida['cobrarAlEntregar'] = Math.round(Number(d.cobrarAlEntregar));
  textoOpcional(salida, 'descripcion', String(d.descripcion ?? '').slice(0, MAX_DESCRIPCION));
  return salida;
}

/** El cuerpo de `POST /v1/domicilios/lote`. */
export function cuerpoLote(domicilios: DomicilioNuevo[]): { domicilios: Array<Record<string, unknown>> } {
  return { domicilios: domicilios.map(cuerpoDomicilio) };
}

/**
 * La recogida que se guarda como la del comercio (`PUT /configuracion`). Aquí sí van todos los campos,
 * también los vacíos, para que quitar el nombre o las indicaciones en pantalla los quite también allá.
 */
export function cuerpoRecogidaPorDefecto(p: Partial<PuntoDomicilio>): PuntoDomicilio {
  const t = (v: unknown) => String(v ?? '').trim();
  return {
    nombre: t(p.nombre),
    telefono: limpiarTelefono(p.telefono),
    direccion: t(p.direccion),
    ciudad: t(p.ciudad),
    barrio: t(p.barrio),
    indicaciones: t(p.indicaciones)
  };
}
