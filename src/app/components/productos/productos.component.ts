import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ProductDetailsComponent } from './product-details/product-details.component';
import Swal from 'sweetalert2';
import { ImagenService } from '../../shared/utils/image.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { LazyLoadEvent } from 'primeng/api';
import * as XLSX from 'xlsx';
import { UtilsService } from '../../shared/services/utils.service';
import { ProveedoresService } from '../dropshipping/services/proveedores.service';
import { Proveedor } from '../dropshipping/interfaces';
import { ImportResult } from '../../shared/models/column-mapping.model';
import { FulfillmentService } from '../../shared/services/fulfillment/fulfillment.service';
import { ToastrService } from 'ngx-toastr';
import { IntegrationsService } from '../integrations/integrations.service';
import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { EMPTY, of } from 'rxjs';
import { parse as flatedParse } from 'flatted';

const FILTROS_SESSION_KEY = 'productos_filtros';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss']
})
export class ProductosComponent implements OnInit, OnDestroy {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;
  // Modal de importación: se usa para descargar la plantilla desde el menú
  // "Importar" sin abrirlo. Sin tipar para no acoplar este componente al módulo
  // compartido; sólo se le llama `downloadTemplate()`, con guarda previa.
  @ViewChild('importModal') importModal: any;

  cargando = false;
  rows = [];
  temp: any[] = [];

  // Paginación
  pageSize = 10;
  currentPage = 1;
  // Offset del paginador. Lo posee el COMPONENTE y va bindeado a [first] de la
  // p-table. Antes no estaba bindeado y la tabla se lo guardaba internamente:
  // cualquier recarga que volviera a página 1 (cambiar un filtro del botón Más,
  // buscar, limpiar) dejaba el paginador resaltando la página vieja mientras los
  // datos ya eran los de la página 1. Peor aún, volver a hacer clic en esa misma
  // página NO emite onLazyLoad (PrimeNG ignora el clic sobre la página activa),
  // así que la tabla quedaba trabada mostrando la primera página por más que la
  // numeración dijera otra cosa.
  first = 0;
  totalItems = 0;
  totalPages = 0;
  lastDocId: string | null = null;
  sortField: string | null = null;
  sortOrder: number = 1;

  userRol: any;
  userNit: any;
  NombreUsuario = '';
  Vendedor = 0;
  empresas = [];

  ColumnMode = ColumnMode;

  closeResult: string;
  isMobile = false;
  empresaActual: any;
  ultimasLetras: any;
  /**
   * Habilita el botón "Eliminar Base de Datos". Solo la familia Administrador.
   * Es únicamente para no ofrecer la acción a quien no puede ejecutarla: la
   * autorización real la impone el backend (requireRole en
   * routers/productos.js), porque el localStorage lo edita cualquiera.
   */
  puedeEliminarBaseDatos = false;

  // ---- Sistema de Filtros ----
  filtros = {
    texto: '',
    searchBy: 'referencia',
    estado: '',
    disponibilidad: '',
    tipoProducto: '',
    precioDesde: null as number | null,
    precioHasta: null as number | null,
    // Más filtros
    requiereProduccion: '',
    inventariable: '',
    ultimaEdicion: '',
    completitud: '',
    // Nuevos filtros
    categoria: '',
    subcategoria: '',
    exposicion: '',          // oferta | nuevo | destacado | recomendado | masvendido
    tipoEntrega: '',
    tiempoEntrega: '',
    canal: '',               // pos | web | shopify
    aceptaAdiciones: '',     // si | no
    aceptaCalendario: '',    // si | no
    permitePrecioManual: '', // si | no
  };
  tiposEntrega: any[] = [];
  tiemposEntrega: any[] = [];
  categoriasList: { label: string; children: { label: string }[] }[] = [];
  subcategoriasList: string[] = [];
  masFiltersVisible = false;
  private searchSubject = new Subject<string>();
  private filterSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  // Saved filter views
  private readonly SAVED_VIEWS_KEY = 'productos_saved_views';
  savedViews: { name: string; filtros: any }[] = [];
  activeViewName = '';

  hasActiveFilters(): boolean {
    return !!(
      this.filtros.texto ||
      this.filtros.estado ||
      this.filtros.disponibilidad ||
      this.filtros.tipoProducto ||
      this.filtros.precioDesde != null ||
      this.filtros.precioHasta != null ||
      this.filtros.requiereProduccion ||
      this.filtros.inventariable ||
      this.filtros.ultimaEdicion ||
      this.filtros.completitud
    );
  }

  async saveCurrentView(): Promise<void> {
    const { value: name } = await Swal.fire({
      title: 'Guardar vista',
      input: 'text',
      inputLabel: 'Nombre de la vista',
      inputPlaceholder: 'Ej: Activos con stock',
      inputValue: this.activeViewName || '',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => !v ? 'Escribe un nombre para la vista' : undefined
    });
    if (!name) return;
    const existing = this.savedViews.findIndex(v => v.name === name);
    const snapshot = JSON.parse(JSON.stringify(this.filtros));
    if (existing >= 0) {
      this.savedViews[existing].filtros = snapshot;
    } else {
      this.savedViews.push({ name, filtros: snapshot });
    }
    this.activeViewName = name;
    localStorage.setItem(this.SAVED_VIEWS_KEY, JSON.stringify(this.savedViews));
    this.toastr.success(`Vista "${name}" guardada`, 'Vistas');
  }

  loadView(view: { name: string; filtros: any }): void {
    this.filtros = { ...this.filtros, ...view.filtros };
    this.activeViewName = view.name;
    this.resetPaginacion();
    this.cargarConFiltros();
  }

