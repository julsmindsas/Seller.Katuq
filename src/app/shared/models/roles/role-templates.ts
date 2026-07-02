/**
 * Plantillas de roles estándar Katuq.
 *
 * El admin de cada empresa elige una plantilla → se crea un rol NUEVO con esos
 * menús y permisos pre-armados. Después puede personalizar.
 *
 * Las plantillas NO afectan roles existentes en Firestore — solo aparecen como
 * sugerencia en el editor /rol.
 *
 * Convención: el `nombreSugerido` se usa como nombre del rol al crearlo (el
 * admin puede cambiarlo). Si ya existe un rol con ese nombre en la empresa,
 * el admin debe elegir uno nuevo.
 */

import { allPermissions, viewOnlyPermissions } from './modules-catalog';

export interface RoleTemplate {
  /** ID interno de la plantilla (no se guarda en Firestore, solo identifica) */
  id: string;
  /** Nombre por defecto del rol cuando se crea desde esta plantilla */
  nombreSugerido: string;
  /** Descripción mostrada en la card de elección de plantilla */
  descripcion: string;
  /** Icono representativo (Feather/FontAwesome) */
  icon: string;
  /** Color de acento para la card (hex) */
  color: string;
  /** Rutas (paths del menú) que verá el usuario con este rol */
  menus: string[];
  /** Permisos granulares por módulo */
  permissions: Record<string, string[]>;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'administrador',
    nombreSugerido: 'Administrador',
    descripcion: 'Acceso total. Gestiona usuarios, roles, empresa e integraciones. Es el rol con más privilegios.',
    icon: 'shield',
    color: '#dc3545',
    menus: ['*'], // wildcard: ve todo el menú
    permissions: allPermissions(),
  },
  {
    id: 'director-comercial',
    nombreSugerido: 'Director Comercial',
    descripcion: 'Lidera el equipo de ventas. Ve todos los pedidos, reportes y métricas. Aprueba operaciones críticas. No configura integraciones.',
    icon: 'trending-up',
    color: '#7c4dff',
    menus: [
      'ventas', 'ventas/crear', 'ventas/pos',
      'pedidos',
      'productos',
      'clientes', 'clientes/crear',
      'inventario',
      'despachos',
      'dashboards', 'dashboards/builder',
    ],
    permissions: {
      ventas: ['view', 'create', 'edit', 'delete', 'approve'],
      pos: ['view', 'create'],
      productos: ['view', 'edit'],
      clientes: ['view', 'create', 'edit', 'delete'],
      inventario: ['view', 'adjust'],
      despachos: ['view', 'assign', 'deliver'],
      reportes: ['view', 'create', 'share'],
      usuarios: ['view'],
      contabilidad: ['view'],
    },
  },
  {
    id: 'vendedor',
    nombreSugerido: 'Vendedor',
    descripcion: 'Crea pedidos, atiende clientes propios. Ve productos y stock disponible. Sus reportes WO se filtran automáticamente a sus ventas.',
    icon: 'user-check',
    color: '#0d6efd',
    menus: [
      'ventas', 'ventas/crear', 'ventas/pos',
      'pedidos',
      'productos',
      'clientes', 'clientes/crear',
      'dashboards/builder',
    ],
    permissions: {
      ventas: ['view', 'create', 'edit'],
      pos: ['view', 'create'],
      productos: ['view'],
      clientes: ['view', 'create', 'edit'],
      inventario: ['view'],
      reportes: ['view'],
    },
  },
  {
    id: 'cajero',
    nombreSugerido: 'Cajero',
    descripcion: 'Solo POS. Registra ventas rápidas en tienda. No edita productos ni accede a reportes globales.',
    icon: 'credit-card',
    color: '#198754',
    menus: [
      'ventas/pos',
      'pedidos',
    ],
    permissions: {
      pos: ['view', 'create'],
      ventas: ['view'],
      productos: ['view'],
      clientes: ['view'],
    },
  },
  {
    id: 'bodeguero',
    nombreSugerido: 'Bodeguero',
    descripcion: 'Gestiona stock, ajustes de inventario y movimientos entre bodegas. Opera despachos y picking/packing.',
    icon: 'package',
    color: '#fd7e14',
    menus: [
      'inventario', 'inventario/inventarioBodegas',
      'despachos',
      'picking-packing/picking',
      'picking-packing/packing',
      'productos',
    ],
    permissions: {
      inventario: ['view', 'create', 'edit', 'adjust'],
      despachos: ['view', 'assign', 'deliver'],
      productos: ['view'],
    },
  },
  {
    id: 'contador',
    nombreSugerido: 'Contador',
    descripcion: 'Acceso de lectura a reportes, documentos contables y cartera. No crea ni edita pedidos.',
    icon: 'file-text',
    color: '#6c757d',
    menus: [
      'dashboards', 'dashboards/builder',
    ],
    permissions: {
      reportes: ['view', 'create', 'share'],
      contabilidad: ['view'],
      ventas: ['view'],
      clientes: ['view'],
    },
  },
  {
    // Spec 013 — Tesorería MVP: el tesorero verifica pagos en el banco y los
    // aprueba/rechaza. El backend valida este rol por nombre ("Tesorero") en
    // los endpoints de decisión de /v1/treasury (junto a Administrador y
    // Super Administrador).
    id: 'tesorero',
    nombreSugerido: 'Tesorero',
    descripcion: 'Verifica los pagos en el banco y los aprueba o rechaza desde Tesorería. Ve la cartera de pedidos y el historial de pagos. No crea pedidos.',
    icon: 'dollar-sign',
    color: '#198754',
    menus: [
      'tesoreria',
      'ventas/pedidos',
      'dashboards',
    ],
    permissions: {
      tesoreria: ['view', 'approve', 'reject'],
      ventas: ['view'],
      reportes: ['view'],
      contabilidad: ['view'],
    },
  },
];

/** Helper: buscar plantilla por ID */
export function findTemplate(id: string): RoleTemplate | null {
  return ROLE_TEMPLATES.find((t) => t.id === id) || null;
}
