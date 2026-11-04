/** Centro de ayuda, fase 1 (D-628). Mismos campos que `services/helpCenter` del backend. */

export type AlcanceArticulo = 'global' | 'company';
export type EstadoArticulo = 'borrador' | 'publicado' | 'archivado';
export type VisibilidadArticulo = 'interna' | 'publica';
export type TipoArticulo = 'guia' | 'pregunta_frecuente' | 'solucion_errores' | 'novedad_version' | 'modulo';
export type ModuloAyuda =
  | 'primeros-pasos' | 'gestion-comercial' | 'operaciones' | 'inventario' | 'finanzas'
  | 'marketing' | 'comunicaciones' | 'analitica' | 'configuracion' | 'integraciones';

export const TIPOS_ARTICULO: TipoArticulo[] = ['guia', 'pregunta_frecuente', 'solucion_errores', 'novedad_version', 'modulo'];
export const MODULOS_AYUDA: ModuloAyuda[] = [
  'primeros-pasos', 'gestion-comercial', 'operaciones', 'inventario', 'finanzas',
  'marketing', 'comunicaciones', 'analitica', 'configuracion', 'integraciones',
];
export const ESTADOS_ARTICULO: EstadoArticulo[] = ['borrador', 'publicado', 'archivado'];

/** Lo que ve el comercio. */
export interface ArticuloAyuda {
  id: string;
  scope: AlcanceArticulo;
  title: string;
  summary: string;
  type: TipoArticulo;
  module: ModuloAyuda;
  routes: string[];
  appliesToVersion: string;
  updatedAt: string | null;
  publishedAt: string | null;
  /** Solo en el detalle. */
  content?: string;
  /** Solo al buscar. */
  fragmento?: string;
}

/** Lo que ve el operador (Julsmind). */
export interface ArticuloAdmin extends ArticuloAyuda {
  company?: string;
  status: EstadoArticulo;
  visibility: VisibilidadArticulo;
  author: string;
  approver: string | null;
  version: number;
  createdAt: string;
  provenance?: { kind: string; ref: string };
}

export interface VersionArticulo {
  id: string;
  articleId: string;
  version: number;
  reason: string;
  status: EstadoArticulo;
  title: string;
  savedBy: string;
  savedAt: string;
}

/** Lo que escribe el operador. El estado, el autor y el aprobador los fija el servidor. */
export interface CambiosArticulo {
  title?: string;
  summary?: string;
  content?: string;
  type?: TipoArticulo;
  module?: ModuloAyuda;
  routes?: string[];
  appliesToVersion?: string;
  visibility?: VisibilidadArticulo;
  scope?: AlcanceArticulo;
  company?: string;
}

export interface FiltrosAdmin {
  status?: EstadoArticulo | '';
  scope?: AlcanceArticulo | '';
  q?: string;
}

export interface HallazgoDato {
  tipo: string;
  dato: string;
}

/** Bloques del texto del artículo (se pintan con interpolación, nunca como HTML). */
export interface BloqueTexto {
  tipo: 'titulo' | 'parrafo' | 'lista' | 'pasos';
  texto?: string;
  items?: string[];
}
