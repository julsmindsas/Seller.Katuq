/**
 * Utilidades del modelo "paquete" de zonas de cobro (spec 011 v2, T-06).
 * Espeja la lógica pura del backend (`services/zonasCobroPackage.js`) para que el
 * frontend tolere tanto docs v2 (paquete con `municipios[]`) como docs legacy v1
 * (un municipio por doc, con `ciudad` en el raíz) durante la migración.
 */

export interface MunicipioZona {
  ciudad: string;
  codigoDane: string;
  departamento: string;
}

export interface ZonaCobro {
  cd?: string;
  nombreZonaCobro: string;
  valorZonaCobro: number;
  impuestoZonaCobro: number;
  impuesto?: number;
  total?: number;
  municipios: MunicipioZona[];
  company?: string;
  activo?: boolean;
  // campos legacy que pueden venir en docs sin migrar:
  ciudad?: string;
  codigoDane?: string;
  departamento?: string;
}

/** trim + minúsculas para comparar nombres/ciudades. */
export function normZona(s: any): string {
  return (s == null ? '' : String(s)).trim().toLowerCase();
}

/** Clave lógica de un municipio para deduplicar dentro de una zona. */
function municipioKey(m: any): string {
  const dane = (m && m.codigoDane != null ? String(m.codigoDane) : '').trim();
  if (dane) { return `dane:${dane}`; }
  return `cd:${normZona(m && (m.ciudad != null ? m.ciudad : m.nombre))}|${normZona(m && m.departamento)}`;
}

/** Limpia y deduplica una lista de municipios (por codigoDane, fallback ciudad|departamento). */
export function dedupeMunicipios(municipios: any[]): MunicipioZona[] {
  const out: MunicipioZona[] = [];
  const vistos = new Set<string>();
  if (!Array.isArray(municipios)) { return out; }
  for (const m of municipios) {
    const ciudad = ((m && (m.ciudad != null ? m.ciudad : m.nombre)) || '').toString().trim();
    if (!ciudad) { continue; }
    const key = municipioKey({ ...m, ciudad });
    if (vistos.has(key)) { continue; }
    vistos.add(key);
    out.push({
      ciudad,
      codigoDane: (m && m.codigoDane != null ? String(m.codigoDane) : '').trim(),
      departamento: (m && m.departamento) ? String(m.departamento).trim() : '',
    });
  }
  return out;
}

/**
 * Normaliza un doc de `zonacobro` a la forma paquete, tolerando docs legacy v1.
 * - Si trae `municipios[]` no vacío, lo conserva (deduplicado).
 * - Si es legacy (`ciudad` en raíz), sintetiza `municipios:[{...}]`.
 */
export function normalizeZonaCobro(doc: any): ZonaCobro {
  if (!doc || typeof doc !== 'object') { return doc; }
  if (Array.isArray(doc.municipios) && doc.municipios.length > 0) {
    return { ...doc, municipios: dedupeMunicipios(doc.municipios) };
  }
  if (doc.ciudad) {
    return {
      ...doc,
      municipios: [{
        ciudad: String(doc.ciudad).trim(),
        codigoDane: doc.codigoDane != null ? String(doc.codigoDane).trim() : '',
        departamento: doc.departamento ? String(doc.departamento).trim() : '',
      }],
    };
  }
  return { ...doc, municipios: Array.isArray(doc.municipios) ? doc.municipios : [] };
}

/** Aplica `normalizeZonaCobro` a una lista (respuesta de `/v1/zonascobro/all`). */
export function normalizeZonasCobro(docs: any[]): ZonaCobro[] {
  return Array.isArray(docs) ? docs.map(normalizeZonaCobro) : [];
}

/**
 * ¿La zona cubre esta ciudad? Busca la ciudad dentro de `municipios[]` (modelo
 * paquete), tolerando docs legacy (ciudad en el raíz vía normalizeZonaCobro).
 * Un municipio puede estar en varias zonas → el selector puede devolver varias.
 */
export function zonaCubreCiudad(zona: any, ciudad: any): boolean {
  const target = (ciudad == null ? '' : String(ciudad)).trim().toLowerCase();
  if (!target) { return false; }
  const munis = (normalizeZonaCobro(zona).municipios || []);
  return munis.some(m => (m.ciudad || '').toString().toLowerCase().trim() === target);
}
