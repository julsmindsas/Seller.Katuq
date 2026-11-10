import { TEXTOS } from '../plataforma.textos';
import { MotivoBajaValor, TipoCuentaValor } from '../plataforma.tipos';

/** D-700 17.4 — Reglas de los formularios de tipo de cuenta y motivo de baja (las mismas que valida el servidor; él decide). */
export const TIPOS_CUENTA: TipoCuentaValor[] = ['real', 'demo', 'prueba', 'cortesia', 'interna'];
export const MOTIVOS_BAJA: MotivoBajaValor[] = ['precio', 'funcionalidad', 'soporte', 'competencia', 'cierre_negocio', 'mora', 'sin_uso', 'otro'];
export const MOTIVO_TIPO_MIN = 5;
export const MOTIVO_TIPO_MAX = 200;
export const COMENTARIO_BAJA_MAX = 300;

/** Mismo criterio del servidor: sin saltos ni espacios repetidos, recortado. */
export function limpiarTextoLibre(v: string): string {
  return (v || '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tipoDeCuentaValido(v: unknown): v is TipoCuentaValor {
  return typeof v === 'string' && (TIPOS_CUENTA as string[]).includes(v);
}

/** Mensaje para la persona a partir del error HTTP: por código conocido; nunca el cuerpo crudo del servidor. */
export function mensajeErrorCuentas(err: unknown): string {
  const e = err as { status?: number; error?: { code?: string } } | null;
  const codigo = e && e.error && typeof e.error.code === 'string' ? e.error.code : null;
  if (codigo && TEXTOS.cuentas.errores[codigo]) return TEXTOS.cuentas.errores[codigo];
  if (e && e.status === 403) return TEXTOS.cuentas.errores['OPERADOR_REQUERIDO'];
  return TEXTOS.cuentas.errorGeneral;
}

/** Valor para elegir de entrada: el tipo ya guardado o, si está por confirmar, el que dedujo el sistema. */
export function tipoInicial(tipo: string | null | undefined, tipoDeducido: string | null | undefined): TipoCuentaValor | null {
  if (tipoDeCuentaValido(tipo)) return tipo;
  if (tipoDeCuentaValido(tipoDeducido)) return tipoDeducido;
  return null;
}
