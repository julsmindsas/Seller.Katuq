import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from "@angular/core";
import { Subject, of, forkJoin, EMPTY, Observable, timer } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, tap, catchError, filter, expand, map, last } from "rxjs/operators";
import { QuickViewComponent } from "../../quick-view/quick-view.component";
import { VentasService } from "../../../../shared/services/ventas/ventas.service";
import Swal from "sweetalert2";
import { Producto } from "../../../../shared/models/productos/Producto";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import { parse } from "flatted";
import {
  FormGroup,
  FormControl,
  FormArray,
  FormBuilder,
  AbstractControl,
} from "@angular/forms";
import { ConfProductToCartComponent } from "../conf-product-to-cart/conf-product-to-cart.component";
import { After } from "v8";
import { PedidosUtilService } from "../../service/pedidos.util.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { InventarioService } from "../../../../shared/services/inventarios/inventario.service";
import { CartSingletonService } from "../../../../shared/services/ventas/cart.singleton.service";
import { ToastrService } from "ngx-toastr";
import { aplicarPrecioDeLista, filaDeTipoCliente, descuentoVigente, precioEfectivoDeFila } from '../../../../shared/utils/precio-por-tipo-cliente';

@Component({
  selector: "app-ecomerce-products",
  templateUrl: "./ecomerce-products.component.html",
  styleUrls: ["./ecomerce-products.component.scss"],
})
export class EcomerceProductsComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  // Subject para cleanup de suscripciones
  private destroy$ = new Subject<void>();

  // Subject para debounce de búsqueda
  private searchSubject$ = new Subject<string>();
  @Input() public ciudad: string;
  @Input() public bodega: any;
  @Output() onRender = new EventEmitter<void>();

  // Nuevos inputs y outputs para el selector de ciudad
  @Input() ciudadSelector: any[] = [];
  @Input() selectedCity: string = "";
  @Output() citySelected = new EventEmitter<any>();

  // Input para mostrar/ocultar el buscador
  @Input() mostrarBuscador: boolean = false;

  openSidebar: boolean = false;
  // Colapso horizontal del panel de filtros en desktop (independiente del
  // drawer mobile de openSidebar/sidebarToggle) — libera espacio para el grid.
  filtrosColapsados: boolean = false;
  col: string = "3";
  listView: boolean = false;
  productos: Producto[];
  categorias: any[];
  empresaActual: any;
  marketplace: any;
  formaEntrega: any[];
  tiempoEntrega: any[];
  ocasiones: any[];
  generos: any[];
  formasPago: any[];
  // Maestro de combos (D-147) — picker con buscador, sin precio propio.
  combos: any[] = [];
  combosFiltrados: any[] = [];
  comboFiltro: string = '';
  filterForm: FormGroup;
  minPrice: number = 0;
  maxPrice: number = 10000000;
  tipoEntrega: any[];
  isOpenModalDirect: any;
  productoSeleccionado: Producto;
  @Input() isRebuy: boolean = false;
  temp: Producto[];

  // Propiedades para la paginación SERVER-SIDE
  productosCompletos: Producto[] = []; // Cache local de productos cargados
  productosPaginados: Producto[] = []; // Productos de la página actual
  paginaActual: number = 1;
  productosPorPagina: number = 12; // Cantidad de productos por página (aumentado para server-side)
  totalPaginas: number = 0;
  totalProductos: number = 0; // Total de productos en el servidor
  Math = Math; // Exponer Math para usarlo en la plantilla

  // Estados de carga para paginación server-side
  cargandoProductos: boolean = false;
  errorCarga: string | null = null;

  // Flag para usar paginación server-side (feature flag)
  usarPaginacionServidor: boolean = true;

  // Solo mostrar productos con unidades disponibles (toggle visible en la UI).
  // ON por defecto: acelera la carga en bodegas grandes (ej. Guía Cereza,
  // 8.2k productos → ~2.3k con stock) y evita ofrecer productos invendibles.
  public soloConStock: boolean = true;

  /**
   * Modo "catálogo sin inventario": muestra SOLO los productos no
   * inventariables (los que se venden bajo pedido). No dependen de ninguna
   * bodega, por eso este modo no exige seleccionarla — se activa desde la
   * barra de filtros, al lado de Bodega y Ciudad.
   */
  @Input() soloNoInventariables: boolean = false;

  /**
   * El vendedor pidió trabajar en otra bodega desde el popover de existencias
   * ("aquí no hay, pero en Bogotá sí"). El padre es el dueño del selector de
   * bodega, así que solo se le avisa el business code elegido.
   */
  @Output() bodegaSolicitada = new EventEmitter<string>();

  // Cache de precio por categoría del cliente (evita parsear sessionStorage en cada CD cycle)
  private _cachedCategoriaClienteId: string | null = null;
  private _cachedCategoriaClienteNombre: string | null = null;
  private _clienteCacheInitialized: boolean = false;

  // ── Aviso "a este cliente se le está cobrando el precio general" ──
  // El cliente pertenece a una lista de precios y hay productos que no la
  // tienen: el vendedor termina cobrándoles el precio base sin enterarse.
  // Es genérico por construcción: si la empresa no usa listas, sus clientes no
  // tienen lista asignada y no aparece absolutamente nada.
  /** Productos del catálogo sin precio en la lista del cliente (null = no se sabe). */
  productosSinPrecioDeLista: number | null = null;
  /** Total de productos del catálogo, para dar contexto al número de arriba. */
  totalProductosCatalogo: number | null = null;
  private _coberturaPedidaPara: string | null = null;
  private _coberturaReintentada: boolean = false;
  private _bannerListaRef: any = null;
  private _bannerListaValor: boolean = false;

  // Flag para evitar recargar filtros estáticos
  private _filtrosCargados: boolean = false;

  // Flag para evitar doble carga cuando cargarTodo() ya disparó filtrarProductos()
  private _skipNextOnChanges: boolean = false;

  // Flag para evitar doble carga entre ngOnInit y ngAfterViewInit
  private _initialLoadTriggered: boolean = false;

  /** Expuesto para que el padre evite llamar cargarTodo() si ngOnInit ya lo hizo */
  public get initialLoadDone(): boolean { return this._initialLoadTriggered; }

  // Subject para debounce de cambios de @Input bodega/ciudad desde ngOnChanges
  private inputChanges$ = new Subject<void>();

  // Subject para debounce de cambios de filtros (checkboxes)
  private filterSubject$ = new Subject<void>();

  // Subject para carga de páginas — switchMap cancela requests anteriores automáticamente
  private pageRequest$ = new Subject<{ filters: any; page: number; pageSize: number }>();

  /** Curso que inicia cada página para el conjunto actual de filtros. */
  private coursePageCursors = new Map<number, string | null>([[1, null]]);

  // Cache de filtros actuales para paginación
  private filtrosActuales: any = null;

  /**
   * Término de búsqueda vigente. Se conserva para que al cambiar de bodega
   * (por el selector o desde el popover de existencias) el vendedor siga viendo
   * el producto que estaba buscando, ahora con el stock de la nueva bodega,
   * en vez de que el catálogo vuelva al listado completo.
   */
  private terminoBusquedaActivo: string = "";

  /**
   * Evita que el reintento sin "Solo con stock" se dispare en cadena: se permite
   * UNA vuelta por búsqueda. Sin este candado, una búsqueda sin resultados
   * reintentaría indefinidamente.
   */
  private _reintentandoSinStock: boolean = false;

  /**
   * Aviso visible cuando la búsqueda solo encontró productos agotados en esta
   * bodega. Es el que convierte un "no hay nada" en "no hay ACÁ, mira dónde sí".
   */
  public avisoBusquedaSinStock: string | null = null;

  constructor(
    private ventasService: VentasService,
    private modalService: NgbModal,
    private maestroService: MaestroService,
    private fb: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private cartService: CartSingletonService,
    private toastrService: ToastrService,
    private inventarioService: InventarioService,
  ) {
    this.initForm();
  }

  // ====== Existencias por bodega (popover del badge de stock) ======
  /** Estado del popover abierto (solo hay uno a la vez por hover). */
  stockBodegasActual: {
    productoId: string;
    cargando: boolean;
    error: boolean;
    bodegas: { idBodega: string; nombre: string; cantidad: number }[];
  } | null = null;
  private stockBodegasCache = new Map<string, { idBodega: string; nombre: string; cantidad: number }[]>();

  /** Carga (con caché) las existencias del producto en todas las bodegas. */
  cargarStockPorBodegas(producto: any): void {
    const id = producto?.cd;
    if (!id || producto?.disponibilidad?.inventariable === false) return;

    const cacheado = this.stockBodegasCache.get(id);
    if (cacheado) {
      this.stockBodegasActual = { productoId: id, cargando: false, error: false, bodegas: cacheado };
      return;
    }

    this.stockBodegasActual = { productoId: id, cargando: true, error: false, bodegas: [] };
    this.inventarioService.getStockProductoEnBodegas(id).subscribe({
      next: (resp) => {
        const bodegas = (resp?.bodegas || []).filter((b) => b.cantidad > 0);
        this.stockBodegasCache.set(id, bodegas);
        if (this.stockBodegasActual?.productoId === id) {
          this.stockBodegasActual = { productoId: id, cargando: false, error: false, bodegas };
        }
      },
      error: () => {
        if (this.stockBodegasActual?.productoId === id) {
          this.stockBodegasActual = { productoId: id, cargando: false, error: true, bodegas: [] };
        }
      },
    });
  }

  /** Popover de existencias abierto y temporizador de cierre con gracia. */
  private popoverStockAbierto: any = null;
  private cierreStockTimer: any = null;

  /**
   * Abre el popover de existencias. El hover se controla a mano (no con
   * `triggers="mouseenter:mouseleave"`) porque las filas son clicables: con el
   * trigger automático el popover se cerraba justo al mover el cursor hacia él.
   */
  abrirStockPopover(popover: any, producto: any): void {
    this.cancelarCierreStockPopover();
    if (this.popoverStockAbierto && this.popoverStockAbierto !== popover) {
      this.popoverStockAbierto.close();
    }
    this.cargarStockPorBodegas(producto);
    this.popoverStockAbierto = popover;
    popover.open();
  }

  /** Cierra tras un respiro, para poder pasar del badge al popover sin perderlo. */
  cerrarStockPopoverConGracia(): void {
    this.cancelarCierreStockPopover();
    this.cierreStockTimer = setTimeout(() => {
      this.popoverStockAbierto?.close();
      this.popoverStockAbierto = null;
      this.cierreStockTimer = null;
    }, 220);
  }

  /** El cursor entró al popover: se cancela el cierre pendiente. */
  cancelarCierreStockPopover(): void {
    if (this.cierreStockTimer) {
      clearTimeout(this.cierreStockTimer);
      this.cierreStockTimer = null;
    }
  }

  /** true si la fila del popover corresponde a la bodega actualmente seleccionada. */
  esBodegaActual(idBodega: string): boolean {
    return !!this.bodega?.idBodega && this.bodega.idBodega === idBodega;
  }

  /**
   * Pide al padre trabajar en otra bodega. Se dispara desde el popover cuando
   * el producto no tiene existencias acá pero sí en otra: en vez de dejar al
   * vendedor con un 0 sin salida, se cambia de bodega y el catálogo recarga.
   */
  irABodega(idBodega: string): void {
    if (!idBodega || this.esBodegaActual(idBodega)) return;
    this.cancelarCierreStockPopover();
    this.popoverStockAbierto?.close();
    this.popoverStockAbierto = null;
    this.bodegaSolicitada.emit(idBodega);
  }

  /**
   * Fija `cantidadDisponible` a las existencias de la bodega seleccionada.
   *
   * La búsqueda rápida devuelve el desglose `stockPorBodega`; si el backend aún
   * no aplica el filtro por bodega, `cantidadDisponible` viene como el total
   * entre bodegas. Derivarlo acá deja el número correcto en pantalla aunque el
   * backend esté desactualizado, en vez de fallar en silencio mostrando stock
   * de otra ciudad. No toca los no inventariables (no viven en una bodega).
   */
  private aplicarStockDeBodega(products: any[]): any[] {
    const idBodega = this.bodega?.idBodega;
    if (!Array.isArray(products) || this.soloNoInventariables || !idBodega) {
      return products || [];
    }
    return products.map((p) => {
      if (!p || p.disponibilidad?.inventariable === false) return p;
      if (!p.stockPorBodega) return p;
      const enBodega = p.stockPorBodega[idBodega] || 0;
      if (p.disponibilidad?.cantidadDisponible === enBodega) return p;
      return {
        ...p,
        disponibilidad: {
          ...(p.disponibilidad || {}),
          cantidadDisponible: enBodega,
          inventarioSeguridad: enBodega,
        },
      };
    });
  }

  ngAfterViewInit(): void {
    // Solo cargar si ngOnInit no lo hizo ya (evita doble HTTP request)
    if (this.isRebuy && !this._initialLoadTriggered) {
      this._initialLoadTriggered = true;
      this.cargarTodo();
    }
  }

  public cargarTodo() {
    // initForm() ya se llama en el constructor — solo reiniciar si el form no existe
    if (!this.filterForm) {
      this.initForm();
    }
    this.listView = false;
    this.col = "3";
    this.obtenerFiltros();
    // Refrescar cache de cliente al recargar todo
    this.refreshClienteCache();

    // Solo filtrar si tenemos bodega y ciudad
    if (
      this.bodega &&
      this.bodega.idBodega &&
      this.ciudad &&
      this.ciudad !== "seleccione" &&
      this.ciudad.trim() !== ""
    ) {
      this._skipNextOnChanges = true; // Evitar doble carga desde ngOnChanges
      this.filtrarProductos();
    } else {
      console.log(
        "cargarTodo: Esperando selección de bodega y ciudad para filtrar productos",
      );
    }
  }

  get genres(): FormArray {
    return this.filterForm.get("genres") as FormArray;
  }

  get occasions(): FormArray {
    return this.filterForm.get("occasions") as FormArray;
  }

  get deliveryTimes(): FormArray {
    return this.filterForm.get("deliveryTimes") as FormArray;
  }

  onGenreChange(event: any, index: number) {
    const genres = this.filterForm.get("genres") as FormGroup;

    if (event.target.checked) {
      genres.addControl(event.target.value, new FormControl(true));
    } else {
      genres.removeControl(event.target.value);
    }

    this.filterSubject$.next();
  }

  onOccasionChange(event: any, index: number) {
    const occasions = this.filterForm.get("occasions") as FormGroup;

    if (event.target.checked) {
      occasions.addControl(event.target.value, new FormControl(true));
    } else {
      occasions.removeControl(event.target.value);
    }

    this.filterSubject$.next();
  }

  onDeliveryTimeChange(event: any, index: number) {
    const deliveryTimesArray = this.filterForm.get(
      "deliveryTimes",
    ) as FormArray;

    if (event.target.checked) {
      deliveryTimesArray.push(new FormControl(event.target.value));
    } else {
      let i = 0;
      deliveryTimesArray.controls.forEach((item: AbstractControl) => {
        if ((item as FormControl).value == event.target.value) {
          deliveryTimesArray.removeAt(i);
          return;
        }
        i++;
      });
    }

    this.filterSubject$.next();
  }

  private initForm() {
    this.filterForm = this.fb.group({
      genres: this.fb.group({}),
      occasions: this.fb.group({}),
      deliveryTimes: this.fb.array([]),
      isRecommended: [false],
      isNew: [false],
      isBestSeller: [false],
      isOnSale: [false],
      hasFreeShipping: [false],
      priceRange: [[this.minPrice, this.maxPrice]],
      category: [""],
      deliveryCity: [[]],
    });
  }

  ngOnInit(): void {
    // Inicializar cache de categoría de cliente
    this.refreshClienteCache();

    // Debounce para cambios de @Input (bodega/ciudad) — evita llamadas duplicadas cuando
    // el padre asigna bodega y ciudad casi simultáneamente
    this.inputChanges$
      .pipe(debounceTime(80), takeUntil(this.destroy$))
      .subscribe(() => {
        if (
          this.bodega &&
          this.bodega.idBodega &&
          this.ciudad &&
          this.ciudad !== 'seleccione' &&
          this.ciudad.trim() !== ''
        ) {
          this.filtrarProductos();
        }
      });

    // Configurar debounce para búsqueda
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        this.ejecutarBusqueda(searchTerm);
      });

    // Configurar debounce para cambios de filtros (checkboxes)
    this.filterSubject$
      .pipe(
        debounceTime(400),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filtrarProductos();
      });

    // El (click) sobre el host de p-treeSelect no captura la selección real de
    // nodo (el panel de opciones se renderiza en un overlay fuera del árbol DOM
    // del componente), así que el filtro nunca se disparaba al elegir una
    // categoría/subcategoría. Escuchar valueChanges del control sí funciona.
    this.filterForm.get('category').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterSubject$.next();
      });

    // Pipeline de carga de páginas con switchMap — cancela requests anteriores automáticamente
    this.pageRequest$
      .pipe(
        tap(() => {
          this.cargandoProductos = true;
          this.errorCarga = null;
        }),
        switchMap(({ filters, page, pageSize }) =>
          this.obtenerPaginaServidor(filters, page, pageSize).pipe(
            map(result => ({ response: result.response, requestedPage: result.page })),
            catchError(error => {
              console.error(`❌ Error cargando página ${page}:`, error);
              this.errorCarga = "Error al cargar productos. Intente nuevamente.";
              // Fallback a modo legacy si falla
              if (this.usarPaginacionServidor) {
                this.usarPaginacionServidor = false;
                this.cargarTodosLosProductos(this.filtrosActuales);
              }
              return of(null);
            })
          )
        ),
        filter(response => response !== null),
        takeUntil(this.destroy$)
      )
      .subscribe(({ response, requestedPage }: any) => {
        const productos = response.products || [];

        // Búsqueda sin resultados con "Solo con stock" activo: el producto puede
        // existir y estar agotado ACÁ pero disponible en otra bodega. Se reintenta
        // una vez incluyendo agotados, en vez de decirle al vendedor que no hay
        // nada — que es lo que hacía creer que "faltan productos" en la recompra.
        // El badge queda en 0 y el desglose por bodega dice dónde sí hay.
        if (
          productos.length === 0 &&
          this.terminoBusquedaActivo &&
          this.soloConStock &&
          !this._reintentandoSinStock
        ) {
          this._reintentandoSinStock = true;
          this.avisoBusquedaSinStock = null;
          this.filtrosActuales = { ...this.filtrosActuales, onlyWithStock: false };
          this.resetPageCursors();
          this.cargarPaginaServidor(1);
          return;
        }

        // Si el reintento sí encontró algo, se le dice al vendedor por qué está
        // viendo agotados; si tampoco encontró, el producto no existe en el catálogo.
        if (this._reintentandoSinStock) {
          this._reintentandoSinStock = false;
          this.avisoBusquedaSinStock = productos.length > 0
            ? `Sin existencias en ${this.bodega?.nombre || 'esta bodega'}. Se muestran también los agotados — pasa el cursor sobre el indicador de stock para ver en qué bodega hay.`
            : null;
        } else if (!this.terminoBusquedaActivo) {
          this.avisoBusquedaSinStock = null;
        }

        this.productosPaginados = productos;
        this.productos = this.productosPaginados;
        this.temp = [...this.productosPaginados];
        this.totalProductos = response.pagination?.totalItems || 0;
        // El conteo de una bodega puede ser una estimación. Si el cursor ya
        // indicó que no hay más resultados, no ofrecemos páginas inexistentes.
        this.totalPaginas = response.pagination?.hasNext === false
          ? requestedPage
          : response.pagination?.totalPages || 0;
        // El API de bodega pagina por cursor. `currentPage` allí es una
        // estimación, por lo que la fuente de verdad es la página solicitada.
        this.paginaActual = requestedPage;
        this.cargandoProductos = false;
      });

    // Catálogo sin inventario: no depende de bodega ni ciudad, así que se
    // carga en cuanto el componente arranca. Va acá y no en `ngOnChanges`
    // porque recién en este punto existe la suscripción a `pageRequest$`
    // (ver la nota del primer ciclo en `ngOnChanges`).
    if (this.soloNoInventariables) {
      this._initialLoadTriggered = true;
      this.filtrarProductos();
      return;
    }

    // Inicializar y cargar productos si tenemos bodega y ciudad
    if (
      this.bodega &&
      this.bodega.idBodega &&
      this.ciudad &&
      this.ciudad !== "seleccione" &&
      this.ciudad.trim() !== ""
    ) {
      this._initialLoadTriggered = true;
      this.cargarTodo();
    }
  }

  // ── TrackBy functions para optimizar *ngFor ──
  trackByGenero(index: number, genero: any): any { return genero.id; }
  trackByOcasion(index: number, ocasion: any): any { return ocasion.id; }
  trackByTiempo(index: number, tiempo: any): string { return tiempo.nombreInterno; }
  trackByProducto(index: number, producto: Producto): string { return producto.cd; }
  trackByIndex(index: number): number { return index; }

  /**
   * Refresca la cache de categoría del cliente desde sessionStorage.
   * Llamar solo cuando cambia el cliente, no en cada CD cycle.
   */
  refreshClienteCache(): void {
    try {
      const clienteStr = sessionStorage.getItem('cliente');
      if (clienteStr) {
        const cliente = JSON.parse(clienteStr);
        this._cachedCategoriaClienteId = cliente?.categoria?.id || null;
        this._cachedCategoriaClienteNombre =
          cliente?.categoria?.nombre || cliente?.categoria?.descripcion || null;
      } else {
        this._cachedCategoriaClienteId = null;
        this._cachedCategoriaClienteNombre = null;
      }
    } catch (e) {
      this._cachedCategoriaClienteId = null;
      this._cachedCategoriaClienteNombre = null;
    }
    this._clienteCacheInitialized = true;
    this.consultarCoberturaDeLista();
  }

  ngOnDestroy(): void {
    this.cancelarCierreStockPopover();
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerFiltros() {
    // Los filtros son datos maestros estáticos, solo cargarlos una vez
    if (this._filtrosCargados) return;

    this.pedidoUtilService.getAllMaestro$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.empresaActual = data.empresaActual;
        this.formaEntrega = data.formaEntrega;
        this.tiempoEntrega = data.tiempoEntrega;
        this.tipoEntrega = data.tipoEntrega;
        this.ocasiones = data.ocasiones;
        this.generos = data.generos;
        this.formasPago = data.formasPago;
        this.categorias = data.categorias;
        // Solo combos activos en el catálogo de venta — un combo desactivado
        // no debe seguir siendo un atajo utilizable.
        this.combos = (data.combos || []).filter((c: any) => c.activo !== false);
        this._filtrosCargados = true;
      });
  }

  getAllFilters() {
    this.empresaActual = JSON.parse(
      localStorage.getItem("currentCompany") || "{}",
    );

    forkJoin([
      this.maestroService.getFormaEntrega(),
      this.maestroService.getTiempoEntrega(),
      this.maestroService.getTipoEntrega(),
      this.maestroService.consultarOcasion(),
      this.maestroService.consultarGenero(),
      this.maestroService.consultarFormaPago(),
      this.maestroService.getCategorias(),
    ]).subscribe({
      next: (results: any[]) => {
        this.formaEntrega = results[0];
        this.tiempoEntrega = results[1];
        this.tipoEntrega = results[2];
        this.ocasiones = results[3];
        this.generos = results[4];
        this.formasPago = results[5];
        this.categorias = parse((results[6] as any[])[0].categoria).map((p) => {
          return {
            label: p.data.nombre,
            data: p.data,
            children: p.children.map((sub) => {
              return {
                label: sub.data.nombre,
                data: sub.data,
                children: sub.children
                  ? sub.children.map((sub2) => {
                      return {
                        label: sub2.data.nombre,
                        data: sub2.data,
                        children: sub2.children
                          ? sub2.children.map((sub2) => {
                              return {};
                            })
                          : null,
                      };
                    })
                  : null,
              };
            }),
          };
        });

        if (this.isOpenModalDirect) {
          this.configurarProducto(this.productos[0]);
        }
      },
      error: (error) => {
        Swal.fire({
          title: "Error!",
          text: "Error al cargar los datos" + error,
          icon: "error",
          confirmButtonText: "Aceptar",
        });
      },
    });
  }

  listProducts() {
    this.ventasService.getProducts().subscribe({
      next: (data) => {
        this.productosCompletos = data;
        this.productos = data; // Mantener esta asignación para compatibilidad

        const precios = this.productos
          .filter((p) => p.precio)
          .map((producto) => producto.precio?.precioUnitarioConIva || 0);

        if (precios.length > 0) {
          this.minPrice = precios.reduce(
            (min, precio) => (precio < min ? precio : min),
            precios[0],
          );
          this.maxPrice = precios.reduce(
            (max, precio) => (precio > max ? precio : max),
            precios[0],
          );
          const priceControl = this.filterForm.get("priceRange");
          if (priceControl) {
            priceControl.setValue([this.minPrice, this.maxPrice]);
          }
        }

        // Configurar paginación
        this.configurarPaginacion();
      },
      error: (error) => {
        Swal.fire({
          title: "Error!",
          text: "Error al cargar los productos" + error,
          icon: "error",
          confirmButtonText: "Aceptar",
        });
      },
    });
  }

  limpiarFiltros() {
    this.initForm();

    this.tiempoEntrega.forEach((tiempo) => {
      tiempo.checked = false;
      const checkbox = document.getElementById(
        "tiempo-" + tiempo.nombreInterno,
      ) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    this.ocasiones.forEach((ocasion) => {
      const checkbox = document.getElementById(
        "ocasion-" + ocasion.id,
      ) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    this.generos.forEach((genero) => {
      const checkbox = document.getElementById(
        "genero-" + genero.id,
      ) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    const priceControl = this.filterForm.get("priceRange");
    const categoryControl = this.filterForm.get("category");

    if (priceControl) {
      priceControl.setValue([this.minPrice, this.maxPrice]);
    }

    if (categoryControl) {
      categoryControl.setValue("");
    }

    this.filtrarProductos();
  }

  /**
   * Recolecta recursivamente el label del nodo de categoría seleccionado y el
   * de todas sus subcategorías (los productos solo guardan el nombre, no un ID).
   */
  private collectCategoryLabels(categoryNode: any): string[] {
    if (!categoryNode || !categoryNode.label) {
      return [];
    }
    const labels = [categoryNode.label.toLowerCase()];
    if (Array.isArray(categoryNode.children)) {
      categoryNode.children.forEach((child: any) => {
        labels.push(...this.collectCategoryLabels(child));
      });
    }
    return labels;
  }

  filtrarProductos() {
    // Modo "catálogo sin inventario": los productos no inventariables no
    // pertenecen a ninguna bodega, así que acá NO se exige bodega. La ciudad
    // sigue siendo opcional: si hay, filtra por cobertura de entrega.
    if (!this.soloNoInventariables) {
      // Validar que tengamos bodega y ciudad antes de hacer la petición
      if (!this.bodega || !this.bodega.idBodega) {
        console.warn("No hay bodega seleccionada para filtrar productos");
        return;
      }

      if (
        !this.ciudad ||
        this.ciudad === "seleccione" ||
        this.ciudad.trim() === ""
      ) {
        console.warn("No hay ciudad seleccionada para filtrar productos");
        // Mostrar mensaje al usuario si es necesario
        this.toastrService.warning(
          "Por favor seleccione una ciudad antes de buscar productos",
          "Ciudad requerida",
        );
        return;
      }
    }

    const filter = this.filterForm.value;
    if (this.ciudad && this.ciudad !== "seleccione" && this.ciudad.trim() !== "") {
      filter.deliveryCity = { label: this.ciudad, value: this.ciudad };
    }
    // El backend matchea por nombre de categoría (los productos no guardan un ID
    // de categoría, solo una copia del nombre). Si se eligió una categoría principal,
    // se incluyen también los nombres de sus subcategorías para que el filtro
    // muestre productos de toda la rama, no solo los asignados exactamente a ese nodo.
    filter.categoryLabels = this.collectCategoryLabels(filter.category);
    delete filter.category;
    if (this.soloNoInventariables) {
      // Sin bodega: el backend resuelve el catálogo de no inventariables.
      delete filter.bodega;
      delete filter.bodegaId;
      filter.soloNoInventariables = true;
    } else {
      filter.bodega = this.bodega;
      filter.bodegaId = this.bodega.idBodega || this.bodega;
      filter.onlyWithStock = this.soloConStock;
    }
    filter.isChannelManual = true;
    filter.estado = 'activo';

    // Guardar filtros actuales
    this.filtrosActuales = { ...filter };
    this.resetPageCursors();

    // Reiniciar a página 1 con nuevos filtros
    this.paginaActual = 1;

    // Con una búsqueda vigente (cambio de bodega, toggle de stock, etc.) se
    // reejecuta esa búsqueda contra los filtros nuevos, no el catálogo entero.
    if (this.usarPaginacionServidor && this.terminoBusquedaActivo) {
      this.ejecutarBusqueda(this.terminoBusquedaActivo);
      return;
    }

    if (this.usarPaginacionServidor) {
      this.cargarPaginaServidor(1);
    } else {
      // Fallback a carga completa (modo legacy)
      this.cargarTodosLosProductos(filter);
    }
  }

  /**
   * Carga una página específica desde el servidor.
   * Emite al pageRequest$ Subject que usa switchMap para cancelar requests anteriores.
   * @param pagina Número de página a cargar
   */
  private cargarPaginaServidor(pagina: number): void {
    this.pageRequest$.next({
      filters: { ...this.filtrosActuales },
      page: pagina,
      pageSize: this.productosPorPagina,
    });
  }

  /** Reinicia el recorrido de cursores al cambiar filtros o tamaño de página. */
  private resetPageCursors(): void {
    this.coursePageCursors.clear();
    this.coursePageCursors.set(1, null);
  }

  /**
   * El endpoint es cursor-based: `page` por sí solo no cambia el resultado.
   * Conservamos los cursores ya obtenidos y, si el usuario salta a una página
   * aún no visitada, recorremos solo las páginas intermedias necesarias.
   */
  private obtenerPaginaServidor(filters: any, requestedPage: number, pageSize: number): Observable<{ response: any; page: number }> {
    const knownPages = Array.from(this.coursePageCursors.keys())
      .filter(page => page <= requestedPage);
    const startPage = knownPages.length ? Math.max(...knownPages) : 1;

    return this.solicitarPaginaConCursor(filters, startPage, pageSize).pipe(
      expand(({ response, page }) => {
        const nextCursor = response.pagination?.nextCursor;
        if (nextCursor) {
          this.coursePageCursors.set(page + 1, nextCursor);
        }

        if (page >= requestedPage || !nextCursor) {
          return EMPTY;
        }
        return this.solicitarPaginaConCursor(filters, page + 1, pageSize);
      }),
      // Si el conteo estimado permitía saltar más allá de la última página,
      // devolvemos la última página real en vez de dejar el catálogo cargando.
      last(),
    );
  }

  private solicitarPaginaConCursor(filters: any, page: number, pageSize: number): Observable<{ response: any; page: number }> {
    const requestFilters = { ...filters };
    const cursor = this.coursePageCursors.get(page);
    if (cursor) {
      requestFilters.cursor = cursor;
    } else {
      delete requestFilters.cursor;
    }

    return this.ventasService.getProductsByFilterPaginated(requestFilters, page, pageSize).pipe(
      map(response => ({ response, page })),
    );
  }

  /**
   * Modo legacy: carga todos los productos de una vez (fallback)
   */
  private cargarTodosLosProductos(filter: any): void {
    this.cargandoProductos = true;

    this.ventasService
      .getProductsByFilter(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log("Productos cargados (modo legacy):", data?.length || 0);
          this.productosCompletos = data;
          this.productos = data;
          this.temp = [...data];
          this.totalProductos = data?.length || 0;

          // Reiniciar paginación cliente-side
          this.paginaActual = 1;
          this.configurarPaginacion();
          this.cargandoProductos = false;
        },
        error: (error) => {
          console.error("Error al filtrar productos:", error);
          this.cargandoProductos = false;
          this.errorCarga = "Error al cargar los productos.";
          Swal.fire({
            title: "Error!",
            text: "Error al cargar los productos. Verifique que haya seleccionado una bodega y ciudad válidas.",
            icon: "error",
            confirmButtonText: "Aceptar",
          });
        },
      });
  }

  /** Toggle "Solo con stock": recarga el catálogo con/sin productos agotados */
  toggleSoloConStock(): void {
    this.soloConStock = !this.soloConStock;
    this.filtrarProductos();
  }

  sidebarToggle() {
    this.openSidebar = !this.openSidebar;
    this.col = "3";
  }

  /** Colapsa/expande horizontalmente el panel de filtros en desktop. */
  toggleFiltrosColapsados(): void {
    this.filtrosColapsados = !this.filtrosColapsados;
  }

  toggleListView(val) {
    this.listView = val;
  }

  gridColumn(val) {
    this.col = val;
  }
  @Input("icon") public icon;

  public col1: string = "4";
  public col2: string = "6";

  @ViewChild("quickView") QuickView: QuickViewComponent;
  @ViewChild("confProduct") confProduct: ConfProductToCartComponent;
  @ViewChild("confProductToCartModal", { static: false })
  confProductToCartModal: TemplateRef<any>;

  /**
   * Maneja la acción de comprar un producto.
   * Si el producto requiere configuración, muestra el modal de configuración.
   * Si no requiere configuración, usa agregarRapido() para añadir directamente.
   * @param producto Producto a comprar
   */
  comprarProducto(producto: Producto) {
    if ((producto as any).exposicion?.activar === false) {
      this.toastrService.warning('Este producto está inactivo y no puede agregarse al carrito.', 'Producto inactivo');
      return;
    }
    if (this.requiereConfiguracion(producto)) {
      // Abrir modal de configuración para productos que lo necesitan
      this.configurarProducto(producto);
    } else {
      // Añadir directamente al carrito usando agregarRapido
      this.agregarRapido(producto);
    }
  }

  // Mantener el método configurarProducto ya que se sigue utilizando cuando se requiere configuración
  configurarProducto(producto: Producto) {
    this.productoSeleccionado = producto;

    this.modalService
      .open(this.confProductToCartModal, {
        centered: true,
        size: "xl",
        keyboard: true,
        animation: true,
        scrollable: true,
        fullscreen: false,
        windowClass: "modal-fullscreen",
      })
      .result.then(
        (result) => {
          `Result ${result}`;
        },
        (reason) => {
          if (this.isRebuy) {
            this.modalService.dismissAll(reason);
          }
        },
      );
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    // Usar debounce para búsqueda server-side
    if (this.usarPaginacionServidor) {
      this.searchSubject$.next(val);
      return;
    }

    // Búsqueda cliente-side (modo legacy)
    this.ejecutarBusquedaLocal(val);
  }

  /**
   * Ejecuta búsqueda en el servidor con el término dado
   */
  private ejecutarBusqueda(searchTerm: string): void {
    this.terminoBusquedaActivo = (searchTerm || "").trim();
    if (!searchTerm || searchTerm.trim().length === 0) {
      // Limpiar búsqueda: recargar sin searchTerm
      this._reintentandoSinStock = false;
      this.avisoBusquedaSinStock = null;
      if (this.filtrosActuales) {
        delete this.filtrosActuales.searchTerm;
        if (!this.soloNoInventariables) {
          this.filtrosActuales.onlyWithStock = this.soloConStock;
        }
        this.paginaActual = 1;
        this.cargarPaginaServidor(1);
      }
      return;
    }

    // Si parece referencia/código (alfanumérico, sin espacios, >= 3 chars) → quickSearch
    const isLikelyReference = /^[a-zA-Z0-9\-_.]+$/.test(searchTerm.trim()) && searchTerm.trim().length >= 3;

    if (isLikelyReference) {
      this.cargandoProductos = true;
      // La bodega viaja SIEMPRE que el catálogo esté trabajando sobre una: sin
      // ella el backend responde la suma de todas y el badge mostraba stock de
      // otra ciudad. En modo "Sin inventario" no hay bodega y sí se busca en
      // todas, que es el comportamiento correcto para lo que se vende bajo pedido.
      const bodegaBusqueda = this.soloNoInventariables ? undefined : this.bodega?.idBodega;
      this.ventasService.quickSearchProducts(searchTerm.trim(), 20, undefined, bodegaBusqueda)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.products?.length > 0) {
              const products = this.aplicarStockDeBodega(response.products);
              this.productosPaginados = products;
              this.productos = products;
              this.temp = [...products];
              this.totalProductos = response.total;
              this.totalPaginas = 1;
              this.paginaActual = 1;
              this.cargandoProductos = false;
              return;
            }
            // Si quickSearch no encontró nada, caer al flujo normal con searchTerm
            this.buscarConFiltrosPaginados(searchTerm);
          },
          error: () => {
            // Si quickSearch falla, caer al flujo normal
            this.buscarConFiltrosPaginados(searchTerm);
          },
        });
      return;
    }

    // Término con espacios o corto → búsqueda normal paginada con searchTerm
    this.buscarConFiltrosPaginados(searchTerm);
  }

  /**
   * Búsqueda estándar que envía searchTerm al endpoint paginado
   */
  private buscarConFiltrosPaginados(searchTerm: string): void {
    if (!this.filtrosActuales) {
      this.filtrosActuales = this.filterForm.value;
      if (this.ciudad && this.ciudad !== 'seleccione' && this.ciudad.trim() !== '') {
        this.filtrosActuales.deliveryCity = { label: this.ciudad, value: this.ciudad };
      }
      if (this.soloNoInventariables) {
        this.filtrosActuales.soloNoInventariables = true;
      } else {
        this.filtrosActuales.bodega = this.bodega;
        this.filtrosActuales.bodegaId = this.bodega?.idBodega || this.bodega;
        this.filtrosActuales.onlyWithStock = this.soloConStock;
      }
      this.filtrosActuales.isChannelManual = true;
      this.filtrosActuales.estado = 'activo';
    }

    this.filtrosActuales.searchTerm = searchTerm;
    // Cada búsqueda arranca con el filtro que el vendedor tiene puesto: si la
    // anterior lo apagó para poder mostrar agotados, no debe quedarse apagado.
    if (!this.soloNoInventariables) {
      this.filtrosActuales.onlyWithStock = this.soloConStock;
    }
    this._reintentandoSinStock = false;
    this.avisoBusquedaSinStock = null;
    this.paginaActual = 1;
    this.resetPageCursors();
    this.cargarPaginaServidor(1);
  }

  /**
   * Búsqueda local en los productos ya cargados (modo legacy)
   */
  private ejecutarBusquedaLocal(val: string): void {
    // Filtrar productos
    const productosFiltrados = this.temp.filter((d) => {
      return (
        (d.crearProducto?.titulo?.toLowerCase().includes(val) ?? false) ||
        (d.crearProducto?.descripcion?.toLowerCase().includes(val) ?? false) ||
        (d.identificacion?.referencia?.toString().toLowerCase().includes(val) ??
          false) ||
        (d.disponibilidad?.cantidadDisponible
          ?.toString()
          .toLowerCase()
          .includes(val) ??
          false) ||
        (d.precio?.precioUnitarioSinIva
          ?.toString()
          .toLowerCase()
          .includes(val) ??
          false) ||
        (d.date_edit?.toLowerCase().includes(val) ?? false)
      );
    });

    // Actualizar productos y paginación
    this.productosCompletos = productosFiltrados;
    this.productos = productosFiltrados; // Para mantener compatibilidad
    this.paginaActual = 1;
    this.configurarPaginacion();
  }

  /**
   * Método para buscar productos desde el input de búsqueda
   * @param event Evento del input
   */
  onProductSearch(event: any): void {
    this.updateFilter(event);
  }

  // Métodos nuevos para paginación

  /**
   * Configura la paginación
   */
  configurarPaginacion() {
    this.totalPaginas = Math.ceil(
      this.productosCompletos.length / this.productosPorPagina,
    );
    this.cambiarPagina(this.paginaActual);
  }

  /**
   * Cambia a la página especificada
   * @param pagina Número de página
   */
  cambiarPagina(pagina: number) {
    if (pagina < 1) pagina = 1;
    if (this.totalPaginas > 0 && pagina > this.totalPaginas) pagina = this.totalPaginas;

    // Si es paginación server-side, cargar del servidor
    if (this.usarPaginacionServidor && this.filtrosActuales) {
      this.cargarPaginaServidor(pagina);
      return;
    }

    // Paginación cliente-side (modo legacy)
    this.paginaActual = pagina;

    // Calcular índices para la página actual
    const indiceInicial = (pagina - 1) * this.productosPorPagina;
    const indiceFinal = Math.min(
      indiceInicial + this.productosPorPagina,
      this.productosCompletos.length,
    );

    // Actualizar productos paginados
    this.productosPaginados = this.productosCompletos.slice(
      indiceInicial,
      indiceFinal,
    );
  }

  /**
   * Avanza a la siguiente página
   */
  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.cambiarPagina(this.paginaActual + 1);
    }
  }

  /**
   * Retrocede a la página anterior
   */
  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.cambiarPagina(this.paginaActual - 1);
    }
  }

  /**
   * Cambia la cantidad de productos por página
   * @param cantidad Nueva cantidad de productos por página
   */
  cambiarProductosPorPagina(cantidad: number) {
    this.productosPorPagina = cantidad;
    this.resetPageCursors();
    this.configurarPaginacion();
  }

  // Función para emitir la ciudad seleccionada
  onCityChange(event: any) {
    const selectedValue = event.target.value;

    if (selectedValue !== "seleccione") {
      this.ciudad = selectedValue;
      this.selectedCity = selectedValue;

      // Solo filtrar si también tenemos bodega seleccionada
      if (this.bodega && this.bodega.idBodega) {
        this.filtrarProductos();
      } else {
        console.warn(
          "Bodega no seleccionada, esperando selección de bodega para filtrar productos",
        );
      }
    } else {
      this.ciudad = "";
      this.selectedCity = "";
      // Limpiar productos si no hay ciudad seleccionada
      this.productosCompletos = [];
      this.productos = [];
      this.productosPaginados = [];
      this.configurarPaginacion();
    }

    // Emitir el evento con el valor seleccionado
    this.citySelected.emit(selectedValue);
  }

  /**
   * Detecta cambios en los @Input bodega o ciudad y vuelve a aplicar filtros
   */
  ngOnChanges(changes: SimpleChanges): void {
    const bodegaChanged = changes["bodega"] && !changes["bodega"].firstChange;
    const ciudadChanged = changes["ciudad"] && !changes["ciudad"].firstChange;

    // Al entrar o salir del catálogo sin inventario se recarga de una vez:
    // es un modo distinto, no un filtro más sobre lo ya cargado.
    //
    // OJO con el primer ciclo: si el modo se activa sin bodega, el componente
    // recién se crea acá, y `ngOnChanges` corre ANTES de `ngOnInit` — o sea,
    // antes de que exista la suscripción a `pageRequest$`. Pedir la página en
    // ese momento la manda a un Subject sin oyentes y se pierde: el catálogo
    // se quedaba cargando para siempre. En ese caso la dispara `ngOnInit`.
    if (changes["soloNoInventariables"] && !changes["soloNoInventariables"].firstChange && this.filterForm) {
      this.productosPaginados = [];
      this.totalProductos = 0;
      this.paginaActual = 1;
      this.filtrosActuales = null;
      this.filtrarProductos();
      return;
    }

    // Si cargarTodo() ya disparó filtrarProductos(), saltar este ciclo
    if (this._skipNextOnChanges && (bodegaChanged || ciudadChanged)) {
      this._skipNextOnChanges = false;
      return;
    }

    if ((bodegaChanged || ciudadChanged) && this.filterForm) {
      // Actualizar campos del formulario de filtros antes de filtrar
      if (bodegaChanged) {
        // Limpiar productos si no hay ciudad para evitar peticiones inválidas
        if (
          !this.ciudad ||
          this.ciudad === "seleccione" ||
          this.ciudad.trim() === ""
        ) {
          console.warn("Bodega cambiada pero no hay ciudad seleccionada");
          this.productosCompletos = [];
          this.productos = [];
          this.productosPaginados = [];
          this.configurarPaginacion();
          return;
        }
      }
      if (ciudadChanged) {
        // selectedCity controla visualización del selector
        this.selectedCity = this.ciudad;

        // Verificar y limpiar productos del carrito que no estén disponibles en la nueva ciudad
        this.verificarYLimpiarCarritoPorCiudad(this.ciudad, changes["ciudad"].previousValue);
      }

      // Emitir al subject con debounce — agrupa cambios rápidos de bodega+ciudad
      // y evita doble llamada cuando el padre ya invocó cargarTodo()
      this.inputChanges$.next();
    }
  }

  /**
   * Obtiene el label de la ciudad seleccionada para mostrar en el badge
   * @param value Valor de la ciudad seleccionada
   * @returns Label de la ciudad o el valor si no se encuentra
   */
  getCityLabel(value: string): string {
    const ciudad = this.ciudadSelector.find(c => c.value === value);
    return ciudad ? ciudad.label : value;
  }

  /**
   * Verifica y limpia los productos del carrito que no estén disponibles en la nueva ciudad.
   * Si hay productos en el carrito de una ciudad diferente, pregunta al usuario si desea limpiarlos.
   * @param nuevaCiudad La nueva ciudad seleccionada
   * @param ciudadAnterior La ciudad anterior (opcional)
   */
  private verificarYLimpiarCarritoPorCiudad(nuevaCiudad: string, ciudadAnterior?: string): void {
    // Obtener productos del carrito
    const productosEnCarrito = this.cartService.productInCart.value;

    // Si no hay productos en el carrito, no hay nada que verificar
    if (!productosEnCarrito || productosEnCarrito.length === 0) {
      return;
    }

    // Verificar si hay productos que podrían no estar disponibles en la nueva ciudad
    // Los productos tienen la ciudad de entrega en configuracion.datosEntrega.ciudad
    const productosOtraCiudad = productosEnCarrito.filter(item => {
      const ciudadProducto = item?.configuracion?.datosEntrega?.ciudad;
      // Si el producto tiene una ciudad asignada y es diferente a la nueva ciudad
      return ciudadProducto && ciudadProducto.toLowerCase() !== nuevaCiudad?.toLowerCase();
    });

    if (productosOtraCiudad.length > 0) {
      // Mostrar mensaje y preguntar al usuario
      const mensaje = `Hay ${productosOtraCiudad.length} producto(s) en el carrito que pertenecen a otra ciudad. ¿Desea limpiar el carrito para la nueva ciudad "${nuevaCiudad}"?`;

      // Usar confirm nativo para preguntar (se puede mejorar con un modal más elegante)
      if (confirm(mensaje)) {
        this.cartService.clearCart();
        this.toastrService.info(
          `El carrito ha sido limpiado al cambiar a ${nuevaCiudad}`,
          'Carrito limpiado'
        );
      } else {
        this.toastrService.warning(
          'Los productos del carrito podrían no estar disponibles en la nueva ciudad',
          'Advertencia'
        );
      }
    }
  }

  /**
   * Obtiene el precio a mostrar para un producto. Jerarquía:
   *  1. Precio por categoría de cliente (negociado) — si aplica.
   *  2. Precio promocional automático de catálogo (Feature B) — si aplica.
   *  3. Precio estándar.
   */
  getPrecioParaMostrar(producto: Producto): number {
    if (!this._clienteCacheInitialized) this.refreshClienteCache();

    // 1. Precio negociado por categoría de cliente (tiene prioridad).
    const categoriaId = this._cachedCategoriaClienteId;
    if (categoriaId) {
      const preciosPorTipo = producto?.preciosPorTipoCliente;
      if (preciosPorTipo && Array.isArray(preciosPorTipo)) {
        const precioCategoria = preciosPorTipo.find(
          (p: any) => p.tipoClienteId === categoriaId && p.activo === true
        );
        if (precioCategoria) {
          // D-219 Fase 2: si la lista trae descuento vigente se muestra el
          // rebajado — lo mismo que se cobra al agregar al carrito.
          return precioEfectivoDeFila(precioCategoria) || producto?.precio?.precioUnitarioConIva || 0;
        }
      }
    }

    // 2. Precio promocional automático (Feature B).
    if (this.tienePrecioPromocional(producto)) {
      return producto.precioPromocional as number;
    }

    // 3. Precio estándar.
    return producto?.precio?.precioUnitarioConIva || 0;
  }

  /**
   * Feature B — el producto trae un precio promocional vigente (inyectado por el
   * backend del catálogo) y es realmente menor que el precio estándar.
   */
  tienePrecioPromocional(producto: Producto): boolean {
    const promo = producto?.precioPromocional;
    const base = producto?.precio?.precioUnitarioConIva;
    return typeof promo === 'number' && typeof base === 'number' && promo < base;
  }

  /** Insignias gráficas disponibles (sprite recortado en src/assets/images/promo). */
  private static readonly PROMO_BADGES = [20, 30, 40, 50, 60, 70, 80];

  /**
   * Feature B — ruta de la insignia gráfica de descuento a mostrar como sticker
   * sobre la foto del producto. Usa el porcentaje puesto al crear la promoción;
   * si ese porcentaje no tiene insignia propia (ej. 10%), cae a la más cercana.
   * Devuelve null si la promo no es de tipo porcentaje (valor fijo → sin sticker).
   */
  getPromoBadgeImg(producto: Producto): string | null {
    if (!this.tienePrecioPromocional(producto)) return null;
    const promo: any = producto?.promocionAplicada;
    if (!promo || promo.tipo !== 'porcentaje') return null;
    const valor = Number(promo.valor);
    if (!isFinite(valor) || valor <= 0) return null;
    const badges = EcomerceProductsComponent.PROMO_BADGES;
    const cercana = badges.reduce((prev, cur) =>
      Math.abs(cur - valor) < Math.abs(prev - valor) ? cur : prev
    );
    return `assets/images/promo/badge-${cercana}.png`;
  }

  /**
   * D-219 Fase 2 — precio que se tacha al lado del precio efectivo.
   * Para un cliente con lista, el tachado es SU precio de lista (el mayorista
   * ve $43.120 tachando $53.900, no el público $98.900); si no tiene lista,
   * el precio estándar del producto.
   */
  getPrecioTachado(producto: Producto): number {
    const fila = filaDeTipoCliente(producto, this._cachedCategoriaClienteId);
    if (fila && descuentoVigente(fila)) return Number(fila.precioConIva) || 0;
    return Number(producto?.precio?.precioUnitarioConIva) || 0;
  }

  /** true si la lista del cliente trae una campaña vigente (para el tachado). */
  tieneDescuentoDeLista(producto: Producto): boolean {
    if (!this._clienteCacheInitialized) this.refreshClienteCache();
    return descuentoVigente(filaDeTipoCliente(producto, this._cachedCategoriaClienteId));
  }

  /**
   * El cliente en pantalla pertenece a una lista de precios y a ESTE producto
   * le falta esa lista: se le va a cobrar el precio general.
   *
   * Mismo criterio que `aplicarPrecioDeLista` — una fila apagada o en cero no
   * se aplica, así que cuenta como faltante. Si el cliente no tiene lista
   * asignada (o la empresa no usa listas) devuelve false siempre.
   */
  faltaPrecioDeLista(producto: Producto): boolean {
    if (!this._clienteCacheInitialized) this.refreshClienteCache();
    if (!this._cachedCategoriaClienteId) return false;
    const fila = filaDeTipoCliente(producto, this._cachedCategoriaClienteId);
    return !fila || !(Number(fila.precioConIva) > 0);
  }

  /** Nombre corto de la lista del cliente ("Mayoristas"), o null si no tiene. */
  get listaDelCliente(): string | null {
    if (!this._clienteCacheInitialized) this.refreshClienteCache();
    return this._cachedCategoriaClienteId ? this._cachedCategoriaClienteNombre : null;
  }

  /**
   * A TODO lo que se ve le falta la lista. Pasa cuando a una empresa le
   * asignaron una lista a sus clientes pero nunca le pusieron precios: en vez
   * de encender las 40 tarjetas se muestra un solo renglón arriba.
   * Se recalcula solo cuando cambia la página de productos.
   */
  get catalogoCompletoSinLista(): boolean {
    if (!this._cachedCategoriaClienteId) return false;
    const pagina: any[] = this.productosPaginados as any[];
    if (!pagina || pagina.length === 0) return false;
    if (this._bannerListaRef !== pagina) {
      this._bannerListaRef = pagina;
      this._bannerListaValor = pagina.every((p) => this.faltaPrecioDeLista(p));
    }
    return this._bannerListaValor;
  }

  /**
   * Le pregunta al backend cuántos productos del catálogo no tienen precio en
   * la lista del cliente. El backend responde de una; si todavía lo está
   * calculando, se vuelve a preguntar UNA vez a los 20 segundos y si tampoco
   * llega, el catálogo simplemente no muestra el número (el aviso por producto
   * sigue funcionando: no depende de esta consulta).
   */
  private consultarCoberturaDeLista(): void {
    const id = this._cachedCategoriaClienteId;
    if (!id) {
      this.productosSinPrecioDeLista = null;
      this.totalProductosCatalogo = null;
      this._coberturaPedidaPara = null;
      this._coberturaReintentada = false;
      return;
    }
    if (this._coberturaPedidaPara === id) return;
    this._coberturaPedidaPara = id;

    this.ventasService
      .getCoberturaListasPrecio()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta: any) => {
          const fila = (respuesta?.listas || []).find(
            (l: any) => l.tipoClienteId === id,
          );
          this.productosSinPrecioDeLista = fila ? Number(fila.sin) : null;
          this.totalProductosCatalogo = respuesta?.totalProductos ?? null;

          if (respuesta?.calculando && !this._coberturaReintentada) {
            this._coberturaReintentada = true;
            timer(20000)
              .pipe(takeUntil(this.destroy$))
              .subscribe(() => {
                this._coberturaPedidaPara = null;
                this.consultarCoberturaDeLista();
              });
          }
        },
        error: () => {
          this.productosSinPrecioDeLista = null;
          this.totalProductosCatalogo = null;
        },
      });
  }

  /**
   * Verifica si el producto tiene un precio especial por categoría de cliente
   */
  tienePrecioCategoria(producto: Producto): boolean {
    if (!this._clienteCacheInitialized) this.refreshClienteCache();

    const categoriaId = this._cachedCategoriaClienteId;
    if (!categoriaId) return false;

    const preciosPorTipo = producto?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo)) return false;

    return preciosPorTipo.some(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );
  }

  /**
   * Verifica si el producto requiere configuración antes de agregarse al carrito.
   * Un producto requiere configuración si tiene procesoComercial activo CON alguna opción habilitada.
   */
  requiereConfiguracion(producto: Producto): boolean {
    const pc = producto?.procesoComercial;

    // Si no hay proceso comercial o no está activo, no requiere configuración
    if (!pc || !pc.configProcesoComercialActivo) {
      return false;
    }

    // Verificar si alguna de las opciones de configuración está activa
    const tieneCalendario = pc.llevaCalendario === true;
    const tieneVariable = pc.aceptaVariable === true;
    const tieneTarjeta = pc.llevaTarjeta === true;
    const tieneAdiciones = pc.aceptaAdiciones === true;
    const tieneOcasion = pc.aceptaOcasion === true;
    const tieneGenero = pc.aceptaGenero === true;
    const tieneComentarios = pc.aceptaComentarios === true;
    const tieneColor = pc.aceptaColorDecoracion === true;

    // Si tiene cualquier opción activa, requiere configuración
    return tieneCalendario || tieneVariable || tieneTarjeta || tieneAdiciones ||
           tieneOcasion || tieneGenero || tieneComentarios || tieneColor;
  }

  /**
   * Obtiene una copia del producto con el precio ajustado por categoría de cliente.
   * Si el cliente tiene categoría y el producto tiene precio para esa categoría,
   * retorna una copia del producto con el precio modificado.
   * Si no aplica, retorna el producto original sin modificar.
   */
  private obtenerProductoConPrecioCategoria(producto: Producto): any {
    // 1. Obtener el cliente desde sessionStorage
    let cliente: any = null;
    try {
      const clienteStr = sessionStorage.getItem('cliente');
      if (clienteStr) {
        cliente = JSON.parse(clienteStr);
      }
    } catch (e) {
      console.warn('⚠️ QuickAdd: Error al obtener cliente de sessionStorage:', e);
      return producto;
    }

    // 2. Verificar si el cliente tiene categoría asignada
    const categoriaId = cliente?.categoria?.id;
    if (!categoriaId) {
      return producto; // Retorna el producto original sin modificar
    }

    // 3. Verificar si el producto tiene precios por tipo de cliente
    const preciosPorTipo = (producto as any)?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo) || preciosPorTipo.length === 0) {
      return producto; // Retorna el producto original sin modificar
    }

    // 4. Buscar el precio específico para la categoría del cliente
    const precioCategoria = preciosPorTipo.find(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );

    if (!precioCategoria) {
      return producto; // Retorna el producto original sin modificar
    }

    // 5. CREAR COPIA del producto con el precio ajustado
    console.log('💰 QuickAdd: Aplicando precio por categoría:', {
      producto: producto?.crearProducto?.titulo,
      categoria: precioCategoria.tipoClienteNombre || cliente?.categoria?.nombre,
      precioOriginal: producto?.precio?.precioUnitarioConIva,
      precioCategoria: precioCategoria.precioConIva
    });

    // D-219 Fase 2: el helper aplica el precio de la lista Y su descuento
    // vigente (el mayorista ve $43.120 en vez de $53.900 llenos, igual que en
    // cerezamayorista.com). Deja el precio de lista sin rebajar en la marca
    // para el tachado y para el `price` que viaja a Cereza.
    return aplicarPrecioDeLista(producto, precioCategoria.tipoClienteId);
  }

  /**
   * Agrega un producto directamente al carrito sin abrir el modal de configuración.
   * Solo funciona para productos que NO requieren configuración.
   * Aplica automáticamente:
   * - Cantidad mínima de venta del producto
   * - Precio por categoría de cliente si aplica
   * - Datos de entrega por defecto (fecha actual, envío a domicilio, lo más pronto posible)
   */
  agregarRapido(producto: Producto): void {
    // 1. Verificar que el producto no requiera configuración
    if (this.requiereConfiguracion(producto)) {
      // Si requiere configuración, abrir el modal en lugar de agregar directamente
      this.configurarProducto(producto);
      return;
    }

    // 2-6. Resolver cantidad/precio/entrega por defecto y agregar al carrito —
    // lógica compartida con agregarCombo() (D-147), extraída sin cambiar el
    // comportamiento observable de este método.
    this.agregarProductoAlCarritoInterno(producto);
  }

  /**
   * Agrega un producto individual al carrito resolviendo cantidad mínima,
   * precio por categoría de cliente y datos de entrega por defecto. Extraído
   * de `agregarRapido` para ser reusado también por `agregarCombo` (D-147) —
   * `agregarRapido` sigue llamándolo con el mismo comportamiento de antes.
   *
   * `opts.requiereConfiguracionPendiente`: cuando viene de un combo y el
   * producto SÍ requiere configuración, se agrega igual (no se abre modal,
   * no se interrumpe el agregado del resto del combo) pero sin `configuracion`
   * resuelta y marcado con `_requiereConfiguracionPendiente` para que el
   * carrito lo señale con un pill/banner.
   *
   * `opts.mostrarToast`: agregarCombo lo pone en `false` para mostrar un
   * único toast resumen al final, en vez de uno por producto del combo.
   */
  private agregarProductoAlCarritoInterno(
    producto: Producto,
    opts: { requiereConfiguracionPendiente?: boolean; mostrarToast?: boolean } = {}
  ): boolean {
    const mostrarToast = opts.mostrarToast !== false;

    // 1.b Sin existencias en la bodega de trabajo no se agrega. El botón
    // "Agregar" no validaba stock (solo lo hacía el modal Configurar), así que
    // un producto agotado en esta bodega entraba al carrito sin aviso.
    const inventariable = producto.disponibilidad?.inventariable !== false;
    const disponible = producto.disponibilidad?.cantidadDisponible || 0;
    if (inventariable && disponible <= 0) {
      if (mostrarToast) {
        const dondeSiHay = this.bodega?.nombre ? ` en ${this.bodega.nombre}` : "";
        this.toastrService.error(
          `No hay unidades${dondeSiHay}. Pasa el cursor sobre el indicador de stock para ver en qué bodega sí hay.`,
          "Sin stock en esta bodega",
          { timeOut: 5000, progressBar: true, positionClass: "toast-bottom-right" }
        );
      }
      return false;
    }

    // 2. Obtener la cantidad mínima de venta
    const cantidadMinima = producto.disponibilidad?.cantidadMinVenta || 1;

    // 3. Obtener el producto con precio ajustado por categoría (si aplica)
    const productoConPrecio = this.obtenerProductoConPrecioCategoria(producto);

    // 4. Crear datos de entrega por defecto
    const hoy = new Date();
    const datosEntregaPorDefecto = {
      fechaEntrega: {
        day: hoy.getDate(),
        month: hoy.getMonth() + 1,
        year: hoy.getFullYear()
      },
      formaEntrega: "Envío a Domicilio",
      horarioEntrega: "LO MAS PRONTO POSIBLE",
      tipoEntrega: null,
      genero: null,
      ocasion: null,
      colores: [],
      observaciones: null
    };

    // 5. Crear el objeto para el carrito con datosEntrega incluidos
    // Estructura compatible con el carrito existente. `configuracion` SIEMPRE
    // lleva la forma completa (con arrays vacíos por defecto) — carrito.component.html
    // accede a `configuracion.adiciones`/`.preferencias` sin optional chaining
    // en varios puntos; un combo con producto que requiere configuración NO
    // pone `configuracion: null`, solo marca `_requiereConfiguracionPendiente`
    // para que el pill lo señale — la config real se completa después.
    const productoCompra: any = {
      producto: productoConPrecio,
      configuracion: {
        producto: productoConPrecio,
        datosEntrega: datosEntregaPorDefecto,
        cantidad: cantidadMinima,
        preferencias: [],
        adiciones: [],
        tarjetas: []
      },
      cantidad: cantidadMinima
    };
    if (opts.requiereConfiguracionPendiente) {
      productoCompra._requiereConfiguracionPendiente = true;
    }

    // 6. Agregar al carrito - DIFERENCIADO POR MODO
    const nombreProducto = producto.crearProducto?.titulo || 'Producto';
    const precioMostrar = productoConPrecio?.precio?.precioUnitarioConIva || 0;

    if (this.isRebuy) {
      // MODO RECOMPRA: Cerrar modal y pasar producto al componente padre (list.component.ts)
      // El padre recibirá el producto en addProductToCart() y lo agregará al pedido
      console.log('🔄 QuickAdd RECOMPRA: Cerrando modal y pasando producto al pedido:', {
        titulo: nombreProducto,
        cantidad: cantidadMinima,
        precioUnitario: precioMostrar
      });

      if (mostrarToast) {
        this.toastrService.success(
          `${nombreProducto} x${cantidadMinima} agregado al pedido ($${precioMostrar.toLocaleString('es-CO')})`,
          'Agregado al pedido',
          {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-bottom-right'
          }
        );
      }

      // Cerrar todos los modales pasando el producto configurado
      this.modalService.dismissAll(productoCompra);
    } else {
      // MODO NORMAL: Agregar al carrito global (CartSingletonService)
      this.cartService.addToCart(productoCompra);

      if (mostrarToast) {
        this.toastrService.success(
          `${nombreProducto} x${cantidadMinima} agregado ($${precioMostrar.toLocaleString('es-CO')})`,
          'Agregado al carrito',
          {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-bottom-right'
          }
        );
      }

      console.log('⚡ QuickAdd: Producto agregado al carrito:', {
        titulo: nombreProducto,
        cantidad: cantidadMinima,
        precioUnitario: precioMostrar,
        tienePrecioCategoria: !!productoConPrecio._precioAplicadoPorCategoria,
        datosEntrega: datosEntregaPorDefecto,
        requiereConfiguracionPendiente: !!opts.requiereConfiguracionPendiente
      });
    }
    return true;
  }

  /** Abre el picker de combos (buscador + lista) — escala a cualquier cantidad de combos. */
  abrirCombosPicker(tpl: TemplateRef<any>): void {
    this.comboFiltro = '';
    this.combosFiltrados = this.combos;
    this.modalService.open(tpl, { centered: true, size: 'md', scrollable: true });
  }

  /** Filtra los combos del picker por nombre (client-side, la lista ya está cargada en memoria). */
  filtrarCombos(): void {
    const term = (this.comboFiltro || '').toLowerCase().trim();
    this.combosFiltrados = !term
      ? this.combos
      : this.combos.filter((c: any) => (c.nombre || '').toLowerCase().includes(term));
  }

  /**
   * Agrega al carrito todos los productos asociados a un combo (D-147), como
   * líneas normales e independientes — NO crea una línea "combo" colapsada ni
   * calcula un precio propio; el total emerge de sumar las líneas agregadas.
   *
   * Los productos del combo se resuelven por ID directo contra Firestore
   * (`getProductsByIds`), no contra `this.productos` (el catálogo de venta
   * asistida es paginado/buscado — un producto del combo puede no estar en la
   * página cargada en este momento).
   */
  agregarCombo(combo: any): void {
    if (this.isRebuy) {
      this.toastrService.info('Los combos no están disponibles en modo recompra.', 'Combo');
      return;
    }

    const ids: string[] = (combo?.productos || [])
      .map((p: any) => p.productoId)
      .filter((id: any) => !!id);

    if (ids.length === 0) {
      return;
    }

    this.maestroService.getProductsByIds(ids).subscribe({
      next: (res: any) => {
        // Los productos del combo se resuelven por ID y llegan con el stock
        // sumado entre bodegas: se baja al de la bodega de trabajo antes de
        // decidir si entran al carrito.
        const productosResueltos: Producto[] = this.aplicarStockDeBodega(res?.products || []);
        const mapaPorId = new Map(productosResueltos.map((p: any) => [p.cd, p]));

        let agregados = 0;
        let pendientesConfig = 0;
        let noDisponibles = 0;
        let sinStock = 0;

        ids.forEach((id) => {
          const producto = mapaPorId.get(id);
          // Producto ya no existe o está inactivo: se omite del agregado sin
          // bloquear el resto del combo (D-147).
          if (!producto) {
            noDisponibles++;
            return;
          }

          const requiereConfig = this.requiereConfiguracion(producto);
          const agregado = this.agregarProductoAlCarritoInterno(producto, {
            requiereConfiguracionPendiente: requiereConfig,
            mostrarToast: false
          });
          if (!agregado) {
            sinStock++;
            return;
          }
          if (requiereConfig) {
            pendientesConfig++;
          }
          agregados++;
        });

        // Toast único de resumen (no uno por producto del combo).
        const nombreCombo = combo?.nombre || 'Combo';
        let mensaje = `${agregados} producto(s) de "${nombreCombo}" agregados al carrito`;
        if (pendientesConfig > 0) {
          mensaje += ` (${pendientesConfig} requiere${pendientesConfig > 1 ? 'n' : ''} configuración — revisa el carrito)`;
        }
        if (noDisponibles > 0) {
          mensaje += `. ${noDisponibles} producto(s) del combo ya no están disponibles y no se agregaron.`;
        }
        if (sinStock > 0) {
          const enBodega = this.bodega?.nombre ? ` en ${this.bodega.nombre}` : "";
          mensaje += `. ${sinStock} producto(s) sin existencias${enBodega} quedaron fuera.`;
        }

        this.toastrService.success(mensaje, 'Combo agregado', {
          timeOut: 5000,
          progressBar: true,
          positionClass: 'toast-bottom-right'
        });
      },
      error: (err) => {
        console.error('Error al resolver productos del combo:', err);
        this.toastrService.error('No se pudo agregar el combo', 'Error');
      }
    });
  }
}
