import { Routes } from "@angular/router";
import { AuthGuard } from "../guards/auth.guard"; // Importar el guard
import { AdminGuard } from "../guard/admin.guard"; // Importar AdminGuard
import { SubscriptionGuard } from "../guards/subscription.guard"; // Importar SubscriptionGuard

export const content: Routes = [
  {
    path: "sample-page",
    loadChildren: () =>
      import("../../components/sample/sample.module").then(
        (m) => m.SampleModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "maestros",
    loadChildren: () =>
      import("../../components/maestros/maestros.module").then(
        (m) => m.MaestrosModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "usuarios",
    loadChildren: () =>
      import("../../components/usuarios/usuarios.module").then(
        (m) => m.UsuariosModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "productos",
    loadChildren: () =>
      import("../../components/productos/productos.module").then(
        (m) => m.ProductosModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "productos/crearProductos",
    loadChildren: () =>
      import(
        "../../components/productos/crear-productos/crear-productos.module"
      ).then((m) => m.ProductosModule),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "usuarios/crearUsuario",
    loadChildren: () =>
      import(
        "../../components/usuarios/crear-usuarios/crear-usuarios.module"
      ).then((m) => m.CrearUsuariosModule),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "rol",
    loadChildren: () =>
      import("../../components/rol/rol.module").then((m) => m.RolModule),
    // canActivate: [AuthGuard] // Agregar el guard
  },
  {
    path: "empresas",
    loadChildren: () =>
      import("../../components/empresas/empresas.module").then(
        (m) => m.EmpresasModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "proceso",
    loadChildren: () =>
      import("../../components/proceso/proceso.module").then(
        (m) => m.ProcesoModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "extras",
    loadChildren: () =>
      import("../../components/extras/extras.module").then(
        (m) => m.ExtrasModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "empresas/crearEmpresa",
    loadChildren: () =>
      import(
        "../../components/empresas/crearEmpresa/crear-empresa/crear-empresa.module"
      ).then((m) => m.CrearEmpresasModule),
    canActivate: [AuthGuard], // Agregar el guard
  },
  // {
  //   path: 'roles/crearRol',
  //   loadChildren: () => import('../../components/rol/crear-rol/crear-rol.module').then(m => m.CrearRolModule),
  //   canActivate: [AuthGuard] // Agregar el guard
  // },
  {
    path: "formasEntrega",
    loadChildren: () =>
      import("../../components/formas-entrega/formas-entrega.module").then(
        (m) => m.FormasEntregaModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "ventas",
    loadChildren: () =>
      import("../../components/ventas/ventas.module").then(
        (m) => m.VentasModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "cotizaciones",
    loadChildren: () =>
      import("../../components/cotizaciones/cotizaciones.module").then(
        (m) => m.CotizacionesModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "dashboards", // Ruta existente para el dashboard principal
    loadChildren: () =>
      import("../../components/dashboard/dashboard.module").then(
        (m) => m.DashboardModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "pos",
    loadChildren: () =>
      import("../../components/pos/pos.module").then((m) => m.PosModule),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "tiempoentrega",
    loadChildren: () =>
      import("../../components/tiempos-entrega/tiempoentrega.module").then(
        (m) => m.TiempoEntregaModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "categorias",
    loadChildren: () =>
      import("../../components/ecomerce/categorias/categorias.module").then(
        (m) => m.CategoriasModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "ecommerce",
    loadChildren: () =>
      import("../../components/ecomerce/ecommerce.module").then(
        (m) => m.EcommeceModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    // Builder de landings y tiendas (D-173/D-174). La página que se publica es
    // pública y vive fuera de aquí, en /s/:slug.
    path: "sitios",
    loadChildren: () =>
      import("../../components/sitios/sitios.module").then((m) => m.SitiosModule),
    canActivate: [AuthGuard],
  },
  {
    path: "produccion",
    loadChildren: () =>
      import("../../components/produccion/produccion.module").then(
        (m) => m.ProduccionModule,
      ),
    canActivate: [AuthGuard, SubscriptionGuard],
    data: { requiresPremium: true },
  },
  {
    path: "despachos",
    loadChildren: () =>
      import("../../components/despachos/despachos.module").then(
        (m) => m.DespachosModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "chat",
    loadChildren: () =>
      import("../../components/chat/chat.module").then((m) => m.ChatModule),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "inventario",
    loadChildren: () =>
      import("../../components/inventarios/inventario.module").then(
        (m) => m.InventarioCatalogoModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    // Compras: dominio propio. Separado de inventario porque al recibir escribe
    // el costo del producto, y mezclarlos borronea esa frontera.
    path: "compras",
    loadChildren: () =>
      import("../../components/compras/compras.module").then(
        (m) => m.ComprasModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "lista-precios",
    loadChildren: () =>
      import("../../components/lista-precios/lista-precios.module").then(
        (m) => m.ListaPreciosModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "picking-packing",
    loadChildren: () =>
      import("../../components/picking-packing/picking-packing.module").then(
        (m) => m.PickingPackingModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "tesoreria",
    loadChildren: () =>
      import("../../components/tesoreria/tesoreria.module").then(
        (m) => m.TesoreriaModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Tesorería" },
  },
  {
    path: "cartera",
    loadChildren: () =>
      import("../../components/cartera/cartera.module").then(
        (m) => m.CarteraModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Cartera (CxC)" },
  },
  {
    path: "facturacion-electronica",
    loadChildren: () =>
      import("../../components/facturacion-electronica/facturacion-electronica.module").then(
        (m) => m.FacturacionElectronicaModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Facturación electrónica" },
  },
  {
    path: "contabilidad",
    loadChildren: () =>
      import("../../components/contabilidad/contabilidad.module").then(
        (m) => m.ContabilidadModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Contabilidad" },
  },
  {
    path: "soporte",
    loadChildren: () =>
      import("../../components/soporte/soporte.module").then(
        (m) => m.SoporteModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "misTickets",
    loadChildren: () =>
      import("../../components/soporte/mis-tickets/mis-tickets.module").then(
        (m) => m.MisTicketsModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },
  {
    path: "misIdeas",
    loadChildren: () =>
      import("../../components/soporte/mis-ideas/mis-ideas.module").then(
        (m) => m.MisIdeasModule,
      ),
    canActivate: [AuthGuard], // Agregar el guard
  },

  {
    path: "welcome",
    loadChildren: () =>
      import("../../welcome/welcome.module").then((m) => m.WelcomeModule),
    canActivate: [AuthGuard],
  },
  {
    path: "superadmin", // Ruta correcta para superadmin
    loadChildren: () =>
      import("../../components/superadmin/superadmin.module").then(
        (m) => m.SuperadminModule,
      ), // Apuntar al módulo correcto
    canActivate: [AdminGuard], // Usar AdminGuard como estaba previsto
  },
  {
    path: "integrations",
    loadChildren: () =>
      import("../../components/integrations/integrations.module").then(
        (m) => m.IntegrationsModule,
      ),
    canActivate: [AuthGuard],
    // Freemium permite 1 integración (límite validado en backend)
  },
  {
    path: "flows",
    loadChildren: () =>
      import("../../components/flows/flows.module").then(
        (m) => m.FlowsModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Flujos automatizados" },
  },
  {
    path: "dropshipping",
    loadChildren: () =>
      import("../../components/dropshipping/dropshipping.module").then(
        (m) => m.DropshippingModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Dropshipping" },
  },
  {
    path: "crm",
    loadChildren: () =>
      import("../../components/crm/crm.module").then((m) => m.CrmModule),
    canActivate: [AuthGuard],
    data: { title: "CRM" },
  },
  // ⚠️ Los tres buzones van ANTES de "notificaciones" a propósito.
  //
  // Angular resuelve las rutas EN ORDEN y por prefijo: "notificaciones" a secas
  // se traga cualquier URL que empiece por ahí, carga su módulo, no encuentra
  // nada que responda por "whatsapp/inbox" y la navegación muere sin error
  // visible — la pantalla simplemente se va a otra parte. Poniéndolos primero,
  // la coincidencia exacta gana y "notificaciones" queda como lo que es: el
  // último recurso.
  {
    path: "notificaciones/whatsapp/inbox",
    loadChildren: () =>
      import(
        "../../components/notificaciones/whatsapp-inbox/whatsapp-inbox.module"
      ).then((m) => m.WhatsappInboxModule),
    canActivate: [AuthGuard],
    data: { title: "Conversaciones WhatsApp" },
  },
  {
    path: "notificaciones/instagram/inbox",
    loadChildren: () =>
      import(
        "../../components/notificaciones/meta-inbox/meta-inbox.module"
      ).then((m) => m.MetaInboxModule),
    canActivate: [AuthGuard],
    data: { title: "Conversaciones Instagram" },
  },
  {
    path: "notificaciones/facebook/inbox",
    loadChildren: () =>
      import(
        "../../components/notificaciones/meta-inbox/meta-inbox.module"
      ).then((m) => m.MetaInboxModule),
    canActivate: [AuthGuard],
    data: { title: "Conversaciones Facebook" },
  },
  {
    path: "notificaciones",
    loadChildren: () =>
      import("../../components/notificaciones/notificaciones.module").then(
        (m) => m.NotificacionesModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Notificaciones" },
  },
  {
    path: "marketing",
    loadChildren: () =>
      import("../../modules/marketing/marketing.module").then(
        (m) => m.MarketingModule,
      ),
    canActivate: [AuthGuard],
    data: { title: "Marketing" },
  },
];
