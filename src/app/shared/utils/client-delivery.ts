/**
 * Direcciones de entrega del cliente (`clients.datosEntrega[]`).
 *
 * Forma canónica (la que escriben Crear cliente y el formulario compartido):
 * `{ alias, nombres, apellidos, indicativoCel, celular, indicativoOtroNumero,
 *    otroNumero, direccionEntrega, observaciones, barrio, nombreUnidad,
 *    especificacionesInternas, pais, departamento, ciudad, zonaCobro,
 *    valorZonaCobro, codigoPV, latitud, longitud, coordenadas }`.
 *
 * Algunos documentos viejos traen elementos con claves tipo snake
 * (`direccion_entrega`, `ciudad_municipio_entrega`, `nombres_entrega`…), que
 * eran los nombres de los controles del formulario y se colaron tal cual.
 * `normalizarEntrega` los lleva a la forma canónica sin perder ninguna clave.
 */

const ALIAS_SNAKE: Record<string, string> = {
  alias_entrega: 'alias',
  nombres_entrega: 'nombres',
  apellidos_entrega: 'apellidos',
  indicativo_celular_entrega: 'indicativoCel',
  numero_celular_entrega: 'celular',
  indicativo_celular_entrega2: 'indicativoOtroNumero',
  otro_numero_entrega: 'otroNumero',
  direccion_entrega: 'direccionEntrega',
  observaciones_entrega: 'observaciones',
  barrio_entrega: 'barrio',
  nombre_unidad: 'nombreUnidad',
  especificaciones_internas: 'especificacionesInternas',
  pais_entrega: 'pais',
  departamento_entrega: 'departamento',
  ciudad_municipio_entrega: 'ciudad',
  ciudad_entrega: 'ciudad',
  zona_cobro: 'zonaCobro',
  valor_zona_cobro: 'valorZonaCobro',
  codigo_postal_entrega: 'codigoPV',
  codigo_postal: 'codigoPV',
};

export interface EntregaCliente {
  alias: string;
  nombres: string;
  apellidos: string;
  indicativoCel: string;
  celular: string;
  indicativoOtroNumero: string;
  otroNumero: string;
  direccionEntrega: string;
  observaciones: string;
  barrio: string;
  nombreUnidad: string;
  especificacionesInternas: string;
  pais: string;
  departamento: string;
  ciudad: string;
  zonaCobro: string;
  valorZonaCobro: string | number;
  codigoPV: string;
  latitud: string;
  longitud: string;
  coordenadas: string;
  [extra: string]: any;
}

const s = (v: any): string => (v === null || v === undefined ? '' : String(v));

/** Lleva un elemento de `datosEntrega[]` a la forma canónica, conservando lo que no reconoce. */
export function normalizarEntrega(raw: any): EntregaCliente {
  const e: any = raw && typeof raw === 'object' ? { ...raw } : {};
  // Claves snake → camel, sin pisar una camel que ya exista con valor.
  Object.entries(ALIAS_SNAKE).forEach(([snake, camel]) => {
    if (e[snake] !== undefined) {
      if (e[camel] === undefined || e[camel] === '' || e[camel] === null) e[camel] = e[snake];
      delete e[snake];
    }
  });
  const coordenadas = s(e.coordenadas);
  let latitud = s(e.latitud);
  let longitud = s(e.longitud);
  if ((!latitud || !longitud) && coordenadas.includes(',')) {
    const [lat, lng] = coordenadas.split(',').map((c) => c.trim());
    latitud = latitud || lat || '';
    longitud = longitud || lng || '';
  }
  return {
    ...e,
    alias: s(e.alias),
    nombres: s(e.nombres),
    apellidos: s(e.apellidos),
    indicativoCel: s(e.indicativoCel) || '57',
    celular: s(e.celular),
    indicativoOtroNumero: s(e.indicativoOtroNumero) || s(e.indicativoCel) || '57',
    otroNumero: s(e.otroNumero),
    direccionEntrega: s(e.direccionEntrega),
    observaciones: s(e.observaciones),
    barrio: s(e.barrio),
    nombreUnidad: s(e.nombreUnidad),
    especificacionesInternas: s(e.especificacionesInternas),
    pais: s(e.pais) || 'Colombia',
    departamento: s(e.departamento),
    ciudad: s(e.ciudad),
    zonaCobro: s(e.zonaCobro),
    valorZonaCobro: e.valorZonaCobro === undefined || e.valorZonaCobro === null ? '' : e.valorZonaCobro,
    codigoPV: s(e.codigoPV),
    latitud,
    longitud,
    coordenadas,
  };
}

/** Normaliza el arreglo completo; descarta elementos que no son objetos. */
export function normalizarEntregas(lista: any): EntregaCliente[] {
  return Array.isArray(lista)
    ? lista.filter((x) => x && typeof x === 'object').map(normalizarEntrega)
    : [];
}

/** Mínimo para que una dirección sirva para despachar: dirección y ciudad. */
export function esEntregaCompleta(e: any): boolean {
  return !!(e && s(e.direccionEntrega).trim() && s(e.ciudad).trim());
}

/** Texto corto para listar una dirección. */
export function resumenEntrega(e: any): string {
  if (!e) return '';
  const partes = [s(e.direccionEntrega).trim(), s(e.barrio).trim(), s(e.ciudad).trim()].filter(Boolean);
  return partes.join(' · ');
}
