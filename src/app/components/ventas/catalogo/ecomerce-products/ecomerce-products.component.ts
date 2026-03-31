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
import { Subject, of, forkJoin } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, tap, catchError, filter } from "rxjs/operators";
import { QuickViewComponent } from "../../quick-view/quick-view.component";
import { VentasService } from "../../../../shared/services/ventas/ventas.service";
import Swal from "sweetalert2";
import { Producto } from "../../../../shared/models/productos/Producto";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import { parse, stringify } from "flatted";
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
import { CartSingletonService } from "../../../../shared/services/ventas/cart.singleton.service";
import { ToastrService } from "ngx-toastr";

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
  col: string;
  listView: any;
  productos: Producto[];
  categorias: any[];
  empresaActual: any;
  marketplace: any;
  formaEntrega: any[];
  tiempoEntrega: any[];
  ocasiones: any[];
  generos: any[];
  formasPago: any[];
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

  // Cache de precio por categoría del cliente (evita parsear sessionStorage en cada CD cycle)
  private _cachedCategoriaClienteId: string | null = null;
  private _clienteCacheInitialized: boolean = false;

  // Flag para evitar recargar filtros estáticos
  private _filtrosCargados: boolean = false;

  // Flag para evitar doble carga cuando cargarTodo() ya disparó filtrarProductos()
  private _skipNextOnChanges: boolean = false;

  // Flag para evitar doble carga entre ngOnInit y ngAfterViewInit
  private _initialLoadTriggered: boolean = false;

  // Subject para debounce de cambios de filtros (checkboxes)
  private filterSubject$ = new Subject<void>();

  // Subject para carga de páginas — switchMap cancela requests anteriores automáticamente
  private pageRequest$ = new Subject<{ filters: any; page: number; pageSize: number }>();

  // Cache de filtros actuales para paginación
  private filtrosActuales: any = null;

  constructor(
    private ventasService: VentasService,
    private modalService: NgbModal,
    private maestroService: MaestroService,
    private fb: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private cartService: CartSingletonService,
    private toastrService: ToastrService,
  ) {
    this.initForm();
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
    this.col = "2";
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

    // Pipeline de carga de páginas con switchMap — cancela requests anteriores automáticamente
    this.pageRequest$
      .pipe(
        tap(() => {
          this.cargandoProductos = true;
          this.errorCarga = null;
        }),
        switchMap(({ filters, page, pageSize }) =>
          this.ventasService.getProductsByFilterPaginated(filters, page, pageSize).pipe(
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
      .subscribe((response: any) => {
        this.productosPaginados = response.products || [];
        this.productos = this.productosPaginados;
        this.temp = [...this.productosPaginados];
        this.totalProductos = response.pagination?.totalItems || 0;
        this.totalPaginas = response.pagination?.totalPages || 0;
        this.paginaActual = response.pagination?.currentPage || 1;
        this.cargandoProductos = false;
      });

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
      } else {
        this._cachedCategoriaClienteId = null;
      }
    } catch (e) {
      this._cachedCategoriaClienteId = null;
    }
    this._clienteCacheInitialized = true;
  }

  ngOnDestroy(): void {
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

  filtrarProductos() {
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

    const filter = this.filterForm.value;
    filter.deliveryCity = { label: this.ciudad, value: this.ciudad };
    filter.category = stringify(filter.category);
    filter.bodega = this.bodega;
    filter.bodegaId = this.bodega.idBodega || this.bodega;
    filter.isChannelManual = true;

    // Guardar filtros actuales
    this.filtrosActuales = { ...filter };

    // Reiniciar a página 1 con nuevos filtros
    this.paginaActual = 1;

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

  sidebarToggle() {
    this.openSidebar = !this.openSidebar;
    this.col = "3";
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
    if (!searchTerm || searchTerm.trim().length === 0) {
      // Limpiar búsqueda: recargar sin searchTerm
      if (this.filtrosActuales) {
        delete this.filtrosActuales.searchTerm;
        this.paginaActual = 1;
        this.cargarPaginaServidor(1);
      }
      return;
    }

    // Si parece referencia/código (alfanumérico, sin espacios, >= 3 chars) → quickSearch
    const isLikelyReference = /^[a-zA-Z0-9\-_.]+$/.test(searchTerm.trim()) && searchTerm.trim().length >= 3;

    if (isLikelyReference) {
      this.cargandoProductos = true;
      this.ventasService.quickSearchProducts(searchTerm.trim(), 20)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.products?.length > 0) {
              this.productosPaginados = response.products;
              this.productos = response.products;
              this.temp = [...response.products];
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
      this.filtrosActuales.deliveryCity = { label: this.ciudad, value: this.ciudad };
      this.filtrosActuales.bodega = this.bodega;
      this.filtrosActuales.bodegaId = this.bodega?.idBodega || this.bodega;
      this.filtrosActuales.isChannelManual = true;
    }

    this.filtrosActuales.searchTerm = searchTerm;
    this.paginaActual = 1;
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

      // Solo filtrar si tenemos tanto bodega como ciudad
      if (
        this.bodega &&
        this.bodega.idBodega &&
        this.ciudad &&
        this.ciudad !== "seleccione" &&
        this.ciudad.trim() !== ""
      ) {
        this.filtrarProductos();
      } else {
        console.warn("No se puede filtrar: faltan bodega o ciudad", {
          bodega: this.bodega?.idBodega || "NO_DEFINIDA",
          ciudad: this.ciudad || "NO_DEFINIDA",
        });
      }
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
   * Obtiene el precio a mostrar para un producto, considerando la categoría del cliente
   * Si el cliente tiene categoría y el producto tiene precio para esa categoría, muestra ese precio
   * Si no, muestra el precio estándar
   */
  getPrecioParaMostrar(producto: Producto): number {
    if (!this._clienteCacheInitialized) this.refreshClienteCache();

    const categoriaId = this._cachedCategoriaClienteId;
    if (!categoriaId) {
      return producto?.precio?.precioUnitarioConIva || 0;
    }

    const preciosPorTipo = producto?.preciosPorTipoCliente;
    if (!preciosPorTipo || !Array.isArray(preciosPorTipo) || preciosPorTipo.length === 0) {
      return producto?.precio?.precioUnitarioConIva || 0;
    }

    const precioCategoria = preciosPorTipo.find(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );

    if (precioCategoria) {
      return precioCategoria.precioConIva || producto?.precio?.precioUnitarioConIva || 0;
    }

    return producto?.precio?.precioUnitarioConIva || 0;
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

    const productoConPrecioAjustado = {
      ...producto,
      precio: {
        ...producto.precio,
        precioUnitarioConIva: precioCategoria.precioConIva,
        precioUnitarioSinIva: precioCategoria.precio,
        valorIva: precioCategoria.valorIva
      },
      // Guardar referencia a la categoría aplicada (para auditoría/debugging)
      _precioAplicadoPorCategoria: {
        tipoClienteId: precioCategoria.tipoClienteId,
        tipoClienteNombre: precioCategoria.tipoClienteNombre,
        precioOriginalConIva: producto?.precio?.precioUnitarioConIva,
        precioOriginalSinIva: producto?.precio?.precioUnitarioSinIva
      }
    };

    return productoConPrecioAjustado;
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
    // Estructura compatible con el carrito existente
    const productoCompra = {
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

      this.toastrService.success(
        `${nombreProducto} x${cantidadMinima} agregado al pedido ($${precioMostrar.toLocaleString('es-CO')})`,
        'Agregado al pedido',
        {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-bottom-right'
        }
      );

      // Cerrar todos los modales pasando el producto configurado
      this.modalService.dismissAll(productoCompra);
    } else {
      // MODO NORMAL: Agregar al carrito global (CartSingletonService)
      this.cartService.addToCart(productoCompra);

      this.toastrService.success(
        `${nombreProducto} x${cantidadMinima} agregado ($${precioMostrar.toLocaleString('es-CO')})`,
        'Agregado al carrito',
        {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-bottom-right'
        }
      );

      console.log('⚡ QuickAdd: Producto agregado al carrito:', {
        titulo: nombreProducto,
        cantidad: cantidadMinima,
        precioUnitario: precioMostrar,
        tienePrecioCategoria: !!productoConPrecio._precioAplicadoPorCategoria,
        datosEntrega: datosEntregaPorDefecto
      });
    }
  }
}
