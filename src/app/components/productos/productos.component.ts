import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ProductDetailsComponent } from './product-details/product-details.component';
import Swal from 'sweetalert2';
import { ImagenService } from '../../shared/utils/image.service';
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
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { parse as flatedParse } from 'flatted';

const FILTROS_SESSION_KEY = 'productos_filtros';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss']
})
export class ProductosComponent implements OnInit, OnDestroy {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp: any[] = [];

  // Paginación
  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  lastDocId: string | null = null;

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

  // ---- Sistema de Filtros ----
  filtros = {
    texto: '',
    searchBy: 'referencia',
    estado: 'activo',
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
      (this.filtros.estado && this.filtros.estado !== 'activo') ||
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
  exportColumnas = [
    { label: 'Referencia',         key: 'referencia',         selected: true,  getValue: (r: any) => r.identificacion?.referencia || '' },
    { label: 'Título',             key: 'titulo',             selected: true,  getValue: (r: any) => r.crearProducto?.titulo || '' },
    { label: 'Descripción',        key: 'descripcion',        selected: false, getValue: (r: any) => r.crearProducto?.descripcion || '' },
    { label: 'Categoría',          key: 'categoria',          selected: true,  getValue: (r: any) => r.categorias?.label || '' },
    { label: 'Precio con IVA',     key: 'precioConIva',       selected: true,  getValue: (r: any) => r.precio?.precioUnitarioConIva || 0 },
    { label: 'Precio sin IVA',     key: 'precioSinIva',       selected: false, getValue: (r: any) => r.precio?.precioUnitarioSinIva || 0 },
    { label: '% IVA',              key: 'porcentajeIva',      selected: false, getValue: (r: any) => r.precio?.precioUnitarioIva || '0' },
    { label: 'Stock disponible',   key: 'stock',              selected: true,  getValue: (r: any) => r.disponibilidad?.cantidadDisponible ?? 0 },
    { label: 'Estado',             key: 'estado',             selected: true,  getValue: (r: any) => r.disponibilidad?.activar ? 'Activo' : 'Inactivo' },
    { label: 'Marca',              key: 'marca',              selected: false, getValue: (r: any) => r.identificacion?.marca || '' },
    { label: 'Inventariable',      key: 'inventariable',      selected: false, getValue: (r: any) => r.disponibilidad?.inventariable ? 'Sí' : 'No' },
    { label: 'Requiere Producción',key: 'requiereProduccion', selected: false, getValue: (r: any) => r.procesoComercial?.requiereProduccion ? 'Sí' : 'No' },
    { label: 'Tiempo de Entrega',  key: 'tiempoEntrega',      selected: false, getValue: (r: any) => r.disponibilidad?.tiempoEntrega || '' },
    { label: 'Peso (kg)',          key: 'peso',               selected: false, getValue: (r: any) => r.dimensiones?.pesoUnitarioProductoKg || '' },
    { label: 'Tags',               key: 'tags',               selected: false, getValue: (r: any) => (r.crearProducto?.etiquetas || []).join(', ') },
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
        if (trimmed && trimmed.length >= 2) {
          return this.service.quickSearchProducts(trimmed, 100, this.filtros.searchBy);
        }
        return this.service.getProductsFiltered(this.filtros, this.pageSize, this.currentPage);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        if (response?.products && !response?.pagination) {
          // Respuesta de quickSearch
          let products: any[] = response.products || [];
          if (this.filtros.estado === 'activo') products = products.filter(p => p.exposicion?.activar === true);
          else if (this.filtros.estado === 'inactivo') products = products.filter(p => p.exposicion?.activar === false);
          if (this.filtros.disponibilidad === 'disponible') products = products.filter(p => p.exposicion?.disponible === true);
          else if (this.filtros.disponibilidad === 'agotado') products = products.filter(p => p.exposicion?.disponible === false);
          if (this.filtros.tipoProducto) products = products.filter(p => p.crearProducto?.tipoProducto === this.filtros.tipoProducto);
          const normalized = this.normalizeProducts(products);
          this.temp = [...normalized];
          this.rows = normalized;
          this.totalItems = normalized.length;
          this.totalPages = 1;
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
      },
      error: (err) => {
        console.error('Error en búsqueda:', err);
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
        return this.service.getProductsFiltered(this.filtros, this.pageSize, this.currentPage);
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
      },
      error: (err) => {
        console.error('Error al aplicar filtros:', err);
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
    if (this.filtros.requiereProduccion) chips.push({ label: `Producción: ${this.filtros.requiereProduccion === 'si' ? 'Sí' : 'No'}`, key: 'requiereProduccion' });
    if (this.filtros.inventariable) chips.push({ label: `Inventariable: ${this.filtros.inventariable === 'si' ? 'Sí' : 'No'}`, key: 'inventariable' });
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
      // Usar quick search indexado (prefix search por referencia + título)
      // Evita el limit(500) in-memory que perdía productos como ALM-804
      this.service.quickSearchProducts(texto, 100, this.filtros.searchBy)
        .subscribe({
          next: (response: any) => {
            let products: any[] = response.products || [];
            // Aplicar filtros adicionales activos en memoria
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
            const normalized = this.normalizeProducts(products);
            this.temp = [...normalized];
            this.rows = normalized;
            this.totalItems = normalized.length;
            this.totalPages = 1;
            this.lastDocId = null;
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error en quick search:', err);
            this.cargando = false;
          }
        });
    } else {
      this.service.getProductsFiltered(this.filtros, this.pageSize, this.currentPage, this.lastDocId ?? undefined)
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

  // Limpiar filtros — restaura al estado default (estado=activo)
  limpiarFiltros() {
    this.filtros = {
      texto: '',
      searchBy: 'referencia',
      estado: 'activo',
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
    const newPageSize = event.rows;
    const newCurrentPage = Math.floor(event.first / event.rows) + 1;

    if (newPageSize !== this.pageSize || newCurrentPage !== this.currentPage) {
      this.pageSize = newPageSize;
      this.currentPage = newCurrentPage;
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
            Se creará una copia exacta del producto con una nueva referencia.<br>
            <strong>Nueva referencia:</strong> ${row.identificacion?.referencia || 'REF'}-COPY-${new Date().getTime().toString().slice(-4)}
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

  private ejecutarDuplicacion(row) {
    // Mostrar loading
    Swal.fire({
      title: 'Duplicando producto...',
      text: 'Por favor espera mientras se crea la copia del producto.',
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

    this.service.createProduct(productoDuplicado).subscribe({
      next: (response: any) => {
        Swal.close();
        this.cargarDatos();

        const productoGuardado = response?.product || response?.data || productoDuplicado;
        this.toastr.success(
          `"${productoDuplicado.crearProducto?.titulo}" creado como inactivo`,
          'Producto duplicado',
          { timeOut: 5000 }
        );

        Swal.fire({
          title: '¡Producto duplicado!',
          html: `
            <div style="text-align:left; margin: 16px 0;">
              <p><strong>Nuevo título:</strong> ${productoDuplicado.crearProducto?.titulo}</p>
              <p><strong>Nueva referencia:</strong> <span style="color:#28a745; font-weight:bold;">${productoDuplicado.identificacion?.referencia}</span></p>
              <p class="text-warning"><i class="fa fa-info-circle"></i> El producto quedó <strong>inactivo</strong>. Actívalo después de revisarlo.</p>
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
    const source = this.selectedProductos?.length > 0 ? this.selectedProductos : this.rows;
    const cols = this.exportColumnas.filter(c => c.selected);
    if (!cols.length) {
      this.toastr.warning('Selecciona al menos una columna para exportar.', 'Exportar');
      return;
    }
    const data = (source as any[]).map(row => {
      const obj: any = {};
      cols.forEach(col => { obj[col.label] = col.getValue(row); });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    const hasFilters = Object.values(this.filtros).some(v => v !== '' && v !== null && v !== 'activo');
    const hasSelected = this.selectedProductos?.length > 0;
    const suffix = hasSelected ? `_seleccionados(${source.length})` : hasFilters ? '_filtrados' : '_todos';
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `productos${suffix}_${date}.xlsx`);
    this.showExportDialog = false;
  }

  selectAllExportColumns(selected: boolean): void {
    this.exportColumnas.forEach(c => c.selected = selected);
  }

  trackById(index: number, item: any): any {
    return item?.key || index;
  }

  // ============== MÉTODOS DE IMPORTACIÓN ==============

  openImportModal(): void {
    this.showImportModal = true;
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
   * Elimina FÍSICAMENTE todos los productos del comercio actual
   * ⚠️ OPERACIÓN DESTRUCTIVA - USO ADMINISTRATIVO/DESARROLLO
   */
  limpiarProductosComercio(): void {
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
