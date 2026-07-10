/**
 * Normaliza el nombre de un transportador/mensajero ANTES de persistirlo en el
 * pedido/orden. Distintos flujos de despacho venían guardando el mismo mensajero
 * en formatos distintos (con el teléfono pegado — "Juan Camilo Patiño Alzate-3197896986" —
 * o con la cédula de prefijo — "1020433874-Jairo Alberto Arango Gomez"), lo que
 * rompía el filtro por mensajero en /despachos (D-083).
 *
 * Reglas: quita el prefijo de cédula/id y el sufijo de teléfono (6+ dígitos), y
 * colapsa espacios. Preserva caja y acentos para no afear la visualización.
 * Las claves de proveedor ("enviame", "prindel", "partners_logistics") no tienen
 * dígitos, así que pasan intactas.
 */
export function normalizeTransportadorName(raw: any): string {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  return s
    .replace(/^\s*\d{6,}\s*-\s*/, '')   // prefijo de cédula/id
    .replace(/\s*-\s*\d{6,}\s*$/, '')   // sufijo de teléfono
    .replace(/\s+/g, ' ')
    .trim();
}
