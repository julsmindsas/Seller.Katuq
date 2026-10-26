/**
 * Tipos del contrato `/v1/onboarding/import-store/*` (importador de tiendas, ticket F5-30,
 * D-498 y D-518). Fuente: openspec/changes/importador-migracion-tiendas/contracts/.
 * Sin Angular: lo cargan también las pruebas de `tests/migracion/`.
 */

export type ProveedorTienda = 'shopify' | 'woocommerce';
export type ModoImportacion = 'create' | 'upsert';

/** Una fila lista para enviar: solo columnas conocidas, más `_row` (su número en el archivo). */
export type FilaEnvio = { [columna: string]: string | number };

export interface GrupoEnvio {
  key: string;
  rows: FilaEnvio[];
  inventoryRows: FilaEnvio[];
}

export interface OpcionesImportacion {
  ivaPercent: number;
  pricesIncludeTax?: boolean;
  taxClassMap?: { [clase: string]: 0 | 5 | 19 };
  warehouse?: string | null;
  replaceExistingStock?: boolean;
}

export interface CuerpoSimulacion {
  migrationId: string;
  source: ProveedorTienda;
  mode?: ModoImportacion;
  siteId?: string;
  options: OpcionesImportacion;
  groups: GrupoEnvio[];
}

export interface CuerpoLoteProductos extends Omit<CuerpoSimulacion, 'siteId'> {
  lot: number;
  runId?: string;
}

export interface AvisoImportacion {
  row?: number | null;
  key?: string;
  code: string;
  message?: string;
  desde?: string | null;
}

export interface GuardaImportacion {
  code: string;
  message: string;
}

/** Códigos de error con HTTP propio que la pantalla debe distinguir. */
export type CodigoErrorImportador =
  | 'INVALID_PAYLOAD'
  | 'FEATURE_DISABLED'
  | 'SITE_NOT_FOUND'
  | 'BATCH_NOT_FOUND'
  | 'FLOW_PUBLISHES_PRODUCTS'
  | 'WOO_INTEGRATION_ACTIVE'
  | 'CATEGORY_TREE_UNREADABLE'
  | 'WAREHOUSE_INVALID'
  | 'IMPORT_IN_PROGRESS'
  | 'TOO_MANY'
  | 'RATE_LIMITED'
  | 'SITE_TOO_LARGE'
  | 'NETWORK'
  | 'SERVER'
  | 'UNKNOWN';

export interface ErrorImportador {
  code: CodigoErrorImportador;
  status: number;
  message: string;
  /** Vale la pena esperar y reenviar el mismo lote. */
  retryable: boolean;
  /** La causa no se arregla reenviando: la pantalla avisa y se detiene. */
  blocking: boolean;
  /** Espera sugerida por el servidor, en milisegundos. */
  retryAfterMs?: number;
}

export interface RespuestaSimulacion {
  success: boolean;
  migrationId: string;
  format?: 'current' | 'legacy' | 'mixed' | null;
  products: { [contador: string]: number };
  photos?: { valid?: number; rejected?: number; overLimit?: number; toCopy?: number };
  categories?: { new?: string[] };
  inventory?: { warehouse?: string | null; units?: number; replacesExisting?: number };
  redirects?: { [contador: string]: number } | null;
  offers?: { publicList?: 'found' | 'missing' | 'ambiguous'; count?: number; scheduled?: number; expired?: number };
  plan?: { name?: string; visibleLimit?: number; visibleToday?: number; hiddenAfterImport?: number; currentDisplaced?: number; ownDomain?: boolean } | null;
  seo?: { withSeo?: number; withAlt?: number };
  taxClasses?: { class: string; products: number; mapped: number | null }[];
  guards?: GuardaImportacion[];
  issues?: AvisoImportacion[];
  issuesTotal?: number;
}

export interface ProductoDelLote {
  key: string;
  row?: number | null;
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
  cd?: string;
  referencia?: string;
  offer?: 'loaded' | 'kept' | 'none' | 'skipped';
  taxExempt?: boolean;
  splitFrom?: string;
}

export interface RespuestaLoteProductos {
  success: boolean;
  migrationId: string;
  lot: number;
  replayed: boolean;
  products: ProductoDelLote[];
  inventory?: { warehouse?: string | null; loaded?: number; notLoaded?: number; failed?: { key: string; referencia?: string; code: string }[] };
  photos?: { valid?: number; rejected?: number; overLimit?: number };
  photosPending?: number;
  categories?: { created?: string[] };
  offers?: { publicList?: string; loaded?: number; kept?: number; skipped?: number };
  issues?: AvisoImportacion[];
  issuesTotal?: number;
  durationMs?: number;
}

export interface CuerpoRedirecciones {
  migrationId: string;
  source: ProveedorTienda;
  siteId: string;
  products: { handle: string; cd: string; probable?: boolean }[];
  collections?: { handle: string; categoria: string; probable?: boolean }[];
  urls?: { desde: string; cd: string }[];
  productBase?: string;
  categoryBase?: string;
}

export interface RespuestaRedirecciones {
  success: boolean;
  generated: number;
  replaced: number;
  unchanged: number;
  probable: number;
  conflictsWithManual: number;
  overCapacity: number;
  capacity: number;
  issues?: AvisoImportacion[];
  issuesTotal?: number;
}

export interface CuerpoFotos {
  migrationId: string;
  runId: string;
  lot: number;
  products: { cd: string }[];
}

export interface RespuestaFotos {
  success: boolean;
  migrationId: string;
  lot: number;
  replayed: boolean;
  copied: number;
  alreadyOwn: number;
  changedMeanwhile: number;
  failed: { cd: string; index: number; code: 'download_failed' | 'not_image' | 'too_large' | 'unreadable' | string }[];
  issues?: { cd: string; code: string }[];
  durationMs?: number;
}

export interface RespuestaFotosPendientes {
  success: boolean;
  migrations: { migrationId: string; startedAt: string; products: number; photosPending: number }[];
}

export interface CuerpoClientes {
  migrationId: string;
  source: ProveedorTienda;
  siteId: string;
  lot: number;
  declaration: boolean;
  exportedAt?: string;
  rows: { row: number; data: FilaEnvio }[];
}

export interface RespuestaClientes {
  success: boolean;
  importBatchId: string;
  created: number;
  completed: number;
  resumed: number;
  skipped: number;
  subscriptions: { created: number; noConsent: number; existing: number; suppressed: number; failed: number };
  issues?: { row: number; code: string }[];
  issuesTotal?: number;
  durationMs?: number;
}

export interface RespuestaDeshacerClientes {
  success: boolean;
  clientsDeleted: number;
  clientsKept: number;
  subscribersDeleted: number;
  subscribersKept: number;
}
