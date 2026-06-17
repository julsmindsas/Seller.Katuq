import { Injectable, OnDestroy } from "@angular/core";
import { Subject, BehaviorSubject, fromEvent, Observable, of } from "rxjs";
import { takeUntil, debounceTime } from "rxjs/operators";
import { Router } from "@angular/router";
import { CartSingletonService } from "./ventas/cart.singleton.service";
import { UtilsService } from "./utils.service";

// Menu
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
  isOnlyAdmin?: boolean;
}

@Injectable({
  providedIn: "root",
})
export class NavService implements OnDestroy {
  private unsubscriber: Subject<any> = new Subject();
  public screenWidth: BehaviorSubject<number> = new BehaviorSubject(
    window.innerWidth,
  );

  // Search Box
  public search: boolean = false;

  // Language
  public language: boolean = false;

  // Mega Menu
  public megaMenu: boolean = false;
  public levelMenu: boolean = false;
  public megaMenuColapse: boolean = window.innerWidth < 1199 ? true : false;

  // For Horizontal Layout Mobile
  public horizontal: boolean = window.innerWidth < 991 ? false : true;

  // Collapse Sidebar
  public collapseSidebar: boolean = window.innerWidth < 991 ? true : false;

  // Verifica si es superadmin o admin de Julsmind
  isSuperAdmin: boolean = (() => {
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      return parsedUser.rol === "Super Administrador";
    }
    return false;
  })();

  isAdmin: boolean = (() => {
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      return (
        parsedUser.rol === "Administrador" && parsedUser.company === "Julsmind"
      );
    }
    return false;
  })();

  // Full screen
  public fullScreen: boolean = false;
  ALLMENUITEMS: Menu[];

  constructor(
    private router: Router,
    private cartSingleton: CartSingletonService,
    private utils: UtilsService,
  ) {
    const user = localStorage.getItem("user");
    if (user) {
      this.refrescarCart();
    }

    this.setScreenWidth(window.innerWidth);
    fromEvent(window, "resize")
      .pipe(debounceTime(1000), takeUntil(this.unsubscriber))
      .subscribe((evt: any) => {
        this.setScreenWidth(evt.target.innerWidth);
        if (evt.target.innerWidth < 991) {
          this.collapseSidebar = true;
          this.megaMenu = false;
          this.levelMenu = false;
        }
        if (evt.target.innerWidth < 1199) {
          this.megaMenuColapse = true;
        }
      });
    if (window.innerWidth < 991) {
      this.router.events.subscribe((event) => {
        this.collapseSidebar = true;
        this.megaMenu = false;
        this.levelMenu = false;
      });
    }
    this.ALLMENUITEMS = this.utils.deepClone(this.MENUITEMS);
    this.filterMenuItemsByAuthorization();
  }

  refrescarCart() {
    this.cartSingleton.refreshCart().subscribe({
      next: (products: any[]) => {
        // console.log('products', products);
      },
    });
  }

  ngOnDestroy() {
    this.unsubscriber.complete();
  }

  private setScreenWidth(width: number): void {
    this.screenWidth.next(width);
  }

  getMenuItems(): Menu[] {
    return this.MENUITEMS;
  }

  getMenuOriginal(): Menu[] {
    return this.ALLMENUITEMS.map((item) => {
      if (item.isOnlySuperAdministrador || item.isOnlyAdmin) {
        return null;
      }

      return item;
    }).filter((item) => item !== null) as Menu[];
  }

  isDropshippingEnabled(): boolean {
    try {
      // Verificar si el dropshipping está habilitado para la empresa actual desde localStorage
      const currentCompany = JSON.parse(
        localStorage.getItem("currentCompany") || "{}",
      );
      const companyId = currentCompany.id || currentCompany._id || "default";
      const configKey = `dropshippingConfig_${companyId}`;

      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) {
        const dropshippingConfig = JSON.parse(savedConfig);
        return dropshippingConfig.habilitado === true;
      }

      // Si no hay configuración guardada, devolver false
      return false;
    } catch (error) {
      console.error("Error checking dropshipping status:", error);
      return false;
    }
  }

  filterMenuItemsByAuthorization() {
    const authorizedPaths = JSON.parse(
      localStorage.getItem("authorizedMenuItems") || "[]",
    ).map((item: any) => item.path);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.rol === "Super Administrador";
    const isJulsmindAdmin =
      user.rol === "Administrador" && user.company === "Julsmind";

    // Verificar si dropshipping está habilitado para filtros adicionales
    const isDropshippingEnabled = this.isDropshippingEnabled();

    // Paso 1: Filtrar elementos y sus hijos basados en roles y permisos
    const filteredMenu = this.ALLMENUITEMS.map((item) => {
      // Omitir item si es solo para superadmin/admin y el usuario no lo es
      if (
        (item.isOnlySuperAdministrador && !isSuperAdmin) ||
        (item.isOnlyAdmin && !isJulsmindAdmin)
      ) {
        return null;
      }

      // Si es un encabezado, mantenerlo por ahora (se validará después)
      if (item.headTitle1) {
        return { ...item };
      }

      // Si tiene hijos, filtrar los hijos
      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          // Filtrar rutas de dropshipping si no está habilitado
          if (
            child.path &&
            child.path.includes("dropshipping") &&
            !isDropshippingEnabled
          ) {
            return false;
          }

          // Filtros normales de autorización y roles
          return (
            (!child.isOnlySuperAdministrador || isSuperAdmin) &&
            (!child.isOnlyAdmin || isJulsmindAdmin) &&
            authorizedPaths.includes(child.path)
          );
        });

        // Si el padre está restringido o no quedan hijos visibles, omitir el padre
        if (
          (item.isOnlySuperAdministrador && !isSuperAdmin) ||
          (item.isOnlyAdmin && !isJulsmindAdmin) ||
          filteredChildren.length === 0
        ) {
          return null;
        }
        // Devolver el padre con los hijos filtrados
        return { ...item, children: filteredChildren };
      }

      // Si es un enlace directo, verificar roles y permisos
      if (
        (item.isOnlySuperAdministrador && !isSuperAdmin) ||
        (item.isOnlyAdmin && !isJulsmindAdmin) ||
        !authorizedPaths.includes(item.path) ||
        (item.path &&
          item.path.includes("dropshipping") &&
          !isDropshippingEnabled)
      ) {
        return null;
      }
      // Devolver el enlace si pasa las verificaciones
      return item;
    }).filter((item) => item !== null) as Menu[];

    // Paso 2: Construir el menú final, asegurándose de que los encabezados tengan contenido visible debajo
    const finalMenu: Menu[] = [];
    for (let i = 0; i < filteredMenu.length; i++) {
      const currentItem = filteredMenu[i];

      if (currentItem.headTitle1) {
        // Es un encabezado. Verificar si hay elementos visibles después de él antes del siguiente encabezado.
        let hasVisibleItemsFollowing = false;
        for (let j = i + 1; j < filteredMenu.length; j++) {
          const nextItem = filteredMenu[j];
          if (nextItem.headTitle1) {
            // Se encontró el siguiente encabezado, detener la búsqueda.
            break;
          }
          // Si es un elemento de menú (no un encabezado), marcar que hay contenido visible.
          if (nextItem.title) {
            hasVisibleItemsFollowing = true;
            break;
          }
        }

        // Solo agregar el encabezado si tiene elementos visibles debajo y no es consecutivo a otro encabezado.
        if (hasVisibleItemsFollowing) {
          // Evitar añadir encabezados consecutivos (mantener solo el primero si hay varios juntos)
          if (
            finalMenu.length === 0 ||
            !finalMenu[finalMenu.length - 1].headTitle1
          ) {
            finalMenu.push(currentItem);
          }
        }
      } else {
        // No es un encabezado, agregarlo directamente (ya pasó el filtro inicial).
        finalMenu.push(currentItem);
      }
    }

    // Eliminar el último elemento si es un encabezado sin nada después (caso borde)
    if (finalMenu.length > 0 && finalMenu[finalMenu.length - 1].headTitle1) {
      finalMenu.pop();
    }

    this.MENUITEMS = finalMenu;
    this.items.next(this.MENUITEMS);
  }

  MENUITEMS: Menu[] = [
    // CONFIGURACIÓN PLATAFORMA
    { headTitle1: "Configuración Plataforma" },
    {
      title: "Gestión General",
      icon: "settings",
      type: "sub",
      active: false,
      children: [
        {
          path: "superadmin/clientes",
          title: "Clientes plataforma",
          type: "link",
          icon: "users",
        },
        { path: "prospectos/lista", title: "Prospectos", type: "link", icon: "user-plus" },
      ],
    },

    // GESTIÓN COMERCIAL
    { headTitle1: "Gestión Comercial" },
    {
      title: "Clientes",
      icon: "user-check",
      type: "sub",
      active: false,
      children: [
        { path: "ventas/clientes", title: "Crear cliente", type: "link", icon: "user-plus" },
        {
          path: "ventas/clienteslista",
          title: "Listado de clientes",
          type: "link",
          icon: "list",
        },
      ],
    },
    {
      title: "Ventas",
      icon: "dollar-sign",
      type: "sub",
      active: false,
      children: [
        { path: "ventas/crear-ventas", title: "Venta asistida", type: "link", icon: "shopping-bag" },
        { path: "ventas/carga-ventas", title: "Ventas masivas", type: "link", icon: "upload" },
        { path: "ventas/ventas-pos", title: "Ventas POS", type: "link", icon: "monitor" },
      ],
    },
    {
      title: "Cotizaciones",
      icon: "file-text",
      type: "sub",
      active: false,
      children: [
        { path: "cotizaciones", title: "Listado de cotizaciones", type: "link", icon: "list" },
        { path: "cotizaciones/editor", title: "Nueva cotización", type: "link", icon: "file-plus" },
      ],
    },
    {
      title: "Dropshipping",
      icon: "truck",
      type: "sub",
      active: false,
      children: [
        { path: "dropshipping/dashboard", title: "Dashboard", type: "link", icon: "bar-chart-2" },
        {
          path: "dropshipping/proveedores",
          title: "Proveedores",
          type: "link",
          icon: "briefcase",
        },
        { path: "dropshipping/productos", title: "Productos", type: "link", icon: "package" },
        { path: "dropshipping/ordenes", title: "Órdenes", type: "link", icon: "clipboard" },
      ],
    },
    {
      title: "CRM",
      icon: "target",
      type: "sub",
      active: false,
      children: [
        { path: "crm/list", title: "Pipeline", type: "link", icon: "bar-chart-2" },
        { path: "crm/tasks", title: "Tareas", type: "link", icon: "check-square" },
      ],
    },

    // OPERACIONES
    { headTitle1: "Operaciones" },
    {
      title: "Pedidos",
      icon: "shopping-cart",
      type: "sub",
      active: false,
      children: [
        { path: "ventas/pedidos", title: "Todos los pedidos", type: "link", icon: "list" },
        { path: "pos/list-ventas", title: "Pedidos POS", type: "link", icon: "monitor" },
      ],
    },
    {
      title: "Producción",
      icon: "archive",
      type: "sub",
      active: false,
      children: [
        {
          path: "produccion/dashboard",
          title: "Órdenes de producción",
          type: "link",
          icon: "tool",
        },
      ],
    },
    {
      title: "Agendamiento",
      icon: "calendar",
      type: "sub",
      active: false,
      children: [
        {
          path: "servicios/agendamiento",
          title: "Solicitar servicio",
          type: "link",
          icon: "plus-circle",
        },
        {
          path: "servicios/agendamiento/citas",
          title: "Ver citas agendadas",
          type: "link",
          icon: "clock",
        },
      ],
    },
    {
      title: "Logística",
      icon: "map-pin",
      type: "sub",
      active: false,
      children: [
        { path: "despachos", title: "Envíos y entregas", type: "link", icon: "send" },
      ],
    },

    // INVENTARIOS Y PRODUCTOS
    { headTitle1: "Inventarios y Productos" },
    {
      title: "Productos",
      icon: "package",
      type: "sub",
      active: false,
      children: [
        { path: "productos", title: "Productos", type: "link", icon: "grid" },
        {
          path: "ecommerce/adiciones/listar",
          title: "Adiciones",
          type: "link",
          icon: "plus-square",
        },
      ],
    },
    {
      title: "Inventarios",
      icon: "box",
      type: "sub",
      active: false,
      children: [
        {
          path: "inventario/inventario-catalogo",
          title: "Inventario por bodega",
          type: "link",
          icon: "database",
        },
        {
          path: "inventario/bodega-detalle",
          title: "Detalle por bodega",
          type: "link",
          icon: "fa-list-alt",
        },
        {
          path: "inventario/recepcion-mercancia",
          title: "Ajustes de inventario",
          type: "link",
          icon: "edit-3",
        },
        {
          path: "inventario/traslados",
          title: "Traslados entre bodegas",
          type: "link",
          icon: "refresh-cw",
        },
        {
          path: "inventario/central-abastecimiento",
          title: "Central de Abastecimiento",
          type: "link",
          icon: "fa-line-chart",
        },
        {
          path: "inventario/historial-movimientos",
          title: "Historial de movimientos",
          type: "link",
          icon: "activity",
        },
      ],
    },
    {
      title: "Lista de precios",
      icon: "dollar-sign",
      type: "sub",
      active: false,
      children: [
        {
          path: "lista-precios/lista-precios",
          title: "Lista de precios",
          type: "link",
          icon: "list",
        },
      ],
    },
    {
      title: "Picking y packing",
      icon: "layers",
      type: "sub",
      active: false,
      children: [
        {
          path: "picking-packing/picking",
          title: "Órdenes de picking",
          type: "link",
          icon: "search",
        },
        {
          path: "picking-packing/packing",
          title: "Órdenes de packing",
          type: "link",
          icon: "archive",
        },
      ],
    },

    // INTELIGENCIA DE NEGOCIOS
    { headTitle1: "Inteligencia de Negocios" },
    {
      title: "Indicadores",
      icon: "trending-up",
      type: "sub",
      active: false,
      children: [
        { path: "dashboards", title: "Dashboard gerencial", type: "link", icon: "pie-chart" },
        { path: "dashboards/builder", title: "Constructor de reportes", type: "link", icon: "edit-3" },
      ],
    },
    {
      title: "Agent Builder",
      icon: "cpu",
      type: "sub",
      active: false,
      children: [
        { path: "agent-builder/chat-agui", title: "KAI Chat", type: "link", icon: "message-circle" },
        { path: "agent-builder/general-chat", title: "Chat Básico", type: "link", icon: "message-square" },
        { path: "agent-builder/library", title: "Mis Agentes IA", type: "link", icon: "cpu" },
        { path: "agent-builder/wizard", title: "Crear Agente", type: "link", icon: "plus" },
        { path: "agent-builder/monitor", title: "Monitor A2A", type: "link", icon: "activity" },
      ],
    },

    // CONFIGURACIÓN
    { headTitle1: "Configuración" },
    {
      title: "Seguridad",
      icon: "shield",
      type: "sub",
      active: false,
      children: [
        { path: "rol", title: "Roles y permisos", type: "link", icon: "lock" },
        { path: "usuarios", title: "Usuarios", type: "link", icon: "users" },
      ],
    },
    {
      title: "Empresa",
      icon: "briefcase",
      type: "sub",
      active: false,
      children: [
        { path: "empresas", title: "Mi Empresa", type: "link", icon: "home" },
        {
          path: "empresas/planes",
          title: "Planes y suscripciones",
          type: "link",
          icon: "award",
        },
        { path: "extras/formasPago", title: "Medios de pago", type: "link", icon: "credit-card" },
        { path: "empresa/facturacion", title: "Facturación", type: "link", icon: "file-text" },
        {
          path: "empresas/modulovariable/produccion/opciones",
          title: "Activación Módulos",
          type: "link",
          icon: "toggle-right",
        },
      ],
    },
    {
      title: "Módulos Variables",
      icon: "grid",
      type: "sub",
      active: false,
      children: [
        {
          path: "empresas/modulovariable/produccion/opciones",
          title: "Producción",
          type: "link",
          icon: "tool",
        },
        {
          path: "empresas/modulovariable/dropshipping/configuracion",
          title: "Dropshipping",
          type: "link",
          icon: "truck",
        },
        {
          path: "empresas/modulovariable/campos-personalizados",
          title: "Campos Personalizados",
          type: "link",
          icon: "list",
        },
        { path: "app-entregas", title: "App de entregas", type: "link", icon: "smartphone" },
      ],
    },
    {
      title: "Inventarios y productos",
      icon: "database",
      type: "sub",
      active: false,
      children: [
        { path: "categorias", title: "Categorías de productos", type: "link", icon: "folder" },
        { path: "inventario/bodegas", title: "Bodegas", type: "link", icon: "home" },
        { path: "proceso/canales", title: "Canales de venta", type: "link", icon: "share-2" },
        {
          path: "proceso/bodegas-por-canal",
          title: "Bodegas por canal",
          type: "link",
          icon: "git-branch",
        },
      ],
    },
    {
      title: "Producto",
      icon: "tag",
      type: "sub",
      active: false,
      children: [
        { path: "proceso/ocasiones", title: "Ocasiones", type: "link", icon: "gift" },
        { path: "proceso/generos", title: "Géneros", type: "link", icon: "users" },
        { path: "proceso/tipos-cliente", title: "Tipos de Cliente", type: "link", icon: "user-check" },
      ],
    },
    {
      title: "Logística",
      icon: "truck",
      type: "sub",
      active: false,
      children: [
        { path: "formasEntrega", title: "Formas de entrega", type: "link", icon: "navigation" },
        {
          path: "formasEntrega/tipoentrega/lista",
          title: "Tipos de entrega",
          type: "link",
          icon: "list",
        },
        { path: "tiempoentrega", title: "Tiempos de entrega", type: "link", icon: "clock" },
        { path: "extras/zonasCobro", title: "Zonas de cobro", type: "link", icon: "map" },
      ],
    },
    {
      title: "Pagos",
      icon: "credit-card",
      type: "sub",
      active: false,
      children: [
        { path: "extras/formasPago", title: "Métodos de pago", type: "link", icon: "dollar-sign" },
        {
          path: "extras/pos/formasPago",
          title: "Métodos de pago POS",
          type: "link",
          icon: "monitor",
        },
      ],
    },
    {
      title: "Integraciones",
      icon: "link",
      type: "sub",
      active: false,
      children: [
        { path: "integrations", title: "Integraciones", type: "link", icon: "link-2" },
        { path: "flows", title: "Flujos automatizados", type: "link", icon: "git-merge" },
      ],
    },
    {
      title: "Notificaciones",
      icon: "bell",
      type: "sub",
      active: false,
      children: [
        { path: "notificaciones", title: "Notificaciones", type: "link", icon: "settings" },
      ],
    },

    {
      headTitle1: "Katuq",
      headTitle2: `${new Date().getFullYear()} © Julsmind S.A.S`,
    },
  ];

  MEGAMENUITEMS: Menu[] = [
    {
      title: "Error Pages",
      type: "sub",
      active: true,
      children: [
        {
          path: "javascript:void(0);",
          title: "Error Page 400",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Error Page 401",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Error Page 403",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Error Page 404",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Error Page 500",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Error Page 503",
          type: "extLink",
        },
      ],
    },
    {
      title: "Authentication",
      type: "sub",
      active: false,
      children: [
        { path: "javascript:void(0);", title: "Login Simple", type: "extLink" },
        {
          path: "javascript:void(0);",
          title: "Login BG Image",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Login BG Video",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Simple Register",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Register BG Image",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Register BG Video",
          type: "extLink",
        },
      ],
    },
    {
      title: "Usefull Pages",
      type: "sub",
      active: false,
      children: [
        { path: "javascript:void(0);", title: "Search Pages", type: "extLink" },
        { path: "javascript:void(0);", title: "Unlock User", type: "extLink" },
        {
          path: "javascript:void(0);",
          title: "Forgot Password",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Reset Password",
          type: "extLink",
        },
        { path: "javascript:void(0);", title: "Maintenance", type: "extLink" },
      ],
    },
    {
      title: "Email templates",
      type: "sub",
      active: false,
      children: [
        {
          path: "http://admin.pixelstrap.com/cuba/theme/basic-template.html",
          title: "Basic Email",
          type: "extTabLink",
        },
        {
          path: "http://admin.pixelstrap.com/cuba/theme/email-header.html",
          title: "Basic With Header",
          type: "extTabLink",
        },
        {
          path: "http://admin.pixelstrap.com/cuba/theme/template-email.html",
          title: "Ecomerce Template",
          type: "extTabLink",
        },
        {
          path: "http://admin.pixelstrap.com/cuba/theme/template-email-2.html",
          title: "Email Template 2",
          type: "extTabLink",
        },
        {
          path: "http://admin.pixelstrap.com/cuba/theme/ecommerce-templates.html",
          title: "Ecommerce Email",
          type: "extTabLink",
        },
        {
          path: "http://admin.pixelstrap.com/cuba/theme/email-order-success.html",
          title: "Order Success",
          type: "extTabLink",
        },
      ],
    },
    {
      title: "Coming Soon",
      type: "sub",
      active: false,
      children: [
        {
          path: "javascript:void(0);",
          title: "Coming Simple",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Coming BG Image",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Coming BG Video",
          type: "extLink",
        },
      ],
    },
  ];

  LEVELMENUITEMS: Menu[] = [
    {
      path: "javascript:void(0);",
      title: "File Manager",
      icon: "git-pull-request",
      type: "extLink",
    },
    {
      title: "Users",
      icon: "users",
      type: "sub",
      active: false,
      children: [
        {
          path: "javascript:void(0);",
          title: "All Users",
          icon: "users",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "User Profile",
          icon: "users",
          type: "extLink",
        },
        {
          path: "javascript:void(0);",
          title: "Edit Profile",
          icon: "users",
          type: "extLink",
        },
      ],
    },
    {
      path: "javascript:void(0);",
      title: "Bookmarks",
      icon: "heart",
      type: "extLink",
    },
    {
      path: "javascript:void(0);",
      title: "Calender",
      icon: "calendar",
      type: "extLink",
    },
    {
      path: "javascript:void(0);",
      title: "Social App",
      icon: "zap",
      type: "extLink",
    },
  ];

  // Array
  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);
  megaItems = new BehaviorSubject<Menu[]>(this.MEGAMENUITEMS);
  levelmenuitems = new BehaviorSubject<Menu[]>(this.LEVELMENUITEMS);

  // Bottom Navigation Methods
  getPendingOrdersCount(): Observable<number> {
    // Mock implementation - replace with actual service call
    // This would normally call your orders service to get pending count
    return of(3); // Mock: 3 pending orders
  }

  getLowStockCount(): Observable<number> {
    // Mock implementation - replace with actual service call
    // This would normally call your inventory service to get low stock count
    return of(5); // Mock: 5 products with low stock
  }

  toggleSidebar(): void {
    this.collapseSidebar = !this.collapseSidebar;
  }

  // Method specifically for mobile sidebar control
  showMobileSidebar(): void {
    if (window.innerWidth < 992) {
      this.collapseSidebar = false;
    }
  }

  hideMobileSidebar(): void {
    if (window.innerWidth < 992) {
      this.collapseSidebar = true;
    }
  }
}
