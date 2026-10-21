/**
 * Errores de la API de domicilios, traducidos a frases para quien usa la pantalla.
 * El servidor responde `{ success:false, codigo, error, campo? }` (ver API-DOMICILIOS.md, sección 8).
 * Lógica pura, sin Angular.
 */

/** Qué puede hacer la pantalla además de mostrar la frase. */
export type AccionError = 'ninguna' | 'transportadores' | 'integracion' | 'campo';

export interface ErrorDomicilios {
  /** `codigo` del servidor (`DATOS_INVALIDOS`…); `null` si no vino. */
  codigo: string | null;
  status: number | null;
  /** Frase lista para mostrar. */
  texto: string;
  /** Campo que falló (`entrega.ciudad`); solo en `DATOS_INVALIDOS`. */
  campo: string | null;
  accion: AccionError;
}

/** Nombres de campo de la API → cómo los llama quien escribe el domicilio. */
export const ETIQUETA_CAMPO: Record<string, string> = {
  idExterno: 'Id externo',
  'recogida.nombre': 'Nombre de recogida',
  'recogida.telefono': 'Teléfono de recogida',
  'recogida.direccion': 'Dirección de recogida',
  'recogida.ciudad': 'Ciudad de recogida',
  'recogida.barrio': 'Barrio de recogida',
  'recogida.indicaciones': 'Indicaciones de recogida',
  'entrega.nombre': 'Nombre de quien recibe',
  'entrega.telefono': 'Teléfono de quien recibe',
  'entrega.direccion': 'Dirección de entrega',
  'entrega.ciudad': 'Ciudad de entrega',
  'entrega.barrio': 'Barrio de entrega',
  'entrega.indicaciones': 'Indicaciones de entrega',
  valorDomicilio: 'Valor del domicilio',
  valorPedido: 'Valor del pedido',
  cobrarAlEntregar: 'Cobrar al entregar',
  descripcion: 'Descripción'
};

export function etiquetaDeCampo(campo: string | null | undefined): string {
  return (campo && ETIQUETA_CAMPO[campo]) || '';
}

const TEXTO_POR_CODIGO: Record<string, string> = {
  SIN_MENSAJEROS_HABILITADOS:
    'Todavía no hay mensajeros que puedan tomar tus domicilios. Activa en Envíos y entregas > Transportadores que tus mensajeros, o los independientes de Katuq, puedan tomar tus pedidos.',
  API_DESHABILITADA:
    'Los domicilios están desactivados para tu comercio. Actívalos en la pestaña Integración.',
  LOTE_MUY_GRANDE: 'El archivo trae demasiados domicilios. El máximo es 50 por envío: divídelo en varios.',
  NO_SE_PUEDE_CANCELAR: 'Este domicilio ya fue recogido o terminó, así que ya no se puede cancelar.',
  NO_ENCONTRADO: 'No encontramos ese domicilio.',
  CUERPO_MUY_GRANDE: 'Lo que intentas enviar es demasiado grande (máximo 256 KB). Envíalo en partes.',
  DEMASIADAS_PETICIONES: 'Hiciste muchas peticiones seguidas. Espera un momento y vuelve a intentar.',
  NO_AUTORIZADO: 'Tu sesión no tiene permiso para esto. Vuelve a iniciar sesión.'
};

/** La frase de un `codigo` conocido; `null` si no se conoce. Sirve también para los fallos de un lote. */
export function textoDeCodigo(codigo: string | null | undefined): string | null {
  return (codigo && TEXTO_POR_CODIGO[codigo]) || null;
}

function textoNoVacio(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function textoPorEstado(status: number | null): string {
  if (status === 0) return 'No hay conexión con Katuq. Revisa tu internet e intenta de nuevo.';
  if (status === 401) return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.';
  if (status === 403) return 'Tu usuario no tiene permiso para esto. Pídele a un administrador del comercio que lo haga.';
  if (status === 404) return 'No encontramos lo que buscas.';
  if (status === 429) return textoDeCodigo('DEMASIADAS_PETICIONES') as string;
  if (status !== null && status >= 500) return 'Algo falló de nuestro lado. Intenta de nuevo en un momento.';
  return 'No pudimos completar la acción. Intenta de nuevo.';
}

function accionDe(codigo: string | null, campo: string | null): AccionError {
  if (codigo === 'SIN_MENSAJEROS_HABILITADOS') return 'transportadores';
  if (codigo === 'API_DESHABILITADA') return 'integracion';
  if (codigo === 'DATOS_INVALIDOS' && campo) return 'campo';
  return 'ninguna';
}

/**
 * Convierte el error de HttpClient (`{ status, error: { codigo, error, campo } }`) en algo mostrable.
 * Nunca incluye el cuerpo completo ni datos de la petición: solo la frase, el código y el campo.
 */
export function interpretarErrorDomicilios(err: unknown): ErrorDomicilios {
  const crudo = (err ?? {}) as { status?: unknown; error?: unknown };
  const status = typeof crudo.status === 'number' ? crudo.status : null;
  const cuerpo = crudo.error && typeof crudo.error === 'object' ? (crudo.error as Record<string, unknown>) : null;
  const codigo = textoNoVacio(cuerpo?.['codigo']) ?? textoNoVacio(cuerpo?.['code']);
  const campo = textoNoVacio(cuerpo?.['campo']);
  const delServidor = textoNoVacio(cuerpo?.['error']) ?? textoNoVacio(cuerpo?.['message']);

  // En un dato inválido manda la frase del servidor: dice exactamente qué corregir.
  const texto =
    codigo === 'DATOS_INVALIDOS'
      ? delServidor ?? 'Revisa los datos del domicilio.'
      : textoDeCodigo(codigo) ?? (status === 200 && delServidor ? delServidor : textoPorEstado(status));

  return { codigo, status, texto, campo: codigo === 'DATOS_INVALIDOS' ? campo : null, accion: accionDe(codigo, campo) };
}
