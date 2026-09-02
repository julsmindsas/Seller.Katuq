import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  AfterViewChecked,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from "@angular/animations";
import { InfoIndicativos } from "../../../../Mock/indicativosPais";
import { InfoPaises } from "../../../../Mock/pais-estado-ciudad";
import { DaneCodesService } from "../../../shared/services/dane-codes.service";
import { MunicipioDane } from "../../../shared/data/colombia-dane-codes";
import { normalizarCiudad } from "../../../shared/utils/ciudad.util";
import { zonaCubreCiudad } from "../../../shared/util/zona-cobro.util";
import { QuickViewComponent } from "../quick-view/quick-view.component";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { CarritoComponent } from "../carrito/carrito.component";
import {
  EstadoPago,
  EstadoProceso,
  Notas,
  Pedido,
  Channel,
} from "../modelo/pedido";
import { EcomerceProductsComponent } from "../catalogo/ecomerce-products/ecomerce-products.component";
import { ConfProductToCartComponent } from "../catalogo/conf-product-to-cart/conf-product-to-cart.component";
import { NotasComponent } from "../notas/notas/notas.component";
import { CheckOutComponent } from "../checkout/checkout.component";
import { ConfirmComponent } from "../confirm/confirm.component";
import { MovingDirection, WizardComponent } from "angular-archwizard";
import { ActivatedRoute } from "@angular/router";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import { PaymentService } from "../../../shared/services/ventas/payment.service";
import { CartSingletonService } from "../../../shared/services/ventas/cart.singleton.service";
import { CotizacionesService } from "../../cotizaciones/cotizaciones.service";
import { NgxHotkeysService } from "@balticcode/ngx-hotkeys";
import { ToastrService } from "ngx-toastr";
import { UtilsService } from "../../../shared/services/utils.service";
import { FacturacionIntegracionService } from "../../../shared/services/integraciones/facturas/facturacion.service";
import { environment } from "../../../../environments/environment";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";
import { InventarioService } from "../../../shared/services/inventarios/inventario.service";
import { IntegrationsService } from "../../integrations/integrations.service";
import { Subscription, Subject, of } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap, catchError } from "rxjs/operators";

