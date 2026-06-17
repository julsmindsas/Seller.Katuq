/**
 * Catálogo declarativo de módulos × acciones para el sistema de permisos.
 *
 * Fuente de verdad para:
 *  - Editor de roles (UI matriz módulo × acciones)
 *  - Validación frontend (deshabilitar botones por permisos)
 *  - Validación backend (middleware requirePermission cuando se active)
 *
 * Cada rol almacena `permissions: { modulo: ['accion1','accion2'] }`. Si el
 * módulo no está en `permissions` o el array de acciones está vacío → el
 * usuario no puede ejecutar nada en ese módulo.
 *
 * NO romper compat: los roles existentes en Firestore NO tienen `permissions`.
 * El sistema actual sigue funcionando por `menus`. Cuando un rol gana
 * `permissions`, el backend lo valida granular.
 */

export interface ModuleAction {
  /** Identificador interno de la acción */
  id: string;
  /** Label visible para el admin en la UI */
  label: string;
}

export interface ModuleDef {
  /** Identificador interno del módulo */
  id: string;
  /** Label visible para el admin en la UI */
  label: string;
  /** Descripción corta del módulo (para tooltip o ayuda) */
  description: string;
  /** Icono Feather/FontAwesome para representar el módulo */
  icon: string;
  /** Acciones disponibles para este módulo */
  actions: ModuleAction[];
}

const A = (id: string, label: string): ModuleAction => ({ id, label });

export const MODULES_CATALOG: ModuleDef[] = [
  {
    id: 'ventas',
    label: 'Ventas',
    description: 'Pedidos, venta asistida, cotizaciones, devoluciones.',
    icon: 'shopping-cart',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('edit', 'Editar'),
      A('delete', 'Eliminar'),
      A('approve', 'Aprobar'),
    ],
  },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    description: 'Propuestas de precio a clientes; borrador, envío y seguimiento.',
    icon: 'file-text',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('edit', 'Editar'),
      A('delete', 'Eliminar'),
    ],
  },
  {
    id: 'pos',
    label: 'Punto de venta (POS)',
    description: 'Caja registradora, ventas rápidas en tienda.',
    icon: 'cash-register',
    actions: [
      A('view', 'Abrir caja'),
      A('create', 'Registrar venta'),
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    description: 'Stock, bodegas, movimientos, ajustes.',
    icon: 'box',
    actions: [
      A('view', 'Ver'),
      A('create', 'Agregar stock'),
      A('edit', 'Editar'),
      A('adjust', 'Ajustar / Conteo'),
    ],
  },
  {
    id: 'productos',
    label: 'Productos',
    description: 'Catálogo de productos, precios, categorías.',
    icon: 'tag',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('edit', 'Editar'),
      A('delete', 'Eliminar'),
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    description: 'Base de clientes, CRM, comunicaciones.',
    icon: 'users',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('edit', 'Editar'),
      A('delete', 'Eliminar'),
    ],
  },
  {
    id: 'despachos',
    label: 'Despachos',
    description: 'Logística, picking, packing, transportadores.',
    icon: 'truck',
    actions: [
      A('view', 'Ver'),
      A('assign', 'Asignar'),
      A('deliver', 'Marcar entregado'),
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    description: 'Constructor de reportes, dashboards, exportación.',
    icon: 'bar-chart-2',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('share', 'Compartir'),
      A('delete', 'Eliminar'),
    ],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    description: 'Gestionar usuarios de la empresa.',
    icon: 'user',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('edit', 'Editar'),
      A('delete', 'Eliminar'),
    ],
  },
  {
    id: 'roles',
    label: 'Roles y permisos',
    description: 'Configurar roles y permisos del sistema.',
    icon: 'shield',
    actions: [
      A('view', 'Ver'),
      A('create', 'Crear'),
      A('edit', 'Editar'),
      A('delete', 'Eliminar'),
    ],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    description: 'Datos generales, sedes, suscripción, facturación.',
    icon: 'briefcase',
    actions: [
      A('view', 'Ver'),
      A('edit', 'Editar'),
    ],
  },
  {
    id: 'integraciones',
    label: 'Integraciones',
    description: 'Conectar Shopify, WooCommerce, World Office, Siigo, etc.',
    icon: 'link',
    actions: [
      A('view', 'Ver'),
      A('configure', 'Configurar'),
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    description: 'Documentos contables, cartera, libros.',
    icon: 'file-text',
    actions: [
      A('view', 'Ver'),
    ],
  },
];

/** Helpers para consumir el catálogo */
export function findModule(id: string): ModuleDef | null {
  return MODULES_CATALOG.find((m) => m.id === id) || null;
}

export function findAction(moduleId: string, actionId: string): ModuleAction | null {
  const mod = findModule(moduleId);
  if (!mod) return null;
  return mod.actions.find((a) => a.id === actionId) || null;
}

/** Mapa `{ modulo: ['accion1', 'accion2', ...] }` con TODAS las acciones */
export function allPermissions(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const mod of MODULES_CATALOG) {
    result[mod.id] = mod.actions.map((a) => a.id);
  }
  return result;
}

/** Mapa con solo las acciones de tipo `view` (lectura, sin escritura) */
export function viewOnlyPermissions(modules: string[] = []): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const target = modules.length > 0 ? modules : MODULES_CATALOG.map((m) => m.id);
  for (const id of target) {
    const mod = findModule(id);
    if (!mod) continue;
    const viewAction = mod.actions.find((a) => a.id === 'view');
    if (viewAction) result[id] = [viewAction.id];
  }
  return result;
}
