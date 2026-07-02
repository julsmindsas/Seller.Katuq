import { Component, OnInit } from '@angular/core';
import { SecurityService } from '../shared/services/security/security.service';
import { CompanyInformation } from '../shared/models/User/CompanyInformation';
import { AnalyticsService } from '../shared/services/dashboard/analytics.service';
import { LogisticaServiceV2 } from '../shared/services/despachos/logistica.service.v2';
import { InventarioService } from '../shared/services/inventarios/inventario.service';
import { CrmService } from '../components/crm/services/crm.service';
import { VentasService } from '../shared/services/ventas/ventas.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  public userActive: any;
  public currentCompany: CompanyInformation | null = null;

  // Paths del menú por sección — única fuente para el *ngIf de cada bloque del
  // template (título + grid comparten contenedor, sin listas duplicadas).
  readonly accionesRapidasPaths: string[] = [
    'ventas/crear-ventas', 'ventas/ventas-pos', 'productos', 'ventas/pedidos',
    'inventario/inventario-catalogo', 'ventas/clienteslista', 'crm/list',
  ];
  readonly herramientasPaths: string[] = [
    'despachos', 'dashboards', 'dashboards/builder', 'empresas', 'integrations',
  ];

  // "Tu negocio hoy" — métricas del comercio calculadas server-side (regla del
  // proyecto: el frontend solo muestra). Cada widget se pide únicamente si el
  // rol tiene acceso a la pantalla destino; valor null = endpoint falló ("—").
  ventasHoy: { cargando: boolean; total: number | null; pedidos: number | null } =
    { cargando: false, total: null, pedidos: null };
  despachosHoy: { cargando: boolean; paraDespacho: number | null; urgentes: number | null } =
    { cargando: false, paraDespacho: null, urgentes: null };
  stockCritico: { cargando: boolean; sinStock: number | null; bajoStock: number | null } =
    { cargando: false, sinStock: null, bajoStock: null };
  crmTareas: { cargando: boolean; vencidas: number | null; paraHoy: number | null } =
    { cargando: false, vencidas: null, paraHoy: null };
  clientesResumen: { cargando: boolean; nuevosMes: number | null; enAlerta: number | null; total: number | null } =
    { cargando: false, nuevosMes: null, enAlerta: null, total: null };

  // Set de paths del menú asignados al rol del usuario (sin barra inicial).
  // Se llena en ngOnInit leyendo user.menu del localStorage. Los admins lo dejan
  // vacío y `canAccess()` retorna true siempre para ellos (escape hatch).
  private userMenuPaths: Set<string> = new Set();
  private isAdminRole = false;
  // Si el JWT no tiene menu (sesión legacy / token viejo), mostrar TODO en lugar
  // de ocultar — no romper operación de users con tokens previos al cambio.
  private hasMenuMetadata = false;

  // Onboarding banner
  showOnboardingBanner = false;

  constructor(
    private securityService: SecurityService,
    private analyticsService: AnalyticsService,
    private logisticaService: LogisticaServiceV2,
    private inventarioService: InventarioService,
    private crmService: CrmService,
    private ventasService: VentasService
  ) {}

  ngOnInit() {
    // SecurityService encapsula los fallbacks (localStorage → user.company);
    // sessionStorage solo se escribe en la rama Administrador del login, así que
    // leerlo directo dejaba el hero sin nombre de comercio para los demás roles.
    this.currentCompany = this.securityService.getCompanyInformationLogged();
    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');

    // Construir set de paths del menú del rol — usado por canAccess() para
    // ocultar cards del welcome que el rol no puede usar.
    const rol = (this.userActive?.rol || this.userActive?.role || '').toLowerCase();
    this.isAdminRole = rol === 'administrador' || rol === 'super administrador';
    const menus = Array.isArray(this.userActive?.menu) ? this.userActive.menu : [];
    this.hasMenuMetadata = menus.length > 0;
    for (const m of menus) {
      if (m && typeof m.path === 'string') {
        // Normalizar: sin barra inicial (los routerLinks del HTML sí la llevan)
        this.userMenuPaths.add(m.path.replace(/^\/+/, ''));
      }
    }

    if (localStorage.getItem('showOnboardingBanner') === 'true') {
      this.showOnboardingBanner = true;
    }

    this.cargarMetricasNegocio();
  }

  get showAccionesRapidas(): boolean {
    return this.canAccessAny(this.accionesRapidasPaths);
  }

  get showHerramientas(): boolean {
    return this.canAccessAny(this.herramientasPaths);
  }

  // Visibilidad por widget: la misma regla que la pantalla a la que navega la
  // card. "Ventas de hoy" son cifras globales del comercio — solo roles con
  // analíticas (un vendedor sin dashboards no debe ver ventas de otros).
  get showVentasHoy(): boolean {
    return this.canAccess('dashboards') || this.canAccess('dashboards/builder');
  }

  get showDespachosHoy(): boolean {
    return this.canAccess('despachos');
  }

  get showStockCritico(): boolean {
    return this.canAccess('inventario/inventario-catalogo');
  }

  get showCrmTareas(): boolean {
    return this.canAccess('crm/list');
  }

  get showClientesResumen(): boolean {
    return this.canAccess('ventas/clienteslista');
  }

  get showNegocioHoy(): boolean {
    return this.showVentasHoy || this.showDespachosHoy || this.showStockCritico
      || this.showCrmTareas || this.showClientesResumen;
  }

  /**
   * Verifica si el rol del usuario tiene acceso a un path específico del welcome.
   * - Admin/Super Admin: siempre true.
   * - Otros: chequea contra el set de menús asignados al rol.
   *
   * @param path Ruta del routerLink (con o sin barra inicial).
   * @returns true si el usuario puede ver la card.
   */
  canAccess(path: string): boolean {
    if (this.isAdminRole) return true;
    // Fallback defensivo: si el JWT no trae menu (sesión legacy / token viejo
    // anterior al cambio), mostrar TODO. Evita romper operación de users con
    // sesiones previas. Cuando re-loguean, el JWT nuevo trae menu y el filtro
    // empieza a aplicar.
    if (!this.hasMenuMetadata) return true;
    if (!path) return false;
    const normalized = path.replace(/^\/+/, '');
    return this.userMenuPaths.has(normalized);
  }

  /**
   * Verifica si el usuario tiene acceso a AL MENOS uno de los paths.
   * Útil para mostrar una sección entera del welcome que tiene varias cards
   * de la misma categoría.
   */
  canAccessAny(paths: string[]): boolean {
    if (this.isAdminRole) return true;
    if (!this.hasMenuMetadata) return true;
    return paths.some((p) => this.canAccess(p));
  }

  dismissOnboarding(): void {
    this.showOnboardingBanner = false;
    localStorage.removeItem('showOnboardingBanner');
  }

  /**
   * Dispara la carga de los widgets de negocio visibles para el rol. Cada
   * endpoint es independiente: si uno falla, su card muestra "—" sin bloquear
   * a los demás. Los observables HTTP completan solos (sin leak).
   */
  private cargarMetricasNegocio(): void {
    const hoy = this.formatearFechaLocal(new Date());

    if (this.showVentasHoy) {
      this.ventasHoy.cargando = true;
      this.analyticsService.getDashboardCore(hoy, hoy).subscribe({
        next: (r) => {
          this.ventasHoy = {
            cargando: false,
            total: r?.kpis?.ventasTotales ?? 0,
            pedidos: r?.kpis?.totalPedidos ?? 0,
          };
        },
        error: () => { this.ventasHoy.cargando = false; },
      });
    }

    if (this.showDespachosHoy) {
      this.despachosHoy.cargando = true;
      // Sin filtro de fechas: la cola operativa activa completa.
      this.logisticaService.getShippingMetrics().subscribe({
        next: (r) => {
          this.despachosHoy = {
            cargando: false,
            paraDespacho: r?.pedidosParaDespacho ?? 0,
            urgentes: r?.pedidosUrgentes ?? 0,
          };
        },
        error: () => { this.despachosHoy.cargando = false; },
      });
    }

    if (this.showStockCritico) {
      this.stockCritico.cargando = true;
      // limit: 1 + includeMetrics: solo los agregados, sin pagar el listado.
      // OJO: `estadisticas` es de la página actual (con limit=1 siempre da 0/1)
      // — los globales correctos salen de totalesGlobales y bodegas[].metricas.
      this.inventarioService.obtenerInventarioConsolidado({ limit: 1, includeMetrics: true }).subscribe({
        next: (r) => {
          const tg = r?.totalesGlobales;
          // SKUs inventariables sin stock = catálogo total - SKUs con stock.
          const sinStock = tg ? Math.max(0, (tg.totalSKUsCatalogo || 0) - (tg.totalProductos || 0)) : 0;
          // Suma de bajo stock por bodega (exacto para tenants de 1 bodega;
          // aproximado en multi-bodega hasta tener el agregado global backend).
          const bajoStock = (r?.bodegas || []).reduce(
            (acc, b) => acc + (b?.metricas?.productosBajoStock || 0), 0);
          this.stockCritico = { cargando: false, sinStock, bajoStock };
        },
        error: () => { this.stockCritico.cargando = false; },
      });
    }

    if (this.showCrmTareas) {
      this.crmTareas.cargando = true;
      // /v1/crm/stats es el CRM real multi-tenant (el viejo /v1/prospectos/stats
      // no existe en el backend — 404 silencioso). getStats() ya desenvuelve
      // `data` y en error emite null (catchError interno) → la card queda "—".
      this.crmService.getStats().subscribe({
        next: (r) => {
          this.crmTareas = {
            cargando: false,
            vencidas: r ? (r.tasksOverdue ?? 0) : null,
            paraHoy: r ? (r.tasksDueToday ?? 0) : null,
          };
        },
        error: () => { this.crmTareas.cargando = false; },
      });
    }

    if (this.showClientesResumen) {
      this.clientesResumen.cargando = true;
      // Cacheado ~30 min server-side (metricas_globales/{company}) — 1 read por
      // login. Solo se renderizan conteos; las cifras de dinero del payload
      // (totalFacturado) no se muestran acá.
      this.ventasService.getGlobalCustomerMetrics().subscribe({
        next: (r) => {
          this.clientesResumen = {
            cargando: false,
            nuevosMes: r?.clientesNuevos30dias ?? 0,
            enAlerta: r?.clientesEnAlerta ?? 0,
            total: r?.totalClientes ?? 0,
          };
        },
        error: () => { this.clientesResumen.cargando = false; },
      });
    }
  }

  private formatearFechaLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
