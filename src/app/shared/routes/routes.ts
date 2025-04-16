import { Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard'; // Importar el guard

export const content: Routes = [
  {
    path: 'sample-page',
    loadChildren: () => import('../../components/sample/sample.module').then(m => m.SampleModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'maestros',
    loadChildren: () => import('../../components/maestros/maestros.module').then(m => m.MaestrosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'usuarios',
    loadChildren: () => import('../../components/usuarios/usuarios.module').then(m => m.UsuariosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'productos',
    loadChildren: () => import('../../components/productos/productos.module').then(m => m.ProductosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'productos/crearProductos',
    loadChildren: () => import('../../components/productos/crear-productos/crear-productos.module').then(m => m.ProductosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'usuarios/crearUsuario',
    loadChildren: () => import('../../components/usuarios/crear-usuarios/crear-usuarios.module').then(m => m.CrearUsuariosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'rol',
    loadChildren: () => import('../../components/rol/rol.module').then(m => m.RolModule),
    // canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'empresas',
    loadChildren: () => import('../../components/empresas/empresas.module').then(m => m.EmpresasModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'proceso',
    loadChildren: () => import('../../components/proceso/proceso.module').then(m => m.ProcesoModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'extras',
    loadChildren: () => import('../../components/extras/extras.module').then(m => m.ExtrasModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'empresas/crearEmpresa',
    loadChildren: () => import('../../components/empresas/crearEmpresa/crear-empresa/crear-empresa.module').then(m => m.CrearEmpresasModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  // {
  //   path: 'roles/crearRol',
  //   loadChildren: () => import('../../components/rol/crear-rol/crear-rol.module').then(m => m.CrearRolModule),
  //   canActivate: [AuthGuard] // Agregar el guard
  // },
  {
    path: 'formasEntrega',
    loadChildren: () => import('../../components/formas-entrega/formas-entrega.module').then(m => m.FormasEntregaModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'ventas',
    loadChildren: () => import('../../components/ventas/ventas.module').then(m => m.VentasModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'dashboards',
    loadChildren: () => import('../../components/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'pos',
    loadChildren: () => import('../../components/pos/pos.module').then(m => m.PosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'tiempoentrega',
    loadChildren: () => import('../../components/tiempos-entrega/tiempoentrega.module').then(m => m.TiempoEntregaModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'categorias',
    loadChildren: () => import('../../components/ecomerce/categorias/categorias.module').then(m => m.CategoriasModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'ecommerce',
    loadChildren: () => import('../../components/ecomerce/ecommerce.module').then(m => m.EcommeceModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'produccion',
    loadChildren: () => import('../../components/produccion/produccion.module').then(m => m.ProduccionModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'despachos',
    loadChildren: () => import('../../components/despachos/despachos.module').then(m => m.DespachosModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'chat',
    loadChildren: () => import('../../components/chat/chat.module').then(m => m.ChatModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'inventario',
    loadChildren: () => import('../../components/inventarios/inventario.module').then(m => m.InventarioCatalogoModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'soporte',
    loadChildren: () => import('../../components/soporte/soporte.module').then(m => m.SoporteModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'misTickets',
    loadChildren: () => import('../../components/soporte/mis-tickets/mis-tickets.module').then(m => m.MisTicketsModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'misIdeas',
    loadChildren: () => import('../../components/soporte/mis-ideas/mis-ideas.module').then(m => m.MisIdeasModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'diagnostic-survey',
    loadChildren: () => import('../../components/diagnostic-survey/diagnostic-survey.module').then(m => m.DiagnosticSurveyModule),
    canActivate: [] // Proteger la ruta
  },
  {
    path: 'welcome',
    loadChildren: () => import('../../welcome/welcome.module').then(m => m.WelcomeModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('../../components/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: 'integrations',
    loadChildren: () =>
      import('../../components/integrations/integrations.module')
        .then(m => m.IntegrationsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'prospectos',
    loadChildren: () => import('../../components/prospect-manager/prospect-manager.module').then(m => m.ProspectManagerModule),
    canActivate: [AuthGuard],
    data: { title: 'Gestión de Prospectos' }
  }
];
