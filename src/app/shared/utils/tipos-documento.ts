/**
 * Tipos de documento del comprador — una sola lista para toda la app.
 *
 * Ticket 1089 (OH MY STORE): venta asistida solo ofrecía CC-NIT, PA y TI, y la
 * lista de clientes ofrecía los doce; un cliente con PPT (venezolanos con
 * Permiso por Protección Temporal) no se podía registrar bien desde la venta.
 * Los códigos son los de la lista de clientes, que la facturación electrónica
 * ya traduce a los de la DIAN.
 */
export const TIPOS_DOCUMENTO: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'CC - Cédula de ciudadanía', value: 'CC' },
  { label: 'NIT', value: 'NIT' },
  { label: 'TI - Tarjeta de identidad', value: 'TI' },
  { label: 'RC - Registro civil', value: 'RC' },
  { label: 'CE - Cédula de extranjería', value: 'CE' },
  { label: 'TE - Tarjeta de extranjería', value: 'TE' },
  { label: 'PA - Pasaporte', value: 'PA' },
  { label: 'DIE - Doc. identificación extranjero', value: 'DIE' },
  { label: 'PEP - Permiso Especial de Permanencia', value: 'PEP' },
  { label: 'PPT - Permiso por Protección Temporal', value: 'PPT' },
  { label: 'NIT_EXT - NIT de otro país', value: 'NIT_EXT' },
  { label: 'NUIP', value: 'NUIP' },
];

/**
 * true cuando el valor guardado no está en la lista (p. ej. el combinado
 * "CC-NIT" de los clientes viejos). El <select> lo muestra tal cual para no
 * dejar el campo en blanco ni cambiarle el tipo al cliente sin que nadie lo pida.
 */
export function esTipoDocumentoAnterior(valor: any): boolean {
  const v = valor == null ? '' : String(valor).trim();
  return !!v && !TIPOS_DOCUMENTO.some((t) => t.value === v);
}

/** Documento de empresa: NIT, NIT de otro país o el combinado viejo "CC-NIT". */
export function esTipoDocumentoEmpresa(valor: any): boolean {
  const v = valor == null ? '' : String(valor).trim().toUpperCase();
  return v === 'NIT' || v === 'NIT_EXT' || v === 'CC-NIT';
}