  async deleteView(view: { name: string; filtros: any }, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await Swal.fire({
      title: `¿Eliminar vista "${view.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d12b38'
    });
    if (!confirmed.isConfirmed) return;
    this.savedViews = this.savedViews.filter(v => v.name !== view.name);
    if (this.activeViewName === view.name) this.activeViewName = '';
    localStorage.setItem(this.SAVED_VIEWS_KEY, JSON.stringify(this.savedViews));
  }

  private loadSavedViews(): void {
    try {
      const saved = localStorage.getItem(this.SAVED_VIEWS_KEY);
      if (saved) this.savedViews = JSON.parse(saved);
    } catch { /* ignore */ }
  }

  // Filtros de dropshipping (legacy — mantenidos para compatibilidad)
  proveedores: Proveedor[] = [];
  selectedProveedor: string | null = null;
  loadingProveedores = false;
  mostrarSoloDropshipping = false;

  // Import modal
  showImportModal: boolean = false;

  // Export dialog
  showExportDialog = false;
  exportando = false;        // export en progreso (trayendo todas las páginas)
  exportProgress = 0;        // productos traídos hasta ahora
  exportTotal = 0;           // total esperado (según la paginación)
  /**
   * Columnas del export. **Contrato compartido con el importador**
   * (`shared/components/import-modal` → `productConfig.templateColumns`): los
   * encabezados son idénticos a los de la plantilla de importación, para que el
   * ciclo exportar → corregir en Excel → reimportar funcione (el import hace
   * upsert por referencia). Si cambiás un encabezado acá, cambialo allá también.
   *
   * Los encabezados dicen qué se escribe: `(SI/NO)` en los booleanos, la unidad
   * en los numéricos. Sin eso nadie sabe qué poner en la celda.
   *
   * Dos columnas no son simétricas, a propósito:
   *  - `Precio con IVA` es solo de salida (al importar se recalcula).
   *  - `Id Categoria` es solo de entrada (el producto no lo guarda; sirve para
   *    enlazar con SIIGO al crear la categoría).
   *
   * Todas arrancan seleccionadas porque reimportar un export PARCIAL pisa los
   * campos ausentes con los valores por defecto — ver la advertencia del diálogo.
   */
  exportColumnas = [
    { label: 'Referencia (SKU)',                key: 'referencia',         selected: true, getValue: (r: any) => r.identificacion?.referencia || '' },
    { label: 'Codigo de Barras',                key: 'codigoBarras',       selected: true, getValue: (r: any) => r.identificacion?.codigoBarras || '' },
    { label: 'Titulo',                          key: 'titulo',             selected: true, getValue: (r: any) => r.crearProducto?.titulo || '' },
    { label: 'Descripcion',                     key: 'descripcion',        selected: true, getValue: (r: any) => r.crearProducto?.descripcion || '' },
    { label: 'Marca',                           key: 'marca',              selected: true, getValue: (r: any) => r.identificacion?.marca || '' },
    { label: 'Categoria',                       key: 'categoria',          selected: true, getValue: (r: any) => r.categorias?.label || '' },
    { label: 'Precio sin IVA',                  key: 'precioSinIva',       selected: true, getValue: (r: any) => r.precio?.precioUnitarioSinIva || 0 },
    { label: 'IVA (%)',                         key: 'porcentajeIva',      selected: true, getValue: (r: any) => r.precio?.precioUnitarioIva || '0' },
    { label: 'Precio con IVA',                  key: 'precioConIva',       selected: true, getValue: (r: any) => r.precio?.precioUnitarioConIva || 0 },
    // `exposicion.activar`, NO `disponibilidad.activar`: ese campo no existe y
    // la columna exportaba "Inactivo" para todos los productos.
    { label: 'Activo (SI/NO)',                  key: 'activo',             selected: true, getValue: (r: any) => (r.exposicion?.activar ? 'SI' : 'NO') },
    { label: 'Disponible (SI/NO)',              key: 'disponible',         selected: true, getValue: (r: any) => (r.exposicion?.disponible ? 'SI' : 'NO') },
    { label: 'Inventariable (SI/NO)',           key: 'inventariable',      selected: true, getValue: (r: any) => (r.disponibilidad?.inventariable ? 'SI' : 'NO') },
    { label: 'Cantidad Minima de Venta',        key: 'cantidadMinVenta',   selected: true, getValue: (r: any) => r.disponibilidad?.cantidadMinVenta ?? '' },
    { label: 'Inventario de Seguridad',         key: 'inventarioSeguridad',selected: true, getValue: (r: any) => r.disponibilidad?.inventarioSeguridad ?? '' },
    { label: 'Tipo de Entrega',                 key: 'tipoEntrega',        selected: true, getValue: (r: any) => r.disponibilidad?.tipoEntrega || '' },
    { label: 'Tiempo de Entrega (dias)',        key: 'tiempoEntrega',      selected: true, getValue: (r: any) => r.disponibilidad?.tiempoEntrega ?? '' },
    { label: 'Largo (cm)',                      key: 'largo',              selected: true, getValue: (r: any) => r.dimensiones?.largoProductoCm || '' },
    { label: 'Alto (cm)',                       key: 'alto',               selected: true, getValue: (r: any) => r.dimensiones?.altoProductoCm || '' },
    { label: 'Ancho (cm)',                      key: 'ancho',              selected: true, getValue: (r: any) => r.dimensiones?.anchoProductoCm || '' },
    { label: 'Peso (kg)',                       key: 'peso',               selected: true, getValue: (r: any) => r.dimensiones?.pesoUnitarioProductoKg || '' },
    // Las etiquetas viven en `exposicion`, no en `crearProducto`: la columna
    // "Tags" leía un campo inexistente y salía vacía siempre.
    { label: 'Etiquetas (separadas por coma)',  key: 'etiquetas',          selected: true, getValue: (r: any) => (r.exposicion?.etiquetas || []).join(', ') },
    { label: 'Garantias',                       key: 'garantias',          selected: true, getValue: (r: any) => r.crearProducto?.garantiasProducto || '' },
    { label: 'Caracteristicas Adicionales',     key: 'caracAdicionales',   selected: true, getValue: (r: any) => r.crearProducto?.caracAdicionales || '' },
    { label: 'Restricciones',                   key: 'restricciones',      selected: true, getValue: (r: any) => r.crearProducto?.restriccionesProducto || '' },
    { label: 'Cuidado y Consumo',               key: 'cuidadoConsumo',     selected: true, getValue: (r: any) => r.crearProducto?.cuidadoConsumo || '' },
    { label: 'Requiere Produccion (SI/NO)',     key: 'requiereProduccion', selected: true, getValue: (r: any) => (r.crearProducto?.paraProduccion ? 'SI' : 'NO') },
    // Stock: NO va acá. `disponibilidad.cantidadDisponible` es un campo muerto
    // (nadie lo asigna) — el stock real vive en la colección `inventory` por
    // bodega, y se exporta/importa desde Inventario. Exportarlo desde acá
    // devolvía 0 para todo el catálogo, que parece un dato y no lo es.
  ];

  // Column configuration
  private readonly COL_CONFIG_KEY = 'productos_col_config';
  showColConfigDialog = false;
  colConfig: { key: string; label: string; visible: boolean }[] = [
    { key: 'referencia',    label: 'Referencia',      visible: true  },
    { key: 'categoria',     label: 'Categoría',       visible: true  },
    { key: 'canales',       label: 'Canales',         visible: true  },
    { key: 'estado',        label: 'Estado',          visible: true  },
    { key: 'disponibilidad',label: 'Disponibilidad',  visible: true  },
    { key: 'produccion',    label: 'Producción',      visible: true  },
    { key: 'precio',        label: 'Precio (c/IVA)',  visible: true  },
    { key: 'ultimaEdicion', label: 'Última Edición',  visible: true  },
  ];

  isColVisible(key: string): boolean {
    const col = this.colConfig.find(c => c.key === key);
    return col ? col.visible : true;
  }

  // Ordena en el cliente los resultados de quickSearch (ya están todos en
  // memoria, no hay round-trip al backend para esa rama). Misma whitelist
  // de campos que SORTABLE_FIELDS en controllers/productos.js#getAll.
  private ordenarProductos(products: any[]): any[] {
    if (!this.sortField) return products;
    const dir = this.sortOrder === -1 ? -1 : 1;
    const getVal = (row: any): any => {
      switch (this.sortField) {
        case 'crearProducto.titulo': return (row.crearProducto?.titulo || '').toLowerCase();
        case 'identificacion.referencia': return (row.identificacion?.referencia || '').toLowerCase();
        case 'categorias.label': return (row.categorias?.label || '').toLowerCase();
        case 'exposicion.activar': return !!row.exposicion?.activar;
        case 'exposicion.disponible': return !!row.exposicion?.disponible;
        case 'crearProducto.paraProduccion': return !!row.crearProducto?.paraProduccion;
        case 'precio.precioUnitarioConIva': return row.precio?.precioUnitarioConIva ?? 0;
        case 'date_edit': return row.date_edit ? new Date(row.date_edit).getTime() : 0;
        default: return null;
      }
    };
    return [...products].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      let cmp: number;
      if (typeof av === 'string') cmp = av.localeCompare(bv);
      else if (typeof av === 'boolean') cmp = (av === bv) ? 0 : (av ? 1 : -1);
      else cmp = (av ?? 0) - (bv ?? 0);
      return cmp * dir;
    });
  }

  private normalizeProducts(products: any[]): any[] {
    return products.map(p => {
      if (p.categorias && typeof p.categorias === 'string') {
        try {
          const parsed = flatedParse(p.categorias);
          // Reconstruir sin referencias circulares (parent) para que JSON.stringify funcione
          p.categorias = {
            label: parsed.label,
            data: parsed.data,
            children: (parsed.children || []).map((c: any) => ({ label: c.label, data: c.data })),
          };
        } catch { }
      }
      return p;
    });
  }

  saveColConfig(): void {
    const saved = this.colConfig.map(c => ({ key: c.key, visible: c.visible }));
    localStorage.setItem(this.COL_CONFIG_KEY, JSON.stringify(saved));
    this.showColConfigDialog = false;
  }

  private loadColConfig(): void {
    try {
      const saved = localStorage.getItem(this.COL_CONFIG_KEY);
      if (saved) {
        const parsed: { key: string; visible: boolean }[] = JSON.parse(saved);
        parsed.forEach(s => {
          const col = this.colConfig.find(c => c.key === s.key);
          if (col) col.visible = s.visible;
        });
      }
    } catch { /* ignore */ }
  }

  moveColUp(index: number): void {
    if (index <= 0) return;
    const tmp = this.colConfig[index - 1];
    this.colConfig[index - 1] = this.colConfig[index];
    this.colConfig[index] = tmp;
  }

  moveColDown(index: number): void {
    if (index >= this.colConfig.length - 1) return;
    const tmp = this.colConfig[index + 1];
    this.colConfig[index + 1] = this.colConfig[index];
    this.colConfig[index] = tmp;
  }

  // Selección múltiple
  selectedProductos: any[] = [];
  private selectedIds = new Set<string>(); // Set para O(1) en isSelected
  ejecutandoAccionMasiva = false;

  // Fulfillment
  fulfillmentEnabled: boolean = false;
  fulfillmentProvider: string = '';
  fulfillmentProviderName: string = '';
  importandoProductosFulfillment: boolean = false;

  // Osmosis
  osmosisEnabled: boolean = false;
  importandoProductosOsmosis: boolean = false;


  constructor(
    private service: MaestroService,
    private imageService: ImagenService,
    private storage: AngularFireStorage,
    private router: Router,
    private modalService: NgbModal,
    private utilsService: UtilsService,
    private proveedoresService: ProveedoresService,
    private fulfillmentService: FulfillmentService,
    private toastr: ToastrService,
    private integrationsService: IntegrationsService
  ) { }

  ngOnInit(): void {
    const currentCompany = localStorage.getItem("currentCompany");
    this.empresaActual = currentCompany ? JSON.parse(currentCompany) : {};
    const texto = this.empresaActual.nomComercial.toString();
    this.ultimasLetras = texto.substring(texto.length - 3);
    this.puedeEliminarBaseDatos = this.esRolAdministrador();

    // Cargar opciones de tipo/tiempo de entrega y categorías para filtros
    this.service.getTipoEntrega().subscribe((r: any) => { this.tiposEntrega = r || []; });
    this.service.getTiempoEntrega().subscribe((r: any) => { this.tiemposEntrega = r || []; });
    this.service.getCategorias().subscribe((r: any) => {
      try {
        const tree = flatedParse((r as any[])[0].categoria);
        this.categoriasList = (tree as any[]).map((p: any) => ({
          label: p.data?.nombre || p.label || '',
          children: (p.children || []).map((c: any) => ({ label: c.data?.nombre || c.label || '' })),
        })).filter(c => c.label);
        // Restaurar subcategorías si hay categoría activa
        if (this.filtros.categoria) this.actualizarSubcategorias(this.filtros.categoria);
      } catch { this.categoriasList = []; }
    });

    // Restaurar filtros de sesión si existen
    this.restaurarFiltros();

    // Restaurar configuración de columnas
    this.loadColConfig();

    // Cargar vistas guardadas
    this.loadSavedViews();

    // Debounce para búsqueda de texto con switchMap (cancela request anterior si el usuario sigue escribiendo)
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(texto => {
        this.filtros.texto = texto;
        this.resetPaginacion();
        this.cargando = true;
        this.guardarFiltros();
        const trimmed = texto?.trim();
        const request$ = (trimmed && trimmed.length >= 2)
          ? this.service.quickSearchProducts(trimmed, this.pageSize, this.filtros.searchBy, this.currentPage)
          : this.service.getProductsFiltered(this.filtros, this.pageSize, this.currentPage, undefined, this.sortField ?? undefined, this.sortOrder);

        // El error se atrapa DENTRO del switchMap a propósito: si escapa hasta el
        // subscribe, RxJS cierra la suscripción y el Subject queda emitiendo al
        // vacío — el buscador se muere hasta recargar la página. Basta un backend
        // caído o un 500 puntual para dejarlo inservible el resto de la sesión.
        return request$.pipe(catchError(err => {
          console.error('Error en búsqueda:', err);
          this.cargando = false;
          return EMPTY;
        }));
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        if (response?.searchBy !== undefined) {
          // Respuesta de quickSearch (identificada por el campo searchBy, exclusivo de este endpoint)
          let products: any[] = response.products || [];
          if (this.filtros.estado === 'activo') products = products.filter(p => p.exposicion?.activar === true);
          else if (this.filtros.estado === 'inactivo') products = products.filter(p => p.exposicion?.activar === false);
          if (this.filtros.disponibilidad === 'disponible') products = products.filter(p => p.exposicion?.disponible === true);
          else if (this.filtros.disponibilidad === 'agotado') products = products.filter(p => p.exposicion?.disponible === false);
          if (this.filtros.tipoProducto) products = products.filter(p => p.crearProducto?.tipoProducto === this.filtros.tipoProducto);
          products = this.ordenarProductos(products);
          const normalized = this.normalizeProducts(products);
          this.temp = [...normalized];
          this.rows = normalized;
          this.totalItems = response.pagination?.totalItems ?? normalized.length;
          this.totalPages = response.pagination?.totalPages ?? 1;
          this.lastDocId = null;
        } else {
          // Respuesta de getProductsFiltered
          const normalized = this.normalizeProducts(response.products);
          this.temp = [...normalized];
          this.rows = normalized;
          this.totalItems = response.pagination.totalItems;
          this.totalPages = response.pagination.totalPages;
          this.lastDocId = response.pagination.lastDocId;
        }
        this.cargando = false;
      }
    });

    // Debounce para cambios de filtros de dropdown (400ms, cancela request previo)
    this.filterSubject.pipe(
      debounceTime(400),
      switchMap(() => {
        this.resetPaginacion();
        this.cargando = true;
        this.guardarFiltros();
        // Mismo blindaje que el buscador: el error no puede escapar del switchMap
        // o la tira de filtros deja de responder para el resto de la sesión.
        return this.service.getProductsFiltered(this.filtros, this.pageSize, this.currentPage, undefined, this.sortField ?? undefined, this.sortOrder)
          .pipe(catchError(err => {
            console.error('Error al aplicar filtros:', err);
            this.cargando = false;
            return EMPTY;
          }));
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        const normalized = this.normalizeProducts(response.products);
        this.temp = [...normalized];
        this.rows = normalized;
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
        this.lastDocId = response.pagination.lastDocId;
        this.cargando = false;
      }
    });

    this.cargarConFiltros();
    this.cargarProveedores();
    this.checkIntegrationsConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---- Persistencia de filtros en sesión ----
  private guardarFiltros(): void {
    sessionStorage.setItem(FILTROS_SESSION_KEY, JSON.stringify(this.filtros));
  }

  private restaurarFiltros(): void {
    const saved = sessionStorage.getItem(FILTROS_SESSION_KEY);
    if (saved) {
      try {
        this.filtros = { ...this.filtros, ...JSON.parse(saved) };
      } catch {}
    }
  }

  private resetPaginacion(): void {
    this.currentPage = 1;
    this.first = 0;
    this.lastDocId = null;
  }

  // ---- Chips de filtros activos ----
  get activeChips(): { label: string; key: string }[] {
    const chips = [];
    if (this.filtros.texto) {
      const criteriaLabel: { [key: string]: string } = { referencia: 'Ref', titulo: 'Nombre', marca: 'Marca', codigoBarras: 'C.Barras', categoria: 'Categoría', etiquetas: 'Etiquetas', descripcion: 'Descripción', caracAdicionales: 'Características', garantias: 'Garantías', restricciones: 'Restricciones', cuidadoConsumo: 'Cómo cuidarse' };
      chips.push({ label: `${criteriaLabel[this.filtros.searchBy] || 'Texto'}: "${this.filtros.texto}"`, key: 'texto' });
    }
    if (this.filtros.estado === 'activo') chips.push({ label: 'Activo', key: 'estado' });
    if (this.filtros.estado === 'inactivo') chips.push({ label: 'Inactivo', key: 'estado' });
    if (this.filtros.disponibilidad === 'disponible') chips.push({ label: 'Disponible', key: 'disponibilidad' });
    if (this.filtros.disponibilidad === 'agotado') chips.push({ label: 'Agotado', key: 'disponibilidad' });
    if (this.filtros.tipoProducto) chips.push({ label: `Tipo: ${this.filtros.tipoProducto}`, key: 'tipoProducto' });
    if (this.filtros.precioDesde != null) chips.push({ label: `Desde $${this.filtros.precioDesde}`, key: 'precioDesde' });
    if (this.filtros.precioHasta != null) chips.push({ label: `Hasta $${this.filtros.precioHasta}`, key: 'precioHasta' });
    if (this.filtros.requiereProduccion) chips.push({ label: `Producción: ${this.filtros.requiereProduccion === 'true' ? 'Sí' : 'No'}`, key: 'requiereProduccion' });
    if (this.filtros.inventariable) chips.push({ label: `Inventariable: ${this.filtros.inventariable === 'true' ? 'Sí' : 'No'}`, key: 'inventariable' });
    if (this.filtros.ultimaEdicion) chips.push({ label: `Edición: ${this.filtros.ultimaEdicion}`, key: 'ultimaEdicion' });
    if (this.filtros.completitud === 'completo') chips.push({ label: 'Completos', key: 'completitud' });
    if (this.filtros.completitud === 'parcial') chips.push({ label: 'Parciales', key: 'completitud' });
    if (this.filtros.completitud === 'incompleto') chips.push({ label: 'Incompletos', key: 'completitud' });
    if (this.filtros.categoria) chips.push({ label: `Cat: ${this.filtros.categoria}`, key: 'categoria' });
    if (this.filtros.subcategoria) chips.push({ label: `Sub: ${this.filtros.subcategoria}`, key: 'subcategoria' });
    const expMap: any = { oferta: 'Oferta', nuevo: 'Nuevo', destacado: 'Destacado', recomendado: 'Recomendado', masvendido: 'Más vendido' };
    if (this.filtros.exposicion) chips.push({ label: expMap[this.filtros.exposicion] || this.filtros.exposicion, key: 'exposicion' });
    if (this.filtros.tipoEntrega) chips.push({ label: `T.Entrega: ${this.filtros.tipoEntrega}`, key: 'tipoEntrega' });
    if (this.filtros.tiempoEntrega) chips.push({ label: `T.Tiempo: ${this.filtros.tiempoEntrega}`, key: 'tiempoEntrega' });
    const canalMap: any = { pos: 'POS', web: 'Web', shopify: 'Shopify' };
    if (this.filtros.canal) chips.push({ label: `Canal: ${canalMap[this.filtros.canal] || this.filtros.canal}`, key: 'canal' });
    if (this.filtros.aceptaAdiciones) chips.push({ label: `Adiciones: ${this.filtros.aceptaAdiciones === 'si' ? 'Sí' : 'No'}`, key: 'aceptaAdiciones' });
    if (this.filtros.aceptaCalendario) chips.push({ label: `Calendario: ${this.filtros.aceptaCalendario === 'si' ? 'Sí' : 'No'}`, key: 'aceptaCalendario' });
    if (this.filtros.permitePrecioManual) chips.push({ label: `Precio manual: ${this.filtros.permitePrecioManual === 'si' ? 'Sí' : 'No'}`, key: 'permitePrecioManual' });
    return chips;
  }

  get hayFiltrosActivos(): boolean {
    return this.activeChips.length > 0;
  }

  // `activeChips` es un getter: devuelve un array NUEVO con objetos NUEVOS en
  // cada ciclo de detección de cambios. Sin trackBy el *ngFor los ve como items
  // distintos y destruye/recrea todos los <button> en cada tick — el mousedown
  // sobre la × pasa sobre un nodo que ya no existe al soltar el mouse, así que
  // el navegador nunca llega a emitir 'click' y el chip parece no responder.
  trackChip(_index: number, chip: { key: string }): string {
    return chip.key;
  }

  get searchPlaceholder(): string {
    const map: { [key: string]: string } = {
      referencia: 'Buscar por referencia (ej: ALM-804)…',
      titulo: 'Buscar por nombre de producto…',
      marca: 'Buscar por marca…',
      codigoBarras: 'Buscar por código de barras…',
      categoria: 'Buscar por categoría…',
      etiquetas: 'Buscar por etiqueta…',
      descripcion: 'Buscar en descripción…',
      caracAdicionales: 'Buscar en características adicionales…',
      garantias: 'Buscar en garantías…',
      restricciones: 'Buscar en restricciones…',
      cuidadoConsumo: 'Buscar en cómo cuidarse / consumirse…',
    };
    return map[this.filtros.searchBy] || 'Buscar…';
  }

  get masFilterCount(): number {
    let count = 0;
    if (this.filtros.precioDesde != null) count++;
    if (this.filtros.precioHasta != null) count++;
    if (this.filtros.requiereProduccion) count++;
    if (this.filtros.inventariable) count++;
    if (this.filtros.ultimaEdicion) count++;
    if (this.filtros.completitud) count++;
    if (this.filtros.categoria) count++;
    if (this.filtros.subcategoria) count++;
    if (this.filtros.exposicion) count++;
    if (this.filtros.tipoEntrega) count++;
    if (this.filtros.tiempoEntrega) count++;
    if (this.filtros.canal) count++;
    if (this.filtros.aceptaAdiciones) count++;
    if (this.filtros.aceptaCalendario) count++;
    if (this.filtros.permitePrecioManual) count++;
    return count;
  }

  removerChip(key: string): void {
    if (key === 'texto') this.filtros.texto = '';
    else if (key === 'estado') this.filtros.estado = '';
    else if (key === 'disponibilidad') this.filtros.disponibilidad = '';
    else if (key === 'tipoProducto') this.filtros.tipoProducto = '';
    else if (key === 'precioDesde') this.filtros.precioDesde = null;
    else if (key === 'precioHasta') this.filtros.precioHasta = null;
    else if (key === 'requiereProduccion') this.filtros.requiereProduccion = '';
    else if (key === 'inventariable') this.filtros.inventariable = '';
    else if (key === 'ultimaEdicion') this.filtros.ultimaEdicion = '';
    else if (key === 'completitud') this.filtros.completitud = '';
    else if (key === 'categoria') { this.filtros.categoria = ''; this.filtros.subcategoria = ''; this.subcategoriasList = []; }
    else if (key === 'subcategoria') this.filtros.subcategoria = '';
    else if (key === 'exposicion') this.filtros.exposicion = '';
    else if (key === 'tipoEntrega') this.filtros.tipoEntrega = '';
    else if (key === 'tiempoEntrega') this.filtros.tiempoEntrega = '';
    else if (key === 'canal') this.filtros.canal = '';
    else if (key === 'aceptaAdiciones') this.filtros.aceptaAdiciones = '';
    else if (key === 'aceptaCalendario') this.filtros.aceptaCalendario = '';
    else if (key === 'permitePrecioManual') this.filtros.permitePrecioManual = '';
    this.resetPaginacion();
    this.cargarConFiltros();
  }

  // ---- Completitud del producto ----
  getProductCompleteness(row: any): { score: number; level: 'red' | 'yellow' | 'green'; tooltip: string } {
    const checks = [
      { label: 'Título', ok: !!(row.crearProducto?.titulo?.trim()), weight: 2 },
      { label: 'Descripción', ok: !!(row.crearProducto?.descripcion?.trim()), weight: 2 },
      { label: 'Imagen', ok: (row.crearProducto?.imagenesPrincipales?.length || 0) > 0, weight: 2 },
      { label: 'Precio', ok: (row.precio?.precioUnitarioConIva || 0) > 0, weight: 2 },
      { label: 'Referencia', ok: !!(row.identificacion?.referencia?.trim()), weight: 2 },
      { label: 'Categoría', ok: !!(row.categorias?.label), weight: 1 },
      { label: 'Peso', ok: (row.dimensiones?.pesoUnitarioProductoKg || 0) > 0, weight: 1 },
      { label: 'Garantías', ok: !!(row.crearProducto?.garantiasProducto?.trim()), weight: 1 },
      { label: 'T. Entrega', ok: !!(row.disponibilidad?.tiempoEntrega), weight: 1 },
    ];

    const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
    const filledWeight = checks.filter(c => c.ok).reduce((s, c) => s + c.weight, 0);
    const score = Math.round((filledWeight / totalWeight) * 100);

    const missing = checks.filter(c => !c.ok).map(c => c.label);
    const tooltip = score === 100
      ? '✅ Producto completo'
      : `Faltan: ${missing.join(', ')}`;

    const level: 'red' | 'yellow' | 'green' = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';
    return { score, level, tooltip };
  }

  // ---- Método unificado de carga ----
  cargarConFiltros(): void {
    this.cargando = true;
    this.guardarFiltros();

    const texto = this.filtros.texto?.trim();
    if (texto && texto.length >= 2) {
      // Usar quick search indexado (búsqueda por campo vía searchBy).
      // Paginado real (page/pageSize) — antes topaba en 100 resultados y
      // fijaba totalPages=1, dejando el paginador inutilizable.
      this.service.quickSearchProducts(texto, this.pageSize, this.filtros.searchBy, this.currentPage)
        .subscribe({
          next: (response: any) => {
            let products: any[] = response.products || [];
            // Aplicar filtros adicionales activos en memoria (sobre la página recibida)
            if (this.filtros.estado === 'activo') {
              products = products.filter(p => p.exposicion?.activar === true);
            } else if (this.filtros.estado === 'inactivo') {
              products = products.filter(p => p.exposicion?.activar === false);
            }
            if (this.filtros.disponibilidad === 'disponible') {
              products = products.filter(p => p.exposicion?.disponible === true);
            } else if (this.filtros.disponibilidad === 'agotado') {
              products = products.filter(p => p.exposicion?.disponible === false);
            }
            if (this.filtros.tipoProducto) {
              products = products.filter(p => p.crearProducto?.tipoProducto === this.filtros.tipoProducto);
            }
            products = this.ordenarProductos(products);
            const normalized = this.normalizeProducts(products);
            this.temp = [...normalized];
            this.rows = normalized;
            this.totalItems = response.pagination?.totalItems ?? normalized.length;
            this.totalPages = response.pagination?.totalPages ?? 1;
            this.lastDocId = null;
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error en quick search:', err);
            this.cargando = false;
          }
        });
    } else {
      this.service.getProductsFiltered(this.filtros, this.pageSize, this.currentPage, this.lastDocId ?? undefined, this.sortField ?? undefined, this.sortOrder)
        .subscribe({
          next: (response: any) => {
            const normalized = this.normalizeProducts(response.products);
            this.temp = [...normalized];
            this.rows = normalized;
            this.totalItems = response.pagination.totalItems;
            this.totalPages = response.pagination.totalPages;
            this.lastDocId = response.pagination.lastDocId;
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error al cargar productos:', err);
            this.cargando = false;
          }
        });
    }
  }

  onFiltroChange(): void {
    this.filterSubject.next();
  }

  onCategoriaChange(): void {
    this.filtros.subcategoria = '';
    this.subcategoriasList = [];
    this.actualizarSubcategorias(this.filtros.categoria);
    this.filterSubject.next();
  }

  actualizarSubcategorias(categoriaLabel: string): void {
    const cat = this.categoriasList.find(c => c.label === categoriaLabel);
    this.subcategoriasList = cat ? cat.children.map(c => c.label).filter(Boolean) : [];
  }

  onSearchInput(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  onSearchCriteriaChange(): void {
    if (this.filtros.texto?.trim().length >= 2) {
      this.searchSubject.next(this.filtros.texto);
    }
    this.guardarFiltros();
  }

  limpiarTexto(): void {
    this.filtros.texto = '';
    this.resetPaginacion();
    this.cargarConFiltros();
  }

  onPrecioBlur(): void {
    this.resetPaginacion();
    this.cargarConFiltros();
  }

  // Alias — mantiene compatibilidad con llamadas desde eliminar, importar, duplicar, etc.
  cargarDatos() {
    this.cargarConFiltros();
  }

  // Cargar proveedores para filtro
  cargarProveedores() {
    this.loadingProveedores = true;
    this.proveedoresService.getProveedoresActivos().subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores || [];
        this.loadingProveedores = false;
      },
      error: (error) => {
        console.error('Error cargando proveedores:', error);
        this.loadingProveedores = false;
      }
    });
  }

  // Filtrar por proveedor
  onProveedorChange() {
    this.currentPage = 1;
    this.lastDocId = null;
    this.cargarDatosFiltrados();
  }

  // Filtrar solo productos dropshipping
  onToggleDropshipping() {
    this.currentPage = 1;
    this.lastDocId = null;
    this.selectedProveedor = null; // Limpiar filtro de proveedor
    this.cargarDatosFiltrados();
  }

  // Limpiar filtros — restaura al estado default (sin filtro de estado, muestra activos e inactivos)
  limpiarFiltros() {
    this.filtros = {
      texto: '',
      searchBy: 'referencia',
      estado: '',
      disponibilidad: '',
      tipoProducto: '',
      precioDesde: null,
      precioHasta: null,
      requiereProduccion: '',
      inventariable: '',
      ultimaEdicion: '',
      completitud: '',
      categoria: '',
      subcategoria: '',
      exposicion: '',
      tipoEntrega: '',
      tiempoEntrega: '',
      canal: '',
      aceptaAdiciones: '',
      aceptaCalendario: '',
      permitePrecioManual: '',
    };
    this.subcategoriasList = [];
    this.selectedProductos = [];
    this.selectedIds.clear();
    this.selectedProveedor = null;
    this.mostrarSoloDropshipping = false;
    this.resetPaginacion();
    this.cargarConFiltros();
  }

  // Cargar datos con filtros aplicados
  cargarDatosFiltrados() {
    this.cargando = true;
    
    if (this.selectedProveedor) {
      // Filtrar por proveedor específico
      this.service.getProductosByProveedor(this.selectedProveedor, this.pageSize, this.currentPage).subscribe((response: any) => {
        const normalized = this.normalizeProducts(response.products);
        this.temp = [...normalized];
        this.rows = normalized;
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
        this.cargando = false;
      }, error => {
        console.error("Error al cargar productos por proveedor:", error);
        this.cargando = false;
      });
    } else if (this.mostrarSoloDropshipping) {
      // Filtrar solo productos dropshipping
      this.service.getProductosDropshipping(this.pageSize, this.currentPage).subscribe((response: any) => {
        const normalized = this.normalizeProducts(response.products);
        this.temp = [...normalized];
        this.rows = normalized;
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
        this.cargando = false;
      }, error => {
        console.error("Error al cargar productos dropshipping:", error);
        this.cargando = false;
      });
    } else {
      // Sin filtros, cargar todos
      this.cargarDatos();
    }
  }

  // Cambiar página

  onPageChange(event: any) {
    const newPageSize = event.rows || this.pageSize;
    let newFirst = event.first ?? 0;
    let newCurrentPage = Math.floor(newFirst / newPageSize) + 1;
    const newSortField = event.sortField || null;
    const newSortOrder = event.sortOrder === -1 ? -1 : 1;

    const sortChanged = newSortField !== this.sortField || newSortOrder !== this.sortOrder;
    // Al reordenar se vuelve al principio: la página N del orden viejo no tiene
    // nada que ver con la página N del nuevo.
    if (sortChanged) { newCurrentPage = 1; newFirst = 0; }

    if (newPageSize !== this.pageSize || newCurrentPage !== this.currentPage || sortChanged) {
      this.pageSize = newPageSize;
      this.currentPage = newCurrentPage;
      this.first = newFirst;
      this.sortField = newSortField;
      this.sortOrder = newSortOrder;
      this.lastDocId = null;
      this.cargarConFiltros();
    }
  }



  crearProducto() {
    sessionStorage.removeItem('infoForms');
    this.router.navigateByUrl('productos/crearProductos');
  }

  editarProducto(row) {
    console.log(row);
    sessionStorage.setItem('infoForms', JSON.stringify(row));
    this.router.navigateByUrl('productos/crearProductos');
  }

  configurarDropshipping(row) {
    console.log(row);
    sessionStorage.setItem('infoForms', JSON.stringify(row));
    sessionStorage.setItem('openDropshippingTab', 'true');
    this.router.navigateByUrl('productos/crearProductos');
  }

  duplicarProducto(row) {
    console.log('Producto a duplicar:', row);
    
    // Mostrar confirmación antes de duplicar
    Swal.fire({
      title: '¿Duplicar Producto?',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Producto:</strong> ${row.crearProducto?.titulo || 'Sin título'}</p>
          <p><strong>Referencia actual:</strong> ${row.identificacion?.referencia || 'Sin referencia'}</p>
          <hr>
          <p style="color: #666; font-size: 14px;">
            Se creará una copia exacta del producto con una nueva referencia (formato <strong>${row.identificacion?.referencia || 'REF'}-COPIA-XXXXXX</strong>).<br>
            El sufijo final se genera al confirmar y se mostrará en el siguiente paso.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fa fa-copy"></i> Sí, duplicar',
      cancelButtonText: '<i class="fa fa-times"></i> Cancelar',
      focusCancel: true,
      customClass: {
        popup: 'swal-wide'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarDuplicacion(row);
      }
    });
  }

  private async ejecutarDuplicacion(row) {
    // Mostrar loading
    Swal.fire({
      title: 'Duplicando producto...',
      text: 'Creando el producto. Por favor espera.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const timestamp = new Date().getTime().toString().slice(-6);
    const productoDuplicado = this.utilsService.deepClone(row);

    // Quitar IDs para que el backend genere uno nuevo
    delete productoDuplicado.id;
    delete productoDuplicado._id;
    delete productoDuplicado.cd;
    delete productoDuplicado.date_edit;

    // Limpiar IDs de integraciones externas (Shopify, Fulfillment) — no deben heredarse
    if (productoDuplicado.integrations) {
      productoDuplicado.integrations = {};
    }

    // Limpiar stock — el duplicado parte en cero hasta que se configure
    if (productoDuplicado.disponibilidad) {
      productoDuplicado.disponibilidad.cantidadDisponible = 0;
      productoDuplicado.disponibilidad.cantidadDisponibleGlobal = 0;
    }

    // Duplicado queda INACTIVO por defecto hasta que el usuario lo revise y active
    if (productoDuplicado.exposicion) {
      productoDuplicado.exposicion.activar = false;
    }

    // Nueva referencia única
    if (productoDuplicado.identificacion?.referencia) {
      productoDuplicado.identificacion.referencia = `${productoDuplicado.identificacion.referencia}-COPIA-${timestamp}`;
    }

    // Título diferenciado
    if (productoDuplicado.crearProducto?.titulo) {
      productoDuplicado.crearProducto.titulo = `Copia de ${productoDuplicado.crearProducto.titulo}`;
    }

    // Código de barras único
    if (productoDuplicado.identificacion?.codigoBarras) {
      productoDuplicado.identificacion.codigoBarras = `${productoDuplicado.identificacion.codigoBarras}-${timestamp}`;
    }

    // Las imágenes referencian una URL de Storage única por producto: el duplicado
    // no puede heredarlas, debe quedar sin imágenes hasta que el usuario suba las suyas.
    if (productoDuplicado.crearProducto) {
      productoDuplicado.crearProducto.imagenesPrincipales = [];
      productoDuplicado.crearProducto.imagenesSecundarias = [];
    }

    this.service.createProduct(productoDuplicado).subscribe({
      next: (response: any) => {
        Swal.close();
        this.cargarDatos();

        // El backend responde el producto guardado directamente (res.send(product)),
        // no envuelto en .product/.data — hay que usar `response` tal cual para
        // reflejar el cd y la referencia REALES (el backend puede renombrar la
        // referencia si detecta colisión, ver controllers/productos.js).
        const productoGuardado = response?.cd ? response : productoDuplicado;
        this.toastr.success(
          `"${productoGuardado.crearProducto?.titulo}" creado como inactivo`,
          'Producto duplicado',
          { timeOut: 5000 }
        );

        Swal.fire({
          title: '¡Producto duplicado!',
          html: `
            <div style="text-align:left; margin: 16px 0;">
              <p><strong>Nuevo título:</strong> ${productoGuardado.crearProducto?.titulo}</p>
              <p><strong>Nueva referencia:</strong> <span style="color:#28a745; font-weight:bold;">${productoGuardado.identificacion?.referencia}</span></p>
              <p class="text-warning"><i class="fa fa-info-circle"></i> El producto quedó <strong>inactivo</strong>. Actívalo después de revisarlo.</p>
              <p class="text-warning"><i class="fa fa-info-circle"></i> El duplicado no incluye imágenes. Súbelas de nuevo antes de activarlo.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Perfecto',
          showCancelButton: true,
          cancelButtonText: 'Editar ahora',
          confirmButtonColor: '#28a745',
          cancelButtonColor: '#007bff'
        }).then((result) => {
          if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            sessionStorage.setItem('infoForms', JSON.stringify(productoGuardado));
            this.router.navigateByUrl('productos/crearProductos');
          }
        });
      },
      error: (error) => {
        // El backend puede retornar error aunque el producto SÍ fue creado
        // (fallo en proceso posterior como sync de integraciones).
        // Estrategia: buscar el producto por la nueva referencia para confirmar.
        Swal.close();

        const nuevaReferencia = productoDuplicado.identificacion?.referencia;
        this.service.getProductsFiltered({ texto: nuevaReferencia || '', estado: '' }, 5, 1).subscribe({
          next: (r: any) => {
            const productos = r?.products || [];
            const encontrado = productos.find((p: any) => p.identificacion?.referencia === nuevaReferencia);

            if (encontrado) {
              // El producto SÍ fue creado a pesar del error (fallo post-proceso)
              this.cargarDatos();
              this.toastr.success(
                `"${productoDuplicado.crearProducto?.titulo}" creado como inactivo`,
                'Producto duplicado',
                { timeOut: 5000 }
              );
              Swal.fire({
                title: '¡Producto duplicado!',
                html: `<div style="text-align:left; margin: 16px 0;">
                  <p><strong>Nuevo título:</strong> ${productoDuplicado.crearProducto?.titulo}</p>
                  <p><strong>Nueva referencia:</strong> <span style="color:#28a745; font-weight:bold;">${nuevaReferencia}</span></p>
                  <p class="text-warning"><i class="fa fa-info-circle"></i> El producto quedó <strong>inactivo</strong>. Actívalo después de revisarlo.</p>
                </div>`,
                icon: 'success',
                confirmButtonText: 'Perfecto',
                showCancelButton: true,
                cancelButtonText: 'Editar ahora',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#007bff'
              }).then((result) => {
                if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                  sessionStorage.setItem('infoForms', JSON.stringify(encontrado));
                  this.router.navigateByUrl('productos/crearProductos');
                }
              });
            } else {
              // El producto NO fue creado — error real
              this.cargarDatos();
              const errorMsg = error?.error?.msg || error?.error?.message || error?.message || 'Error desconocido';
              Swal.fire({
                title: 'Error al duplicar',
                html: `<div style="text-align:left; margin:16px 0;">
                  <p><i class="fa fa-exclamation-triangle" style="color:#dc3545;"></i> Ocurrió un error durante la duplicación.</p>
                  <p><strong>Detalle:</strong> ${errorMsg}</p>
                </div>`,
                icon: 'error',
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#dc3545'
              });
            }
          },
          error: () => {
            // No se pudo verificar — aviso genérico
            this.cargarDatos();
            Swal.fire({
              title: 'Verifica el listado',
              text: 'Hubo un error en la duplicación. Es posible que el producto sí haya sido creado. Revisa el listado antes de intentar nuevamente.',
              icon: 'warning',
              confirmButtonText: 'Ver listado',
              confirmButtonColor: '#f59e0b'
            });
          }
        });
      }
    });
  }

  // Mantenido por compatibilidad con el HTML — delega al nuevo sistema
  updateFilter(event: any) {
    this.onSearchInput(event);
  }

  toggleEstado(row: any): void {
    const nuevoEstado = !row.exposicion?.activar;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    Swal.fire({
      title: `¿${nuevoEstado ? 'Activar' : 'Desactivar'} producto?`,
      text: `"${row.crearProducto?.titulo}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nuevoEstado ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevoEstado ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Optimistic update
      const valorAnterior = row.exposicion?.activar;
      if (row.exposicion) row.exposicion.activar = nuevoEstado;
      row._guardandoEstado = true;

      const productoActualizado = { ...row };
      this.service.createProduct(productoActualizado).subscribe({
        next: () => {
          row._guardandoEstado = false;
          this.toastr.success(
            `Producto ${nuevoEstado ? 'activado' : 'desactivado'}`,
            row.crearProducto?.titulo,
            { timeOut: 3000 }
          );
        },
        error: () => {
          // Revertir
          if (row.exposicion) row.exposicion.activar = valorAnterior;
          row._guardandoEstado = false;
          this.toastr.error('No se pudo cambiar el estado', 'Error');
        }
      });
    });
  }

  toggleDisponibilidad(row: any): void {
    const nuevaDisp = !row.exposicion?.disponible;

    Swal.fire({
      title: `¿Marcar como ${nuevaDisp ? 'Disponible' : 'Agotado'}?`,
      text: `"${row.crearProducto?.titulo}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nuevaDisp ? 'Sí, disponible' : 'Sí, agotado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevaDisp ? '#17a2b8' : '#6c757d',
      cancelButtonColor: '#6c757d'
    }).then(result => {
      if (!result.isConfirmed) return;

      const valorAnterior = row.exposicion?.disponible;
      if (row.exposicion) row.exposicion.disponible = nuevaDisp;
      row._guardandoDisp = true;

      const productoActualizado = { ...row };
      this.service.createProduct(productoActualizado).subscribe({
        next: () => {
          row._guardandoDisp = false;
          this.toastr.success(
            `Marcado como ${nuevaDisp ? 'disponible' : 'agotado'}`,
            row.crearProducto?.titulo,
            { timeOut: 3000 }
          );
        },
        error: () => {
          if (row.exposicion) row.exposicion.disponible = valorAnterior;
          row._guardandoDisp = false;
          this.toastr.error('No se pudo cambiar la disponibilidad', 'Error');
        }
      });
    });
  }

  // ---- Selección múltiple ----
  private rowId(row: any): string {
    return row.cd || row.id || row._id || '';
  }

  get allPageSelected(): boolean {
    return this.rows.length > 0 && this.rows.every(r => this.selectedIds.has(this.rowId(r)));
  }

  isSelected(row: any): boolean {
    return this.selectedIds.has(this.rowId(row));
  }

  toggleSelectAll(): void {
    if (this.allPageSelected) {
      this.rows.forEach(r => this.selectedIds.delete(this.rowId(r)));
      this.selectedProductos = this.selectedProductos.filter(p => !this.rows.some(r => this.rowId(r) === this.rowId(p)));
    } else {
      this.rows.forEach(r => {
        const id = this.rowId(r);
        if (!this.selectedIds.has(id)) {
          this.selectedIds.add(id);
          this.selectedProductos = [...this.selectedProductos, r];
        }
      });
    }
  }

  toggleSelectRow(row: any): void {
    const id = this.rowId(row);
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      this.selectedProductos = this.selectedProductos.filter(p => this.rowId(p) !== id);
    } else {
      this.selectedIds.add(id);
      this.selectedProductos = [...this.selectedProductos, row];
    }
  }

  async accionMasiva(accion: 'activar' | 'desactivar' | 'disponible' | 'agotado' | 'eliminar'): Promise<void> {
    const n = this.selectedProductos.length;
    if (n === 0) return;

    if (accion === 'eliminar') {
      const confirmed = await Swal.fire({
        title: `¿Eliminar ${n} producto${n !== 1 ? 's' : ''}?`,
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Eliminar ${n} producto${n !== 1 ? 's' : ''}`,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      });
      if (!confirmed.isConfirmed) return;
    }

    this.ejecutandoAccionMasiva = true;
    const ids = this.selectedProductos.map(p => this.rowId(p)).filter(Boolean);

    try {
      const resultado: any = await this.service.bulkPatchProductos(ids, accion).toPromise();

      // Actualizar filas en memoria sin recargar (excepto eliminar)
      if (accion !== 'eliminar') {
        this.rows = this.rows.map(r => {
          if (!this.selectedIds.has(this.rowId(r))) return r;
          const exp = { ...(r.exposicion || {}) };
          if (accion === 'activar')    exp.activar    = true;
          if (accion === 'desactivar') exp.activar    = false;
          if (accion === 'disponible') exp.disponible = true;
          if (accion === 'agotado')    exp.disponible = false;
          return { ...r, exposicion: exp };
        });
        this.temp = [...this.rows];
      }

      // Limpiar selección
      this.selectedProductos = [];
      this.selectedIds.clear();

      if (accion === 'eliminar') this.cargarConFiltros();

      const procesados = resultado?.procesados ?? ids.length;
      const omitidos   = resultado?.omitidos   ?? 0;
      const msgOmit    = omitidos > 0 ? ` (${omitidos} con stock no eliminados)` : '';
      this.toastr.success(
        `${procesados} producto${procesados !== 1 ? 's' : ''} ${accion === 'eliminar' ? 'eliminado' : 'actualizado'}${procesados !== 1 ? 's' : ''}${msgOmit}`,
        'Listo', { timeOut: 4000 }
      );
    } catch (err: any) {
      const msg = err?.error?.message || 'Error al aplicar la acción';
      this.toastr.error(msg, 'Error');
    } finally {
      this.ejecutandoAccionMasiva = false;
    }
  }

  viewProduct(row) {
    const config: NgbModalOptions = {
      backdrop: true,
      size: 'lg',
      keyboard: true,
      centered: true,
      animation: true,
      scrollable: true,
      windowClass: 'product-preview-modal'
    }
    const modalRef = this.modalService.open(ProductDetailsComponent, config);
    modalRef.componentInstance.producto = row;
    modalRef.componentInstance.isView = true;
    modalRef.result.then((result) => {
      if (result === 'edit') {
        this.editarProducto(row);
      }
    }, () => {});
  }

  eliminarProducto(row) {
    const generalContext = this;
    Swal.fire({
      title: '¿Está seguro de eliminar el producto?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        if (Array.isArray(row.crearProducto.imagenesPrincipales) && row.crearProducto.imagenesPrincipales?.length > 0) {
          // this.imageService.eliminarImagen(row.crearProducto.imagenesPrincipales[0].path);
        }
        this.service.deleteProducto(row).subscribe({
          next(value: any) {
            generalContext.cargarDatos();
            Swal.fire({
              title: 'Producto eliminado',
              text: 'El producto se ha eliminado correctamente',
              icon: 'success'
            });
          },
          error(err: any) {
            Swal.fire({
              title: 'Error',
              text: 'No se ha podido eliminar el producto',
              icon: 'error'
            });
          }
        })
      }
    });
  }

  exportToExcel() {
    this.showExportDialog = true;
  }

  doExport(): void {
    const cols = this.exportColumnas.filter(c => c.selected);
    if (!cols.length) {
      this.toastr.warning('Selecciona al menos una columna para exportar.', 'Exportar');
      return;
    }

    // Caso 1: hay productos seleccionados → exportar solo esos (ya están en memoria).
    if (this.selectedProductos?.length > 0) {
      this.generarExcelExport(this.selectedProductos, cols, true);
      return;
    }

    // Caso 2: exportar TODOS los productos que cumplen los filtros actuales.
    // OJO: this.rows es solo la página visible (paginación server-side). Hay que
    // traer todas las páginas antes de exportar, si no solo sale la primera "hoja".
    this.exportando = true;
    this.exportProgress = 0;
    this.exportTotal = this.totalItems || 0;
    this.fetchAllProductosParaExport()
      .then(todos => {
        this.exportando = false;
        if (!todos.length) {
          this.toastr.warning('No hay productos para exportar.', 'Exportar');
          return;
        }
        // Fuera del `.catch` de abajo: un fallo armando el .xlsx no es un fallo
        // trayendo los productos, y reportarlo como tal manda a buscar el
        // problema al lado equivocado (pasó con el límite de 32.767 caracteres
        // de Excel: decía "no se pudieron traer los productos" con las 2.134
        // páginas ya descargadas y en memoria).
        try {
          this.generarExcelExport(todos, cols, false);
        } catch (e: any) {
          console.error('[Export] Error generando el archivo:', e);
          this.toastr.error(
            `No se pudo generar el archivo: ${e?.message || 'error desconocido'}`,
            'Exportar',
          );
        }
      })
      .catch(err => {
        this.exportando = false;
        console.error('[Export] Error trayendo todos los productos:', err);
        this.toastr.error('No se pudieron traer todos los productos. Intenta de nuevo.', 'Exportar');
      });
  }

  /**
   * Trae TODAS las páginas que cumplen los filtros actuales.
   * El backend capa pageSize a 100, así que paginamos; las páginas son
   * independientes (offset), por eso las pedimos en paralelo (batches de 6)
   * para que sea rápido aun con miles de productos.
   */
  private async fetchAllProductosParaExport(): Promise<any[]> {
    const PAGE = 100;        // máx que acepta el backend
    const CONCURRENCY = 6;   // requests en paralelo por batch

    // Página 1: nos da el total de páginas e items reales (con los filtros).
    const first: any = await this.service.getProductsFiltered(this.filtros, PAGE, 1).toPromise();
    const all: any[] = [...(first?.products || [])];
    const totalPages = Math.max(1, first?.pagination?.totalPages || 1);
    this.exportTotal = first?.pagination?.totalItems || all.length;
    this.exportProgress = all.length;

    for (let start = 2; start <= totalPages; start += CONCURRENCY) {
      const batch: Promise<any>[] = [];
      for (let p = start; p < start + CONCURRENCY && p <= totalPages; p++) {
        batch.push(this.service.getProductsFiltered(this.filtros, PAGE, p).toPromise());
      }
      const results = await Promise.all(batch);
      for (const r of results) all.push(...((r as any)?.products || []));
      this.exportProgress = all.length;
    }

    return this.normalizeProducts(all);
  }

  /**
   * Tope de caracteres por celda de Excel. No es un límite de la librería: es
   * del formato. Pasarse hace que `json_to_sheet` lance
   * "Text length must not exceed 32767 characters" y se cae TODO el export.
   */
  private static readonly EXCEL_MAX_CELDA = 32767;

  /**
   * Recorta un valor al tope de Excel.
   *
   * Pasa con descripciones que traen HTML del editor enriquecido, a veces con
   * imágenes embebidas en base64: una sola descripción se come el límite. Antes
   * eso reventaba la exportación completa del catálogo y el usuario no tenía
   * forma de saber cuál producto la causaba.
   */
  private recortarParaExcel(valor: any): any {
    if (typeof valor !== 'string' || valor.length <= ProductosComponent.EXCEL_MAX_CELDA) {
      return valor;
    }
    const aviso = '… [texto recortado por exceder el límite de Excel]';
    return valor.slice(0, ProductosComponent.EXCEL_MAX_CELDA - aviso.length) + aviso;
  }

  /** Arma y descarga el .xlsx con las columnas elegidas. */
  private generarExcelExport(source: any[], cols: any[], hasSelected: boolean): void {
    let celdasRecortadas = 0;
    const productosRecortados = new Set<string>();

    const data = source.map(row => {
      const obj: any = {};
      cols.forEach(col => {
        const original = col.getValue(row);
        const recortado = this.recortarParaExcel(original);
        if (recortado !== original) {
          celdasRecortadas++;
          productosRecortados.add(row.identificacion?.referencia || row.cd || '¿?');
        }
        obj[col.label] = recortado;
      });
      return obj;
    });

    if (celdasRecortadas > 0) {
      const refs = [...productosRecortados];
      console.warn('[Export] Celdas recortadas por el límite de Excel en:', refs);
      this.toastr.warning(
        `${celdasRecortadas} ${celdasRecortadas === 1 ? 'celda superaba' : 'celdas superaban'} el máximo que admite Excel y se recortaron ` +
        `(${refs.slice(0, 3).join(', ')}${refs.length > 3 ? ` y ${refs.length - 3} más` : ''}). ` +
        'El archivo se descargó igual. No reimportes estas filas: guardarían el texto recortado.',
        'Exportar',
        { timeOut: 12000 },
      );
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    const hasFilters = Object.values(this.filtros).some(v => v !== '' && v !== null && v !== 'activo');
    const suffix = hasSelected
      ? `_seleccionados(${source.length})`
      : hasFilters ? `_filtrados(${source.length})` : `_todos(${source.length})`;
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `productos${suffix}_${date}.xlsx`);
    this.showExportDialog = false;
  }

  selectAllExportColumns(selected: boolean): void {
    this.exportColumnas.forEach(c => c.selected = selected);
  }

  /**
   * Columnas desmarcadas. Alimenta el aviso del diálogo de exportar, que solo
   * tiene sentido cuando el archivo sale incompleto: reimportar un export
   * parcial pisa los campos ausentes.
   */
  get columnasSinMarcar(): number {
    return this.exportColumnas.filter(c => !c.selected).length;
  }

  trackById(index: number, item: any): any {
    return item?.key || index;
  }

  // ============== MÉTODOS DE IMPORTACIÓN ==============

  openImportModal(): void {
    this.showImportModal = true;
  }

  /**
   * Descarga la plantilla de ejemplo SIN abrir el importador.
   *
   * Delega en el modal a propósito: la definición de columnas vive en un solo
   * lugar (`import-modal.component.ts` → `productConfig.templateColumns`), así
   * que la plantilla nunca se desincroniza de lo que el importador espera.
   * Funciona con el modal cerrado porque su `config` se arma en el `ngOnInit`
   * del componente, y el componente está siempre presente en el template.
   */
  descargarPlantillaProductos(): void {
    if (typeof this.importModal?.downloadTemplate !== 'function') {
      this.toastr.error(
        'No se pudo generar la plantilla. Recarga la página e intenta de nuevo.',
        'Plantilla',
      );
      return;
    }
    this.importModal.downloadTemplate();
  }

  onImportComplete(result: ImportResult): void {
    this.showImportModal = false;
    if (result.success > 0) {
      Swal.fire({
        title: 'Importación Exitosa',
        text: `${result.success} productos importados correctamente`,
        icon: 'success'
      });
      // Recargar lista de productos
      this.cargarDatos();
    }
    if (result.failed > 0) {
      Swal.fire({
        title: 'Importación con errores',
        text: `${result.failed} productos no pudieron ser importados`,
        icon: 'warning'
      });
    }
  }

  // ============== MÉTODOS DE FULFILLMENT ==============

  /**
   * Una sola llamada a getIntegrations() para detectar fulfillment y Osmosis.
   */
  checkIntegrationsConfig(): void {
    this.integrationsService.getIntegrations().subscribe({
      next: (integrations) => {
        const fulfillmentIntegration = integrations.find(i =>
          i.enabled && (i.provider === 'aliaddo' || i.type === 'aliaddo' ||
                        i.provider === 'aliaddo_fulfillment' || i.type === 'aliaddo_fulfillment')
        );
        if (fulfillmentIntegration) {
          this.fulfillmentEnabled = true;
          this.fulfillmentProvider = fulfillmentIntegration.provider || fulfillmentIntegration.type;
          this.fulfillmentProviderName = this.fulfillmentService.getProviderDisplayName(this.fulfillmentProvider);
        } else {
          this.fulfillmentEnabled = false;
        }

        const osmosisIntegration = integrations.find(i =>
          i.enabled && (i.provider === 'osmosis' || i.type === 'osmosis' || i.id === 'osmosis')
        );
        this.osmosisEnabled = !!osmosisIntegration;
      },
      error: (err) => {
        console.error('[Productos] Error cargando integraciones:', err);
        this.fulfillmentEnabled = false;
        this.osmosisEnabled = false;
      }
    });
  }

  /**
   * Importa productos desde el fulfillment
   */
  importarProductosFulfillment(): void {
    if (!this.fulfillmentEnabled || !this.fulfillmentProvider) {
      this.toastr.warning('No hay proveedor de fulfillment configurado', 'Advertencia');
      return;
    }

    Swal.fire({
      title: `Importar desde ${this.fulfillmentProviderName}`,
      html: `<p>¿Cómo desea importar los productos?</p>`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="pi pi-cloud-download"></i> Importar todos',
      denyButtonText: '<i class="pi pi-search"></i> Por referencia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6',
      denyButtonColor: '#00e5cc'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarImportacionFulfillment();
      } else if (result.isDenied) {
        this.importarPorReferencia();
      }
    });
  }

  /**
   * Pide la referencia/código al usuario y ejecuta la importación filtrada
   */
  private importarPorReferencia(): void {
    Swal.fire({
      title: `Importar por referencia`,
      html: `<p>Ingrese el código o referencia del producto en ${this.fulfillmentProviderName}:</p>`,
      input: 'text',
      inputPlaceholder: 'Ej: JCR4021',
      showCancelButton: true,
      confirmButtonText: 'Importar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Debe ingresar un código o referencia';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarImportacionFulfillment(result.value.trim());
      }
    });
  }

  /**
   * Ejecuta la importación de productos desde fulfillment
   * @param filterBySku Si se proporciona, solo importa el producto con ese código
   */
  private ejecutarImportacionFulfillment(filterBySku?: string): void {
    this.importandoProductosFulfillment = true;

    const loadingText = filterBySku
      ? `Buscando producto "${filterBySku}" en ${this.fulfillmentProviderName}...`
      : `Importando todos los productos desde ${this.fulfillmentProviderName}...`;

    Swal.fire({
      title: 'Importando productos...',
      text: loadingText,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    const options: any = { fetchStockPerWarehouse: true };
    if (filterBySku) {
      options.filterBySku = filterBySku;
    }

    this.fulfillmentService.importProductsFromFulfillment(this.fulfillmentProvider, options)
      .subscribe({
        next: (res) => {
          this.importandoProductosFulfillment = false;
          if (res.success) {
            this.cargarDatos();
            const data = res.data || res;
            const inventoryInfo = data.inventoryByWarehouse;

            let inventoryHtml = '';
            if (inventoryInfo && inventoryInfo.totalBodegas > 0) {
              inventoryHtml = `<hr><p><strong>Inventario por bodega:</strong></p>
                               <p><i class="fa fa-warehouse"></i> ${inventoryInfo.creados} bodegas con stock</p>
                               ${inventoryInfo.sinMapeo > 0 ? `<p class="text-warning"><i class="fa fa-exclamation-triangle"></i> ${inventoryInfo.sinMapeo} bodegas sin mapear</p>` : ''}`;
            }

            const title = filterBySku
              ? (data.created > 0 ? 'Producto Importado' : 'Producto no encontrado')
              : 'Importación Completada';

            Swal.fire({
              title,
              html: `<p><strong>${data.created || 0}</strong> productos creados</p>
                     <p><strong>${data.skipped || 0}</strong> productos omitidos</p>
                     ${(data.errors || 0) > 0 ? `<p class="text-danger"><strong>${data.errors}</strong> errores</p>` : ''}
                     ${inventoryHtml}
                     ${data.message ? `<p class="text-muted mt-2"><small>${data.message}</small></p>` : ''}`,
              icon: (data.created || 0) > 0 ? 'success' : ((data.errors || 0) > 0 ? 'warning' : 'info')
            });
          } else {
            Swal.fire('Error', res.error || 'Error al importar productos', 'error');
          }
        },
        error: (error) => {
          this.importandoProductosFulfillment = false;
          console.error('Error importando productos:', error);
          Swal.fire('Error', `Error al importar productos desde ${this.fulfillmentProviderName}`, 'error');
        }
      });
  }

  // ============================================================
  // OSMOSIS
  // ============================================================

  /**
   * Importa el catálogo completo desde Osmosis/Guiacereza.
   */
  importarProductosOsmosis(): void {
    if (!this.osmosisEnabled) {
      this.toastr.warning('No hay integración Osmosis configurada', 'Advertencia');
      return;
    }

    Swal.fire({
      title: 'Importar desde Guiacereza (Osmosis)',
      html: '<p>Se importará el catálogo completo de productos desde Osmosis. Los productos existentes se actualizarán.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="pi pi-cloud-download"></i> Importar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.importandoProductosOsmosis = true;

      Swal.fire({
        title: 'Importando productos...',
        text: 'Sincronizando catálogo desde Osmosis/Guiacereza...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });

      this.fulfillmentService.importProductsFromOsmosis().subscribe({
        next: (res) => {
          this.importandoProductosOsmosis = false;
          if (res.success) {
            this.cargarDatos();
            const data = res.data || res;
            Swal.fire({
              title: 'Importación completada',
              html: `<p><strong>${data.created || data.imported || 0}</strong> productos creados</p>
                     <p><strong>${data.updated || data.skipped || 0}</strong> productos actualizados/omitidos</p>
                     ${(data.errors || 0) > 0 ? `<p class="text-danger"><strong>${data.errors}</strong> errores</p>` : ''}
                     ${data.message ? `<p class="text-muted mt-2"><small>${data.message}</small></p>` : ''}`,
              icon: (data.created || data.imported || 0) > 0 ? 'success' : 'info'
            });
          } else {
            Swal.fire('Error', res.error || 'Error al importar productos desde Osmosis', 'error');
          }
        },
        error: () => {
          this.importandoProductosOsmosis = false;
          Swal.fire('Error', 'Error al importar productos desde Osmosis/Guiacereza', 'error');
        }
      });
    });
  }

  /**
   * Convierte cualquier formato de fecha a Date para el pipe
   * Maneja: Firestore Timestamp, string ISO, Date, número (epoch)
   */
  toDate(value: any): Date | null {
    if (!value) return null;

    // Si es un Firestore Timestamp (tiene seconds y nanoseconds)
    if (value && typeof value === 'object' && 'seconds' in value) {
      return new Date(value.seconds * 1000);
    }

    // Si es un Firestore Timestamp con toDate()
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }

    // Si ya es un Date
    if (value instanceof Date) {
      return value;
    }

    // Si es un string o número, intentar parsear
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // ============== MÉTODOS ADMINISTRATIVOS ==============

  /**
   * True si el rol de la sesión pertenece a la familia Administrador.
   * Mismo criterio que `requireRole` en el backend: se normaliza (sin tildes,
   * minúsculas) y se busca "administrador" como palabra, así entran tanto
   * "Administrador" como "Super Administrador".
   */
  private esRolAdministrador(): boolean {
    try {
      const userString = localStorage.getItem('user');
      if (!userString) { return false; }

      const rol = JSON.parse(userString)?.rol;
      const normalizado = String(rol || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

      return /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(normalizado);
    } catch {
      // Sesión ilegible: se niega. Es una acción irreversible, falla cerrada.
      return false;
    }
  }

  /**
   * Elimina FÍSICAMENTE todos los productos del comercio actual
   * ⚠️ OPERACIÓN DESTRUCTIVA - USO ADMINISTRATIVO/DESARROLLO
   */
  limpiarProductosComercio(): void {
    // El botón ya está oculto para no-admins; esto cubre el caso de llegar acá
    // por otra vía (atajo, estado viejo del componente).
    if (!this.esRolAdministrador()) {
      Swal.fire(
        'Acción no permitida',
        'Solo un Administrador puede eliminar la base de datos de productos.',
        'warning',
      );
      return;
    }

    const companyName = this.empresaActual?.nomComercial;

    if (!companyName) {
      Swal.fire('Error', 'No se pudo obtener el nombre del comercio', 'error');
      return;
    }

    Swal.fire({
      title: '⚠️ Eliminación Masiva de Productos',
      html: `
        <div class="text-start">
          <p class="text-danger fw-bold">Esta acción eliminará FÍSICAMENTE todos los productos del comercio:</p>
          <p class="text-primary fw-bold fs-5">"${companyName}"</p>
          <hr>
          <p class="text-muted">Total de productos a eliminar: <strong>${this.totalItems}</strong></p>
          <p class="text-danger"><i class="fa fa-exclamation-triangle"></i> Esta acción NO se puede deshacer.</p>
          <p>Uso recomendado solo para:</p>
          <ul class="text-start">
            <li>Entornos de desarrollo</li>
            <li>Limpieza de datos de prueba</li>
            <li>Reinicio completo del catálogo</li>
          </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '⚠️ Continuar',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Confirmación Final',
          html: `
            <p>Para confirmar, escriba el nombre del comercio:</p>
            <p class="fw-bold text-primary">"${companyName}"</p>
          `,
          input: 'text',
          inputPlaceholder: 'Escriba el nombre del comercio',
          inputAttributes: {
            autocapitalize: 'off'
          },
          showCancelButton: true,
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          confirmButtonText: '🗑️ Eliminar TODO',
          cancelButtonText: 'Cancelar',
          focusCancel: true,
          inputValidator: (value) => {
            if (!value) {
              return 'Debe escribir el nombre del comercio';
            }
            if (value !== companyName) {
              return 'El nombre no coincide. Intente de nuevo.';
            }
            return null;
          }
        }).then((confirmResult) => {
          if (confirmResult.isConfirmed && confirmResult.value === companyName) {
            this.ejecutarLimpiezaProductos(companyName);
          }
        });
      }
    });
  }

  private ejecutarLimpiezaProductos(companyName: string): void {
    Swal.fire({
      title: 'Eliminando productos...',
      html: 'Por favor espere. Esta operación puede tomar varios minutos dependiendo de la cantidad de productos.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    this.service.deleteAllProductsByCompany(companyName).subscribe({
      next: (response: any) => {
        if (response.success) {
          Swal.fire({
            title: '✅ Limpieza Completada',
            html: `
              <div class="text-start">
                <p><strong>${response.deletedCount}</strong> productos eliminados físicamente.</p>
                <p class="text-muted">Comercio: ${response.company}</p>
                <p class="text-muted small">Timestamp: ${response.timestamp}</p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'Entendido'
          });
          this.cargarDatos();
        } else {
          Swal.fire('Error', response.error || 'Error desconocido', 'error');
        }
      },
      error: (error: any) => {
        console.error('Error eliminando productos:', error);
        Swal.fire({
          title: 'Error',
          html: `
            <p>No se pudieron eliminar los productos.</p>
            <p class="text-danger">${error.error?.error || error.message || 'Error desconocido'}</p>
          `,
          icon: 'error'
        });
      }
    });
  }
}