@Component({
  selector: "app-pedido",
  templateUrl: "./crear-ventas.component.html",
  styleUrls: ["./crear-ventas.component.scss"],
  animations: [
    trigger("slideInOut", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(-20px)" }),
        animate(
          "300ms ease-in",
          style({ opacity: 1, transform: "translateY(0)" }),
        ),
      ]),
      transition(":leave", [
        animate(
          "300ms ease-out",
          style({ opacity: 0, transform: "translateY(-20px)" }),
        ),
      ]),
    ]),
  ],
})
export class CrearVentasComponent
  implements OnInit, AfterViewChecked, OnChanges, OnDestroy
{
  @ViewChild("quickView") QuickView: QuickViewComponent;
  @ViewChild("carrito") carrito: CarritoComponent;
  @ViewChild("products", { static: false })
  productos: EcomerceProductsComponent;
  @ViewChild("notaspedidos") notaspedido: NotasComponent;
  @ViewChild("resumen") resumen: CheckOutComponent;
  @ViewChild("confirmacion") confirmacion: ConfirmComponent;
  @ViewChild("wizard") mywizard: WizardComponent;
  @ViewChild(WizardComponent) public wizard: WizardComponent;
  @ViewChild("whatsapp") whatsapp: ElementRef;
  @Input() isEditing: boolean = false;
  public openSidebar: boolean = true;
  public isCollapsed1 = false;
  public isCollapsed = false;
  public listView: boolean = false;
  formulario: FormGroup;
  public col: string = "3";
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  thirdFormGroup: FormGroup;
  fourthFormGroup: FormGroup;
  generarFacturaElectronica: boolean = false;
  maxDate: Date;
  indicativos: {
    nombre: string;
    name: string;
    nom: string;
    iso2: string;
    iso3: string;
    phone_code: string;
  }[];
  datos: any;
  formularioFacturacion: any;
  formularioEntrega: any;
  encontrado: boolean = false;
  departamentos: string[];
  pais: string = "Colombia";
  departamento: string = "Antioquia";
  ciudades: string[] = [];
  ciudadesOrigen: { value: string; label: string }[];
  pais_entrega: string;
  departamentos1: string[];
  direccion_facturacion: any;
  alias_facturacion: any;
  codigo_postal: any;
  departamento_entrega: string;
  ciudades1: string[];
  ciudadesOrigen1: { value: string; label: string }[];

  // Propiedades para DANE codes
  departamentosDane: string[] = [];
  municipiosDane: MunicipioDane[] = [];
  searchQueryCiudadDane: string = '';
  cargandoCiudadesDane: boolean = false;
  usarDaneCiudadEntrega: boolean = false;
  departamentoDaneSeleccionado: string = '';
  bloqueado: boolean;
  facturacionElectronica: boolean = false;
  razon_social: any;
  ciudad_municipio: any;
  tipo_documento_facturacion: any;
  numero_documento_facturacion: any;
  indicativo_celular_facturacion: any;
  numero_celular_facturacion: any;
  correo_electronico_facturacion: any;
  indicativo_celular_entrega2: any;
  paises: string[];
  barrio: any;
  ciudad_municipio_entrega: any;
  zona_cobro: any;
  codigo_postal_entrega: any;
  entregar: boolean;
  apellidos_entrega: any;
  otro_numero_entrega: any;
  direccion_entrega: any;
  nombreUnidad: any;
  observaciones: any;
  especificacionesInternas: any;
  alias_entrega: any;
  nombres_entrega: any;
  indicativo_celular_entrega: any;
  numero_celular_entrega: any;
  datosFacturacionElectronica: any;
  activarDatosFact: boolean;
  datosEntregas: any = [];
  activarDatosEntrega: boolean;
  editandodato: boolean;

  // Autocompletado de clientes
  clienteSuggestions: any[] = [];
  isSearchingCliente: boolean = false;
  selectedClienteAutocomplete: any = null;
  private clienteSearchSubject = new Subject<string>();
  private clienteSearchSubscription: Subscription;

  idenxFacturacion: any;
  idenxEntrega: any;
  @Input() pedidoGral: Pedido;
  pedidoPrm: string;
  showPedidoConfirm: boolean = false;
  showSteper: boolean = true;
  empresaActual: any;
  data: any[] = [
    {
      RefDatEntrega: "R001",
      Nombres: "John",
      Apellidos: "Doe",
      IndicativoCel: "+57",
      NumCel: "3001234567",
      IndicativoOtroTel: "+57",
      NumOtroTel: "4001234567",
      Direccion: "Calle 123 #45-67",
      NombreUnidadOEdificio: "Edificio A",
      TorreAptoOficina: "Apto 101",
      ObservacionesAdicionales: "Entregar antes de las 5 PM",
      Barrio: "Modelia",
      Pais: "Colombia",
      Departamento: "Antioquia",
      Ciudad: "Medellín",
      ZonaCobro: "Zona Centro 2",
      CodigoPostal: "050012",
    },
    {
      RefDatEntrega: "R002",
      Nombres: "Jane",
      Apellidos: "Doe",
      IndicativoCel: "+57",
      NumCel: "3007654321",
      IndicativoOtroTel: "+57",
      NumOtroTel: "4007654321",
      Direccion: "Calle 124 #46-68",
      NombreUnidadOEdificio: "Edificio B",
      TorreAptoOficina: "Apto 102",
      ObservacionesAdicionales: "Dejar en la portería",
      Barrio: "Centro",
      Pais: "Colombia",
      Departamento: "Antioquia",
      Ciudad: "Medellín",
      ZonaCobro: "Zona Centro 2",
      CodigoPostal: "050013",
    },
  ];
  file: File;
  jsonData: unknown[];
  numberProduct: string;
  pedidoSinGuardar: boolean;
  filteredResults: any;
  allBillingZone: any;
  valor_zona_cobro: any;
  carrito1: any;
  activarEntrega: boolean = true;
  esRecogeEnTienda: boolean = false;
  documentoBuscar: any;

  // Propiedades para selector de forma de entrega (pedidos sin configuración)
  formasEntregaOptions: { value: string; label: string; icon: string }[] = [
    { value: 'Domicilio', label: 'Envío a Domicilio', icon: 'fa-truck' },
    { value: 'Recoge', label: 'Recoge en Tienda', icon: 'fa-store' }
  ];
  selectedFormaEntrega: string = 'Domicilio';
  pedidoSinConfiguracion: boolean = false;

  @Input("icon") public icon;

  public col1: string = "4";
  public col2: string = "6";

  originalDataEntregas: any[];
  originalDataFacturacionElectronica: any[];
  nextAvailable: boolean;
  datosEntregaNoEncontradosParaCiudadSeleccionada: boolean;
  mostrarFormularioCliente: boolean = false;
  clienteRecienCreado: boolean = false;
  notasClienteExpanded: boolean = false;
  notasPedidoExpanded: boolean = false;
  creandoCliente: boolean = false;
  public bodegas: any[] = [];
  public selectedWarehouse: string = "";
  public selectedCity: string = "";
  public bodega: any = null;
  isChannelManual: boolean = true;

  /**
   * Catálogo sin inventario: muestra solo los productos que se venden bajo
   * pedido. No pertenecen a ninguna bodega, así que al activarlo el catálogo
   * aparece de una vez, sin exigir bodega ni ciudad.
   */
  public catalogoSinInventario: boolean = false;

  // Formulario y propiedades para notas de cliente
  notasClienteForm: FormGroup;
  fechaActual: Date;

  private subscription: Subscription;

  /**
   * Variable reactiva para rastrear si hay productos en el carrito.
   * Se actualiza automáticamente cuando cambia el carrito.
   */
  public tieneProductosEnCarrito: boolean = false;

  /**
   * D-147: true si alguna línea del carrito viene de un combo y todavía
   * requiere configuración — bloquea el botón "Datos de Envío" (no solo
   * advierte) para no dejar avanzar el wizard con datos de producción
   * incompletos.
   */
  public tieneConfiguracionPendiente: boolean = false;

  /**
   * Variables para el Sidebar del Carrito (Fase 2 - Quick View)
   */
  public productosCarritoSidebar: any[] = [];
  public totalCarritoSidebar: number = 0;
  public cantidadItemsCarrito: number = 0;
  public sidebarCarritoVisible: boolean = true;

  /**
   * Variables para manejo de categoría/tipo de cliente
   */
  public tiposCliente: any[] = [];
  public categoriaClienteSeleccionada: any = null;
  public cargandoTiposCliente: boolean = false;

  /**
   * Configuración de facturación electrónica (Siigo, World Office, etc.)
   */
  public siigoConfig: any = null;
  public siigoEnabled: boolean = false;
  public activeAccountingProvider: string = null;
  public accountingProviderName: string = 'Sistema Contable';

  constructor(
    private modalService: NgbModal,
    private service: MaestroService,
    private ventasService: VentasService,
    private infoIndicativo: InfoIndicativos,
    private formBuilder: FormBuilder,
    private inforPaises: InfoPaises,
    private ref: ChangeDetectorRef,
    private route: ActivatedRoute,
    private pyamentService: PaymentService,
    private cartService: CartSingletonService,
    private _hotkeysService: NgxHotkeysService,
    private toastrService: ToastrService,
    private utils: UtilsService,
    private facturacionElectronicaService: FacturacionIntegracionService,
    private bodegaService: BodegaService,
    private inventarioService: InventarioService,
    private daneCodesService: DaneCodesService,
    private integrationsService: IntegrationsService,
    private cotizacionesService: CotizacionesService,
  ) {
    this.initForm();

    this.maxDate = new Date();
    this.empresaActual = JSON.parse(
      localStorage.getItem("currentCompany") || "{}",
    );

    // Inicializar pedidoGral inmediatamente para evitar errores de null
    this.initializePedidoGral();

    this.pedidoPrm = this.route.snapshot.queryParamMap.get("pedido") || "";
    this.numberProduct = this.route.snapshot.queryParamMap.get("product") || "";
    const documentoParam = this.route.snapshot.queryParamMap.get("documento") || "";

    if (this.pedidoPrm) {
      this.pedidoGral = JSON.parse(this.pedidoPrm);
    } else {
      this.newPedido();

      if (documentoParam) {
        this.selectedClienteAutocomplete = documentoParam;
        setTimeout(() => { this.buscar(); }, 0);
      } else if (this.numberProduct) {
        this.ventasService
          .getProductByNumber(this.numberProduct)
          .subscribe((res: any) => {
            this.productos.isOpenModalDirect = true;
            this.productos.productos = res;
            this.productos.obtenerFiltros();
          });
      }
    }

    this.cargarBodegas();
  }

  /**
   * Spec 008.2 — Si esta venta proviene de "Convertir a pedido" de una cotización
   * (marcador en sessionStorage['cotizacionOrigen']), sella la cotización como
   * convertida y la enlaza al pedido recién creado. Idempotente y defensivo: si
   * algo falla, NO interrumpe el flujo del pedido (ya creado).
   */
  private marcarCotizacionConvertidaSiAplica(nroPedido: string): void {
    let origen: any = null;
    try {
      const raw = sessionStorage.getItem("cotizacionOrigen");
      if (raw) origen = JSON.parse(raw);
    } catch {
      origen = null;
    }
    if (!origen || !origen.id) return;

    // Limpiar el marcador de una vez para evitar doble marcado.
    try { sessionStorage.removeItem("cotizacionOrigen"); } catch { /* noop */ }

    this.cotizacionesService.marcarConvertida(origen.id, nroPedido).subscribe({
      next: () => console.log("✅ Cotización", origen.nro || origen.id, "marcada como convertida →", nroPedido),
      error: (err) => console.error("⚠️ No se pudo marcar la cotización como convertida:", err),
    });
  }

  /**
   * Spec 008.2 — Si esta venta proviene de "Convertir a pedido" de una cotización
   * (contexto en sessionStorage['cotizacionVentaCtx']), setea bodega + ciudad SIN
   * pasar por los handlers públicos (que limpian el carrito) y salta directo al
   * paso del Carrito. El carrito ya viene pre-cargado desde la cotización.
   */
  private aplicarContextoConversionSiAplica(): void {
    let ctx: any = null;
    try {
      const raw = sessionStorage.getItem("cotizacionVentaCtx");
      if (raw) ctx = JSON.parse(raw);
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    // Consumir el contexto una sola vez.
    try { sessionStorage.removeItem("cotizacionVentaCtx"); } catch { /* noop */ }

    // Cargar el carrito con las líneas de la cotización AQUÍ (newPedido ya limpió el
    // carrito al iniciar). La suscripción de ngOnInit sincroniza a pedidoGral.carrito
    // y habilita tieneProductosEnCarrito.
    try {
      if (Array.isArray(ctx.items) && ctx.items.length) {
        this.cartService.clearCart();
        for (const item of ctx.items) {
          this.cartService.addToCart(item);
        }
      }
    } catch (e) {
      console.error("Conversión cotización: error cargando el carrito", e);
    }

    // Setear bodega y ciudad vía los métodos privados (NO onWarehouseChange/onSelectCity,
    // que limpian el carrito). Estos actualizan pedidoGral.bodegaId / envio.ciudad.
    try {
      if (ctx.bodega) this.aplicarCambioBodega(ctx.bodega);
      if (ctx.ciudad) this.aplicarCambioCiudad(ctx.ciudad);
    } catch (e) {
      console.error("Conversión cotización: error seteando bodega/ciudad", e);
    }

    // Saltar al paso del Carrito (índice 2) con avance secuencial (patrón del wizard).
    setTimeout(() => {
      try {
        this.mywizard?.goToNextStep(); // Cliente → Productos
        setTimeout(() => {
          try { this.mywizard?.goToNextStep(); } catch { /* noop */ } // Productos → Carrito
        }, 80);
      } catch { /* noop */ }
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["pedidoGral"]) {
      // Eliminar el guardado automático del pre-pedido
    }
  }

  private initializePedidoGral() {
    this.pedidoGral = {
      referencia: "",
      nroPedido: "TEMP-000000",
      company: this.empresaActual.nomComercial,
      cliente: undefined,
      notasPedido: {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: [],
      },
      carrito: undefined,
      facturacion: undefined,
      envio: undefined,
      estadoPago: EstadoPago.Pendiente,
      estadoProceso: EstadoProceso.SinProducir,
      generarFacturaElectronica: this.generarFacturaElectronica,
    };
  }

  private newPedido() {
    this.pedidoSinGuardar = true;
    this.formulario.reset();

    // Limpiar completamente el caché
    this.limpiarCacheCompleto();

    this.cartService.clearCart();
    this.ventasService
      .getNextRef(this.empresaActual.nomComercial)
      .subscribe((res: any) => {
        const texto = this.empresaActual.nomComercial.toString();
        const ultimasLetras = texto.substring(texto.length - 3);
        this.pedidoGral.nroPedido =
          ultimasLetras + "-" + res.nextConsecutive.toString().padStart(6, "0");
        this.pedidoGral.referencia = "";
      });
  }

  // Método para limpiar completamente el caché y empezar de cero
  public limpiarCacheCompleto(): void {
    // Limpiar localStorage
    localStorage.removeItem("carrito");
    localStorage.removeItem("selectedCity");
    localStorage.removeItem("warehouse");

    // Limpiar sessionStorage
    sessionStorage.removeItem("pedidoTemporal");
    sessionStorage.removeItem("cliente");

    // Resetear variables del componente
    this.encontrado = false;
    this.mostrarFormularioCliente = false;
    this.clienteRecienCreado = false;
    this.creandoCliente = false;
    this.selectedCity = "";
    this.selectedWarehouse = "";
    this.bodega = null;
    this.categoriaClienteSeleccionada = null;

    // Limpiar arrays de datos
    this.datosEntregas = [];
    this.datosFacturacionElectronica = [];
    this.originalDataEntregas = [];
    this.originalDataFacturacionElectronica = [];

    // Re-inicializar pedidoGral para evitar errores de null
    this.initializePedidoGral();

    // Mostrar feedback al usuario
    this.toastrService.success(
      "Caché limpiado completamente. Sistema reiniciado.",
      "Reset Exitoso",
      {
        closeButton: true,
        timeOut: 3000,
      },
    );

    // Forzar detección de cambios después de que pedidoGral esté inicializado
    setTimeout(() => {
      this.ref.detectChanges();
    }, 0);
  }

  ngAfterViewChecked(): void {}
  ngAfterViewInit(): void {
    this.showSteper = !this.pedidoPrm;
    this.showPedidoConfirm = !!this.pedidoPrm;
  }

  redirectToPostalCode() {
    window.open("https://visor.codigopostal.gov.co/472/visor", "_blank");
  }

  verDatosFacturacion() {
    this.activarDatosFact = true;
    this.datosFacturacionElectronica = [];
    this.originalDataFacturacionElectronica = [];
    const data = {
      documento: this.documentoBuscar,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      // Primero cargar los datos del servidor
      if (res.datosFacturacionElectronica && Array.isArray(res.datosFacturacionElectronica)) {
        res.datosFacturacionElectronica.forEach((x) => {
          this.datosFacturacionElectronica.push(x);
        });
      }

    });
  }
  datosFacElect(event) {
    console.log(event);
    if (this.facturacionElectronica === true) {
      this.razon_social = this.formulario.value.nombres_completos;
      this.tipo_documento_facturacion =
        this.formulario.value.tipo_documento_comprador;
      this.numero_documento_facturacion = this.formulario.value.documento;
      this.indicativo_celular_facturacion =
        this.formulario.value.indicativo_celular_comprador;
      this.numero_celular_facturacion =
        this.formulario.value.numero_celular_comprador;
      this.correo_electronico_facturacion =
        this.formulario.value.correo_electronico_comprador;
    } else {
      this.razon_social = "";
      this.tipo_documento_facturacion = "";
      this.numero_documento_facturacion = "";
      this.indicativo_celular_facturacion = "";
      this.numero_celular_facturacion = "";
      this.correo_electronico_facturacion = "";
    }
  }
  ngOnInit(): void {
    // Inicializar estado de recoge en tienda
    this.esRecogeEnTienda = false;

    // Cargar zonas de cobro
    this.cargarZonasCobro();
    // Cargar departamentos DANE para búsqueda de ciudades
    this.cargarDepartamentosDane();
    // Inicializar indicativos con valores por defecto
    this.indicativo_celular_facturacion = "57";
    this.indicativo_celular_entrega = "57";
    this.indicativo_celular_entrega2 = "57";

    // Cargar bodegas y verificar si hay una bodega guardada en localStorage
    this.cargarBodegas();

    // Cargar tipos de cliente para selector de categoría
    this.cargarTiposCliente();

    // Cargar configuración de facturación electrónica (Siigo, World Office, etc.)
    this.cargarConfiguracionSiigo();

    // **NUEVA FUNCIONALIDAD: Suscribirse a los cambios del carrito**
    this.subscription = this.cartService.productInCartChanges$.subscribe(
      (products) => {
        // Actualizar la variable reactiva para habilitar/deshabilitar el botón
        this.tieneProductosEnCarrito = products && products.length > 0;
        this.tieneConfiguracionPendiente = !!(products || []).some(
          (item: any) => item?._requiereConfiguracionPendiente === true
        );

        // **FASE 2: Actualizar sidebar del carrito**
        this.productosCarritoSidebar = products || [];
        this.cantidadItemsCarrito = this.productosCarritoSidebar.reduce(
          (total, item) => total + (item.cantidad || 1), 0
        );
        this.totalCarritoSidebar = this.calcularTotalCarritoSidebar(products);

        if (this.pedidoGral && products && products.length > 0) {
          console.log(
            "📦 CREAR-VENTAS: Productos agregados al carrito -",
            products.length,
            "productos",
          );

          // Sincronizar el carrito del pedido con el servicio de carrito
          this.pedidoGral.carrito = products.map((item) => ({
            producto: item.producto,
            configuracion: item.configuracion,
            cantidad: item.cantidad || item.configuracion?.cantidad || 1,
            // Mapear otros campos necesarios según la estructura de Carrito
            cd: item.producto?.cd || item.producto?.crearProducto?.cd || "",
            crearProducto: item.producto?.crearProducto,
            precio: item.producto?.precio,
            disponibilidad: item.producto?.disponibilidad,
            // Preservar precios custom por pedido (no modifica el producto original)
            _precioManualOverride: item._precioManualOverride,
            _ivaManualOverride: item._ivaManualOverride,
            // D-147: sin esto el guard de checkout.component.ts nunca detecta
            // líneas de combo con configuración pendiente — el flag se perdía
            // al reconstruir este array con una whitelist de campos.
            cartItemId: item.cartItemId,
            _requiereConfiguracionPendiente: item._requiereConfiguracionPendiente,
          }));

          // Forzar detección de cambios para actualizar la UI y notificar al componente de notas
          this.ref.detectChanges();

          console.log("✅ CREAR-VENTAS: Carrito sincronizado y UI actualizada");
        } else if (this.pedidoGral && (!products || products.length === 0)) {
          // Si el carrito se vació, limpiar también en el pedido
          this.pedidoGral.carrito = [];
          console.log("🧹 CREAR-VENTAS: Carrito vaciado");
          this.ref.detectChanges();
        }
      },
    );

    // Inicializar tieneProductosEnCarrito con el estado actual del carrito
    const carritoActual = this.cartService.productInCart.value;
    this.tieneProductosEnCarrito = carritoActual && carritoActual.length > 0;
    this.tieneConfiguracionPendiente = !!(carritoActual || []).some(
      (item: any) => item?._requiereConfiguracionPendiente === true
    );

    // Verificar si hay una ciudad seleccionada previamente en localStorage
    const ciudadGuardada = localStorage.getItem("selectedCity");
    if (ciudadGuardada) {
      this.selectedCity = ciudadGuardada;
      // Si hay una ciudad guardada, utilizarla para el pedido
      if (this.pedidoGral && !this.pedidoGral.envio) {
        this.pedidoGral.envio = {
          ciudad: ciudadGuardada,
        } as any;
      } else if (this.pedidoGral && this.pedidoGral.envio) {
        this.pedidoGral.envio.ciudad = ciudadGuardada;
      }
    }

    // Verificar si hay una bodega guardada en localStorage
    const bodegaGuardada = JSON.parse(
      localStorage.getItem("warehouse") || "null",
    );
    if (bodegaGuardada) {
      // Establecer la bodega en el objeto del componente
      this.selectedWarehouse = bodegaGuardada.nombre;
      this.bodega = bodegaGuardada;

      // Asignar la bodega al pedido
      if (this.pedidoGral) {
        this.pedidoGral.bodegaId = bodegaGuardada.idBodega;
      }

      // Programar la carga de productos después de que los componentes estén inicializados
      setTimeout(() => {
        if (this.productos) {
          this.productos.bodega = bodegaGuardada;

          // Si también hay una ciudad seleccionada, asignarla al componente productos
          if (this.selectedCity && this.selectedCity !== "seleccione") {
            this.productos.ciudad = this.selectedCity;
          }

          // Cargar productos solo si ngOnInit del hijo no lo hizo ya (evita doble request)
          if (!this.productos.initialLoadDone && typeof this.productos.cargarTodo === "function") {
            this.productos.cargarTodo();
          }
        }
      }, 0);
    }

    // Configurar búsqueda con debounce para autocompletado de clientes
    this.clienteSearchSubscription = this.clienteSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
        if (!term || term.length < 2) {
          return of([]);
        }
        this.isSearchingCliente = true;
        return this.service.searchClients(term, 10).pipe(
          catchError((error) => {
            console.error("Error en búsqueda de clientes:", error);
            return of([]);
          })
        );
      })
    ).subscribe((results: any[]) => {
      this.clienteSuggestions = results || [];
      this.isSearchingCliente = false;
      this.ref.detectChanges();
    });
  }

  // Método para cargar las zonas de cobro
  cargarZonasCobro(): void {
    // Intentar recuperar zonas de cobro de sessionStorage primero
    const zonasGuardadas = sessionStorage.getItem("allBillingZone");
    if (zonasGuardadas) {
      try {
        this.allBillingZone = JSON.parse(zonasGuardadas);
        console.log("Zonas de cobro cargadas desde sessionStorage");
      } catch (e) {
        this.cargarZonasCobroDesdeServicio();
      }
    } else {
      this.cargarZonasCobroDesdeServicio();
    }
  }

  // Método para cargar zonas de cobro desde el servicio
  cargarZonasCobroDesdeServicio(): void {
    this.service.getBillingZone().subscribe({
      next: (zonas: any) => {
        // Verificar y convertir la respuesta para asegurar que sea un array
        if (zonas) {
          // Si es un ArrayBuffer, convertirlo primero a string y luego a JSON
          if (zonas instanceof ArrayBuffer) {
            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(zonas);
            try {
              this.allBillingZone = JSON.parse(jsonStr);
            } catch (e) {
              this.allBillingZone = [];
            }
          } else if (Array.isArray(zonas)) {
            // Si ya es un array, asignarlo directamente
            this.allBillingZone = zonas;
          } else if (typeof zonas === "string") {
            // Si es string, intentar parsearlo como JSON
            try {
              this.allBillingZone = JSON.parse(zonas);
            } catch (e) {
              this.allBillingZone = [];
            }
          } else {
            // Si no es ninguno de los anteriores, intentar convertirlo a array
            try {
              this.allBillingZone = Array.isArray(zonas) ? zonas : [];
            } catch (e) {
              this.allBillingZone = [];
            }
          }
          // Guardar en sessionStorage para acceso más rápido en el futuro
          sessionStorage.setItem(
            "allBillingZone",
            JSON.stringify(this.allBillingZone),
          );
        } else {
          this.allBillingZone = [];
        }
      },
      error: (err) => {
        this.allBillingZone = [];
      },
    });
  }

  /**
   * Carga los tipos de cliente (categorías) desde el servicio maestro.
   * Solo carga tipos activos para el selector.
   */
  cargarTiposCliente(): void {
    this.cargandoTiposCliente = true;
    this.service.consultarTiposClienteActivos().subscribe({
      next: (data: any) => {
        // Procesar la respuesta según el formato que venga
        if (Array.isArray(data)) {
          this.tiposCliente = data;
        } else if (data && Array.isArray(data.data)) {
          this.tiposCliente = data.data;
        } else if (data && data.results && Array.isArray(data.results)) {
          this.tiposCliente = data.results;
        } else {
          this.tiposCliente = [];
        }
        this.cargandoTiposCliente = false;
        console.log('Tipos de cliente cargados:', this.tiposCliente);
      },
      error: (error) => {
        console.error('Error cargando tipos de cliente:', error);
        this.tiposCliente = [];
        this.cargandoTiposCliente = false;
      }
    });
  }

  /**
   * Carga la configuración de facturación electrónica.
   * Verifica proveedores contables (Siigo, World Office) en orden de prioridad.
   */
  cargarConfiguracionSiigo(): void {
    const accountingProviders = ['dian', 'siigo', 'world_office'];
    let found = false;

    const checkProvider = (index: number) => {
      if (index >= accountingProviders.length) {
        if (!found) {
          this.siigoConfig = null;
          this.siigoEnabled = false;
          this.activeAccountingProvider = null;
          this.accountingProviderName = 'Sistema Contable';
          console.log('ℹ️ No hay integración de facturación configurada para esta empresa');
        }
        return;
      }

      const provider = accountingProviders[index];
      this.integrationsService.getIntegration(provider).subscribe({
        next: (response: any) => {
          const providerConfig = response?.config || response?.credentials;
          const isActive = response?.enabled || response?.config?.status === 'active';

          // Verificar credenciales válidas según el proveedor
          let isConfigured = false;
          let hasAutoInvoicing = false;

          if (provider === 'siigo') {
            isConfigured = isActive && !!providerConfig?.username;
            hasAutoInvoicing = providerConfig?.enableAutoInvoicing === true ||
                               providerConfig?.facturacionAutomatica === true;
          } else if (provider === 'world_office') {
            isConfigured = isActive && !!(providerConfig?.apiToken || providerConfig?.idEmpresa);
            hasAutoInvoicing = providerConfig?.enableAutoInvoicing === true ||
                               providerConfig?.facturacionAutomatica === true;
          } else if (provider === 'dian') {
            isConfigured = isActive && !!providerConfig?.issuer?.nit && !!providerConfig?.environment;
            hasAutoInvoicing = providerConfig?.enableAutoInvoicing === true;
          }

          if (isConfigured && !found) {
            found = true;
            this.siigoConfig = providerConfig;
            this.siigoEnabled = hasAutoInvoicing;
            this.activeAccountingProvider = provider;
            this.accountingProviderName = this.getAccountingProviderDisplayName(provider);

            if (this.siigoEnabled) {
              console.log(`✅ ${this.accountingProviderName} habilitado con facturación automática`);
            } else {
              console.log(`ℹ️ ${this.accountingProviderName} configurado pero facturación automática deshabilitada`);
            }
          } else {
            checkProvider(index + 1);
          }
        },
        error: () => {
          checkProvider(index + 1);
        }
      });
    };

    checkProvider(0);
  }

  /**
   * Retorna el nombre legible del proveedor contable.
   */
  private getAccountingProviderDisplayName(provider: string): string {
    const names: { [key: string]: string } = {
      'siigo': 'Siigo',
      'world_office': 'World Office',
      'dian': 'DIAN directo',
      'alegra': 'Alegra'
    };
    return names[provider] || 'Sistema Contable';
  }

  /**
   * Encola facturación electrónica en background después de crear el pedido.
   * Soporta Siigo (async) y World Office (generic endpoint).
   *
   * @param orderId ID del pedido creado
   * @param nroPedido Número de pedido para logs
   */
  encolarFacturacionSiigo(orderId: string, nroPedido: string): void {
    // Validar: debe tener orderId Y (siigoEnabled O checkbox marcado)
    if (!orderId || (!this.siigoEnabled && !this.generarFacturaElectronica)) {
      return;
    }

    const providerName = this.accountingProviderName || 'Sistema Contable';
    const provider = this.activeAccountingProvider || 'siigo';

    console.log(`📄 Encolando facturación ${providerName} para pedido ${nroPedido}...`);

    // Obtener opciones de facturación de la configuración
    const options: any = {};
    if (this.siigoConfig?.documentTypeId) {
      options.documentTypeId = this.siigoConfig.documentTypeId;
    }
    if (this.siigoConfig?.defaultPaymentTypeId) {
      options.paymentTypeId = this.siigoConfig.defaultPaymentTypeId;
    }
    if (this.siigoConfig?.costCenterId) {
      options.costCenterId = this.siigoConfig.costCenterId;
    }
    if (this.siigoConfig?.sellerId) {
      options.sellerId = this.siigoConfig.sellerId;
    }

    // Usar endpoint async de Siigo o genérico para otros proveedores
    const invoiceCall = provider === 'siigo'
      ? this.integrationsService.createSiigoInvoiceFromOrderAsync(orderId, options)
      : this.integrationsService.createAccountingInvoiceFromOrder(provider, orderId, options);

    invoiceCall.subscribe({
        next: (response: any) => {
          console.log(`🔄 Facturación ${providerName} encolada - Job ID: ${response.jobId || response.id || 'N/A'}`);
          // Mostrar mensaje informativo al usuario
          this.toastrService.info(
            'La factura se generará en segundo plano. Recibirás una notificación cuando esté lista.',
            `Facturación ${providerName} en proceso`,
            { timeOut: 5000 }
          );
        },
        error: (error) => {
          console.warn(`⚠️ No se pudo encolar facturación ${providerName}:`, error?.message || error);
          // No bloquear el flujo - solo advertir
          // El usuario puede facturar manualmente después
        }
      });
  }

  /**
   * Maneja el cambio de categoría de cliente seleccionada.
   * Muestra un modal de confirmación antes de guardar.
   * Si hay productos en el carrito, los limpia automáticamente.
   */
  onCategoriaClienteChange(event: any): void {
    const tipoClienteId = event.target.value;
    const selectElement = event.target;
    const categoriaAnterior = this.categoriaClienteSeleccionada;

    // Verificar si hay productos en el carrito
    const hayProductosEnCarrito = this.tieneProductosEnCarrito;

    if (!tipoClienteId || tipoClienteId === '') {
      // Si selecciona "Sin categoría", mostrar confirmación para quitar categoría
      if (this.categoriaClienteSeleccionada) {
        const mensajeCarrito = hayProductosEnCarrito
          ? '<br><br><strong class="text-danger">⚠️ Atención: El carrito será vaciado al cambiar la categoría.</strong>'
          : '';

        Swal.fire({
          title: '¿Quitar categoría?',
          html: `¿Desea quitar la categoría "${this.categoriaClienteSeleccionada.descripcion || this.categoriaClienteSeleccionada.nombre}" de este cliente?${mensajeCarrito}`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Sí, quitar',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.categoriaClienteSeleccionada = null;
            this.guardarCategoriaCliente(null);
            // Limpiar el carrito si había productos
            if (hayProductosEnCarrito) {
              this.limpiarCarritoPorCambioCategoria(categoriaAnterior, null);
            }
          } else {
            // Restaurar el valor anterior en el select
            selectElement.value = this.categoriaClienteSeleccionada?.id || '';
          }
        });
      } else {
        this.categoriaClienteSeleccionada = null;
      }
      return;
    }

    // Buscar el tipo de cliente seleccionado
    const tipoSeleccionado = this.tiposCliente.find(t => t.id === tipoClienteId);

    if (tipoSeleccionado) {
      // Verificar si realmente está cambiando la categoría (no es la misma)
      const esMismaCategoria = categoriaAnterior?.id === tipoSeleccionado.id;

      if (esMismaCategoria) {
        // Si es la misma categoría, no hacer nada
        return;
      }

      const mensajeCarrito = hayProductosEnCarrito
        ? '<br><br><strong class="text-danger">⚠️ Atención: El carrito será vaciado al cambiar la categoría.</strong>'
        : '';

      // Mostrar modal de confirmación
      Swal.fire({
        title: '¿Guardar categoría?',
        html: `¿Desea guardar la categoría <strong>"${tipoSeleccionado.descripcion || tipoSeleccionado.nombre}"</strong> para este cliente?<br><br><small class="text-muted">Si guarda, esta categoría se aplicará para futuras compras.<br>Si no guarda, se usará solo para esta venta.</small>${mensajeCarrito}`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: '#28a745',
        denyButtonColor: '#6c757d',
        cancelButtonColor: '#dc3545',
        confirmButtonText: '<i class="fa fa-save"></i> Sí, guardar',
        denyButtonText: 'Solo esta venta',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Guardar en la base de datos para futuras compras
          this.categoriaClienteSeleccionada = tipoSeleccionado;
          this.guardarCategoriaCliente(tipoSeleccionado);
          console.log('✅ Categoría guardada en cliente:', tipoSeleccionado);
          // Limpiar el carrito si había productos
          if (hayProductosEnCarrito) {
            this.limpiarCarritoPorCambioCategoria(categoriaAnterior, tipoSeleccionado);
          }
        } else if (result.isDenied) {
          // Solo usar para esta venta (actualizar sessionStorage sin guardar en BD)
          this.categoriaClienteSeleccionada = tipoSeleccionado;
          const clienteTemporal = {
            ...this.pedidoGral.cliente,
            categoria: {
              id: tipoSeleccionado.id,
              nombre: tipoSeleccionado.nombre,
              descripcion: tipoSeleccionado.descripcion
            }
          };
          sessionStorage.setItem('cliente', JSON.stringify(clienteTemporal));
          this.toastrService.info(
            `Categoría "${tipoSeleccionado.descripcion || tipoSeleccionado.nombre}" aplicada solo para esta venta`,
            'Categoría Temporal',
            { closeButton: true, timeOut: 3000 }
          );
          console.log('📋 Categoría aplicada solo para esta venta:', tipoSeleccionado);
          // Limpiar el carrito si había productos
          if (hayProductosEnCarrito) {
            this.limpiarCarritoPorCambioCategoria(categoriaAnterior, tipoSeleccionado);
          }
        } else {
          // Cancelado - restaurar el valor anterior en el select
          selectElement.value = categoriaAnterior?.id || '';
        }
      });
    }
  }

  /**
   * Limpia el carrito cuando se cambia la categoría del cliente.
   * Muestra una notificación informativa al usuario.
   */
  private limpiarCarritoPorCambioCategoria(categoriaAnterior: any, categoriaNueva: any): void {
    // Limpiar el carrito usando el servicio
    this.cartService.clearCart();

    // Limpiar también el carrito del pedido
    if (this.pedidoGral) {
      this.pedidoGral.carrito = [];
    }

    // Mostrar notificación
    const nombreCategoriaAnterior = categoriaAnterior?.descripcion || categoriaAnterior?.nombre || 'Sin categoría';
    const nombreCategoriaNueva = categoriaNueva?.descripcion || categoriaNueva?.nombre || 'Sin categoría';

    this.toastrService.warning(
      `El carrito ha sido vaciado debido al cambio de categoría de "${nombreCategoriaAnterior}" a "${nombreCategoriaNueva}". Los precios pueden variar según la categoría del cliente.`,
      'Carrito Vaciado',
      {
        closeButton: true,
        timeOut: 5000,
        enableHtml: true
      }
    );

    console.log('🛒 Carrito limpiado por cambio de categoría:', {
      categoriaAnterior: nombreCategoriaAnterior,
      categoriaNueva: nombreCategoriaNueva
    });

    // Forzar detección de cambios
    this.ref.detectChanges();
  }

  /**
   * Guarda la categoría del cliente en la base de datos.
   * @param categoria - El tipo de cliente seleccionado o null para quitar
   */
  guardarCategoriaCliente(categoria: any): void {
    if (!this.pedidoGral?.cliente?.documento) {
      this.toastrService.error('No hay cliente seleccionado', 'Error');
      return;
    }

    // Preparar el objeto cliente con la nueva categoría
    const clienteActualizado = {
      ...this.pedidoGral.cliente,
      categoria: categoria ? {
        id: categoria.id,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion
      } : null
    };

    // Actualizar el cliente usando el servicio
    this.service.editClient(clienteActualizado).subscribe({
      next: (response: any) => {
        // Actualizar el cliente en el pedido
        this.pedidoGral.cliente = clienteActualizado;

        // ✅ CRÍTICO: Actualizar sessionStorage para que el paso de productos lea la categoría correcta
        sessionStorage.setItem('cliente', JSON.stringify(clienteActualizado));
        console.log('📦 sessionStorage actualizado con categoría:', clienteActualizado.categoria);

        if (categoria) {
          this.toastrService.success(
            `Categoría "${categoria.descripcion || categoria.nombre}" asignada correctamente`,
            'Categoría Guardada',
            { closeButton: true, timeOut: 3000 }
          );
        } else {
          this.toastrService.info(
            'La categoría ha sido removida del cliente',
            'Categoría Removida',
            { closeButton: true, timeOut: 3000 }
          );
        }

        console.log('Cliente actualizado con categoría:', clienteActualizado);
      },
      error: (error) => {
        console.error('Error al guardar categoría del cliente:', error);
        this.toastrService.error(
          'No se pudo guardar la categoría. Intente nuevamente.',
          'Error',
          { closeButton: true, timeOut: 4000 }
        );
        // Restaurar la selección anterior
        this.categoriaClienteSeleccionada = this.pedidoGral.cliente?.categoria || null;
      }
    });
  }

  private initForm() {
    this.paises = this.inforPaises.paises.map((x) => {
      return x.Pais;
    });
    this.indicativos = this.infoIndicativo.datos;

    // Establecer valores por defecto
    this.pais = "Colombia";
    this.departamento = "Antioquia";
    this.identificarDepto(); // Para cargar los departamentos de Colombia
    this.identificarCiu(); // Para cargar las ciudades de Antioquia

    // Inicializar formulario de notas de cliente
    this.notasClienteForm = this.formBuilder.group({
      nota: ["", Validators.required],
    });

    // Establecer fecha actual
    this.fechaActual = new Date();

    // Resto del código de inicialización del formulario
    this.firstFormGroup = this.formBuilder.group({
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      contactNumber: ["", Validators.required],
    });
    this.secondFormGroup = this.formBuilder.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
      cnfPassword: ["", Validators.required],
    });
    this.thirdFormGroup = this.formBuilder.group({
      birthdate: ["", Validators.required],
      age: [""],
      hasPassport: ["", Validators.required],
    });
    this.fourthFormGroup = this.formBuilder.group({
      country: ["", Validators.required],
      state: ["", Validators.required],
      city: ["", Validators.required],
    });
    this.formulario = this.formBuilder.group({
      // Datos del comprador
      nombres_completos: ["", Validators.required],
      apellidos_completos: ["", Validators.required],
      tipo_documento_comprador: ["CC", Validators.required],
      documento: ["", Validators.required],
      indicativo_celular_comprador: ["57", Validators.required], // Valor por defecto: Colombia +57
      numero_celular_comprador: ["", Validators.required],
      correo_electronico_comprador: [
        "",
        [Validators.required, Validators.email],
      ],
      indicativo_celular_whatsapp: ["57", Validators.required], // Valor por defecto: Colombia +57
      numero_celular_whatsapp: ["", Validators.required],
      datosFacturacionElectronica: [[""]],
      datosEntrega: [[""]],
      notas: [[""]],
      estado: ["Activo"],
      cd: [""],
    });
  }

  downloadExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    XLSX.writeFile(wb, "export.xlsx");
  }
  sidebarToggle() {
    this.openSidebar = !this.openSidebar;
    this.col = "3";
  }
  crearCliente() {
    this.formulario.controls["datosFacturacionElectronica"].setValue([]);
    this.formulario.controls["datosEntrega"].setValue([]);
    this.formulario.controls["notas"].setValue([]);
    this.formulario.controls["estado"].setValue("activo");
    this.service.createClient(this.formulario.value).subscribe((r) => {
      Swal.fire({
        title: "Guardado!",
        text: "Guardado con exito",
        icon: "success",
        confirmButtonText: "Ok",
      });
      const data = {
        documento: this.formulario.value.documento,
      };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        sessionStorage.setItem("cliente", JSON.stringify(res));
        this.formulario.patchValue({
          cd: res.cd, // ✅ IMPORTANTE: Setear el cd del cliente para identificarlo en ediciones
          nombres_completos: res.nombres_completos,
          apellidos_completos: res.apellidos_completos,
          tipo_documento_comprador: res.tipo_documento_comprador || 'CC',
          documento: res.documento,
          indicativo_celular_comprador: res.indicativo_celular_comprador != null ? String(res.indicativo_celular_comprador) : '57',
          numero_celular_comprador: res.numero_celular_comprador != null ? String(res.numero_celular_comprador) : '',
          indicativo_celular_whatsapp: res.indicativo_celular_whatsapp != null ? String(res.indicativo_celular_whatsapp) : '57',
          numero_celular_whatsapp: res.numero_celular_whatsapp != null ? String(res.numero_celular_whatsapp) : '',
          correo_electronico_comprador: res.correo_electronico_comprador,
          datosFacturacionElectronica: res.datosFacturacionElectronica || [],
          datosEntrega: res.datosEntrega || [],
          notas: res.notas || [],
          estado: res.estado || "activo",
        });
        this.datos = res;
        this.documentoBuscar = this.formulario.value.documento; // Guardar el documento para futuras referencias

        // Si se ingresaron dirección, país, departamento, ciudad y código postal, heredarlos a facturación y entrega
        // Asegurar que los apellidos se incluyan en la creación de datos iniciales
        if (
          this.direccion_facturacion &&
          this.pais &&
          this.departamento &&
          this.ciudad_municipio
        ) {
          // Crear datos iniciales de facturación usando los datos del cliente
          const datoFacturacionInicial = {
            alias: "Principal",
            nombres: this.formulario.value.nombres_completos,
            apellidos: this.formulario.value.apellidos_completos,
            tipoDocumento: this.formulario.value.tipo_documento_comprador,
            documento: this.formulario.value.documento,
            indicativoCel: this.formulario.value.indicativo_celular_comprador,
            celular: this.formulario.value.numero_celular_comprador,
            correoElectronico:
              this.formulario.value.correo_electronico_comprador,
            direccion: this.direccion_facturacion,
            pais: this.pais,
            departamento: this.departamento,
            ciudad: this.ciudad_municipio,
            codigoPostal: this.codigo_postal || "",
          };

          // Crear datos iniciales de entrega usando los datos del cliente
          const datoEntregaInicial = {
            alias: "Principal",
            nombres: this.formulario.value.nombres_completos,
            apellidos: this.formulario.value.apellidos_completos || "",
            indicativoCel: this.formulario.value.indicativo_celular_comprador,
            celular: this.formulario.value.numero_celular_comprador,
            direccionEntrega: this.direccion_facturacion,
            pais: this.pais,
            departamento: this.departamento,
            ciudad: this.ciudad_municipio,
            codigoPV: this.codigo_postal || "",
          };

          // Asignar datos iniciales a los arreglos
          this.datosFacturacionElectronica = [datoFacturacionInicial];
          this.datosEntregas = [datoEntregaInicial];

          // Guardar estos datos en el cliente
          this.formulario.controls["datosFacturacionElectronica"].setValue(
            this.datosFacturacionElectronica,
          );
          this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);

          // Actualizar el cliente con estos datos
          this.service.editClient(this.formulario.value).subscribe(() => {
            console.log("Datos iniciales de facturación y entrega guardados");
          });
        }

        // Activar los componentes de facturación y entrega
        this.pedidoGral.cliente = res;
        this.encontrado = true;
        this.clienteRecienCreado = true; // Esto activará la visualización de facturación y entrega
        
        // Cargar las notas del cliente recién creado
        this.cargarNotasDelCliente();
        
        this.identificarDepto();
        this.identificarCiu();
      });
    });
  }
  editarCliente() {
    // Verificar si el formulario es válido antes de proceder
    if (this.formulario.invalid) {
      Swal.fire({
        title: "Formulario Incompleto",
        text: "Por favor complete todos los campos requeridos antes de guardar.",
        icon: "warning",
        confirmButtonText: "Ok",
      });
      return;
    }

    // Confirmar la edición
    Swal.fire({
      title: "Editar Cliente",
      text: "¿Desea guardar los cambios realizados al cliente?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, guardar cambios",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Preparar datos del cliente con la información actual del formulario
        const clienteData = {
          ...this.formulario.value,
          datosFacturacionElectronica: this.datosFacturacionElectronica || [],
          datosEntrega: this.datosEntregas || [],
          notas: this.formulario.value.notas || [],
          estado: this.formulario.value.estado || "activo",
        };

        // Guardar los cambios
        this.service.editClient(clienteData).subscribe({
          next: (r) => {
            // Actualizar el pedido con los datos del cliente editado
            this.pedidoGral.cliente = clienteData;
            this.ref.markForCheck();

            // Actualizar sessionStorage con los nuevos datos
            sessionStorage.setItem("cliente", JSON.stringify(clienteData));

            // Ocultar el formulario de edición y mantener el estado encontrado
            this.mostrarFormularioCliente = false;
            this.encontrado = true;

            // Actualizar arrays de datos
            this.originalDataEntregas =
              this.utils.deepClone(this.datosEntregas) || [];

            // Preservar notas existentes y actualizar solo las del cliente
            if (!this.pedidoGral.notasPedido) {
              this.pedidoGral.notasPedido = {
                notasCliente: clienteData.notas as Notas[],
                notasDespachos: [] as Notas[],
                notasEntregas: [] as Notas[],
                notasProduccion: [] as Notas[],
                notasFacturacionPagos: [] as Notas[],
              };
            } else {
              // Solo actualizar las notas del cliente sin tocar las demás
              this.pedidoGral.notasPedido.notasCliente =
                clienteData.notas as Notas[];
            }

            // Verificar estado del cliente
            this.bloqueado = clienteData.estado === "Bloqueado";

            // Forzar detección de cambios
            this.ref.detectChanges();

            // Mostrar mensaje de éxito
            Swal.fire({
              title: "¡Cliente actualizado!",
              text: "Los datos del cliente se han guardado exitosamente.",
              icon: "success",
              confirmButtonText: "Ok",
            });

            // Mostrar toast de confirmación
            this.toastrService.success(
              `Cliente ${clienteData.nombres_completos} ${clienteData.apellidos_completos || ""} actualizado correctamente`,
              "Cliente Actualizado",
              {
                closeButton: true,
                timeOut: 3000,
              },
            );
          },
          error: (error) => {
            Swal.fire({
              title: "Error al actualizar",
              text: "Ha ocurrido un error al actualizar el cliente. Por favor, intente nuevamente.",
              icon: "error",
              confirmButtonText: "Ok",
            });
          },
        });
      }
    });
  }

  /**
   * Método para abrir el formulario de edición con los datos actuales del cliente
   */
  abrirFormularioEdicion() {
    if (this.pedidoGral?.cliente) {
      // Llenar el formulario con los datos actuales del cliente
      this.formulario.patchValue({
        nombres_completos: this.pedidoGral.cliente.nombres_completos,
        apellidos_completos: this.pedidoGral.cliente.apellidos_completos,
        tipo_documento_comprador:
          this.pedidoGral.cliente.tipo_documento_comprador,
        documento: this.pedidoGral.cliente.documento,
        indicativo_celular_comprador:
          this.pedidoGral.cliente.indicativo_celular_comprador,
        numero_celular_comprador:
          this.pedidoGral.cliente.numero_celular_comprador,
        indicativo_celular_whatsapp:
          this.pedidoGral.cliente.indicativo_celular_whatsapp,
        numero_celular_whatsapp:
          this.pedidoGral.cliente.numero_celular_whatsapp,
        correo_electronico_comprador:
          this.pedidoGral.cliente.correo_electronico_comprador,
        estado: this.pedidoGral.cliente.estado || "activo",
      });

      // Asegurar que los datos de facturación y entrega estén disponibles
      this.datosFacturacionElectronica =
        this.pedidoGral.cliente.datosFacturacionElectronica || [];
      this.datosEntregas = this.pedidoGral.cliente.datosEntrega || [];
      this.originalDataEntregas =
        this.utils.deepClone(this.datosEntregas) || [];

      // Mostrar el formulario de edición
      this.mostrarFormularioCliente = true;

      // Forzar detección de cambios
      this.ref.detectChanges();
    }
  }

  /**
   * Método para cancelar la edición del cliente y volver al estado anterior
   */
  cancelarEdicionCliente() {
    // Si hay un cliente encontrado, volver a mostrar sus datos sin el formulario
    if (this.encontrado && this.pedidoGral?.cliente) {
      // Restaurar el formulario con los datos originales del cliente
      this.formulario.patchValue({
        nombres_completos: this.pedidoGral.cliente.nombres_completos,
        apellidos_completos: this.pedidoGral.cliente.apellidos_completos,
        tipo_documento_comprador:
          this.pedidoGral.cliente.tipo_documento_comprador,
        documento: this.pedidoGral.cliente.documento,
        indicativo_celular_comprador:
          this.pedidoGral.cliente.indicativo_celular_comprador,
        numero_celular_comprador:
          this.pedidoGral.cliente.numero_celular_comprador,
        indicativo_celular_whatsapp:
          this.pedidoGral.cliente.indicativo_celular_whatsapp,
        numero_celular_whatsapp:
          this.pedidoGral.cliente.numero_celular_whatsapp,
        correo_electronico_comprador:
          this.pedidoGral.cliente.correo_electronico_comprador,
        estado: this.pedidoGral.cliente.estado || "activo",
      });

      // Restaurar datos de facturación y entrega originales
      this.datosFacturacionElectronica =
        this.pedidoGral.cliente.datosFacturacionElectronica || [];
      this.datosEntregas = this.pedidoGral.cliente.datosEntrega || [];
      this.originalDataEntregas =
        this.utils.deepClone(this.datosEntregas) || [];
    } else {
      // Si no hay cliente encontrado, limpiar el formulario
      this.formulario.reset();
      this.datosFacturacionElectronica = [];
      this.datosEntregas = [];
      this.originalDataEntregas = [];
    }

    // Ocultar el formulario de edición
    this.mostrarFormularioCliente = false;

    // Forzar detección de cambios
    this.ref.detectChanges();
  }

  verDatosEntrega() {
    this.activarDatosEntrega = true;
    this.datosEntregas = [];
    this.originalDataEntregas = [];
    const data = {
      documento: this.documentoBuscar,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.datosEntrega.map((x) => {
        this.datosEntregas.push(x);
      });
      this.originalDataEntregas = [...this.datosEntregas];
    });
  }

  buscar() {
    this.bloqueado = false;
    this.formulario.reset();

    // Obtener el valor del autocompletado (puede ser string u objeto)
    let valorBusqueda = "";
    if (typeof this.selectedClienteAutocomplete === "string") {
      valorBusqueda = this.selectedClienteAutocomplete.trim();
    } else if (this.selectedClienteAutocomplete?.documento) {
      valorBusqueda = this.selectedClienteAutocomplete.documento.trim();
    }

    this.documentoBuscar = valorBusqueda;

    // Búsqueda por documento (comportamiento por defecto)
    const data = { documento: valorBusqueda };
    this.service.getClientByDocument(data).subscribe((res: any) => {
        console.log("🔍 Respuesta del servicio getClientByDocument:", res);

        // Manejar respuesta: puede ser array vacío, array con cliente, u objeto directo
        const esArrayVacio = Array.isArray(res) && res.length === 0;
        const noHayCliente = !res || esArrayVacio;

        if (noHayCliente) {
          // Cliente no encontrado: se muestra el formulario de creación (incluyendo facturación y entrega)
          this.formulario.controls["documento"].setValue(valorBusqueda);
          this.pedidoGral.cliente = undefined;
          this.encontrado = false;
          this.bloqueado = false;
          this.mostrarFormularioCliente = true; // activar formulario de creación
          this.categoriaClienteSeleccionada = null; // Resetear categoría para nuevo cliente
          Swal.fire({
            title: "No encontrado!",
            text: "No se encuentra el documento. Llene los datos para crear el cliente.",
            icon: "warning",
            confirmButtonText: "Ok",
          });
        } else {
          // Extraer cliente: puede venir como array o como objeto directo
          const cliente = Array.isArray(res) ? res[0] : res;

          // Cliente encontrado: se oculta el formulario de creación
          console.log(
            "📋 Campos disponibles en el cliente encontrado:",
            Object.keys(cliente),
          );
          console.log("👤 Datos del cliente:", {
            nombres: cliente.nombres_completos,
            apellidos: cliente.apellidos_completos,
            documento: cliente.documento,
            categoria: cliente.categoria,
          });
          this.pedidoGral.cliente = cliente;
          this.ref.markForCheck();
          sessionStorage.setItem("cliente", JSON.stringify(cliente));
          this.formulario.patchValue({
            cd: cliente.cd, // ✅ IMPORTANTE: Setear el cd del cliente para identificarlo en ediciones
            nombres_completos: cliente.nombres_completos,
            apellidos_completos: cliente.apellidos_completos,
            tipo_documento_comprador: cliente.tipo_documento_comprador,
            documento: cliente.documento,
            indicativo_celular_comprador: cliente.indicativo_celular_comprador,
            numero_celular_comprador: cliente.numero_celular_comprador,
            indicativo_celular_whatsapp: cliente.indicativo_celular_whatsapp,
            numero_celular_whatsapp: cliente.numero_celular_whatsapp,
            correo_electronico_comprador: cliente.correo_electronico_comprador,
            datosFacturacionElectronica: cliente.datosFacturacionElectronica || [],
            datosEntrega: cliente.datosEntrega || [],
            notas: cliente.notas || [],
            estado: cliente.estado || "activo",
          });
          // Preservar notas existentes si ya existen, sino inicializar con las del cliente
          if (!this.pedidoGral.notasPedido) {
            this.pedidoGral.notasPedido = {
              notasCliente: this.formulario.value.notas as Notas[],
              notasDespachos: [] as Notas[],
              notasEntregas: [] as Notas[],
              notasProduccion: [] as Notas[],
              notasFacturacionPagos: [] as Notas[],
            };
          } else {
            // Solo actualizar las notas del cliente sin tocar las demás
            this.pedidoGral.notasPedido.notasCliente = this.formulario.value
              .notas as Notas[];
            // Asegurar que las demás categorías existan pero sin sobrescribirlas
            if (!this.pedidoGral.notasPedido.notasDespachos) {
              this.pedidoGral.notasPedido.notasDespachos = [];
            }
            if (!this.pedidoGral.notasPedido.notasEntregas) {
              this.pedidoGral.notasPedido.notasEntregas = [];
            }
            if (!this.pedidoGral.notasPedido.notasProduccion) {
              this.pedidoGral.notasPedido.notasProduccion = [];
            }
            if (!this.pedidoGral.notasPedido.notasFacturacionPagos) {
              this.pedidoGral.notasPedido.notasFacturacionPagos = [];
            }
          }

          // Cargar las notas del cliente desde la base de datos
          this.cargarNotasDelCliente();

          this.datos = cliente;
          this.identificarDepto();
          this.identificarCiu();
          this.identificarDepto1();
          this.identificarCiu1();
          this.encontrado = true;
          this.mostrarFormularioCliente = false;
          this.clienteRecienCreado = false; // Asegurar que este flag esté en false para clientes encontrados

          // Spec 008.2 — si venimos de "Convertir a pedido", setear bodega/ciudad y
          // saltar al carrito (cliente y carrito ya están listos en este punto).
          this.aplicarContextoConversionSiAplica();

          // Recuperar categoría existente del cliente si la tiene
          console.log('🔍 DEBUG - Verificando categoría del cliente:', {
            tieneCategoria: !!cliente.categoria,
            categoriaCompleta: cliente.categoria,
            categoriaId: cliente.categoria?.id,
            tiposClienteCargados: this.tiposCliente?.length || 0
          });

          if (cliente.categoria && cliente.categoria.id) {
            this.categoriaClienteSeleccionada = cliente.categoria;
            console.log('📋 Categoría del cliente recuperada:', cliente.categoria);
            console.log('✅ categoriaClienteSeleccionada asignada:', this.categoriaClienteSeleccionada);
          } else {
            this.categoriaClienteSeleccionada = null;
            console.log('📋 Cliente sin categoría asignada - categoria en respuesta:', cliente.categoria);
          }
          // Forzar detección de cambios para actualizar el dropdown
          this.ref.markForCheck();

          if (this.formulario.value.estado == "Bloqueado") {
            this.bloqueado = true;
          }
          this.toastrService.show(
            '<p class="mb-0 mt-1">Cliente encontrado!</p>',
            "",
            {
              closeButton: true,
              enableHtml: true,
              positionClass: "toast-bottom-right",
              timeOut: 1000,
            },
          );
          this.verDatosFacturacion();
          this.datosEntregas = [];
          if (cliente.datosEntrega) {
            cliente.datosEntrega.map((x) => {
              this.datosEntregas.push(x);
            });
          }
          this.originalDataEntregas =
            this.utils.deepClone(this.datosEntregas) || [];
        }
      });
  }

  /**
   * Método para el autocompletado - se llama cuando el usuario escribe
   */
  searchClientesAutocomplete(event: any): void {
    const query = event.query || "";
    this.clienteSearchSubject.next(query);
  }

  /**
   * Método cuando se selecciona un cliente del autocompletado
   */
  onClienteAutocompleteSelect(event: any): void {
    const cliente = event;
    if (cliente && cliente.cd) {
      console.log("🎯 Cliente seleccionado del autocompletado:", cliente);

      // Simular la búsqueda normal con el documento del cliente
      this.documentoBuscar = (cliente.documento || "").trim();

      // Asignar el cliente al pedido
      this.pedidoGral.cliente = cliente;
      this.ref.markForCheck();
      sessionStorage.setItem("cliente", JSON.stringify(cliente));

      // Actualizar el formulario con los datos del cliente
      this.formulario.patchValue({
        cd: cliente.cd,
        nombres_completos: cliente.nombres_completos,
        apellidos_completos: cliente.apellidos_completos,
        tipo_documento_comprador: cliente.tipo_documento_comprador,
        documento: cliente.documento,
        indicativo_celular_comprador: cliente.indicativo_celular_comprador,
        numero_celular_comprador: cliente.numero_celular_comprador,
        indicativo_celular_whatsapp: cliente.indicativo_celular_whatsapp,
        numero_celular_whatsapp: cliente.numero_celular_whatsapp,
        correo_electronico_comprador: cliente.correo_electronico_comprador,
        datosFacturacionElectronica: cliente.datosFacturacionElectronica || [],
        datosEntrega: cliente.datosEntrega || [],
        notas: cliente.notas || [],
        estado: cliente.estado || "activo",
      });

      // Inicializar notas del pedido
      if (!this.pedidoGral.notasPedido) {
        this.pedidoGral.notasPedido = {
          notasCliente: this.formulario.value.notas as Notas[],
          notasDespachos: [] as Notas[],
          notasEntregas: [] as Notas[],
          notasProduccion: [] as Notas[],
          notasFacturacionPagos: [] as Notas[],
        };
      }

      this.datos = cliente;
      this.encontrado = true;
      this.mostrarFormularioCliente = false;
      this.clienteRecienCreado = false;

      // Limpiar dirección de envío del cliente anterior para evitar contaminación
      this.pedidoGral.envio = undefined;
      this.pedidoGral.facturacion = undefined;

      // Cargar datos de facturación y entrega
      this.verDatosFacturacion();
      this.datosEntregas = [];
      if (cliente.datosEntrega) {
        cliente.datosEntrega.forEach((x) => {
          this.datosEntregas.push(x);
        });
      }
      this.originalDataEntregas = this.utils.deepClone(this.datosEntregas) || [];

      // Verificar categoría del cliente
      if (cliente.categoria && this.tiposCliente?.length > 0) {
        const categoriaEncontrada = this.tiposCliente.find(
          (tipo) => tipo.id === cliente.categoria?.id
        );
        if (categoriaEncontrada) {
          this.categoriaClienteSeleccionada = categoriaEncontrada;
        }
      }

      this.toastrService.success(
        '<p class="mb-0 mt-1">Cliente encontrado!</p>',
        "",
        {
          closeButton: true,
          enableHtml: true,
          positionClass: "toast-bottom-right",
          timeOut: 1500,
        }
      );
    }
  }

  /**
   * Limpia el autocompletado cuando se borra el input
   */
  onClienteAutocompleteClear(): void {
    this.selectedClienteAutocomplete = null;
    this.clienteSuggestions = [];
  }

  seleccionarDireccionFE(index) {
    this.pedidoGral.facturacion = this.datosFacturacionElectronica[index];
    this.pedidoGral = { ...this.pedidoGral };
    Swal.fire({
      title: "Direccion Seleccionada!",
      text: this.datosFacturacionElectronica[index].direccion,
      icon: "success",
      confirmButtonText: "Ok",
    });
  }
  seleccionarDireccionEntrega(index) {
    this.pedidoGral.envio = this.datosEntregas[index];
    this.pedidoGral = { ...this.pedidoGral };
    Swal.fire({
      title: "Direccion Seleccionada!",
      text: this.datosEntregas[index].direccionEntrega,
      icon: "success",
      confirmButtonText: "Ok",
    });
  }
  editarDatosEntrega() {
    const datosEntreg = {
      alias: this.alias_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoOtroNumero: this.indicativo_celular_entrega2,
      otroNumero: this.otro_numero_entrega,
      direccionEntrega: this.direccion_entrega,
      observaciones: this.observaciones,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      especificacionesInternas: this.especificacionesInternas,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      zonaCobro: this.zona_cobro,
      valorZonaCobro: this.valor_zona_cobro,
      codigoPV: this.codigo_postal_entrega,
    };
    this.datosEntregas[this.idenxEntrega] = datosEntreg;

    // Si la dirección editada es la que está en uso en el pedido, actualizarla
    if (this.pedidoGral?.envio && this.pedidoGral.envio.alias === datosEntreg.alias) {
      this.pedidoGral.envio = { ...datosEntreg };
      this.pedidoGral = { ...this.pedidoGral };
    }

    // ✅ REFACTORIZADO: Actualizar solo el array de datosEntrega en el formulario
    // El cd ya está en el formulario desde cuando se buscó el cliente en el paso 1
    this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);

    // ✅ LLAMADA ÚNICA: Solo editClient() - el formulario ya tiene todos los datos
    this.service.editClient(this.formulario.value).subscribe({
      next: (r) => {
        // Cerrar el modal después de guardar exitosamente
        this.modalService.dismissAll();

        // Resetear el flag de edición
        this.editandodato = false;

        // Recargar los datos del servidor para actualizar la lista
        this.service
          .getClientByDocument({ documento: this.documentoBuscar })
          .subscribe((clientRes: any) => {
            if (
              clientRes &&
              clientRes.datosEntrega &&
              Array.isArray(clientRes.datosEntrega)
            ) {
              // Filtrar por ciudad si hay un pedido con envío definido
              if (this.pedidoGral?.envio?.ciudad) {
                this.datosEntregas = clientRes.datosEntrega.filter((x) => {
                  return x.ciudad == this.pedidoGral.envio.ciudad;
                });
              } else {
                this.datosEntregas = clientRes.datosEntrega;
              }
            }
          });

        Swal.fire({
          title: "Editado!",
          text: "Editado con éxito",
          icon: "success",
          confirmButtonText: "Ok",
          timer: 2000,
        });

        // Limpiar variables
        this.alias_entrega = "";
        this.nombres_entrega = "";
        this.apellidos_entrega = "";
        this.indicativo_celular_entrega = "";
        this.numero_celular_entrega = "";
        this.indicativo_celular_entrega2 = "";
        this.otro_numero_entrega = "";
        this.direccion_entrega = "";
        this.observaciones = "";
        this.barrio = "";
        this.nombreUnidad = "";
        this.especificacionesInternas = "";
        this.pais_entrega = "";
        this.departamento_entrega = "";
        this.ciudad_municipio_entrega = "";
        this.zona_cobro = "";
        this.valor_zona_cobro = "";
        this.codigo_postal_entrega = "";
      },
      error: (err) => {
        console.error("Error al editar dirección de entrega:", err);
        Swal.fire({
          title: "Error",
          text: "No se pudo guardar la dirección de entrega. Por favor intente nuevamente.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    });
  }
  editarDatosFacturacion() {
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
      indicativoCel: this.indicativo_celular_facturacion,
      celular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal,
    };
    this.datosFacturacionElectronica[this.idenxFacturacion] =
      datosFacturacionElec;

    // Si los datos de facturación editados son los que están en uso en el pedido, actualizarlos
    if (this.pedidoGral?.facturacion && this.pedidoGral.facturacion.alias === datosFacturacionElec.alias) {
      this.pedidoGral.facturacion = { ...datosFacturacionElec };
      this.pedidoGral = { ...this.pedidoGral };
    }

    // ✅ REFACTORIZADO: Actualizar solo el array de datosFacturacionElectronica en el formulario
    // El cd ya está en el formulario desde cuando se buscó el cliente en el paso 1
    this.formulario.controls["datosFacturacionElectronica"].setValue(
      this.datosFacturacionElectronica,
    );

    // ✅ LLAMADA ÚNICA: Solo editClient() - el formulario ya tiene todos los datos
    this.service.editClient(this.formulario.value).subscribe({
      next: (r) => {
        // Cerrar el modal después de guardar exitosamente
        this.modalService.dismissAll();

        // Resetear el flag de edición
        this.editandodato = false;

        // Recargar los datos del servidor para actualizar la lista
        this.service
          .getClientByDocument({ documento: this.documentoBuscar })
          .subscribe((clientRes: any) => {
            if (
              clientRes &&
              clientRes.datosFacturacionElectronica &&
              Array.isArray(clientRes.datosFacturacionElectronica)
            ) {
              this.datosFacturacionElectronica = clientRes.datosFacturacionElectronica;
            }
          });

        Swal.fire({
          title: "Editado!",
          text: "Editado con éxito",
          icon: "success",
          confirmButtonText: "Ok",
          timer: 2000,
        });

        // Limpiar variables de facturación
        this.alias_facturacion = "";
        this.razon_social = "";
        this.tipo_documento_facturacion = "";
        this.numero_documento_facturacion = "";
        this.indicativo_celular_facturacion = "";
        this.numero_celular_facturacion = "";
        this.correo_electronico_facturacion = "";
        this.direccion_facturacion = "";
        this.pais = "";
        this.departamento = "";
        this.ciudad_municipio = "";
        this.codigo_postal = "";
      },
      error: (err) => {
        console.error("Error al editar datos de facturación:", err);
        Swal.fire({
          title: "Error",
          text: "No se pudieron guardar los datos de facturación. Por favor intente nuevamente.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    });
  }

  editarDatos(modal, index) {
    this.idenxEntrega = index;
    this.editandodato = true;
    this.alias_entrega = this.datosEntregas[index].alias;
    this.nombres_entrega = this.datosEntregas[index].nombres;
    this.apellidos_entrega = this.datosEntregas[index].apellidos;
    this.indicativo_celular_entrega = this.datosEntregas[index].indicativoCel;
    this.numero_celular_entrega = this.datosEntregas[index].celular;
    this.indicativo_celular_entrega2 =
      this.datosEntregas[index].indicativoOtroNumero;
    this.otro_numero_entrega = this.datosEntregas[index].otroNumero;
    this.direccion_entrega = this.datosEntregas[index].direccionEntrega;
    this.observaciones = this.datosEntregas[index].observaciones;
    this.barrio = this.datosEntregas[index].barrio;
    this.nombreUnidad = this.datosEntregas[index].nombreUnidad;
    this.especificacionesInternas =
      this.datosEntregas[index].especificacionesInternas;
    this.pais_entrega = this.datosEntregas[index].pais;
    this.departamento_entrega = this.datosEntregas[index].departamento;
    this.ciudad_municipio_entrega = this.datosEntregas[index].ciudad;
    this.identificarDepto1();
    this.identificarCiu1();
    this.idBillingZone(this.datosEntregas[index]);
    // this.zona_cobro = this.datosEntregas[index].zonaCobro
    this.codigo_postal_entrega = this.datosEntregas[index].codigoPV;
    this.modalService.open(modal, { size: "lg" }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
        this.limpiarVariables();
      },
    );
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length) {
      this.file = files[0];
    }
  }
  readExcel(): void {
    this.datosEntregas = [];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data1 = e.target?.result;
      const workbook = XLSX.read(data1, { type: "binary" });
      const wsName = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsName];
      const json = XLSX.utils.sheet_to_json(ws);
      this.jsonData = json;

      this.jsonData.map((x: any) => {
        const datosEntreg = {
          alias: x.RefDatEntrega,
          nombres: x.Nombres,
          apellidos: x.Apellidos,
          indicativoCel: x.IndicativoCel,
          celular: x.NumCel,
          indicativoOtroNumero: x.IndicativoOtroTel,
          otroNumero: x.NumOtroTel,
          direccionEntrega: x.Direccion,
          observaciones: x.ObservacionesAdicionales,
          barrio: x.Barrio,
          nombreUnidad: x.NombreUnidadOEdificio,
          especificacionesInternas: x.TorreAptoOficina,
          pais: x.Pais,
          departamento: x.Departamento,
          ciudad: x.Ciudad,
          zonaCobro: x.ZonaCobro,
          codigoPV: x.CodigoPostal,
        };
        this.datosEntregas.push(datosEntreg);
      });
      const data = {
        documento: this.documentoBuscar,
      };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        res.datosEntrega.map((x) => {
          this.datosEntregas.push(x);
        });

        // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
        this.formulario.controls["cd"].setValue(res.cd);
        this.formulario.controls["datosFacturacionElectronica"].setValue(
          res.datosFacturacionElectronica,
        );
        this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
        this.formulario.controls["notas"].setValue(res.notas);
        this.formulario.controls["estado"].setValue(res.estado);
        this.service.editClient(this.formulario.value).subscribe((r) => {
          Swal.fire({
            title: "Guardado!",
            text: "Guardado con exito",
            icon: "success",
            confirmButtonText: "Ok",
          });
        });
      });
    };
    reader.readAsBinaryString(this.file);
  }
  guardarDatosEntrega() {
    this.datosEntregas = [];
    const datosEntreg = {
      alias: this.alias_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoOtroNumero: this.indicativo_celular_entrega2,
      otroNumero: this.otro_numero_entrega,
      direccionEntrega: this.direccion_entrega,
      observaciones: this.observaciones,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      especificacionesInternas: this.especificacionesInternas,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      zonaCobro: this.zona_cobro,
      valorZonaCobro: this.valor_zona_cobro,
      codigoPV: this.codigo_postal_entrega,
    };
    const data = {
      documento: this.documentoBuscar,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.datosEntregas.push(datosEntreg);
      res.datosEntrega.map((x) => {
        this.datosEntregas.push(x);
      });
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        this.datosEntregas.push(datosEntreg);
        res.datosEntrega.map((x) => {
          this.datosEntregas.push(x);
        });

        Swal.fire({
          title: "Guardado!",
          text: "Guardado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
        this.alias_entrega = "";
        this.nombres_entrega = "";
        this.indicativo_celular_entrega = "";
        this.numero_celular_entrega = "";
        this.otro_numero_entrega = "";
        this.direccion_entrega = "";
        this.observaciones = "";
        this.pais_entrega = "";
        this.departamento_entrega = "";
        this.ciudad_municipio_entrega = "";
        this.zona_cobro = "";
        this.valor_zona_cobro = "";
        this.codigo_postal_entrega = "";
      });
    });
  }
  guardarDatosFacturacionElectronica() {
    this.datosFacturacionElectronica = [];
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
      indicativoCel: this.indicativo_celular_facturacion,
      celular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal,
    };
    const data = {
      documento: this.documentoBuscar,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.datosFacturacionElectronica.map((x) => {
        this.datosFacturacionElectronica.push(x);
      });
      this.datosFacturacionElectronica.push(datosFacturacionElec);
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        Swal.fire({
          title: "Guardado!",
          text: "Guardado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
        this.facturacionElectronica = false;
        this.alias_facturacion = "";
        this.razon_social = "";
        this.tipo_documento_facturacion = "";
        this.numero_documento_facturacion = "";
        this.indicativo_celular_facturacion = "";
        this.numero_celular_facturacion = "";
        this.correo_electronico_facturacion = "";
        this.direccion_facturacion = "";
        this.pais = "";
        this.departamento = "";
        this.ciudad_municipio = "";
        this.codigo_postal = "";
      });
    });
  }
  editarDatos1(modal, index) {
    this.idenxFacturacion = index;
    this.editandodato = true;
    this.alias_facturacion = this.datosFacturacionElectronica[index].alias;
    this.razon_social = this.datosFacturacionElectronica[index].nombres;
    this.tipo_documento_facturacion =
      this.datosFacturacionElectronica[index].tipoDocumento;
    this.numero_documento_facturacion =
      this.datosFacturacionElectronica[index].documento;
    this.indicativo_celular_facturacion =
      this.datosFacturacionElectronica[index].indicativoCel;
    this.numero_celular_facturacion =
      this.datosFacturacionElectronica[index].celular;
    this.correo_electronico_facturacion =
      this.datosFacturacionElectronica[index].correoElectronico;
    this.direccion_facturacion =
      this.datosFacturacionElectronica[index].direccion;
    this.pais = this.datosFacturacionElectronica[index].pais;
    this.departamento = this.datosFacturacionElectronica[index].departamento;
    this.ciudad_municipio = this.datosFacturacionElectronica[index].ciudad;
    this.codigo_postal = this.datosFacturacionElectronica[index].codigoPostal;
    this.identificarDepto();
    this.identificarCiu();
    this.modalService.open(modal, { size: "lg" }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
        this.limpiarVariables();
      },
    );
  }
  replicarWhatsApp(event) {
    if (this.whatsapp.nativeElement.checked === true) {
      this.formulario.controls["indicativo_celular_whatsapp"].setValue(
        this.formulario.value.indicativo_celular_comprador,
      );
      this.formulario.controls["numero_celular_whatsapp"].setValue(
        this.formulario.value.numero_celular_comprador,
      );
    } else {
      this.formulario.controls["indicativo_celular_whatsapp"].setValue("");
      this.formulario.controls["numero_celular_whatsapp"].setValue("");
    }
  }
  limpiarVariables() {
    this.editandodato = false;
    this.alias_entrega = "";
    this.nombres_entrega = "";
    this.indicativo_celular_entrega = "";
    this.numero_celular_entrega = "";
    this.otro_numero_entrega = "";
    this.direccion_entrega = "";
    this.observaciones = "";
    this.pais_entrega = "";
    this.departamento_entrega = "";
    this.ciudad_municipio_entrega = "";
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.codigo_postal_entrega = "";
    this.facturacionElectronica = false;
    this.alias_facturacion = "";
    this.razon_social = "";
    this.tipo_documento_facturacion = "";
    this.numero_documento_facturacion = "";
    this.indicativo_celular_facturacion = "";
    this.numero_celular_facturacion = "";
    this.correo_electronico_facturacion = "";
    this.direccion_facturacion = "";
    this.pais = "";
    this.departamento = "";
    this.ciudad_municipio = "";
    this.codigo_postal = "";
  }
  eliminarDato(index: number): void {
    // Eliminar el elemento en el índice especificado
    this.datosFacturacionElectronica.splice(index, 1);
    const data = {
      documento: this.formulario.value.documento,
    };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        Swal.fire({
          title: "Eliminado!",
          text: "Eliminado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
      });
    });
  }
  eliminarDato1(index: number): void {
    // Eliminar el elemento en el índice especificado
    this.datosEntregas.splice(index, 1);
    const data = {
      documento: this.formulario.value.documento,
    };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        Swal.fire({
          title: "Eliminado!",
          text: "Eliminado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
      });
    });
  }
  onSelectCity(event: any) {
    // Determinar si el evento viene del select directo o del componente hijo
    const value = event.target ? event.target.value : event;

    // Si la ciudad no es válida, retornar
    if (value === "seleccione") {
      this.selectedCity = "";
      return;
    }

    // Obtener la ciudad anterior para comparar
    const ciudadAnterior = this.selectedCity;

    // Verificar si hay productos en el carrito y la ciudad está cambiando
    if (this.tieneProductosEnCarrito && ciudadAnterior && ciudadAnterior !== "" && ciudadAnterior !== value) {
      // Mostrar confirmación antes de cambiar la ciudad
      Swal.fire({
        title: "Cambio de Ciudad",
        html: `
          <div class="text-start">
            <p>Está cambiando la ciudad de <strong>${this.getCityLabel(ciudadAnterior)}</strong> a <strong>${this.getCityLabel(value)}</strong>.</p>
            <p class="text-danger"><strong>⚠️ Atención:</strong> Los productos en el carrito serán eliminados porque los precios y disponibilidad varían según la ciudad.</p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, cambiar ciudad",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          // Limpiar el carrito
          this.limpiarCarritoPorCambioCiudad(ciudadAnterior, value);
          // Proceder con el cambio de ciudad
          this.aplicarCambioCiudad(value);
        }
        // Si cancela, no hacer nada (mantener la ciudad anterior)
      });
      return;
    }

    // Si no hay productos en el carrito o es la primera selección, proceder directamente
    this.aplicarCambioCiudad(value);
  }

  /**
   * Aplica el cambio de ciudad actualizando todas las referencias necesarias.
   */
  private aplicarCambioCiudad(value: string): void {
    // Guardar la ciudad seleccionada
    this.selectedCity = value;

    // Actualizar ciudad en el hijo — ngOnChanges (con debounce) dispara filtrarProductos()
    // No llamar filtrarProductos() directamente aquí: causaría doble request
    if (this.productos) {
      this.productos.ciudad = value;
    }

    // Resto del código existente...
    this.pedidoGral.envio = {
      ...(this.pedidoGral.envio || {}),
      ciudad: value,
    } as any;

    // Guardar la ciudad seleccionada en localStorage
    localStorage.setItem("selectedCity", value);

    // Filtrar direcciones de entrega por la ciudad seleccionada silenciosamente
    if (this.originalDataEntregas && this.originalDataEntregas.length > 0) {
      const ciudadFiltro = normalizarCiudad(this.selectedCity);
      const filtradas = this.originalDataEntregas.filter(
        (x) => normalizarCiudad(x.ciudad) === ciudadFiltro,
      );
      // Spec fix-direcciones-ciudad-mismatch-venta-asistida: si no hay match
      // para la ciudad, mostrar TODAS las direcciones del cliente (igual que
      // aplicarFiltroCiudadEntrega) en vez de dejar la lista vacía — antes no
      // había fallback aquí, así que un mismatch de ciudad dejaba el listado
      // literalmente vacío sin ningún aviso.
      this.datosEntregas = filtradas.length > 0 ? filtradas : this.originalDataEntregas;
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = filtradas.length === 0;
      this.activarDatosEntrega =
        this.datosEntregaNoEncontradosParaCiudadSeleccionada;
    } else {
      // Si no hay datos de entrega originales, no hacer validaciones aquí
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
      this.activarDatosEntrega = false;
    }
  }

  /**
   * Limpia el carrito cuando se cambia la ciudad.
   * Muestra una notificación informativa al usuario.
   */
  private limpiarCarritoPorCambioCiudad(ciudadAnterior: string, ciudadNueva: string): void {
    // Limpiar el carrito usando el servicio
    this.cartService.clearCart();

    // Limpiar también el carrito del pedido
    if (this.pedidoGral) {
      this.pedidoGral.carrito = [];
    }

    // Obtener labels de las ciudades para el mensaje
    const nombreCiudadAnterior = this.getCityLabel(ciudadAnterior) || ciudadAnterior;
    const nombreCiudadNueva = this.getCityLabel(ciudadNueva) || ciudadNueva;

    // Mostrar notificación
    this.toastrService.warning(
      `El carrito ha sido vaciado debido al cambio de ciudad de "${nombreCiudadAnterior}" a "${nombreCiudadNueva}". Los productos y precios pueden variar según la ciudad.`,
      'Carrito Vaciado',
      {
        closeButton: true,
        timeOut: 5000,
        enableHtml: true
      }
    );

    console.log('🛒 Carrito limpiado por cambio de ciudad:', {
      ciudadAnterior: nombreCiudadAnterior,
      ciudadNueva: nombreCiudadNueva
    });
  }

  // Método para obtener el label de la ciudad seleccionada (para badge de confirmación)
  getCityLabel(value: string): string {
    const ciudad = this.empresaActual?.ciudadess?.ciudadesEntrega?.find(
      (c) => c.value === value
    );
    return ciudad ? ciudad.label : value;
  }

  // Método para delegar la búsqueda de productos al componente hijo
  onProductSearch(event: any): void {
    if (this.productos) {
      this.productos.updateFilter(event);
    }
  }

  toggleWithGreeting(tooltip, greeting: string) {
    if (tooltip.isOpen()) {
      tooltip.close();
    } else {
      tooltip.open({ greeting });
    }
  }
  gridColumn(val) {
    this.col = val;
  }
  enterStep($event: MovingDirection, index: number) {
    // Inicializar notasPedido si no existe, pero preservar las existentes
    if (!this.pedidoGral.notasPedido) {
      this.pedidoGral.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: [],
      };
    } else {
      // Asegurar que todas las categorías existan
      if (!this.pedidoGral.notasPedido.notasProduccion) {
        this.pedidoGral.notasPedido.notasProduccion = [];
      }
      if (!this.pedidoGral.notasPedido.notasCliente) {
        this.pedidoGral.notasPedido.notasCliente = [];
      }
      if (!this.pedidoGral.notasPedido.notasDespachos) {
        this.pedidoGral.notasPedido.notasDespachos = [];
      }
      if (!this.pedidoGral.notasPedido.notasEntregas) {
        this.pedidoGral.notasPedido.notasEntregas = [];
      }
      if (!this.pedidoGral.notasPedido.notasFacturacionPagos) {
        this.pedidoGral.notasPedido.notasFacturacionPagos = [];
      }
    }

    // Verificar si es "recoge en tienda" para configurar la UI correctamente
    if (index === 4) {
      const carrito = localStorage.getItem("carrito");
      try {
        if (carrito) {
          const carritoObj = JSON.parse(carrito);
          if (carritoObj && carritoObj.length > 0) {
            const formaEntrega =
              carritoObj[0]?.configuracion?.datosEntrega?.formaEntrega
                ?.toString()
                .toLowerCase();

            // Verificar si el pedido tiene configuración de forma de entrega
            this.pedidoSinConfiguracion = !formaEntrega || formaEntrega === '';

            // Inicializar selectedFormaEntrega basándose en el estado actual
            if (this.pedidoGral?.formaEntrega) {
              this.selectedFormaEntrega = this.pedidoGral.formaEntrega;
            } else if (formaEntrega) {
              this.selectedFormaEntrega = formaEntrega.includes("recoge") ? 'Recoge' : 'Domicilio';
            } else {
              this.selectedFormaEntrega = 'Domicilio';
            }

            if (formaEntrega && formaEntrega.includes("recoge")) {
              // Crear datos de envío simplificados para recogida en tienda
              const envioRecoge = {
                alias: "Recoge",
                nombres: "N/A",
                apellidos: "N/A",
                indicativoCel: "N/A",
                celular: "N/A",
                indicativoOtroNumero: "N/A",
                otroNumero: "N/A",
                direccionEntrega: "N/A",
                observaciones: "N/A",
                barrio: "N/A",
                nombreUnidad: "N/A",
                especificacionesInternas: "N/A",
                pais: "N/A",
                departamento: "N/A",
                ciudad: this.selectedCity || "N/A",
                zonaCobro: "N/A",
                valorZonaCobro: 0,
                codigoPV: "N/A",
              };

              // Asignar al pedido
              this.pedidoGral.envio = envioRecoge;
              this.pedidoGral.formaEntrega = "Recoge";
              this.pedidoGral.totalEnvio = 0;

              // Marcar que es recoge en tienda para ocultar tab de envío
              this.esRecogeEnTienda = true;

              // Activar directamente el tab de facturación
              setTimeout(() => {
                const tabFacturacion = document.getElementById('tab-facturacion');
                if (tabFacturacion) {
                  tabFacturacion.click();
                }
              }, 100);
            } else if (this.selectedFormaEntrega === 'Recoge') {
              // Si ya se había seleccionado "Recoge" manualmente (pedido sin configuración)
              this.esRecogeEnTienda = true;
            } else {
              this.esRecogeEnTienda = false;
            }
          } else {
            // Carrito vacío o sin elementos, es un pedido sin configuración
            this.pedidoSinConfiguracion = true;
          }
        } else {
          // No hay carrito, es un pedido sin configuración
          this.pedidoSinConfiguracion = true;
        }
      } catch (error) {
        this.esRecogeEnTienda = false;
      }
    }

    // Actualizar el estado en función del paso actual
    if (index == 3) {
      // Paso de cliente
      if (this.pedidoGral && this.pedidoGral.cliente) {
        this.encontrado = true;

        // Si tenemos un cliente, actualizar el formulario con sus datos
        if (this.formulario) {
          this.formulario.patchValue({
            nombres_completos: this.pedidoGral.cliente.nombres_completos,
            apellidos_completos: this.pedidoGral.cliente.apellidos_completos,
            tipo_documento_comprador:
              this.pedidoGral.cliente.tipo_documento_comprador,
            documento: this.pedidoGral.cliente.documento,
            indicativo_celular_comprador:
              this.pedidoGral.cliente.indicativo_celular_comprador,
            numero_celular_comprador:
              this.pedidoGral.cliente.numero_celular_comprador,
            indicativo_celular_whatsapp:
              this.pedidoGral.cliente.indicativo_celular_whatsapp,
            numero_celular_whatsapp:
              this.pedidoGral.cliente.numero_celular_whatsapp,
            correo_electronico_comprador:
              this.pedidoGral.cliente.correo_electronico_comprador,
          });
        }
      }
    }

    if (index == 4) {
      // Paso de envío y facturación - Cargar datos del cliente
      if (this.pedidoGral && this.pedidoGral.cliente) {
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        // Limpiar envío previo para forzar re-selección con datos frescos del cliente
        // Esto evita que una dirección de otro cliente persista si la carga asíncrona falla
        // NO limpiar si es recoge en tienda, porque el envío ya fue configurado con datos de N/A
        if (!this.esRecogeEnTienda) {
          if (!this.pedidoGral.envio?.direccionEntrega ||
              !this.datosEntregas?.some(d => d.direccionEntrega === this.pedidoGral.envio?.direccionEntrega)) {
            this.pedidoGral.envio = undefined;
          }
        }

        // Cargar datos de entrega (solo si NO es recoge en tienda)
        if (!this.esRecogeEnTienda) {
          this.cargarDatosEntregaCliente();
        }

        // Cargar datos de facturación
        if (
          !this.datosFacturacionElectronica ||
          this.datosFacturacionElectronica.length === 0
        ) {
          this.ventasService
            .getDatosFacturacion(this.documentoBuscar)
            .subscribe({
              next: (res: any) => {
                if (res && res.length > 0) {
                  this.datosFacturacionElectronica = res;
                  this.originalDataFacturacionElectronica =
                    this.utils.deepClone(res);

                  this.ref.detectChanges();
                }
              },
              error: (err) => {
                console.error('Error al cargar datos de facturación:', err);
              },
            });
        }
      }
    }

    if (index == 5) {
      // Paso de pago - Ya no necesita cargar facturación (se carga en paso 4)
      if (this.pedidoGral && this.pedidoGral.envio) {
        this.ref.detectChanges();
      }
    }

    if (index == 7) {
      this.carrito1 = localStorage.getItem("carrito");
    }

    // Forzar la detección de cambios para actualizar la vista
    this.ref.detectChanges();

    // Al finalizar cualquier cambio de paso, forzar detección de cambios
    this.ref.detectChanges();
  }

  // Método para verificar si ya existe un consumidor final en la lista
  // Busca por documento "222222222222" o por alias/nombres "Consumidor Final" para evitar duplicados
  existeConsumidorFinal(): boolean {
    if (!this.datosFacturacionElectronica || !Array.isArray(this.datosFacturacionElectronica)) return false;
    return this.datosFacturacionElectronica.some(
      (item) =>
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final",
    );
  }

  // Método para eliminar duplicados de consumidor final de la lista
  eliminarDuplicadosConsumidorFinal(): void {
    if (!this.datosFacturacionElectronica || !Array.isArray(this.datosFacturacionElectronica)) return;

    let encontradoPrimero = false;
    this.datosFacturacionElectronica = this.datosFacturacionElectronica.filter((item) => {
      const esConsumidorFinal =
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final";

      if (esConsumidorFinal) {
        if (encontradoPrimero) {
          // Ya encontramos uno antes, este es duplicado, eliminarlo
          return false;
        }
        encontradoPrimero = true;
      }
      return true;
    });
  }

  // Método para agregar un consumidor final a la lista de facturación
  agregarConsumidorFinal(): void {
    // Primero eliminar duplicados si existen
    this.eliminarDuplicadosConsumidorFinal();

    // Datos actualizados del consumidor final según normativa colombiana
    const consumidorFinal = {
      alias: "Consumidor Final",
      nombres: "CONSUMIDOR FINAL",
      tipoDocumento: "CC",
      documento: "222222222222",
      indicativoCel: "57",
      celular: "0000000000",
      correoElectronico: "consumidorfinal@katuq.com",
      direccion: "N/A",
      pais: "Colombia",
      departamento: "N/A",
      ciudad: "N/A",
      codigoPostal: "000000",
    };

    // Si la lista no está inicializada, crearla
    if (!this.datosFacturacionElectronica) {
      this.datosFacturacionElectronica = [];
    }

    // Buscar si ya existe un consumidor final para actualizarlo
    const index = this.datosFacturacionElectronica.findIndex(
      (item) =>
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final"
    );

    if (index >= 0) {
      // Actualizar el consumidor final existente con los nuevos datos
      this.datosFacturacionElectronica[index] = consumidorFinal;
    } else {
      // Agregar un nuevo consumidor final
      this.datosFacturacionElectronica.push(consumidorFinal);
    }
  }

  private reviewStepAndExecute(index: number) {
    if (index == 1) {
      // Paso del cliente - Validar que existe un cliente antes de ir a Productos
      if (!this.pedidoGral.cliente) {
        Swal.fire({
          title: "Advertencia",
          text: "Debe seleccionar o crear un cliente para continuar",
          icon: "warning",
        });
        return;
      }
    }

    if (index == 3) {
      // D-147: no avanzar de Carrito a Envío si queda una línea de combo sin
      // configurar — mismo guard que ya bloquea el pago final en
      // checkout.component.ts::gotToPaymentOrder(), pero aplicado más temprano
      // para no dejar que el vendedor avance varios pasos antes de enterarse.
      const carritoActual = this.cartService.productInCart.value || [];
      const lineasPendientes = carritoActual.filter(
        (item: any) => item?._requiereConfiguracionPendiente === true
      );
      if (lineasPendientes.length > 0) {
        const nombres = lineasPendientes
          .map((item: any) => item?.producto?.crearProducto?.titulo || 'Producto')
          .join(', ');
        Swal.fire({
          title: "Configuración pendiente",
          text: `Completa la configuración de: ${nombres} antes de continuar. Estos productos vinieron de un combo y necesitan datos adicionales.`,
          icon: "warning",
        });
        return;
      }

      // Paso de Carrito hacia Envío - Preparar datos de envío
      if (this.pedidoGral.cliente) {
        // Si hay cliente, intentar cargar sus datos de envío
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        // Siempre cargar los datos de entrega actualizados para asegurar que estén disponibles
        // Verificar si se necesitan cargar datos de entrega
        this.cargarDatosEntregaCliente();
      }
    }

    if (index == 4) {
      // Paso de facturación - Preparar datos de facturación
      if (this.pedidoGral.cliente) {
        // Si hay cliente, intentar cargar sus datos de facturación
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        // Verificamos si ya hay datos cargados previamente
        if (
          !this.datosFacturacionElectronica ||
          this.datosFacturacionElectronica?.length === 0
        ) {
          this.ventasService
            .getDatosFacturacion(this.documentoBuscar)
            .subscribe({
              next: (res: any) => {
                if (res && res.length > 0) {
                  this.datosFacturacionElectronica = res;
                }
              },
              error: (err) => {
                console.error("Error al cargar datos de facturación:", err);
              },
            });
        }

        // Verificar si la forma de entrega es "recoge" para no validar datos de envío
        const carrito = localStorage.getItem("carrito");
        let esRecogeEnTienda = false;

        try {
          if (carrito) {
            const carritoObj = JSON.parse(carrito);
            // Verificar si la forma de entrega contiene la palabra "recoge"
            if (carritoObj && carritoObj.length > 0) {
              const formaEntrega =
                carritoObj[0]?.configuracion?.datosEntrega?.formaEntrega
                  ?.toString()
                  .toLowerCase();
              if (formaEntrega && formaEntrega.includes("recoge")) {
                esRecogeEnTienda = true;

                // Si es recogida en tienda y no hay datos de envío, crear datos mínimos
                if (!this.pedidoGral.envio) {
                  const envioRecoge = {
                    alias: "Recoge",
                    nombres: "N/A",
                    apellidos: "N/A",
                    indicativoCel: "N/A",
                    celular: "N/A",
                    indicativoOtroNumero: "N/A",
                    otroNumero: "N/A",
                    direccionEntrega: "N/A",
                    observaciones: "N/A",
                    barrio: "N/A",
                    nombreUnidad: "N/A",
                    especificacionesInternas: "N/A",
                    pais: "N/A",
                    departamento: "N/A",
                    ciudad: this.selectedCity || "N/A",
                    zonaCobro: "N/A",
                    valorZonaCobro: 0,
                    codigoPV: "N/A",
                  };
                  this.pedidoGral.envio = envioRecoge;
                  this.pedidoGral.formaEntrega = "Recoge";
                }
              }
            }
          }
        } catch (error) {
          console.error(
            "Error al procesar carrito para verificar forma de entrega:",
            error,
          );
        }

        // Si no es recogida en tienda, verificar que existan datos de envío
        if (!esRecogeEnTienda && !this.pedidoGral.envio) {
          Swal.fire({
            title: "Advertencia",
            text: "Debe seleccionar o crear datos de envío antes de continuar",
            icon: "warning",
          });
          return;
        }
      }
    }

    if (index == 5) {
      // Paso de resumen - Validar que existe información de facturación antes de ir a Pago
      if (!this.pedidoGral.facturacion) {
        Swal.fire({
          title: "Advertencia",
          text: "Debe seleccionar o crear datos de facturación antes de continuar",
          icon: "warning",
        });
        return;
      }

      // Cargar datos del carrito para el resumen
      this.carrito1 = localStorage.getItem("carrito");
      try {
        if (this.carrito1) {
          this.carrito1 = JSON.parse(this.carrito1);

          // Si es forma de entrega "recoge", crear datos de envío simplificados
          if (
            this.carrito1[0]?.configuracion?.datosEntrega?.formaEntrega
              ?.toString()
              .toLowerCase()
              .includes("recoge")
          ) {
            this.activarEntrega = false;
            const envioRecoge = {
              alias: "Recoge",
              nombres: "N/A",
              apellidos: "N/A",
              indicativoCel: "N/A",
              celular: "N/A",
              indicativoOtroNumero: "N/A",
              otroNumero: "N/A",
              direccionEntrega: "N/A",
              observaciones: "N/A",
              barrio: "N/A",
              nombreUnidad: "N/A",
              especificacionesInternas: "N/A",
              pais: "N/A",
              departamento: "N/A",
              ciudad:
                this.pedidoGral.envio?.ciudad || this.selectedCity || "N/A",
              zonaCobro: "N/A",
              valorZonaCobro: 0,
              codigoPV: "N/A",
            };
            this.pedidoGral.envio = envioRecoge;
          }
        }
      } catch (e) {}
    }
  }

  // Método para preparar el pago llamando primero al método del checkout
  prepararPago() {
    if (!this.resumen) {
      Swal.fire({
        title: "Error",
        text: "No se pudo acceder al formulario de pago. Intente nuevamente.",
        icon: "error",
      });
      return;
    }

    // Llamar al método del checkout para preparar los datos del pedido
    this.resumen
      .gotToPaymentOrder()
      .then(() => {
        // El evento comprarYPagar será emitido por el checkout y capturado
        // mediante el binding (comprarYPagar)="comprarYPagar($event)" en el HTML
      })
      .catch((error) => {
        Swal.fire({
          title: "Error",
          text: "Ocurrió un error al preparar el pago. Verifique los datos e intente nuevamente.",
          icon: "error",
        });
      });
  }

  // Método para procesar el pago después de recibir los datos completos del checkout
  async comprarYPagar(pedidoProcesado: Pedido) {
    // Asegurarnos de mantener la información correcta del pedido
    this.pedidoGral = { ...pedidoProcesado };

    // Validar productos con precio manual no configurado
    const productosSinPrecioManual = this.pedidoGral.carrito?.filter(item =>
      item.producto?.procesoComercial?.permitePrecioManual === true
      && (item._precioManualOverride === undefined || item._precioManualOverride === null)
    );

    if (productosSinPrecioManual?.length > 0) {
      const nombres = productosSinPrecioManual
        .map(item => item.producto?.crearProducto?.titulo || 'Producto sin nombre')
        .join(', ');

      const result = await Swal.fire({
        title: 'Precio manual no configurado',
        html: `Los siguientes productos permiten precio manual pero no tienen precio asignado:<br><b>${nombres}</b><br>¿Desea continuar con el precio base?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Volver al carrito',
      });

      if (!result.isConfirmed) return;
    }

    // Validar que la dirección de envío pertenezca al cliente actual
    if (this.pedidoGral.envio?.direccionEntrega && this.pedidoGral.formaEntrega !== 'Recoge' && !this.esRecogeEnTienda) {
      const envioActual = this.pedidoGral.envio;
      const direccionExisteEnCliente = this.originalDataEntregas?.some(
        (d) => d.direccionEntrega === envioActual.direccionEntrega
      );
      if (!direccionExisteEnCliente && this.originalDataEntregas?.length > 0) {
        Swal.fire({
          title: 'Dirección no corresponde al cliente',
          html: `<p>La dirección de envío <b>"${envioActual.direccionEntrega}"</b> no está registrada para el cliente <b>${this.pedidoGral.cliente?.nombres_completos || ''} ${this.pedidoGral.cliente?.apellidos_completos || ''}</b>.</p>
                 <p>Por favor regrese al paso de envío y seleccione una dirección válida.</p>`,
          icon: 'error',
          confirmButtonText: 'Entendido',
        });
        return;
      }
    }

    // Detectar si hay productos dropshipping en el carrito
    const hasDropshippingProducts = this.detectDropshippingProducts();
    
    // Añadir información de canal y tipo de orden
    if (hasDropshippingProducts) {
      this.pedidoGral.typeOrder = "Dropshipping";
      this.pedidoGral.channel = {
        name: "Venta Asistida Dropshipping",
        tipo: "Dropshipping",
        activo: true,
        createdAt: new Date().toISOString(),
      };
      
      // Configurar estados específicos para productos dropshipping
      this.configureDropshippingStates();
    } else {
      this.pedidoGral.typeOrder = "E-commerce";
      this.pedidoGral.channel = {
        name: "Venta Asistida",
        tipo: "E-commerce",
        activo: true,
        createdAt: new Date().toISOString(),
      };
    }

    // Verificar que se haya seleccionado una bodega
    if (this.bodega) {
      this.pedidoGral.bodegaId = this.bodega?.idBodega;
    } else {
      Swal.fire({
        title: "Error",
        text: "No se ha seleccionado una bodega",
        icon: "error",
      });
      return;
    }

    // Actualizar estado según los productos
    this.cambiarEstadoSegunLosProductos();

    // Verificar la forma de pago
    const formaPago = this.pedidoGral.formaDePago?.toLowerCase() || "";
    if (formaPago.includes("wompi")) {
      // Para Wompi, primero guardar el pedido y después mostrar el widget de pago
      this.pedidoGral.estadoPago = EstadoPago.Pendiente; // Asegurar que el estado comienza como pendiente
      this.guardarPedidoParaWompi().then((pedidoGuardado) => {
        if (pedidoGuardado) {
          // Si el pedido se guardó correctamente, mostrar el widget de pago
          this.iniciarPagoConWompi()
            .then((pagoExitoso) => {
              if (pagoExitoso) {
                // El pago fue exitoso, actualizar estado del pedido
                this.actualizarEstadoPedido(
                  this.pedidoGral.nroPedido as string,
                  EstadoPago.Pendiente,
                );
                this.showPedidoConfirm = true;
                this.showSteper = true; // Mantener visible el wizard para mostrar el paso de confirmación
                this.mywizard.goToNextStep();
              } else {
                // El pago fue rechazado o cancelado
                this.actualizarEstadoPedido(
                  this.pedidoGral.nroPedido as string,
                  EstadoPago.Rechazado,
                );
                Swal.fire({
                  title: "Pago no completado",
                  text: "No se pudo completar el pago con Wompi. El pedido ha sido guardado con estado pendiente.",
                  icon: "warning",
                  confirmButtonText: "Ok",
                });
              }
            })
            .catch((error) => {
              Swal.fire({
                title: "Error en el pago",
                text: "Ocurrió un error durante el proceso de pago. El pedido ha sido guardado con estado pendiente.",
                icon: "warning",
                confirmButtonText: "Ok",
              });
            });
        } else {
          // Si hubo un error al guardar el pedido
          Swal.fire({
            title: "Error",
            text: "No se pudo guardar el pedido. Por favor intente nuevamente.",
            icon: "error",
            confirmButtonText: "Ok",
          });
        }
      });
    } else {
      // Si no es Wompi, continuar con el proceso normal de creación de pedido
      this.continuarCreacionPedido();
    }
  }

  // Método para continuar con la creación del pedido normal (no Wompi)
  private continuarCreacionPedido() {
    const context = this;
    context.ventasService
      .validateNroPedido(context.pedidoGral.nroPedido as string)
      .subscribe({
        next: (res: any) => {
          // Configurar la visualización del paso de confirmación
          this.showPedidoConfirm = true;
          this.showSteper = true; // Mantener el wizard visible para mostrar el paso de confirmación

          // Recalcular totales con la lógica correcta del frontend antes de enviar al backend.
          // Esto respeta: precio por tipo de cliente (sin escala) y precio por volumen.
          // El backend puede recalcular con precio base sin aplicar estas reglas.
          const subtotalFrontend = context.pyamentService.checkPriceScale(context.pedidoGral);
          context.pedidoGral.totalPedidoSinDescuento = subtotalFrontend;
          context.pedidoGral.totalPedididoConDescuento =
            subtotalFrontend
            - (Number(context.pedidoGral.totalDescuento) || 0)
            + (Number(context.pedidoGral.totalEnvio) || 0)
            + (Number(context.pedidoGral.totalImpuesto) || 0);
          context.pedidoGral.faltaPorPagar = Math.max(
            0,
            context.pedidoGral.totalPedididoConDescuento - (Number(context.pedidoGral.anticipo) || 0)
          );

          // Generar contenido HTML del pedido
          const htmlSanizado = context.pyamentService.getHtmlContent(
            context.pedidoGral,
          );

          // DEBUG: Log antes de crear el pedido
          console.log('🚀 ===== CREAR PEDIDO - DATOS ANTES DE ENVIAR =====');
          console.log('📦 Pedido completo:', JSON.parse(JSON.stringify(this.pedidoGral)));
          console.log('📧 Email HTML:', htmlSanizado ? 'Generado ✅' : 'No generado ❌');
          console.log('🏢 Empresa:', this.pedidoGral.company);
          console.log('👤 Cliente:', this.pedidoGral.cliente);
          console.log('🛒 Carrito items:', this.pedidoGral.carrito?.length || 0);
          console.log('💰 Total pedido:', this.pedidoGral.totalPedididoConDescuento);
          console.log('📍 Dirección entrega:', this.pedidoGral.envio);
          console.log('💳 Forma de pago:', this.pedidoGral.formaDePago);
          console.log('🔄 Estado proceso:', this.pedidoGral.estadoProceso);
          console.log('💵 Estado pago:', this.pedidoGral.estadoPago);
          console.log('===============================================');

          // Crear el pedido en el sistema
          context.ventasService
            .createOrder({ order: this.pedidoGral, emailHtml: htmlSanizado })
            .subscribe({
              next: (res: any) => {
                const orderSiigo =
                  context.facturacionElectronicaService.transformarPedidoLite(
                    context.pedidoGral,
                  );
                if (res.order?.pagoInformation) {
                  // Actualizar con información adicional que pueda haber agregado el backend
                  this.pedidoGral = { ...this.pedidoGral, ...res.order };
                }

                // Obtener el ID del pedido creado
                const orderId = res.order?._id || res.orderId || res.id;
                // Preferir el nro confirmado por el backend; fallback al pre-generado en el cliente.
                const nroPedido = res.order?.nroPedido || res.order?.referencia || this.pedidoGral.nroPedido || this.pedidoGral.referencia || '';

                context.cartService.clearCart();
                context.pedidoSinGuardar = false;
                // Spec 008.2: sellar la cotización origen SOLO si el pedido se creó de verdad
                // (la respuesta trae order/orderId). Evita asociar un pedido inexistente
                // ante un 2xx vacío o un success:false.
                if (orderId || res.order) {
                  this.marcarCotizacionConvertidaSiAplica(nroPedido);
                }
                this.mywizard.goToNextStep();

                // Mostrar mensaje de éxito
                Swal.fire({
                  title: "¡Pedido creado!",
                  text: "El pedido se ha creado exitosamente",
                  icon: "success",
                  confirmButtonText: "Ok",
                });

                // Encolar facturación electrónica en background si está habilitada globalmente o si el checkbox está marcado
                if (orderId && (context.siigoEnabled || context.generarFacturaElectronica)) {
                  context.encolarFacturacionSiigo(orderId, nroPedido);
                }

                // ir al siguiente paso (confirmación)
                this.mywizard.goToNextStep();
              },
              error: (err: any) => {
                Swal.fire({
                  title: "Error",
                  text: "No se pudo crear el pedido. Por favor intente nuevamente.",
                  icon: "error",
                  confirmButtonText: "Ok",
                });
              },
            });

          // ir al siguiente paso (confirmación)
          this.mywizard.goToNextStep();
        },
        error: (err) => {
          Swal.fire({
            title: "Error",
            text: "No se pudo validar el número de pedido. Por favor intente nuevamente.",
            icon: "error",
            confirmButtonText: "Ok",
          });
        },
      });
  }

  cambiarEstadoSegunLosProductos() {
    // Verificar que el carrito existe y tiene elementos
    if (!this.pedidoGral?.carrito || this.pedidoGral.carrito.length === 0) {
      return; // No hay productos para procesar
    }

    const siTodosSonParaProducir = this.pedidoGral.carrito.some((item) => {
      return item?.producto?.crearProducto?.paraProduccion;
    });

    if (!siTodosSonParaProducir) {
      this.pedidoGral.estadoProceso = EstadoProceso.ParaDespachar;
    }
  }

  overridePedido(event: Pedido) {
    this.pedidoGral = event;
    console.log(this.pedidoGral);

    // Recargar datos de entrega cuando se actualiza el pedido
    if (this.pedidoGral?.cliente?.documento) {
      this.documentoBuscar = this.pedidoGral.cliente.documento;
      this.cargarDatosEntregaCliente();
    }

    // Usar operadores de acceso seguro para evitar errores
    if (
      this.pedidoGral?.facturacion &&
      this.pedidoGral.facturacion.hasOwnProperty("direccion")
    ) {
      if (
        this.pedidoGral.carrito &&
        this.pedidoGral.carrito[0]?.configuracion?.datosEntrega?.formaEntrega
          ?.toString()
          .toLowerCase()
          .includes("domicilio")
      ) {
        // Verificar que existe envío y tiene dirección
        if (
          this.pedidoGral.envio &&
          this.pedidoGral.envio.hasOwnProperty("direccionEntrega")
        ) {
          this.nextAvailable = true;
        } else {
          this.nextAvailable = false;
        }
      } else {
        this.nextAvailable = true;
      }
    } else {
      this.nextAvailable = false;
    }
  }

  /**
   * Maneja el cambio del checkbox de generar factura electrónica
   * @param value - Nuevo valor del checkbox (true/false)
   */
  onGenerarFacturaChange(value: boolean): void {
    this.generarFacturaElectronica = value;
    if (this.pedidoGral) {
      this.pedidoGral.generarFacturaElectronica = value;
    }
    console.log('📄 Generar Factura Electrónica:', value);
    }
  verificarPedidoSinConfiguracion(): boolean {
    try {
      const carrito = localStorage.getItem("carrito");
      if (carrito) {
        const carritoObj = JSON.parse(carrito);
        if (carritoObj && carritoObj.length > 0) {
          const formaEntrega = carritoObj[0]?.configuracion?.datosEntrega?.formaEntrega;
          // Si no hay formaEntrega configurada, es un pedido sin configuración
          return !formaEntrega;
        }
      }
      return true; // Si no hay carrito, asumir sin configuración
    } catch (error) {
      console.error("Error al verificar configuración del pedido:", error);
      return true;
    }
  }

  /**
   * Determina si debe mostrar el selector de forma de entrega
   * El selector NO debe mostrarse cuando todos los productos del carrito
   * tienen llevaCalendario activado (procesoComercial.llevaCalendario = true),
   * ya que el calendario maneja la configuración de entrega.
   * Si al menos un producto NO tiene calendario activado, SÍ se muestra el selector.
   */

  /** true cuando el cliente activo es persona jurídica (NIT / empresa) */
  get clienteEsEmpresa(): boolean {
    return this.pedidoGral?.cliente?.tipo_documento_comprador === 'CC-NIT';
  }

  /** Nombre de empresa: nombres_completos para NIT, nombre completo para persona natural */
  get clienteNombreEmpresa(): string {
    return this.pedidoGral?.cliente?.nombres_completos || '';
  }

  /** Contacto principal: apellidos_completos solo cuando es empresa (NIT) */
  get clienteNombreContacto(): string {
    const c = this.pedidoGral?.cliente;
    if (!c || c.tipo_documento_comprador !== 'CC-NIT') return '';
    return c.apellidos_completos || '';
  }

  get mostrarSelectorFormaEntrega(): boolean {
    try {
      const carrito = localStorage.getItem("carrito");
      if (carrito) {
        const carritoObj = JSON.parse(carrito);
        if (carritoObj && carritoObj.length > 0) {
          // Verificar si al menos un producto tiene calendario desactivado
          const tieneProductoSinCalendario = carritoObj.some(
            (item: any) => !item.producto?.procesoComercial?.llevaCalendario
          );

          if (tieneProductoSinCalendario) {
            return true;
          }
          return false;
        }
      }

      // Si no hay carrito, mostrar selector por defecto
      return true;
    } catch (error) {
      console.error("Error al verificar si mostrar selector de forma de entrega:", error);
      return true;
    }
  }

  /**
   * Maneja el cambio de forma de entrega para pedidos sin configuración
   * @param nuevaFormaEntrega La nueva forma de entrega seleccionada ('Domicilio' o 'Recoge')
   */
  onFormaEntregaChange(nuevaFormaEntrega: string): void {
    this.selectedFormaEntrega = nuevaFormaEntrega;

    if (nuevaFormaEntrega === 'Recoge') {
      // Configurar como recoge en tienda
      this.esRecogeEnTienda = true;

      // Crear datos de envío simplificados para recogida en tienda
      const envioRecoge = {
        alias: "Recoge",
        nombres: "N/A",
        apellidos: "N/A",
        indicativoCel: "N/A",
        celular: "N/A",
        indicativoOtroNumero: "N/A",
        otroNumero: "N/A",
        direccionEntrega: "N/A",
        observaciones: "N/A",
        barrio: "N/A",
        nombreUnidad: "N/A",
        especificacionesInternas: "N/A",
        pais: "N/A",
        departamento: "N/A",
        ciudad: this.selectedCity || "N/A",
        zonaCobro: "N/A",
        valorZonaCobro: 0,
        codigoPV: "N/A",
      };

      // Asignar al pedido
      this.pedidoGral.envio = envioRecoge;
      this.pedidoGral.formaEntrega = "Recoge";
      this.pedidoGral.totalEnvio = 0;

      // Actualizar configuración de todos los productos del carrito
      if (this.pedidoGral.carrito && this.pedidoGral.carrito.length > 0) {
        this.pedidoGral.carrito.forEach(item => {
          if (!item.configuracion) {
            (item as any).configuracion = {};
          }
          if (!item.configuracion.datosEntrega) {
            (item.configuracion as any).datosEntrega = {};
          }
          item.configuracion.datosEntrega.formaEntrega = "Recoge";
        });
      }

      // Actualizar también en localStorage
      this.actualizarFormaEntregaEnCarritoLocalStorage("Recoge");

      // Activar directamente el tab de facturación
      setTimeout(() => {
        const tabFacturacion = document.getElementById('tab-facturacion');
        if (tabFacturacion) {
          tabFacturacion.click();
        }
      }, 100);

    } else {
      // Configurar como domicilio
      this.esRecogeEnTienda = false;

      // Limpiar datos de envío para que el usuario los configure
      this.pedidoGral.envio = null;
      this.pedidoGral.formaEntrega = "Domicilio";

      // Actualizar configuración de todos los productos del carrito
      if (this.pedidoGral.carrito && this.pedidoGral.carrito.length > 0) {
        this.pedidoGral.carrito.forEach(item => {
          if (!item.configuracion) {
            (item as any).configuracion = {};
          }
          if (!item.configuracion.datosEntrega) {
            (item.configuracion as any).datosEntrega = {};
          }
          item.configuracion.datosEntrega.formaEntrega = "Domicilio";
        });
      }

      // Actualizar también en localStorage
      this.actualizarFormaEntregaEnCarritoLocalStorage("Domicilio");

      // Activar el tab de envío
      setTimeout(() => {
        const tabEnvio = document.getElementById('tab-envio');
        if (tabEnvio) {
          tabEnvio.click();
        }
      }, 100);
    }

    // Forzar detección de cambios creando una nueva referencia del pedido
    // Esto dispara ngOnChanges en el componente checkout para actualizar la forma de entrega
    this.pedidoGral = { ...this.pedidoGral };
    this.ref.detectChanges();
  }

  /**
   * Actualiza la forma de entrega en el carrito del localStorage
   * @param formaEntrega La forma de entrega a establecer
   */
  private actualizarFormaEntregaEnCarritoLocalStorage(formaEntrega: string): void {
    try {
      const carrito = localStorage.getItem("carrito");
      if (carrito) {
        const carritoObj = JSON.parse(carrito);
        if (carritoObj && carritoObj.length > 0) {
          carritoObj.forEach((item: any) => {
            if (!item.configuracion) {
              item.configuracion = {};
            }
            if (!item.configuracion.datosEntrega) {
              item.configuracion.datosEntrega = {};
            }
            item.configuracion.datosEntrega.formaEntrega = formaEntrega;
          });
          localStorage.setItem("carrito", JSON.stringify(carritoObj));
        }
      }
    } catch (error) {
      console.error("Error al actualizar forma de entrega en localStorage:", error);
    }
  }

  onBillingSame(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      // Copiar datos de contacto del comprador desde el formulario reactivo
      this.alias_facturacion = this.formulario.value.nombres_completos;
      this.razon_social = this.formulario.value.nombres_completos;
      this.tipo_documento_facturacion =
        this.formulario.value.tipo_documento_comprador;
      this.numero_documento_facturacion = this.formulario.value.documento;
      this.indicativo_celular_facturacion =
        this.formulario.value.indicativo_celular_comprador;
      this.numero_celular_facturacion =
        this.formulario.value.numero_celular_comprador;
      this.correo_electronico_facturacion =
        this.formulario.value.correo_electronico_comprador;
      // Aquí se heredan los datos de ubicación y dirección que están ligados por ngModel en la plantilla:
      // (asegúrate de que los inputs de dirección tengan [(ngModel)] asignados a estas mismas variables)
      this.direccion_facturacion = this.direccion_facturacion;
      this.pais = this.pais;
      this.departamento = this.departamento;
      this.ciudad_municipio = this.ciudad_municipio;
      this.codigo_postal = this.codigo_postal;
      // De esta forma, al crear el cliente, en los objetos tanto de facturación como de entrega se podrá
      // utilizar la misma dirección y ubicación.
    } else {
      // Opcional: limpiar los datos de facturación
      this.alias_facturacion = "";
      this.razon_social = "";
      this.tipo_documento_facturacion = "";
      this.numero_documento_facturacion = "";
      this.indicativo_celular_facturacion = "";
      this.numero_celular_facturacion = "";
      this.correo_electronico_facturacion = "";
    }
  }

  identificarDepto() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais) {
        this.departamentos = x.Regiones.map((c) => {
          return c.departamento;
        });
      }
    });
  }

  identificarCiu() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais) {
        x.Regiones.map((y) => {
          if (y.departamento == this.departamento) {
            this.ciudades = y.ciudades.map((c) => {
              return c;
            });
            this.ciudadesOrigen = this.ciudades.map((city) => ({
              value: city,
              label: city,
            }));
          }
        });
      }
    });
  }

  identificarDepto1() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais_entrega) {
        this.departamentos1 = x.Regiones.map((c) => {
          return c.departamento;
        });
      }
    });
  }

  identificarCiu1() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais_entrega) {
        x.Regiones.map((y) => {
          if (y.departamento == this.departamento_entrega) {
            this.ciudades1 = y.ciudades.map((c) => {
              return c;
            });
          }
        });
      }
    });
  }

  // ========== MÉTODOS DANE CODES ==========

  /**
   * Carga departamentos DANE al iniciar
   */
  cargarDepartamentosDane(): void {
    this.daneCodesService.getDepartamentos().subscribe(deptos => {
      this.departamentosDane = deptos;
    });
  }

  /**
   * Cambia departamento y carga municipios DANE
   */
  onDepartamentoDaneChange(departamento: string): void {
    this.departamentoDaneSeleccionado = departamento;
    if (!departamento) {
      this.municipiosDane = [];
      return;
    }
    this.cargandoCiudadesDane = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDane = municipios;
      this.cargandoCiudadesDane = false;
    });
  }

  /**
   * Busca municipios por texto (nombre o código DANE)
   * Si hay un departamento seleccionado, filtra solo en ese departamento
   */
  buscarMunicipioDane(query: string): void {
    if (!query || query.length < 2) {
      // Si hay departamento seleccionado, mostrar municipios del departamento
      if (this.departamentoDaneSeleccionado) {
        this.onDepartamentoDaneChange(this.departamentoDaneSeleccionado);
      } else {
        this.municipiosDane = [];
      }
      return;
    }
    this.cargandoCiudadesDane = true;
    // Pasar el departamento seleccionado para filtrar
    this.daneCodesService.searchMunicipios(query, this.departamentoDaneSeleccionado || undefined).subscribe(resultados => {
      this.municipiosDane = resultados;
      this.cargandoCiudadesDane = false;
    });
  }

  /**
   * Selecciona un municipio DANE
   */
  seleccionarMunicipioDane(municipio: MunicipioDane): void {
    const ciudadAnterior = this.selectedCity;
    const ciudadNueva = municipio.nombre;

    // Verificar si hay productos en el carrito y la ciudad está cambiando
    if (this.tieneProductosEnCarrito && ciudadAnterior && ciudadAnterior !== '' && ciudadAnterior !== ciudadNueva) {
      Swal.fire({
        title: "Cambio de Ciudad",
        html: `
          <div class="text-start">
            <p>Está cambiando la ciudad de <strong>${ciudadAnterior}</strong> a <strong>${ciudadNueva}</strong>.</p>
            <p class="text-danger"><strong>⚠️ Atención:</strong> Los productos en el carrito serán eliminados porque los precios y disponibilidad varían según la ciudad.</p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, cambiar ciudad",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.limpiarCarritoPorCambioCiudad(ciudadAnterior, ciudadNueva);
          this.aplicarCambioCiudadDane(municipio);
        }
        // Si cancela, no hacer nada (mantener la ciudad anterior)
      });
      return;
    }

    // Si no hay productos en el carrito o es la primera selección, proceder directamente
    this.aplicarCambioCiudadDane(municipio);
  }

  /**
   * Aplica el cambio de ciudad DANE actualizando todas las referencias necesarias.
   */
  private aplicarCambioCiudadDane(municipio: MunicipioDane): void {
    this.pais_entrega = 'Colombia';
    this.departamento_entrega = municipio.departamento;
    this.ciudad_municipio_entrega = municipio.nombre;
    this.ciudades1 = [municipio.nombre];
    // Actualizar selectedCity para que la UI refleje la selección
    this.selectedCity = municipio.nombre;
    localStorage.setItem('selectedCity', municipio.nombre);
    this.daneCodesService.addMunicipioFrecuente(municipio);
    this.idBillingZone('');
    // Limpiar búsqueda
    this.searchQueryCiudadDane = '';
    this.municipiosDane = [];
    // Notificar al componente de productos si existe
    if (this.productos) {
      this.productos.ciudad = municipio.nombre;
      if (typeof this.productos.cargarTodo === 'function') {
        this.productos.cargarTodo();
      }
    }
  }

  idBillingZone(zona_cobro: any) {
    const ciudad = this.ciudad_municipio_entrega;
    const context = this;
    // Spec 011 v2: la zona es un paquete; se cubre la ciudad si está en municipios[].
    context.filteredResults = context.allBillingZone.filter(
      (item) => zonaCubreCiudad(item, ciudad),
    );
    // Si zona_cobro es un objeto con datos (carga de dirección existente)
    if (zona_cobro && zona_cobro.zonaCobro) {
      context.zona_cobro = zona_cobro.zonaCobro;
      context.valor_zona_cobro = zona_cobro.valorZonaCobro;
    }
    // Si el usuario seleccionó del dropdown, this.zona_cobro ya tiene el nombre (por ngModel)
    // Buscar el valorZonaCobro correspondiente en filteredResults
    else if (context.zona_cobro && context.filteredResults && context.filteredResults.length > 0) {
      const zonaSeleccionada = context.filteredResults.find(
        (item) => item.nombreZonaCobro === context.zona_cobro
      );
      if (zonaSeleccionada) {
        context.valor_zona_cobro = zonaSeleccionada.valorZonaCobro;
      }
    }
  }

  // NUEVO MÉTODO: Mostrar formulario para crear nuevo cliente
  mostrarFormularioNuevoCliente() {
    // Limpiar el formulario
    this.formulario.reset();

    // Establecer valores por defecto
    this.formulario.patchValue({
      tipo_documento_comprador: "CC-NIT",
      indicativo_celular_comprador: "57",
      indicativo_celular_whatsapp: "57",
    });

    // Limpiar arrays de datos
    this.datosFacturacionElectronica = [];
    this.datosEntregas = [];

    // Resetear estados
    this.encontrado = false;
    this.clienteRecienCreado = false;
    this.creandoCliente = false;

    // Mostrar el formulario
    this.mostrarFormularioCliente = true;

    // Forzar detección de cambios
    this.ref.detectChanges();
  }

  // NUEVO MÉTODO: Crear cliente de forma rápida usando los datos mínimos del formulario
  crearClienteRapido() {
    // Validar que el formulario sea válido antes de proceder
    if (this.formulario.invalid) {
      Swal.fire({
        title: "Formulario Incompleto",
        text: "Por favor complete todos los campos requeridos antes de guardar el cliente.",
        icon: "warning",
        confirmButtonText: "Ok",
      });
      return;
    }

    // Activar indicador de carga
    this.creandoCliente = true;

    // Primero verificar si el cliente ya existe por documento
    const documentoCliente = (this.formulario.value.documento || "").trim();
    this.service.getClientByDocument({ documento: documentoCliente }).subscribe({
      next: (res: any) => {
        // Verificar si el cliente ya existe
        const esArrayVacio = Array.isArray(res) && res.length === 0;
        const clienteExiste = res && !esArrayVacio;

        if (clienteExiste) {
          // Cliente ya existe - cargar sus datos como si fuera una consulta normal
          this.creandoCliente = false;

          // Obtener el cliente (puede ser objeto directo o primer elemento del array)
          const cliente = Array.isArray(res) ? res[0] : res;

          // === Replicar la misma lógica del método buscar() ===

          // Actualizar pedidoGral con el cliente
          this.pedidoGral.cliente = cliente;
          this.ref.markForCheck();
          sessionStorage.setItem("cliente", JSON.stringify(cliente));

          // Cargar los datos del cliente existente en el formulario
          this.formulario.patchValue({
            cd: cliente.cd,
            nombres_completos: cliente.nombres_completos,
            apellidos_completos: cliente.apellidos_completos,
            tipo_documento_comprador: cliente.tipo_documento_comprador,
            documento: cliente.documento,
            indicativo_celular_comprador: cliente.indicativo_celular_comprador,
            numero_celular_comprador: cliente.numero_celular_comprador,
            indicativo_celular_whatsapp: cliente.indicativo_celular_whatsapp,
            numero_celular_whatsapp: cliente.numero_celular_whatsapp,
            correo_electronico_comprador: cliente.correo_electronico_comprador,
            datosFacturacionElectronica: cliente.datosFacturacionElectronica || [],
            datosEntrega: cliente.datosEntrega || [],
            notas: cliente.notas || [],
            estado: cliente.estado || "activo",
          });

          // Preservar notas existentes si ya existen, sino inicializar con las del cliente
          if (!this.pedidoGral.notasPedido) {
            this.pedidoGral.notasPedido = {
              notasCliente: this.formulario.value.notas as Notas[],
              notasDespachos: [] as Notas[],
              notasEntregas: [] as Notas[],
              notasProduccion: [] as Notas[],
              notasFacturacionPagos: [] as Notas[],
            };
          } else {
            this.pedidoGral.notasPedido.notasCliente = this.formulario.value.notas as Notas[];
            if (!this.pedidoGral.notasPedido.notasDespachos) {
              this.pedidoGral.notasPedido.notasDespachos = [];
            }
            if (!this.pedidoGral.notasPedido.notasEntregas) {
              this.pedidoGral.notasPedido.notasEntregas = [];
            }
            if (!this.pedidoGral.notasPedido.notasProduccion) {
              this.pedidoGral.notasPedido.notasProduccion = [];
            }
            if (!this.pedidoGral.notasPedido.notasFacturacionPagos) {
              this.pedidoGral.notasPedido.notasFacturacionPagos = [];
            }
          }

          // Cargar las notas del cliente desde la base de datos
          this.cargarNotasDelCliente();

          // Actualizar datos auxiliares
          this.datos = cliente;
          this.documentoBuscar = cliente.documento;
          this.identificarDepto();
          this.identificarCiu();
          this.identificarDepto1();
          this.identificarCiu1();

          // Cambiar a modo consulta (cliente encontrado)
          this.encontrado = true;
          this.mostrarFormularioCliente = false;
          this.clienteRecienCreado = false;

          // Recuperar categoría existente del cliente si la tiene
          if (cliente.categoria && cliente.categoria.id) {
            this.categoriaClienteSeleccionada = cliente.categoria;
          } else {
            this.categoriaClienteSeleccionada = null;
          }
          this.ref.markForCheck();

          // Verificar si el cliente está bloqueado
          if (this.formulario.value.estado == "Bloqueado") {
            this.bloqueado = true;
          }

          // Cargar datos de facturación
          this.verDatosFacturacion();

          // Cargar datos de entrega
          this.datosEntregas = [];
          if (cliente.datosEntrega) {
            cliente.datosEntrega.map((x) => {
              this.datosEntregas.push(x);
            });
          }
          this.originalDataEntregas = this.utils.deepClone(this.datosEntregas) || [];

          // Mostrar mensaje informativo
          Swal.fire({
            title: "Cliente ya registrado",
            html: `
              <div class="text-start">
                <p>El documento <strong>${documentoCliente}</strong> ya se encuentra registrado.</p>
                <p><strong>Cliente:</strong> ${cliente.nombres_completos} ${cliente.apellidos_completos || ""}</p>
                <p>Se han cargado los datos del cliente existente.</p>
              </div>
            `,
            icon: "info",
            confirmButtonText: "Entendido",
          });

          // Forzar detección de cambios
          this.ref.detectChanges();
        } else {
          // Cliente no existe - proceder con la creación
          this.procederConCreacionCliente();
        }
      },
      error: (error: any) => {
        // En caso de error en la búsqueda, intentar crear el cliente de todas formas
        console.warn("Error al verificar cliente existente, procediendo con creación:", error);
        this.procederConCreacionCliente();
      },
    });
  }

  // Método privado para proceder con la creación del cliente
  private procederConCreacionCliente() {
    // Recopilar datos mínimos para la creación del cliente
    const clienteData = {
      ...this.formulario.value,
      documento: (this.formulario.value.documento || "").trim(),
      datosFacturacionElectronica:
        this.formulario.value.datosFacturacionElectronica || [],
      datosEntrega: this.formulario.value.datosEntrega || [],
      notas: this.formulario.value.notas || [],
      estado: "activo",
    };
    this.pedidoGral.cliente = this.utils.deepClone(clienteData);
    // Si no tiene datos de facturación, se preconfiguran usando campos del formulario
    if (
      !clienteData.datosFacturacionElectronica?.length &&
      this.direccion_facturacion
    ) {
      const datoFacturacion = {
        alias: "Principal",
        nombres: this.formulario.value.nombres_completos,
        apellidos: this.formulario.value.apellidos_completos || "",
        tipoDocumento: this.formulario.value.tipo_documento_comprador,
        documento: this.formulario.value.documento,
        indicativoCel: this.formulario.value.indicativo_celular_comprador,
        celular: this.formulario.value.numero_celular_comprador,
        correoElectronico: this.formulario.value.correo_electronico_comprador,
        direccion: this.direccion_facturacion,
        pais: this.pais,
        departamento: this.departamento,
        ciudad: this.ciudad_municipio,
        codigoPostal: this.codigo_postal || "",
      };
      this.formulario.controls["datosFacturacionElectronica"].setValue([
        datoFacturacion,
      ]);
      clienteData.datosFacturacionElectronica = [datoFacturacion];
      this.datosFacturacionElectronica = [datoFacturacion];
    }
    if (!clienteData.datosEntrega?.length && this.direccion_facturacion) {
      const datoEntrega = {
        alias: "Principal",
        nombres: this.formulario.value.nombres_completos,
        apellidos: this.formulario.value.apellidos_completos || "",
        indicativoCel: this.formulario.value.indicativo_celular_comprador,
        celular: this.formulario.value.numero_celular_comprador,
        direccionEntrega: this.direccion_facturacion,
        pais: this.pais,
        departamento: this.departamento,
        ciudad: this.ciudad_municipio,
        codigoPV: this.codigo_postal || "",
      };
      this.formulario.controls["datosEntrega"].setValue([datoEntrega]);
      clienteData.datosEntrega = [datoEntrega];
      this.datosEntregas = [datoEntrega];
    }
    this.service.createClient(clienteData).subscribe({
      next: (r: any) => {
        // Desactivar indicador de carga
        this.creandoCliente = false;

        this.pedidoGral.facturacion = this.datosFacturacionElectronica[0];
        this.pedidoGral.envio = this.datosEntregas[0];

        // Si la respuesta es un ArrayBuffer, se decodifica y se parsea a JSON
        const client =
          r instanceof ArrayBuffer
            ? JSON.parse(new TextDecoder().decode(r))
            : r;

        // Ocultar formulario y activar estado "encontrado"
        this.mostrarFormularioCliente = false;
        this.encontrado = true;
        this.clienteRecienCreado = true;

        sessionStorage.setItem("cliente", JSON.stringify(clienteData));
        this.pedidoGral = { ...this.pedidoGral };

        // Mostrar mensaje de éxito con información específica del cliente
        Swal.fire({
          title: "¡Cliente creado exitosamente!",
          html: `
            <div class="text-start">
              <strong>Cliente:</strong> ${this.formulario.value.nombres_completos} ${this.formulario.value.apellidos_completos || ""}<br>
              <strong>Documento:</strong> ${this.formulario.value.documento}<br>
              <strong>El cliente ha sido guardado y está listo para continuar.</strong>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Continuar",
          timer: 3000,
          timerProgressBar: true,
        });

        // Mostrar notificación toast adicional
        this.toastrService.success(
          `Cliente ${this.formulario.value.nombres_completos} ${this.formulario.value.apellidos_completos || ""} creado correctamente`,
          "Cliente Creado",
          {
            closeButton: true,
            enableHtml: true,
            positionClass: "toast-bottom-right",
            timeOut: 3000,
          },
        );

        // Resetear el estado de "recién creado" después de 5 segundos para remover la animación
        setTimeout(() => {
          this.clienteRecienCreado = false;
          this.ref.detectChanges();
        }, 5000);
      },
      error: (error: any) => {
        // Desactivar indicador de carga en caso de error
        this.creandoCliente = false;

        console.error("Error al crear cliente:", error);
        Swal.fire({
          title: "Error al crear cliente",
          text: "Ha ocurrido un error al crear el cliente. Por favor, intente nuevamente.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      },
    });
  }

  onVoiceTranscription(text: string): void {
    console.log("Texto transcrito:", text);
    // Aquí se podría utilizar la transcripción para realizar alguna acción
  }

  cargarBodegas() {
    this.bodegaService.getBodegasByChannelName("Venta Asistida").subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        // Ya no necesitamos esta parte aquí, se maneja en ngOnInit
        // const bodegaGuardada = JSON.parse(localStorage.getItem('warehouse') || 'null');
        // if (bodegaGuardada) {
        //   this.onWarehouseChange({ target: { value: bodegaGuardada.idBodega } } as any);
        // }
      },
      error: (error) => {
        this.toastrService.error("Error al cargar las bodegas", "Error");
      },
    });
  }

  /**
   * Entra o sale del catálogo sin inventario. Es un modo, no un filtro: al
   * activarlo se muestran los productos que se venden bajo pedido (que no
   * pertenecen a ninguna bodega) y el selector de bodega queda inhabilitado.
   * La bodega elegida NO se borra, para no perderla al volver.
   */
  onCatalogoSinInventarioChange(activo: boolean): void {
    // Solo se cambia la bandera: el catálogo la recibe por @Input y reacciona
    // solo. Asignarla también a mano sobre el hijo saltaría la detección de
    // cambios de Angular y el modo no se recargaría.
    this.catalogoSinInventario = activo;
  }

  onWarehouseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    const selected = this.bodegas.find(
      (warehouse) => warehouse.idBodega === selectedId,
    );

    if (selected) {
      // Cambiar de bodega no limpia el carrito, se permite cambiar libremente
      this.aplicarCambioBodega(selected);
    } else {
      this.selectedWarehouse = "";
      this.bodega = null;
      if (this.pedidoGral) {
        this.pedidoGral.bodegaId = undefined;
      }
    }
  }

  /**
   * Cambia la bodega de trabajo por su business code. Lo usa el catálogo cuando
   * el vendedor, viendo el desglose de existencias, elige la bodega donde sí hay
   * el producto ("acá 0, en Bogotá 26") sin tener que volver al selector.
   */
  seleccionarBodegaPorId(idBodega: string): void {
    if (!idBodega) return;
    const selected = this.bodegas?.find((w: any) => w.idBodega === idBodega);
    if (!selected) {
      this.toastrService.warning("No se encontró esa bodega en la lista", "Bodega");
      return;
    }
    if (this.bodega?.idBodega === idBodega) return;
    this.aplicarCambioBodega(selected);
  }

  /**
   * Aplica el cambio de bodega actualizando todas las referencias necesarias.
   */
  private aplicarCambioBodega(selected: any): void {
    this.selectedWarehouse = selected.nombre;
    this.bodega = selected;
    localStorage.setItem("warehouse", JSON.stringify(selected));

    // Actualizar el bodegaId en el pedido
    if (this.pedidoGral) {
      this.pedidoGral.bodegaId = selected.idBodega;
    }

    // Actualizar productos con la nueva bodega seleccionada
    if (this.productos) {
      this.productos.bodega = selected;

      // Si también hay una ciudad seleccionada, aplicarla junto con la bodega
      if (this.selectedCity && this.selectedCity !== "seleccione") {
        this.productos.ciudad = this.selectedCity;
        // Refrescar la lista de productos con los nuevos filtros
        if (typeof this.productos.cargarTodo === "function") {
          this.productos.cargarTodo();
        }
      } else {
        // Si no hay ciudad, solo actualizar con la bodega
        if (typeof this.productos.cargarTodo === "function") {
          this.productos.cargarTodo();
        }
      }

      this.toastrService.success(
        "Bodega seleccionada: " + selected.nombre,
        "Éxito",
      );
    }
  }

  /**
   * Limpia el carrito cuando se cambia la bodega.
   * Muestra una notificación informativa al usuario.
   */
  private limpiarCarritoPorCambioBodega(bodegaAnterior: any, bodegaNueva: any): void {
    // Limpiar el carrito usando el servicio
    this.cartService.clearCart();

    // Limpiar también el carrito del pedido
    if (this.pedidoGral) {
      this.pedidoGral.carrito = [];
    }

    // Obtener nombres de las bodegas para el mensaje
    const nombreBodegaAnterior = bodegaAnterior?.nombre || 'Sin bodega';
    const nombreBodegaNueva = bodegaNueva?.nombre || 'Sin bodega';

    // Mostrar notificación
    this.toastrService.warning(
      `El carrito ha sido vaciado debido al cambio de bodega de "${nombreBodegaAnterior}" a "${nombreBodegaNueva}". Los productos disponibles varían según la bodega.`,
      'Carrito Vaciado',
      {
        closeButton: true,
        timeOut: 5000,
        enableHtml: true
      }
    );

    console.log('🛒 Carrito limpiado por cambio de bodega:', {
      bodegaAnterior: nombreBodegaAnterior,
      bodegaNueva: nombreBodegaNueva
    });
  }

  // Nuevo método para guardar el pedido antes de iniciar el pago con Wompi
  private guardarPedidoParaWompi(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const context = this;
      context.ventasService
        .validateNroPedido(context.pedidoGral.nroPedido as string)
        .subscribe({
          next: (res: any) => {
            // Recalcular totales con la lógica correcta del frontend antes de enviar al backend.
            // Esto respeta: precio por tipo de cliente (sin escala) y precio por volumen.
            const subtotalFrontendW = context.pyamentService.checkPriceScale(context.pedidoGral);
            context.pedidoGral.totalPedidoSinDescuento = subtotalFrontendW;
            context.pedidoGral.totalPedididoConDescuento =
              subtotalFrontendW
              - (Number(context.pedidoGral.totalDescuento) || 0)
              + (Number(context.pedidoGral.totalEnvio) || 0)
              + (Number(context.pedidoGral.totalImpuesto) || 0);
            context.pedidoGral.faltaPorPagar = Math.max(
              0,
              context.pedidoGral.totalPedididoConDescuento - (Number(context.pedidoGral.anticipo) || 0)
            );

            const htmlSanizado = context.pyamentService.getHtmlContent(
              context.pedidoGral,
            );

            // DEBUG: Log antes de guardar pedido para Wompi
            console.log('💳 ===== GUARDAR PEDIDO PARA WOMPI =====');
            console.log('📦 Pedido completo:', JSON.parse(JSON.stringify(this.pedidoGral)));
            console.log('📧 Email HTML:', htmlSanizado ? 'Generado ✅' : 'No generado ❌');
            console.log('🏢 Empresa:', this.pedidoGral.company);
            console.log('👤 Cliente:', this.pedidoGral.cliente);
            console.log('🛒 Carrito items:', this.pedidoGral.carrito?.length || 0);
            console.log('💰 Total pedido:', this.pedidoGral.totalPedididoConDescuento);
            console.log('💳 Forma de pago:', this.pedidoGral.formaDePago);
            console.log('💵 Estado pago:', this.pedidoGral.estadoPago);
            console.log('=========================================');

            // Guardar pedido con estado de pago pendiente
            context.ventasService
              .createOrder({ order: this.pedidoGral, emailHtml: htmlSanizado })
              .subscribe({
                next: (res: any) => {
                  const orderSiigo =
                    context.facturacionElectronicaService.transformarPedidoLite(
                      context.pedidoGral,
                    );
                  if (res.order.pagoInformation) {
                    context.pedidoGral = res.order;
                    context.pedidoGral = { ...context.pedidoGral };
                  }
                  context.pedidoSinGuardar = false;

                  // Obtener el ID del pedido creado
                  const orderId = res.order?._id || res.orderId || res.id;
                  // Preferir el nro confirmado por el backend; fallback al pre-generado en el cliente.
                  const nroPedido = res.order?.nroPedido || res.order?.referencia || context.pedidoGral.nroPedido || context.pedidoGral.referencia || '';

                  // Encolar facturación electrónica en background si está habilitada globalmente o si el checkbox está marcado
                  if (orderId && (context.siigoEnabled || context.generarFacturaElectronica)) {
                    context.encolarFacturacionSiigo(orderId, nroPedido);
                  }

                  // Spec 008.2: sellar la cotización origen SOLO si el pedido se creó de verdad
                  // (la respuesta trae order/orderId). Evita asociar un pedido inexistente.
                  if (orderId || res.order) {
                    context.marcarCotizacionConvertidaSiAplica(nroPedido);
                  }

                  resolve(true); // Pedido guardado exitosamente
                },
                error: (err: any) => {
                  resolve(false); // Error al guardar el pedido
                },
              });
          },
          error: (err) => {
            resolve(false); // Error al validar el número de pedido
          },
        });
    });
  }

  // Método modificado para actualizar el estado del pedido después del pago
  private actualizarEstadoPedido(
    numeroPedido: string,
    estadoPago: EstadoPago,
  ): void {
    // Si el método no existe, usamos un enfoque alternativo
    this.actualizarPedidoCompleto(numeroPedido, estadoPago);
  }

  // Método alternativo para actualizar el pedido completo si el método específico no está disponible
  private actualizarPedidoCompleto(
    numeroPedido: string,
    estadoPago: EstadoPago,
  ): void {
    // Actualizamos el estado en el objeto pedido
    this.pedidoGral.estadoPago = estadoPago;

    // Usamos el método editOrder en lugar de updateOrder
    this.ventasService.editOrder(this.pedidoGral).subscribe({
      next: (res: any) => {
        // Opcionalmente, también podemos enviar el correo de confirmación si es necesario
        const htmlSanizado = this.pyamentService.getHtmlContent(
          this.pedidoGral,
        );
        this.ventasService
          .enviarCorreoConfirmacionPedido({
            order: this.pedidoGral,
            emailHtml: htmlSanizado,
          })
          .subscribe({
            next: (emailRes: any) => {},
            error: (emailErr: any) => {},
          });
      },
      error: (err: any) => {},
    });
  }

  /**
   * Inicia el proceso de pago con Wompi
   *
   * IMPLEMENTACIÓN ANTERIOR:
   * Anteriormente, este método inicializaba y abría el widget de Wompi directamente en el navegador:
   * 1. Configuraba los datos necesarios (monto, referencia, datos del cliente)
   * 2. Creaba una instancia del WidgetCheckout con la configuración
   * 3. Abría el widget que mostraba una interfaz para ingresar datos de la tarjeta
   * 4. Procesaba la respuesta del widget para actualizar el estado del pedido
   *
   * NUEVA IMPLEMENTACIÓN:
   * Ahora utilizamos un enfoque basado en link de pago que viene desde el backend:
   * 1. El backend genera un link de pago en Wompi y lo envía en el objeto order.pagoInformation
   * 2. Este método simplemente abre ese link en una pestaña nueva
   * 3. El estado del pago se actualiza posteriormente mediante webhooks configurados en el backend
   *
   * El objeto pagoInformation ahora contiene:
   * - integridad: hash de verificación
   * - estado: estado del pago ("pendiente", "aprobado", etc.)
   * - fecha: fecha de generación
   * - linkPago: URL generada por Wompi para completar el pago
   * - detalleIntegracion: información adicional de la integración con Wompi
   *
   * @returns Promise<boolean> Promesa que se resuelve con true si el proceso de pago se inició correctamente
   */
  private iniciarPagoConWompi(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // NUEVA IMPLEMENTACIÓN: Utiliza el link de pago proporcionado por el backend
        if (
          !this.pedidoGral.pagoInformation ||
          !this.pedidoGral.pagoInformation.linkPago
        ) {
          reject(new Error("Link de pago no disponible"));
          return;
        }

        // Redireccionar al usuario al link de pago proporcionado por el backend
        // window.open(this.pedidoGral.pagoInformation.linkPago, '_blank');

        // Como ahora trabajamos con un link externo y no hay forma directa de saber cuando
        // finaliza el pago, simplemente resolvemos la promesa sin esperar confirmación
        // El estado del pago se actualizará posteriormente mediante una notificación webhook
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  public onNotaAgregada(event: any): void {
    // El evento ahora viene con la estructura completa del carrito actualizado
    if (event && event.pedido) {
      console.log("📝 CREAR-VENTAS: Nota agregada desde carrito");

      // Actualizar el pedido completo con las notas actualizadas
      this.pedidoGral = { ...event.pedido };

      // Forzar detección de cambios
      this.ref.detectChanges();

      // Mostrar confirmación visual
      this.toastrService.success(
        "Nota de producción agregada correctamente",
        "Nota Agregada",
        {
          closeButton: true,
          timeOut: 2000,
          positionClass: "toast-bottom-right",
        },
      );
    }
  }

  /**
   * Maneja el evento notasActualizadas del componente de notas
   * @param event Información actualizada de notas
   */
  public onNotasActualizadas(event: any): void {
    // Verificar que el evento tenga la información necesaria
    if (event && event.notasPedido) {
      console.log(
        "📝 CREAR-VENTAS: Notas actualizadas desde componente de notas",
      );

      // Preservar notas existentes y actualizar solo las que vienen en el evento
      if (!this.pedidoGral.notasPedido) {
        this.pedidoGral.notasPedido = event.notasPedido;
      } else {
        // Actualizar cada categoría individualmente para preservar las que no vienen en el evento
        if (event.notasPedido.notasProduccion !== undefined) {
          this.pedidoGral.notasPedido.notasProduccion =
            event.notasPedido.notasProduccion;
          console.log(
            "✅ CREAR-VENTAS: Notas de producción actualizadas -",
            event.notasPedido.notasProduccion.length,
            "notas",
          );
        }
        if (event.notasPedido.notasCliente !== undefined) {
          this.pedidoGral.notasPedido.notasCliente =
            event.notasPedido.notasCliente;
        }
        if (event.notasPedido.notasDespachos !== undefined) {
          this.pedidoGral.notasPedido.notasDespachos =
            event.notasPedido.notasDespachos;
        }
        if (event.notasPedido.notasEntregas !== undefined) {
          this.pedidoGral.notasPedido.notasEntregas =
            event.notasPedido.notasEntregas;
        }
        if (event.notasPedido.notasFacturacionPagos !== undefined) {
          this.pedidoGral.notasPedido.notasFacturacionPagos =
            event.notasPedido.notasFacturacionPagos;
        }
      }

      // Si el evento incluye el carrito actualizado, actualizar también el carrito
      if (event.carrito) {
        this.pedidoGral.carrito = event.carrito;
      }

      // Forzar detección de cambios
      this.ref.detectChanges();

      console.log("✅ CREAR-VENTAS: Pedido actualizado con nuevas notas");
    }
  }

  /**
   * Método para manejar el envío de nuevas notas de cliente
   */
  onSubmitCliente(): void {
    if (this.notasClienteForm.invalid) {
      return;
    }

    const nota = this.notasClienteForm.value;
    nota.fecha = new Date();

    // Inicializar notasPedido si no existe
    if (!this.pedidoGral.notasPedido) {
      this.pedidoGral.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: [],
      };
    }

    // Inicializar notasCliente si no existe
    if (!this.pedidoGral.notasPedido.notasCliente) {
      this.pedidoGral.notasPedido.notasCliente = [];
    }

    // Agregar la nueva nota al inicio del array del pedido
    this.pedidoGral.notasPedido.notasCliente.unshift(nota);

    // Guardar la nota en el cliente en la base de datos
    this.guardarNotaEnCliente(nota);

    // Limpiar el formulario
    this.notasClienteForm.reset();

    // Forzar detección de cambios
    this.ref.detectChanges();

    // Mostrar mensaje de confirmación
    this.toastrService.success(
      "Nota del cliente agregada exitosamente",
      "Nota Agregada",
      {
        closeButton: true,
        timeOut: 3000,
      },
    );
  }

  /**
   * Método para guardar la nota en el cliente en la base de datos
   */
  private guardarNotaEnCliente(nota: any): void {
    if (!this.documentoBuscar) {
      console.warn('No hay documento de cliente para guardar la nota');
      return;
    }

    // Obtener el cliente actual
    this.service.getClientByDocument({ documento: this.documentoBuscar }).subscribe({
      next: (res: any) => {
        // Inicializar array de notas si no existe
        if (!res.notas) {
          res.notas = [];
        }

        // Agregar la nueva nota
        const nuevaNota = {
          fecha: nota.fecha.toISOString().split('T')[0], // Formato YYYY-MM-DD
          nota: nota.nota
        };
        res.notas.push(nuevaNota);

        // Actualizar el cliente con la nueva nota
        this.service.editClient(res).subscribe({
          next: (updateRes) => {
            console.log('✅ Nota guardada en el cliente:', updateRes);
            // Recargar las notas del cliente para mostrar las actualizadas
            this.cargarNotasDelCliente();
          },
          error: (error) => {
            console.error('❌ Error al actualizar cliente con nota:', error);
            this.toastrService.error(
              'Error al guardar la nota en el cliente',
              'Error',
              {
                closeButton: true,
                timeOut: 5000,
              }
            );
          }
        });
      },
      error: (error) => {
        console.error('❌ Error al obtener cliente para guardar nota:', error);
        this.toastrService.error(
          'Error al obtener datos del cliente',
          'Error',
          {
            closeButton: true,
            timeOut: 5000,
          }
        );
      }
    });
  }

  /**
   * Método para cargar las notas del cliente desde la base de datos
   */
  private cargarNotasDelCliente(): void {
    if (!this.documentoBuscar) {
      return;
    }

    this.service.getClientByDocument({ documento: this.documentoBuscar }).subscribe({
      next: (res: any) => {
        if (res && res.notas && Array.isArray(res.notas)) {
          // Convertir las notas del cliente al formato del pedido
          const notasCliente = res.notas.map((nota: any) => ({
            fecha: new Date(nota.fecha),
            nota: nota.nota
          }));

          // Inicializar notasPedido si no existe
          if (!this.pedidoGral.notasPedido) {
            this.pedidoGral.notasPedido = {
              notasProduccion: [],
              notasCliente: [],
              notasDespachos: [],
              notasEntregas: [],
              notasFacturacionPagos: [],
            };
          }

          // Actualizar las notas del cliente en el pedido
          this.pedidoGral.notasPedido.notasCliente = notasCliente;

          // Forzar detección de cambios
          this.ref.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar notas del cliente:', error);
      }
    });
  }

  /**
   * Método para eliminar una nota de cliente
   * @param index Índice de la nota a eliminar
   */
  eliminarNotaCliente(index: number): void {
    if (
      !this.pedidoGral?.notasPedido?.notasCliente ||
      !Array.isArray(this.pedidoGral.notasPedido.notasCliente)
    ) {
      return;
    }

    // Obtener la nota a eliminar
    const notaAEliminar = this.pedidoGral.notasPedido.notasCliente[index];

    // Confirmar eliminación
    Swal.fire({
      title: "¿Eliminar nota?",
      text: "¿Está seguro de que desea eliminar esta nota del cliente?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed && this.pedidoGral?.notasPedido?.notasCliente) {
        // Eliminar la nota del array del pedido
        this.pedidoGral.notasPedido.notasCliente.splice(index, 1);

        // Eliminar la nota del cliente en la base de datos
        this.eliminarNotaDelCliente(notaAEliminar);

        // Forzar detección de cambios
        this.ref.detectChanges();

        // Mostrar mensaje de confirmación
        this.toastrService.success(
          "Nota eliminada exitosamente",
          "Nota Eliminada",
          {
            closeButton: true,
            timeOut: 3000,
          },
        );
      }
    });
  }

  /**
   * Método para eliminar la nota del cliente en la base de datos
   */
  private eliminarNotaDelCliente(notaAEliminar: any): void {
    if (!this.documentoBuscar) {
      console.warn('No hay documento de cliente para eliminar la nota');
      return;
    }

    // Obtener el cliente actual
    this.service.getClientByDocument({ documento: this.documentoBuscar }).subscribe({
      next: (res: any) => {
        if (res && res.notas && Array.isArray(res.notas)) {
          // Buscar y eliminar la nota del cliente
          const notaClienteIndex = res.notas.findIndex((nota: any) => 
            nota.nota === notaAEliminar.nota && 
            nota.fecha === notaAEliminar.fecha.toISOString().split('T')[0]
          );

          if (notaClienteIndex !== -1) {
            res.notas.splice(notaClienteIndex, 1);

            // Actualizar el cliente sin la nota eliminada
            this.service.editClient(res).subscribe({
              next: (updateRes) => {
                console.log('✅ Nota eliminada del cliente:', updateRes);
              },
              error: (error) => {
                console.error('❌ Error al eliminar nota del cliente:', error);
                this.toastrService.error(
                  'Error al eliminar la nota del cliente',
                  'Error',
                  {
                    closeButton: true,
                    timeOut: 5000,
                  }
                );
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('❌ Error al obtener cliente para eliminar nota:', error);
      }
    });
  }

  /**
   * Carga los datos de entrega del cliente y maneja el filtrado por ciudad
   */
  private cargarDatosEntregaCliente(): void {
    if (!this.documentoBuscar) return;

    this.service
      .getClientByDocument({ documento: this.documentoBuscar })
      .subscribe({
        next: (res: any) => {
          this.procesarDatosEntregaCliente(res);
        },
        error: (err) => {
          this.originalDataEntregas = [];
          this.datosEntregas = [];
          // Limpiar envío para evitar que persista una dirección de otro cliente
          this.pedidoGral.envio = undefined;
          this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
          this.ref.detectChanges();
        },
      });
  }

  /**
   * Procesa los datos de entrega del cliente y aplica filtros
   */
  private procesarDatosEntregaCliente(res: any): void {
    if (res && res.datosEntrega && res.datosEntrega.length > 0) {
      // Guardar todos los datos de entrega originales
      this.originalDataEntregas = this.utils.deepClone(res.datosEntrega);

      // Aplicar filtro por ciudad si está seleccionada
      this.aplicarFiltroCiudadEntrega();
    } else {
      this.originalDataEntregas = [];
      this.datosEntregas = [];
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
    }
    this.ref.detectChanges();
  }

  /**
   * Aplica el filtro de ciudad a las direcciones de entrega
   */
  private aplicarFiltroCiudadEntrega(): void {
    if (!this.originalDataEntregas || this.originalDataEntregas.length === 0) {
      this.datosEntregas = [];
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
      return;
    }

    // Si no hay ciudad seleccionada, mostrar todas las direcciones
    if (!this.selectedCity || this.selectedCity === "") {
      this.datosEntregas = this.utils.deepClone(this.originalDataEntregas);
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
      return;
    }

    // Filtrar por ciudad seleccionada (comparación normalizada: sin tildes,
    // sin distinguir mayúsculas y sin el sufijo "D.C." — ver
    // shared/utils/ciudad.util.ts)
    const ciudadFiltro = normalizarCiudad(this.selectedCity);
    const direccionesFiltradas = this.originalDataEntregas.filter(
      (x) => normalizarCiudad(x.ciudad) === ciudadFiltro,
    );

    if (direccionesFiltradas.length > 0) {
      this.datosEntregas = direccionesFiltradas;
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
    } else {
      // Si no hay direcciones para la ciudad seleccionada, mostrar todas
      this.datosEntregas = this.utils.deepClone(this.originalDataEntregas);
      this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;

      // Mostrar mensaje informativo — deja claro que probablemente SÍ se
      // guardaron, solo que son de otra ciudad (no se perdieron datos)
      this.toastrService.info(
        `Este cliente no tiene direcciones registradas en ${this.selectedCity}. Se muestran todas sus direcciones (pueden ser de otras ciudades) — si buscas una que acabas de crear, probablemente sí se guardó pero para otra ciudad.`,
        "Información de Entrega",
        {
          closeButton: true,
          timeOut: 7000,
          positionClass: "toast-bottom-right",
        },
      );
    }
  }

  /**
   * Detecta si hay productos con configuración de dropshipping en el carrito
   */
  detectDropshippingProducts(): boolean {
    try {
      // Verificar el carrito del servicio
      const currentCartProducts = this.cartService.productInCart.value;
      if (currentCartProducts && currentCartProducts.length > 0) {
        return currentCartProducts.some(item => 
          item.producto?.dropshippingConfig?.enabled === true
        );
      }

      // Verificar el carrito local si existe (fallback)
      if (this.pedidoGral.carrito && this.pedidoGral.carrito.length > 0) {
        return this.pedidoGral.carrito.some(item => 
          item.producto?.dropshippingConfig?.enabled === true
        );
      }

      return false;
    } catch (error) {
      console.error('Error detectando productos dropshipping:', error);
      return false;
    }
  }

  /**
   * Configura estados específicos para productos dropshipping en el pedido
   */
  configureDropshippingStates(): void {
    if (this.pedidoGral.carrito) {
      this.pedidoGral.carrito.forEach(item => {
        if (item.producto?.dropshippingConfig?.enabled) {
          // Asignar estado inicial específico para dropshipping
          item.estadoProcesoProducto = 'SolicitadoProveedor' as any;
        }
      });
    }
  }

  /**
   * FASE 2: Calcula el total del carrito para el sidebar
   * Usa la misma lógica que el carrito principal para consistencia
   */
  private calcularTotalCarritoSidebar(productos: any[]): number {
    if (!productos || productos.length === 0) return 0;

    return productos.reduce((total, item) => {
      const precioUnitario = this.getPrecioProductoSidebar(item);
      const cantidad = item.cantidad || 1;
      const precioAdiciones = this.calcularPrecioAdiciones(item);
      const precioPreferencias = this.calcularPrecioPreferencias(item);

      return total + ((precioUnitario + precioAdiciones + precioPreferencias) * cantidad);
    }, 0);
  }

  /**
   * FASE 2: Obtiene el precio unitario de un producto considerando categoría de cliente
   */
  private getPrecioProductoSidebar(item: any): number {
    if (!item?.producto?.precio) return 0;

    // Si tiene precio por categoría, usar ese precio fijo
    if (item?.producto?._precioAplicadoPorCategoria) {
      return Number(item.producto.precio.precioUnitarioConIva) || 0;
    }

    // Precio estándar
    return Number(item.producto.precio.precioUnitarioConIva) || 0;
  }

  /**
   * FASE 2: Calcula el precio de las adiciones de un item
   */
  private calcularPrecioAdiciones(item: any): number {
    const adiciones = item?.configuracion?.adiciones;
    if (!adiciones || !Array.isArray(adiciones)) return 0;

    return adiciones.reduce((total, adicion) => {
      const precio = adicion?.referencia?.precioTotal || 0;
      const cantidad = adicion?.cantidad || 1;
      return total + (precio * cantidad);
    }, 0);
  }

  /**
   * FASE 2: Calcula el precio de las preferencias de un item
   */
  private calcularPrecioPreferencias(item: any): number {
    const preferencias = item?.configuracion?.preferencias;
    if (!preferencias || !Array.isArray(preferencias)) return 0;

    return preferencias.reduce((total, pref) => {
      return total + (pref?.precioTotalConIva || 0);
    }, 0);
  }

  /**
   * FASE 2: Elimina un producto del carrito desde el sidebar
   */
  eliminarDelCarritoSidebar(item: any): void {
    this.cartService.removeProduct(item);
  }

  /**
   * Completa la configuración de una línea agregada desde un combo (D-147)
   * que quedó marcada `_requiereConfiguracionPendiente`, desde el sidebar del
   * carrito. Mismo patrón que `CarritoComponent.completarConfiguracionPendiente`:
   * reabre `ConfProductToCartComponent` en modo edición y actualiza la línea
   * existente en vez de duplicarla.
   */
  completarConfiguracionPendienteSidebar(item: any): void {
    if (!item) return;

    const ref = this.modalService.open(ConfProductToCartComponent, {
      centered: true,
      size: "xl",
      scrollable: true,
      windowClass: "modal-fullscreen",
    });
    const inst = ref.componentInstance as ConfProductToCartComponent;
    inst.producto = item.producto;
    inst.isEdit = true;
    inst.configuracionCarrito = item;
    inst.modalRef = ref;

    ref.result.then(
      () => { /* dismiss sin resultado (cancelado) → no hacer nada */ },
      (resultado: any) => {
        if (resultado && resultado.producto) {
          this.cartService.updateProductQuantity({
            ...resultado,
            cartItemId: item.cartItemId,
            _requiereConfiguracionPendiente: false
          });
        }
      }
    );
  }

  /**
   * FASE 2: Toggle visibilidad del sidebar del carrito
   */
  toggleSidebarCarrito(): void {
    this.sidebarCarritoVisible = !this.sidebarCarritoVisible;
  }

  /**
   * Imprime el contenido del pedido confirmado
   */
  imprimirPedido(): void {
    if (this.confirmacion) {
      this.confirmacion.printContent();
    } else {
      // Fallback: imprimir usando el contenido del DOM
      const printContents = document.getElementById('contentToPrint');
      if (printContents) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Pedido #${this.pedidoGral?.nroPedido || 'N/A'}</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f4f4f4; }
                  .header { text-align: center; margin-bottom: 20px; }
                  @media print {
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>
                ${printContents.innerHTML}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      }
    }
  }

  /**
   * Reinicia el formulario para crear un nuevo pedido
   */
  nuevoPedido(): void {
    // Limpiar caché antes de recargar
    this.limpiarCacheCompleto();

    // Recargar la página para reiniciar completamente el flujo
    window.location.reload();
  }

  ngOnDestroy(): void {
    // Limpiar la suscripción cuando el componente se destruye
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    // Limpiar suscripción del autocompletado de clientes
    if (this.clienteSearchSubscription) {
      this.clienteSearchSubscription.unsubscribe();
    }
  }
}
