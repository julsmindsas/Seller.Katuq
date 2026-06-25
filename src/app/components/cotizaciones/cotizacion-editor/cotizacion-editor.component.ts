import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, Subscription, of } from "rxjs";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from "rxjs/operators";
import { ToastrService } from "ngx-toastr";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import { SecurityService } from "../../../shared/services/security/security.service";
import { CotizacionesService } from "../cotizaciones.service";
import { CotizacionConvertService } from "../cotizacion-convert.service";
import {
  Cotizacion,
  EstadoCotizacion,
  ESTADOS_COTIZACION,
  VendedorCotizacion,
} from "../modelo/cotizacion";
import { Carrito, Cliente } from "../../ventas/modelo/pedido";
import { Producto } from "../../../shared/models/productos/Producto";
import { ConfProductToCartComponent } from "../../ventas/catalogo/conf-product-to-cart/conf-product-to-cart.component";
import { CrearClienteModalComponent } from "../../ventas/clientes/crear-cliente-modal/crear-cliente-modal.component";

/**
 * Editor de cotización — T-18 (cliente + fechas + términos).
 *
 * Scaffold del editor: picker de cliente existente (autocomplete vía
 * MaestroService.searchClients), datos del cliente seleccionado, fecha de
 * emisión (auto), validez en días → fecha de vencimiento, vendedor (usuario en
 * sesión) y términos precargados del default de empresa (GET /config), editables
 * por cotización.
 *
 * Productos/popup (T-19), precio·IVA (T-20), totales·estado (T-21) y guardar
 * (T-22) se agregan en las siguientes tareas; el modelo y los bindings ya quedan
 * preparados para extenderse.
 */
@Component({
  selector: "app-cotizacion-editor",
  templateUrl: "./cotizacion-editor.component.html",
  styleUrls: ["./cotizacion-editor.component.scss"],
})
export class CotizacionEditorComponent implements OnInit, OnDestroy {
  cotizacionId: string | null = null;
  loading = false;
  saving = false;
  generandoPDF = false;
  compartiendo = false;

  /** Overlay de "Vista previa del cliente" (documento de cotización). */
  showPreview = false;

  /** Elemento oculto con el documento, capturado por html2pdf para el PDF. */
  @ViewChild("docCapture") docCapture?: ElementRef<HTMLElement>;

  // Modelo en edición.
  cotizacion: Cotizacion = {
    estadoCotizacion: "borrador",
    cliente: null,
    vendedor: null,
    items: [],
    terminos: "",
  };

  // Validez (días) → recalcula fechaVencimiento.
  readonly VALIDEZ_DEFAULT = 15;
  validezDias = this.VALIDEZ_DEFAULT;
  fechaEmision = ""; // yyyy-MM-dd (input date)
  fechaVencimiento = ""; // yyyy-MM-dd (input date)

  // Picker de cliente (autocomplete con debounce).
  clienteTerm = "";
  clienteSuggestions: any[] = [];
  buscandoCliente = false;
  private clienteSearch$ = new Subject<string>();

