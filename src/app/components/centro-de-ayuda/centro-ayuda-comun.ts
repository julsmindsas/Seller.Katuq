import { BloqueTexto, EstadoArticulo, ModuloAyuda, TipoArticulo } from './centro-ayuda.models';
import { esSuperAdministrador } from '../../shared/utils/roles';
import { ErrorAyuda } from './centro-ayuda.service';

/** Claves de traducción (es.json) de cada tipo, módulo y estado. */
export const NOMBRE_TIPO: Record<TipoArticulo, string> = {
  guia: 'centroAyuda.tipo.guia',
  pregunta_frecuente: 'centroAyuda.tipo.preguntaFrecuente',
  solucion_errores: 'centroAyuda.tipo.solucionErrores',
  novedad_version: 'centroAyuda.tipo.novedadVersion',
  modulo: 'centroAyuda.tipo.modulo',
};

export const NOMBRE_MODULO: Record<ModuloAyuda, string> = {
  'primeros-pasos': 'centroAyuda.modulo.primerosPasos',
  'gestion-comercial': 'centroAyuda.modulo.gestionComercial',
  operaciones: 'centroAyuda.modulo.operaciones',
  inventario: 'centroAyuda.modulo.inventario',
  finanzas: 'centroAyuda.modulo.finanzas',
  marketing: 'centroAyuda.modulo.marketing',
  comunicaciones: 'centroAyuda.modulo.comunicaciones',
  analitica: 'centroAyuda.modulo.analitica',
  configuracion: 'centroAyuda.modulo.configuracion',
  integraciones: 'centroAyuda.modulo.integraciones',
};

export const NOMBRE_ESTADO: Record<EstadoArticulo, string> = {
  borrador: 'centroAyuda.estado.borrador',
  publicado: 'centroAyuda.estado.publicado',
  archivado: 'centroAyuda.estado.archivado',
};

export const CLASE_ESTADO: Record<EstadoArticulo, string> = {
  borrador: 'cfg-pill--warn',
  publicado: 'cfg-pill--ok',
  archivado: 'cfg-pill--neutro',
};

export const NOMBRE_MOTIVO_VERSION: Record<string, string> = {
  creacion: 'centroAyuda.motivo.creacion',
  edicion: 'centroAyuda.motivo.edicion',
  publicacion: 'centroAyuda.motivo.publicacion',
  despublicacion: 'centroAyuda.motivo.despublicacion',
  archivo: 'centroAyuda.motivo.archivo',
  restauracion: 'centroAyuda.motivo.restauracion',
};

/**
 * ¿La sesión es del operador (empresa Julsmind + rol Super Administrador)? Solo decide qué se MUESTRA:
 * el servidor responde 403 a cualquier otra sesión.
 */
export function esOperadorKatuq(): boolean {
  try {
    const sesion = JSON.parse(localStorage.getItem('user') || '{}');
    return String(sesion?.company || '').trim().toLowerCase() === 'julsmind' && esSuperAdministrador(sesion?.rol);
  } catch {
    return false;
  }
}

/** El mensaje que dice el servidor (en español y sin jerga) o el genérico. */
export function mensajeError(e: ErrorAyuda | any, generico: string): string {
  const texto = e?.error?.error || e?.error?.message;
  return typeof texto === 'string' && texto.trim() ? texto : generico;
}

/**
 * Parte el texto del artículo en bloques: `# ` o `## ` abre un título; líneas con `- ` o `• ` son una
 * lista; líneas con `1. ` son pasos; lo demás es párrafo. Todo se pinta con interpolación (nunca HTML).
 */
export function aBloques(texto: string | undefined | null): BloqueTexto[] {
  const salida: BloqueTexto[] = [];
  const grupos = String(texto || '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  for (const grupo of grupos) {
    const lineas = grupo.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lineas.length) continue;
    let parrafo: string[] = [];
    let lista: string[] = [];
    let pasos: string[] = [];
    const cerrar = () => {
      if (parrafo.length) salida.push({ tipo: 'parrafo', texto: parrafo.join(' ') });
      if (lista.length) salida.push({ tipo: 'lista', items: lista });
      if (pasos.length) salida.push({ tipo: 'pasos', items: pasos });
      parrafo = []; lista = []; pasos = [];
    };
    for (const linea of lineas) {
      const titulo = /^#{1,3}\s+(.+)$/.exec(linea);
      const vineta = /^[-•*]\s+(.+)$/.exec(linea);
      const paso = /^\d+[.)]\s+(.+)$/.exec(linea);
      if (titulo) { cerrar(); salida.push({ tipo: 'titulo', texto: titulo[1] }); }
      else if (vineta) { if (parrafo.length || pasos.length) cerrar(); lista.push(vineta[1]); }
      else if (paso) { if (parrafo.length || lista.length) cerrar(); pasos.push(paso[1]); }
      else { if (lista.length || pasos.length) cerrar(); parrafo.push(linea); }
    }
    cerrar();
  }
  return salida;
}

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
