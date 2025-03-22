export interface Menu {
  headTitle1?: string;
  headTitle2?: string;
  path?: string;
  title?: string;
  icon?: string;
  type?: string;
  badgeType?: string;
  badgeValue?: string;
  active?: boolean;
  bookmark?: boolean;
  children?: Menu[];
  isOnlySuperAdministrador?: boolean;
}

export interface Role {
  rol: string; // Nombre del rol
  empresa: string; // Empresa a la que pertenece el rol
  permissions: string[]; // Lista de permisos asociados al rol
  menus: Menu[]; // Lista de menús que puede ver el rol
  date_edit: Date; // Fecha de la última edición
  user_edit: string; // Usuario que realizó la última edición
}

export const RECOMMENDED_PERMISSIONS = {
  Administrador: [
    'ver_dashboard',
    'gestionar_usuarios',
    'gestionar_roles',
    'ver_reportes',
    'gestionar_configuraciones',
    'gestionar_inventario',
    'gestionar_pedidos',
    'gestionar_productos',
    'gestionar_promociones',
    'gestionar_notificaciones'
  ],
  Usuario: [
    'ver_dashboard',
    'ver_reportes',
    'ver_inventario',
    'ver_pedidos',
    'ver_productos'
  ],
  Invitado: [
    'ver_dashboard',
    'ver_reportes'
  ]
};