  // Picker de productos (autocomplete con debounce).
  productoTerm = "";
  productoSuggestions: Producto[] = [];
  buscandoProducto = false;
  private productoSearch$ = new Subject<string>();

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: CotizacionesService,
    private maestro: MaestroService,
    private ventas: VentasService,
    private security: SecurityService,
    private modal: NgbModal,
    private toastr: ToastrService,
    private convertService: CotizacionConvertService
  ) {}

  /** True si la cotización en edición puede convertirse a pedido (aceptada). */
  get puedeConvertir(): boolean {
    return this.convertService.puedeConvertir(this.cotizacion);
  }

  /** Convierte la cotización a pedido (hidrata la venta asistida — spec 008.2). */
  convertirAPedido(): void {
    this.convertService.iniciar(this.cotizacion);
  }

  ngOnInit(): void {
    this.configurarBusquedaCliente();
    this.configurarBusquedaProducto();
    this.cotizacionId = this.route.snapshot.paramMap.get("id");

    if (this.cotizacionId) {
      this.cargar(this.cotizacionId);
    } else {
      this.inicializarNueva();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ---- Inicialización ----
  private inicializarNueva(): void {
    const hoy = new Date();
    this.fechaEmision = this.toInputDate(hoy);
    this.validezDias = this.VALIDEZ_DEFAULT;
    this.recalcularVencimiento();
    this.cotizacion.vendedor = this.vendedorActual();
    this.cargarTerminosDefault();
  }

  private cargar(id: string): void {
    this.loading = true;
    const sub = this.service.getById(id).subscribe({
      next: (res) => {
        const c = res && res.data;
        if (!c) {
          this.toastr.error("No se encontró la cotización.");
          this.loading = false;
          return;
        }
        this.cotizacion = {
          ...c,
          items: c.items || [],
          cliente: c.cliente || null,
          vendedor: c.vendedor || this.vendedorActual(),
        };
        // Fechas → inputs date.
        this.fechaEmision = this.toInputDate(
          c.fechaEmision || c.fechaCreacion || new Date()
        );
        if (c.fechaVencimiento) {
          this.fechaVencimiento = this.toInputDate(c.fechaVencimiento);
          this.validezDias =
            c.validezDias ?? this.diasEntre(this.fechaEmision, this.fechaVencimiento);
        } else {
          this.validezDias = c.validezDias ?? this.VALIDEZ_DEFAULT;
          this.recalcularVencimiento();
        }
        this.clienteTerm = this.clienteNombre(c.cliente);
        // Si no trae términos, precargar el default de empresa.
        if (!this.cotizacion.terminos) {
          this.cargarTerminosDefault();
        }
        this.loading = false;
      },
      error: () => {
        this.toastr.error("No se pudo cargar la cotización.");
        this.loading = false;
      },
    });
    this.subs.push(sub);
  }

  private cargarTerminosDefault(): void {
    const sub = this.service.getConfig().subscribe({
      next: (res) => {
        const base = res && res.data ? res.data.terminosBase : "";
        if (base && !this.cotizacion.terminos) {
          this.cotizacion.terminos = base;
        }
      },
      error: () => {
        /* términos quedan vacíos; editables a mano */
      },
    });
    this.subs.push(sub);
  }

  // ---- Vendedor (usuario en sesión) ----
  private vendedorActual(): VendedorCotizacion {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        email: u.email || "",
        nombre: u.name || u.nombre || u.email || "",
      };
    } catch {
      return { email: "", nombre: "" };
    }
  }

  get vendedorLabel(): string {
    const v = this.cotizacion.vendedor;
    return (v && (v.nombre || v.email)) || "—";
  }

  /**
   * Navega al pedido generado a partir de esta cotización (deep-link a la lista
   * de pedidos filtrada por nroPedido — ver ListOrdersComponent, query `nroPedido`).
   */
  verPedido(): void {
    const nro = this.cotizacion.pedidoGenerado;
    if (!nro) return;
    this.router.navigate(["/ventas/pedidos"], { queryParams: { nroPedido: nro } });
  }

  // ---- Picker de cliente ----
  private configurarBusquedaCliente(): void {
    const sub = this.clienteSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term || term.length < 2) {
            return of([] as any[]);
          }
          this.buscandoCliente = true;
          return this.maestro.searchClients(term, 10).pipe(
            catchError(() => of([] as any[]))
          );
        })
      )
      .subscribe((results: any) => {
        this.clienteSuggestions = (results as any[]) || [];
        this.buscandoCliente = false;
      });
    this.subs.push(sub);
  }

  onClienteInput(term: string): void {
    this.clienteTerm = term || "";
    if (!term) {
      this.clienteSuggestions = [];
    }
    this.clienteSearch$.next(this.clienteTerm);
  }

  seleccionarCliente(cli: any): void {
    this.cotizacion.cliente = cli as Cliente;
    this.clienteTerm = this.clienteNombre(cli);
    this.clienteSuggestions = [];
  }

  quitarCliente(): void {
    this.cotizacion.cliente = null;
    this.clienteTerm = "";
    this.clienteSuggestions = [];
  }

  /**
   * Abre el modal de cliente para crear uno nuevo y, al guardarlo, lo selecciona
   * en la cotización. Reusa `CrearClienteModalComponent` (ClientesSharedModule).
   * Si lo que se escribió en el buscador es un número de documento, se preplena.
   */
  crearCliente(): void {
    const ref = this.modal.open(CrearClienteModalComponent, {
      size: "lg",
      centered: true,
    });
    ref.componentInstance.isEdit = false;
    const term = (this.clienteTerm || "").trim();
    if (term && /^\d+$/.test(term)) {
      ref.componentInstance.documentoPrellenado = term;
    }
    ref.result.then(
      (result: any) => {
        // 'created' (nuevo) o 'existing_found' (ya existía): en ambos casos hay cliente.
        if (result && result.cliente) {
          this.seleccionarCliente(result.cliente);
        }
      },
      () => {
        /* dismiss → no hacer nada */
      }
    );
  }

  /**
   * Abre el modal de cliente en modo edición con el cliente seleccionado y
   * refleja los cambios en la cotización tras guardar.
   */
  editarCliente(): void {
    if (!this.cotizacion.cliente) {
      return;
    }
    const ref = this.modal.open(CrearClienteModalComponent, {
      size: "lg",
      centered: true,
    });
    ref.componentInstance.isEdit = true;
    ref.componentInstance.clienteData = this.cotizacion.cliente;
    const cdPrevio = (this.cotizacion.cliente as any)?.cd || (this.cotizacion.cliente as any)?.id;
    ref.result.then(
      (result: any) => {
        if (result && result.cliente) {
          // Preservar el doc id si el cliente refrescado no lo trae (para reeditar).
          const actualizado = { cd: cdPrevio, ...result.cliente };
          this.seleccionarCliente(actualizado);
        }
      },
      () => {
        /* dismiss → no hacer nada */
      }
    );
  }

  // ---- Picker de productos (T-19) ----
  private configurarBusquedaProducto(): void {
    const sub = this.productoSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term || term.length < 2) {
            return of({ products: [] } as any);
          }
          this.buscandoProducto = true;
          return this.ventas
            .quickSearchProducts(term, 20, "all")
            .pipe(catchError(() => of({ products: [] } as any)));
        })
      )
      .subscribe((res: any) => {
        this.productoSuggestions = (res && res.products) || [];
        this.buscandoProducto = false;
      });
    this.subs.push(sub);
  }

  onProductoInput(term: string): void {
    this.productoTerm = term || "";
    if (!term) {
      this.productoSuggestions = [];
    }
    this.productoSearch$.next(this.productoTerm);
  }

  /**
   * Agrega un producto a la cotización. Si requiere configuración abre el popup
   * (modo returnOnly → no toca el carrito de venta asistida); si no, arma la
   * línea directa con datos de entrega por defecto y precio por categoría.
   */
  agregarProducto(producto: Producto): void {
    if ((producto as any)?.exposicion?.activar === false) {
      this.toastr.warning("Este producto está inactivo.", "Producto inactivo");
      return;
    }
    if (this.requiereConfiguracion(producto)) {
      this.abrirPopupConfig(producto);
    } else {
      this.agregarDirecto(producto);
    }
    // Limpiar el buscador tras agregar.
    this.productoTerm = "";
    this.productoSuggestions = [];
  }

  /** Misma regla que venta asistida: ¿el producto necesita configuración? */
  requiereConfiguracion(producto: Producto): boolean {
    const pc: any = (producto as any)?.procesoComercial;
    if (!pc || !pc.configProcesoComercialActivo) {
      return false;
    }
    return (
      pc.llevaCalendario === true ||
      pc.aceptaVariable === true ||
      pc.llevaTarjeta === true ||
      pc.aceptaAdiciones === true ||
      pc.aceptaOcasion === true ||
      pc.aceptaGenero === true ||
      pc.aceptaComentarios === true ||
      pc.aceptaColorDecoracion === true
    );
  }

  /**
   * Abre `ConfProductToCartComponent` en modo aislado (returnOnly). Para que el
   * popup aplique el precio por categoría usa el cliente de la cotización: se
   * guarda y restaura `sessionStorage['cliente']` alrededor del modal para no
   * contaminar el estado de venta asistida.
   */
  private abrirPopupConfig(producto: Producto): void {
    const prevCliente = sessionStorage.getItem("cliente");
    try {
      if (this.cotizacion.cliente) {
        sessionStorage.setItem("cliente", JSON.stringify(this.cotizacion.cliente));
      }
    } catch {
      /* ignore */
    }

    const ref = this.modal.open(ConfProductToCartComponent, {
      centered: true,
      size: "xl",
      scrollable: true,
      windowClass: "modal-fullscreen",
    });
    const inst = ref.componentInstance as ConfProductToCartComponent;
    inst.producto = producto;
    inst.returnOnly = true;
    inst.modalRef = ref;

    const restaurar = () => {
      try {
        if (prevCliente === null) {
          sessionStorage.removeItem("cliente");
        } else {
          sessionStorage.setItem("cliente", prevCliente);
        }
      } catch {
        /* ignore */
      }
    };

    ref.result.then(
      () => restaurar(),
      (resultado: any) => {
        // dismiss(ProductoCompra) → llega como "reason".
        if (resultado && resultado.producto) {
          this.cotizacion.items = [...this.cotizacion.items, resultado as Carrito];
        }
        restaurar();
      }
    );
  }

  /** Línea directa (sin popup) para productos que no requieren configuración. */
  private agregarDirecto(producto: Producto): void {
    const productoConPrecio = this.aplicarPrecioCategoria(producto);
    const cantidadMinima = (producto as any)?.disponibilidad?.cantidadMinVenta || 1;
    const hoy = new Date();
    const datosEntrega = {
      fechaEntrega: {
        day: hoy.getDate(),
        month: hoy.getMonth() + 1,
        year: hoy.getFullYear(),
      },
      formaEntrega: "Envío a Domicilio",
      horarioEntrega: "LO MAS PRONTO POSIBLE",
      tipoEntrega: null,
      genero: null,
      ocasion: null,
      colores: [],
      observaciones: null,
    };
    const linea: Carrito = {
      producto: productoConPrecio,
      configuracion: {
        producto: productoConPrecio,
        datosEntrega,
        cantidad: cantidadMinima,
        preferencias: [],
        adiciones: [],
        tarjetas: [],
      } as any,
      cantidad: cantidadMinima,
    };
    this.cotizacion.items = [...this.cotizacion.items, linea];
    this.toastr.success(
      (this.itemTitulo(linea) || "Producto") + " agregado",
      "Agregado",
      { timeOut: 2000, positionClass: "toast-bottom-right" }
    );
  }

  /**
   * Réplica de `obtenerProductoConPrecioCategoria` de venta asistida, pero usando
   * el cliente de la cotización (no sessionStorage). Si el cliente tiene categoría
   * y el producto tiene precio para esa categoría, devuelve una copia con el precio
   * ajustado; si no, el producto original.
   */
  private aplicarPrecioCategoria(producto: Producto): any {
    const categoriaId = (this.cotizacion.cliente as any)?.categoria?.id;
    if (!categoriaId) return producto;
    const preciosPorTipo = (producto as any)?.preciosPorTipoCliente;
    if (!Array.isArray(preciosPorTipo) || preciosPorTipo.length === 0) {
      return producto;
    }
    const pc = preciosPorTipo.find(
      (p: any) => p.tipoClienteId === categoriaId && p.activo === true
    );
    if (!pc) return producto;
    return {
      ...producto,
      precio: {
        ...(producto as any).precio,
        precioUnitarioConIva: pc.precioConIva,
        precioUnitarioSinIva: pc.precio,
        valorIva: pc.valorIva,
        precioUnitarioIva: pc.porcentajeIva ?? (producto as any)?.precio?.precioUnitarioIva,
      },
      _precioAplicadoPorCategoria: {
        tipoClienteId: pc.tipoClienteId,
        tipoClienteNombre: pc.tipoClienteNombre,
        precioOriginalConIva: (producto as any)?.precio?.precioUnitarioConIva,
        precioOriginalSinIva: (producto as any)?.precio?.precioUnitarioSinIva,
      },
    };
  }

  /** Ítem libre (sin producto del catálogo). */
  agregarItemLibre(): void {
    const linea: Carrito = {
      producto: {
        crearProducto: { titulo: "" },
        precio: { precioUnitarioConIva: 0, precioUnitarioSinIva: 0, valorIva: 0 },
      } as any,
      configuracion: { cantidad: 1 } as any,
      cantidad: 1,
    };
    this.cotizacion.items = [...this.cotizacion.items, linea];
  }

  eliminarItem(index: number): void {
    this.cotizacion.items = this.cotizacion.items.filter((_, i) => i !== index);
  }

  setCantidad(item: Carrito, value: number): void {
    const n = Math.max(1, Math.floor(Number(value) || 1));
    item.cantidad = n;
    if (item.configuracion) (item.configuracion as any).cantidad = n;
  }

  // ---- Helpers de presentación de producto / línea ----
  productoTitulo(p: Producto): string {
    return (p as any)?.crearProducto?.titulo || (p as any)?.identificacion?.referencia || "—";
  }

  productoReferencia(p: Producto): string {
    return (p as any)?.identificacion?.referencia || "";
  }

  productoPrecio(p: Producto): number {
    return (p as any)?.precio?.precioUnitarioConIva || 0;
  }

  itemTitulo(item: Carrito): string {
    return (item?.producto as any)?.crearProducto?.titulo || "—";
  }

  itemReferencia(item: Carrito): string {
    return (item?.producto as any)?.identificacion?.referencia || "";
  }

  // ---- T-20: precio/IVA por línea (réplica del carrito de venta asistida) ----

  /** Ítems libres y productos con `permitePrecioManual` admiten editar el precio base. */
  permitePrecioManual(item: Carrito): boolean {
    if (this.itemEsLibre(item)) return true;
    return (item?.producto as any)?.procesoComercial?.permitePrecioManual === true;
  }

  /**
   * Rango de precio por volumen que aplica a la cantidad del ítem (o null).
   * Réplica del carrito (`checkIVAPrice`): NO aplica volumen si el precio ya viene
   * por categoría de cliente (categoría > volumen). Tampoco si hay override manual.
   */
  private getRangoVolumen(item: Carrito): any {
    if ((item?.producto as any)?._precioAplicadoPorCategoria) return null;
    if (item?._precioManualOverride !== undefined && item?._precioManualOverride !== null && this.permitePrecioManual(item)) return null;
    if (item?._ivaManualOverride !== undefined && item?._ivaManualOverride !== null) return null;
    const preciosVolumen = (item?.producto as any)?.precio?.preciosVolumen;
    if (!Array.isArray(preciosVolumen) || preciosVolumen.length === 0) return null;
    const cantidad = Number(item?.cantidad) || 0;
    for (const x of preciosVolumen) {
      const tieneMin = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
      const tieneMax = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
      if (!tieneMin || !tieneMax) continue;
      const ini = Number(x.numeroUnidadesInicial) || 0;
      const lim = Number(x.numeroUnidadesLimite) || Infinity;
      if (cantidad >= ini && cantidad <= lim) return x;
    }
    return null;
  }

  /** % de IVA vigente: override manual → volumen → del producto. */
  getIvaActual(item: Carrito): number {
    if (item?._ivaManualOverride !== undefined && item?._ivaManualOverride !== null) {
      return Number(item._ivaManualOverride);
    }
    const rango = this.getRangoVolumen(item);
    if (rango) return Number(rango.valorIVAPorVolumen) || 0;
    return Number((item?.producto as any)?.precio?.precioUnitarioIva) || 0;
  }

  /**
   * Precio unitario CON IVA aplicando overrides (réplica de `checkPriceScale`).
   * - `_precioManualOverride` se interpreta como precio BASE (sin IVA) y se le
   *   aplica el IVA vigente, solo si el ítem permite precio manual.
   * - `_ivaManualOverride` recalcula desde el precio sin IVA del producto.
   * - sin overrides, usa el precio con IVA del producto.
   */
  itemPrecio(item: Carrito): number {
    const precio = (item?.producto as any)?.precio;
    // Prioridad 0: override manual de precio (base sin IVA × (1+IVA)).
    if (
      item?._precioManualOverride !== undefined &&
      item?._precioManualOverride !== null &&
      this.permitePrecioManual(item)
    ) {
      const base = Number(item._precioManualOverride) || 0;
      const iva = this.getIvaActual(item);
      return base * (1 + iva / 100);
    }
    // Prioridad 0b: override manual de IVA.
    if (item?._ivaManualOverride !== undefined && item?._ivaManualOverride !== null) {
      const precioSinIva = Number(precio?.precioUnitarioSinIva) || 0;
      return precioSinIva * (1 + item._ivaManualOverride / 100);
    }
    // Prioridad 2: precio por volumen según la cantidad. (La categoría, si aplica, ya
    // está horneada en precioUnitarioConIva y getRangoVolumen la excluye → categoría > volumen.)
    const rango = this.getRangoVolumen(item);
    if (rango) {
      return Number(rango.valorUnitarioPorVolumenConIVA) || 0;
    }
    // Prioridad 3: precio base (o el de categoría ya horneado).
    return Number(precio?.precioUnitarioConIva) || 0;
  }

  /** Precio unitario CON IVA original (sin overrides) — para el tachado. */
  itemPrecioOriginal(item: Carrito): number {
    return Number((item?.producto as any)?.precio?.precioUnitarioConIva) || 0;
  }

  /** Precio unitario SIN IVA (deriva del precio con IVA y el IVA vigente). */
  getPrecioSinIva(item: Carrito): number {
    const iva = this.getIvaActual(item);
    return this.itemPrecio(item) / (1 + iva / 100);
  }

  /** Valor del IVA por unidad. */
  getValorIva(item: Carrito): number {
    return this.itemPrecio(item) - this.getPrecioSinIva(item);
  }

  /** ¿La línea tiene algún override manual (precio o IVA)? */
  tieneOverride(item: Carrito): boolean {
    return (
      (item?._precioManualOverride !== undefined && item?._precioManualOverride !== null) ||
      (item?._ivaManualOverride !== undefined && item?._ivaManualOverride !== null)
    );
  }

  /** Guarda el valor temporal mientras el usuario escribe (permite vacío). */
  onPrecioManualInput(item: Carrito, value: any): void {
    if (!item) return;
    item._precioManualTemp = value;
    if (value !== "" && value !== null && value !== undefined) {
      item._precioManualOverride = Number(value);
    }
  }

  /** Al confirmar (blur/enter): vacío o inválido restaura el precio original. */
  onPrecioManualConfirm(item: Carrito): void {
    if (!item) return;
    const temp = item._precioManualTemp;
    if (
      temp === "" ||
      temp === null ||
      temp === undefined ||
      isNaN(Number(temp)) ||
      Number(temp) < 0
    ) {
      item._precioManualOverride = undefined;
    } else {
      item._precioManualOverride = Number(temp);
    }
    delete item._precioManualTemp;
  }

  /** Cambia el % de IVA de la línea. */
  onIvaManualChange(item: Carrito, value: any): void {
    if (!item) return;
    const iva = Number(value);
    if (isNaN(iva) || iva < 0) return;
    item._ivaManualOverride = iva;
  }

  /** % de descuento de la línea (0–100), saneado. */
  descLineaPct(item: Carrito): number {
    const d = Number(item?.descuentoLinea) || 0;
    return Math.min(100, Math.max(0, d));
  }

  onDescLineaChange(item: Carrito, value: any): void {
    if (!item) return;
    let d = Number(value);
    if (isNaN(d) || d < 0) d = 0;
    if (d > 100) d = 100;
    item.descuentoLinea = d;
  }

  /** Subtotal de la línea CON IVA, ya aplicado el descuento de línea. */
  itemSubtotal(item: Carrito): number {
    const bruto = this.itemPrecio(item) * (item?.cantidad || 0);
    return bruto * (1 - this.descLineaPct(item) / 100);
  }

  /** Subtotal de la línea CON IVA, ANTES del descuento de línea (para tachado). */
  itemSubtotalBruto(item: Carrito): number {
    return this.itemPrecio(item) * (item?.cantidad || 0);
  }

  itemEsLibre(item: Carrito): boolean {
    return !(item?.producto as any)?.identificacion?.referencia;
  }

  /**
   * Precios por tipo de cliente (segmentación) definidos para el producto de la
   * línea. Indicador informativo: nombre de la categoría + precio. Marca como
   * `aplicado` el segmento que coincide con la categoría del cliente seleccionado
   * (el que efectivamente determina el precio de la línea).
   * Devuelve [] para empresas sin segmentación o ítems libres.
   */
  preciosSegmento(item: Carrito): { nombre: string; precio: number; aplicado: boolean }[] {
    if (this.itemEsLibre(item)) return [];
    const lista = (item?.producto as any)?.preciosPorTipoCliente;
    if (!Array.isArray(lista) || lista.length === 0) return [];
    const categoriaId = (this.cotizacion.cliente as any)?.categoria?.id;
    return lista
      .filter((p: any) => p && p.activo === true)
      .map((p: any) => ({
        nombre: p.tipoClienteNombre || p.tipoClienteId || "Segmento",
        precio: Number(p.precioConIva) || 0,
        aplicado: !!categoriaId && p.tipoClienteId === categoriaId,
      }));
  }

  // ---- Fechas / validez ----
  onEmisionChange(value: string): void {
    this.fechaEmision = value;
    this.recalcularVencimiento();
    this.reactivarSiVencidaExtendida();
  }

  onValidezChange(dias: number): void {
    this.validezDias = Number(dias) || 0;
    this.recalcularVencimiento();
    this.reactivarSiVencidaExtendida();
  }

  onVencimientoChange(value: string): void {
    this.fechaVencimiento = value;
    this.validezDias = this.diasEntre(this.fechaEmision, this.fechaVencimiento);
    this.reactivarSiVencidaExtendida();
  }

  private recalcularVencimiento(): void {
    const base = this.fromInputDate(this.fechaEmision) || new Date();
    const venc = new Date(base);
    venc.setDate(venc.getDate() + (Number(this.validezDias) || 0));
    this.fechaVencimiento = this.toInputDate(venc);
  }

  /**
   * Reactiva una cotización VENCIDA cuando se extiende la vigencia a una fecha
   * futura: vuelve al estado 'enviada' y re-emite con fecha de hoy (D-045).
   * La vigencia elegida por el usuario se conserva; la validez se recalcula
   * desde hoy. No hace nada si la cotización no está vencida o sigue caducada.
   */
  private reactivarSiVencidaExtendida(): void {
    if (this.cotizacion.estadoCotizacion !== ("vencida" as EstadoCotizacion)) return;
    const venc = this.fromInputDate(this.fechaVencimiento);
    if (!venc) return;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (venc.getTime() < hoy.getTime()) return; // sigue vencida

    this.cotizacion.estadoCotizacion = "enviada" as EstadoCotizacion;
    this.fechaEmision = this.toInputDate(new Date());
    this.validezDias = this.diasEntre(this.fechaEmision, this.fechaVencimiento);
    this.toastr.info(
      "Cotización reactivada: estado 'Enviada' y emisión actualizada a hoy.",
      "Reactivada",
      { timeOut: 3500 }
    );
  }

  // ---- Helpers de presentación de cliente ----
  clienteNombre(cli: any): string {
    if (!cli) return "";
    return (
      cli.razonSocial ||
      cli.nombre ||
      [cli.nombres_completos, cli.apellidos_completos].filter(Boolean).join(" ") ||
      cli.nombreComercial ||
      cli.documento ||
      ""
    );
  }

  clienteDocumento(cli: any): string {
    if (!cli) return "";
    return cli.documento || "";
  }

  clienteCorreo(cli: any): string {
    if (!cli) return "";
    return cli.correo_electronico_comprador || cli.correo || cli.email || "";
  }

  clienteCelular(cli: any): string {
    if (!cli) return "";
    const ind = cli.indicativo_celular_comprador || "";
    const num = cli.numero_celular_comprador || cli.celular || cli.telefono || "";
    return [ind, num].filter(Boolean).join(" ");
  }

  clienteCiudad(cli: any): string {
    if (!cli) return "";
    return cli.ciudad || cli.municipio || cli.ciudad_comprador || "";
  }

  /**
   * Tipo de cliente (segmentación) a mostrar como indicador. La fuente
   * autoritativa es `categoria` (la misma que define el precio por tipo de
   * cliente); si el cliente solo trae el `tipoCliente` del formulario, se usa
   * como respaldo (solo display, sin efecto en precios).
   */
  clienteTipo(cli: any): string {
    if (!cli) return "";
    return (
      cli.categoria?.nombre ||
      cli.categoria?.descripcion ||
      cli.tipoCliente ||
      ""
    );
  }

  /** Meta del cliente para el documento: documento · ciudad · correo. */
  clienteMetaDoc(cli: any): string {
    return [
      this.clienteDocumento(cli),
      this.clienteCiudad(cli),
      this.clienteCorreo(cli),
    ]
      .filter(Boolean)
      .join(" · ");
  }

  // ---- Datos de empresa para el encabezado del documento ----

  /** Nombre comercial / razón social usado como "logo" textual del documento. */
  get empresaNombre(): string {
    const e = this.security.getCompanyInformationLogged();
    return (e && ((e as any).nombreComercio || e.razonSocial)) || "Cotización";
  }

  /** Línea secundaria del encabezado: razón social · NIT (si difiere). */
  get empresaMeta(): string {
    const e = this.security.getCompanyInformationLogged();
    const razon = (e && e.razonSocial) || "";
    let nit = "";
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      nit = user && user.nit ? `NIT ${user.nit}` : "";
    } catch {
      nit = "";
    }
    return [razon !== this.empresaNombre ? razon : "", nit]
      .filter(Boolean)
      .join(" · ");
  }

  /** Precio unitario SIN IVA para la columna "Precio" del documento. */
  docPrecioUnit(item: Carrito): number {
    return this.getPrecioSinIva(item);
  }

  get clienteSeleccionado(): any | null {
    return this.cotizacion.cliente || null;
  }

  // ---- T-21: totales + descuento por línea + descuento global ----

  /** Subtotal BRUTO: suma de bases SIN IVA por línea (precio sin IVA × cantidad), antes de descuentos. */
  get subtotal(): number {
    return (this.cotizacion.items || []).reduce(
      (acc, item) => acc + this.getPrecioSinIva(item) * (item?.cantidad || 0),
      0
    );
  }

  /** Suma de descuentos por línea (sobre base SIN IVA). */
  get totalDescuentoLineas(): number {
    return (this.cotizacion.items || []).reduce(
      (acc, item) =>
        acc +
        this.getPrecioSinIva(item) * (item?.cantidad || 0) * (this.descLineaPct(item) / 100),
      0
    );
  }

  /** Subtotal SIN IVA neto de descuentos por línea (base para el descuento global). */
  private get subtotalNetoLineas(): number {
    return this.subtotal - this.totalDescuentoLineas;
  }

  /** IVA por línea ya neto del descuento de línea (antes del descuento global). */
  private get ivaNetoLineas(): number {
    return (this.cotizacion.items || []).reduce(
      (acc, item) =>
        acc +
        this.getValorIva(item) * (item?.cantidad || 0) * (1 - this.descLineaPct(item) / 100),
      0
    );
  }

  /** % de descuento global (0–100), saneado. */
  get descGlobalPct(): number {
    const d = Number(this.cotizacion.descGlobal) || 0;
    return Math.min(100, Math.max(0, d));
  }

  /** Valor del descuento global (sobre el subtotal ya neto de descuentos por línea). */
  get totalDescuentoGlobal(): number {
    return this.subtotalNetoLineas * (this.descGlobalPct / 100);
  }

  /** Descuento total mostrado: descuentos por línea + descuento global. */
  get totalDescuento(): number {
    return this.totalDescuentoLineas + this.totalDescuentoGlobal;
  }

  /** Base gravable: subtotal bruto menos todos los descuentos. */
  get baseGravable(): number {
    return this.subtotal - this.totalDescuento;
  }

  /** IVA sobre la base ya descontada (descuentos de línea y global aplican antes de IVA). */
  get totalImpuesto(): number {
    return this.ivaNetoLineas * (1 - this.descGlobalPct / 100);
  }

  /** Total a pagar. */
  get total(): number {
    return this.baseGravable + this.totalImpuesto;
  }

  onDescGlobalChange(value: any): void {
    let d = Number(value);
    if (isNaN(d) || d < 0) d = 0;
    if (d > 100) d = 100;
    this.cotizacion.descGlobal = d;
  }

  // ---- Estado ----
  get estado(): EstadoCotizacion {
    return this.cotizacion.estadoCotizacion;
  }

  /**
   * Estados que el usuario puede fijar manualmente desde el editor.
   * `vencida` y `convertida` son derivados del sistema (expiración / conversión a
   * pedido) y no se asignan a mano.
   */
  get estadosEditables(): { value: EstadoCotizacion; label: string }[] {
    return ESTADOS_COTIZACION.filter(
      (e) => e.value !== "vencida" && e.value !== "convertida"
    );
  }

  estadoLabel(value: EstadoCotizacion): string {
    return (
      ESTADOS_COTIZACION.find((e) => e.value === value)?.label || value
    );
  }

  cambiarEstado(value: EstadoCotizacion): void {
    this.cotizacion.estadoCotizacion = value;
  }

  // ---- T-22: guardar (create/edit) + validaciones ----

  /** ¿La cotización tiene lo mínimo para guardarse? (cliente + ≥1 producto). */
  get puedeGuardar(): boolean {
    return !!this.cotizacion.cliente && (this.cotizacion.items || []).length > 0;
  }

  guardar(): void {
    if (this.saving) return;

    // Validaciones (EARS persistencia: cliente + ≥1 producto).
    if (!this.cotizacion.cliente) {
      this.toastr.warning("Selecciona un cliente antes de guardar.", "Falta el cliente");
      return;
    }
    if (!this.cotizacion.items || this.cotizacion.items.length === 0) {
      this.toastr.warning("Agrega al menos un producto.", "Sin productos");
      return;
    }
    // Ítems libres deben tener descripción.
    const libreSinNombre = this.cotizacion.items.some(
      (it) =>
        this.itemEsLibre(it) &&
        !((it?.producto as any)?.crearProducto?.titulo || "").trim()
    );
    if (libreSinNombre) {
      this.toastr.warning("Hay un ítem libre sin descripción.", "Ítem incompleto");
      return;
    }

    const emisionIso =
      this.fromInputDate(this.fechaEmision)?.toISOString() || new Date().toISOString();
    const vencIso = this.fromInputDate(this.fechaVencimiento)?.toISOString();

    // Payload: totales del frontend (source of truth, backend no recalcula — T-04).
    const payload: Cotizacion = {
      ...this.cotizacion,
      vendedor: this.cotizacion.vendedor || this.vendedorActual(),
      descGlobal: this.descGlobalPct,
      subtotal: this.subtotal,
      totalDescuento: this.totalDescuento,
      baseGravable: this.baseGravable,
      totalImpuesto: this.totalImpuesto,
      total: this.total,
      fechaEmision: emisionIso,
      fechaVencimiento: vencIso,
      validezDias: this.validezDias,
    };

    this.saving = true;
    // `any`: la unión de los dos Observable (edit/create) no expone una firma de
    // `.subscribe` combinable; ambos respondan `{ success }` para nuestro uso.
    const req$: any = this.cotizacionId
      ? this.service.edit({ ...payload, id: this.cotizacionId })
      : this.service.create(payload);

    const sub = req$.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res && res.success === false) {
          this.toastr.error(res.message || "No se pudo guardar la cotización.");
          return;
        }
        this.toastr.success(
          this.cotizacionId ? "Cotización actualizada." : "Cotización creada.",
          "Guardado"
        );
        this.router.navigate(["/cotizaciones"]);
      },
      error: () => {
        this.saving = false;
        this.toastr.error("No se pudo guardar la cotización.");
      },
    });
    this.subs.push(sub);
  }

  // ---- T-23: PDF (jsPDF + autoTable) ----

  /** Formatea un valor como moneda COP (sin decimales). */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  /** Texto descriptivo de una línea para el PDF / WhatsApp. */
  private itemDescripcion(item: Carrito): string {
    const titulo = this.itemTitulo(item);
    const ref = this.itemReferencia(item);
    return ref ? `${titulo} (Ref: ${ref})` : titulo;
  }

  // ---- Vista previa del documento (mismo HTML que el PDF) ----

  /** Abre el overlay con la vista previa del documento para el cliente. */
  abrirVistaPrevia(): void {
    if (!this.puedeGuardar) {
      this.toastr.warning(
        "Agrega un cliente y al menos un producto para ver la cotización.",
        "Faltan datos"
      );
      return;
    }
    this.showPreview = true;
  }

  cerrarVistaPrevia(): void {
    this.showPreview = false;
  }

  /**
   * Genera y descarga el PDF capturando el documento HTML (`#docCapture`) con
   * html2pdf.js — el mismo marcado que muestra la vista previa, de modo que el
   * PDF y la previsualización son idénticos al diseño de referencia. html2pdf se
   * importa dinámicamente para no engordar el bundle inicial del módulo.
   */
  async descargarPDF(): Promise<void> {
    if (this.generandoPDF) return;
    if (!this.puedeGuardar) {
      this.toastr.warning(
        "Agrega un cliente y al menos un producto para generar el PDF.",
        "Faltan datos"
      );
      return;
    }
    this.generandoPDF = true;
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const element = this.docCapture?.nativeElement?.querySelector(".cot-doc");
      if (!element) {
        throw new Error("Documento no encontrado");
      }

      const filename = `cotizacion-${this.cotizacion.nroCotizacion || "borrador"}.pdf`;
      const options = {
        margin: [10, 10, 12, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().from(element).set(options).save();
    } catch (e) {
      this.toastr.error("No se pudo generar el PDF.");
    } finally {
      this.generandoPDF = false;
    }
  }

  // ---- T-24: enviar por WhatsApp ----

  /**
   * Abre WhatsApp (wa.me) con un mensaje prellenado (número, total, validez). Usa
   * el celular del cliente si está disponible; si no, abre WhatsApp sin destino.
   */
  enviarWhatsApp(): void {
    if (!this.puedeGuardar) {
      this.toastr.warning(
        "Agrega un cliente y al menos un producto para compartir.",
        "Faltan datos"
      );
      return;
    }
    // El link público necesita una cotización guardada (con id).
    if (!this.cotizacionId) {
      this.toastr.info(
        "Guarda la cotización antes de compartir el enlace de aprobación.",
        "Guarda primero"
      );
      return;
    }

    this.compartiendo = true;
    this.service.generarShareToken(this.cotizacionId).subscribe({
      next: (res) => {
        this.compartiendo = false;
        const token = res?.data?.token || "";
        const link = token ? `${window.location.origin}/c/${token}` : "";
        // Compartir = enviar: refleja localmente el cambio de estado del backend.
        if (this.cotizacion.estadoCotizacion === "borrador") {
          this.cotizacion.estadoCotizacion = "enviada" as any;
        }

        const cli = this.cotizacion.cliente as any;
        const telefono = (this.clienteCelular(cli) || "").replace(/\D/g, "");
        const lineas = [
          `Hola ${this.clienteNombre(cli) || ""}`.trim() + ",",
          "",
          `Te comparto la cotización ${this.cotizacion.nroCotizacion || ""}.`,
          `Total: ${this.formatCurrency(this.total)}`,
          this.fechaVencimiento ? `Válida hasta: ${this.fechaVencimiento}` : "",
          link ? "" : null,
          link ? `Puedes verla y aprobarla aquí: ${link}` : null,
          "",
          "Quedo atento(a) a tus comentarios.",
        ].filter((l) => l !== null && l !== undefined);

        const mensaje = encodeURIComponent(lineas.join("\n"));
        const url = telefono
          ? `https://wa.me/${telefono}?text=${mensaje}`
          : `https://wa.me/?text=${mensaje}`;
        window.open(url, "_blank");
      },
      error: () => {
        this.compartiendo = false;
        this.toastr.error("No se pudo generar el enlace para compartir.", "Error");
      },
    });
  }

  // ---- Navegación ----
  volver(): void {
    this.router.navigate(["/cotizaciones"]);
  }

  // ---- Utilidades de fecha (input date <-> ISO) ----
  private toInputDate(value: string | Date): string {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private fromInputDate(value: string): Date | null {
    if (!value) return null;
    const d = new Date(value + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  private diasEntre(desde: string, hasta: string): number {
    const a = this.fromInputDate(desde);
    const b = this.fromInputDate(hasta);
    if (!a || !b) return this.VALIDEZ_DEFAULT;
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  }
}
