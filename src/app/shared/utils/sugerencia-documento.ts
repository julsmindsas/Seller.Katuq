import { claveDocumento } from './clave-documento';

/**
 * Ticket 1650 (D-724): al escribir el documento en «Nuevos datos de facturación» se busca el cliente
 * de la empresa con ese documento y se proponen sus datos. Primero un perfil de facturación de esa
 * ficha con el mismo documento (la razón social con que ya se ha facturado); si no hay, la ficha misma
 * cuando su documento es ese. Nunca se sobrescribe lo escrito: la pantalla lo propone y la persona decide.
 */
export interface SugerenciaDocumento {
  nombre: string;
  /** 'perfil' = un dato de facturación guardado; 'ficha' = el cliente mismo. */
  origen: 'perfil' | 'ficha';
  tipoDocumento?: string;
  correo?: string;
  indicativoCel?: string;
  celular?: string;
  direccion?: string;
  pais?: string;
  departamento?: string;
  ciudad?: string;
  codigoPostal?: string;
}

const texto = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const conValor = (o: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => !!v)) as Record<string, string>;

export function sugerenciaPorDocumento(ficha: any, documento: unknown): SugerenciaDocumento | null {
  const clave = claveDocumento(documento);
  if (!clave || !ficha || typeof ficha !== 'object' || Array.isArray(ficha)) return null;

  const perfiles: any[] = Array.isArray(ficha.datosFacturacionElectronica) ? ficha.datosFacturacionElectronica : [];
  const perfil = perfiles.find((p) => p && claveDocumento(p.documento) === clave && texto(p.nombres));
  if (perfil) {
    return {
      nombre: texto(perfil.nombres),
      origen: 'perfil',
      ...conValor({
        tipoDocumento: texto(perfil.tipoDocumento),
        correo: texto(perfil.correoElectronico),
        indicativoCel: texto(perfil.indicativoCel),
        celular: texto(perfil.celular),
        direccion: texto(perfil.direccion),
        pais: texto(perfil.pais),
        departamento: texto(perfil.departamento),
        ciudad: texto(perfil.ciudad),
        codigoPostal: texto(perfil.codigoPostal),
      }),
    };
  }

  if (claveDocumento(ficha.documento) !== clave) return null;
  const nombre = [texto(ficha.nombres_completos), texto(ficha.apellidos_completos)].filter(Boolean).join(' ');
  if (!nombre) return null;
  return {
    nombre,
    origen: 'ficha',
    ...conValor({
      tipoDocumento: texto(ficha.tipo_documento_comprador),
      correo: texto(ficha.correo_electronico_comprador),
      indicativoCel: texto(ficha.indicativo_celular_comprador),
      celular: texto(ficha.numero_celular_comprador),
    }),
  };
}

/** Los campos del formulario de datos de facturación (Venta asistida y POS usan los mismos nombres). */
export interface CamposFacturacion {
  razon_social: any;
  tipo_documento_facturacion: any;
  correo_electronico_facturacion: any;
  indicativo_celular_facturacion: any;
  numero_celular_facturacion: any;
  direccion_facturacion: any;
  pais: any;
  departamento: any;
  ciudad_municipio: any;
  codigo_postal: any;
  identificarDepto(): void;
  identificarCiu(): void;
}

/** Llena el formulario con la sugerencia; lo que la sugerencia no trae queda como estaba. */
export function aplicarSugerenciaDocumento(c: CamposFacturacion, s: SugerenciaDocumento): void {
  c.razon_social = s.nombre;
  if (s.tipoDocumento) c.tipo_documento_facturacion = s.tipoDocumento;
  if (s.correo) c.correo_electronico_facturacion = s.correo;
  if (s.indicativoCel) c.indicativo_celular_facturacion = s.indicativoCel;
  if (s.celular) c.numero_celular_facturacion = s.celular;
  if (s.direccion) c.direccion_facturacion = s.direccion;
  // País → departamento → ciudad: cada lista se llena con el valor anterior ya puesto.
  if (s.pais) {
    c.pais = s.pais;
    c.identificarDepto();
  }
  if (s.departamento) {
    c.departamento = s.departamento;
    c.identificarCiu();
  }
  if (s.ciudad) c.ciudad_municipio = s.ciudad;
  if (s.codigoPostal) c.codigo_postal = s.codigoPostal;
}

/** Dos razones sociales son la misma si solo cambian mayúsculas, tildes, puntos o espacios. */
export function mismaRazonSocial(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => texto(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const x = norm(a);
  return !!x && x === norm(b);
}
