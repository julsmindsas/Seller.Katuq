import { Component, Input, OnInit, ViewChild, ElementRef, ChangeDetectorRef, AfterViewChecked, OnChanges, SimpleChanges } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { trigger, state, style, transition, animate } from '@angular/animations';
import { InfoIndicativos } from "../../../../Mock/indicativosPais";
import { InfoPaises } from "../../../../Mock/pais-estado-ciudad";
import { QuickViewComponent } from "../quick-view/quick-view.component";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import * as XLSX from 'xlsx';
import Swal from "sweetalert2";
import { CarritoComponent } from "../carrito/carrito.component";
import { EstadoPago, EstadoProceso, Notas, Pedido, Channel } from '../modelo/pedido'
import { EcomerceProductsComponent } from "../catalogo/ecomerce-products/ecomerce-products.component";
import { NotasComponent } from "../notas/notas/notas.component";
import { CheckOutComponent } from "../checkout/checkout.component";
import { MovingDirection, WizardComponent } from "angular-archwizard";
import { ActivatedRoute } from "@angular/router";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import { PaymentService } from "../../../shared/services/ventas/payment.service";
import { CartSingletonService } from "../../../shared/services/ventas/cart.singleton.service";
import { NgxHotkeysService } from "@balticcode/ngx-hotkeys";
import { ToastrService } from "ngx-toastr";
import { UtilsService } from "../../../shared/services/utils.service";
import { FacturacionIntegracionService } from "../../../shared/services/integraciones/facturas/facturacion.service";
import { environment } from "../../../../environments/environment";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";
import { InventarioService } from "../../../shared/services/inventarios/inventario.service";

@Component({
  selector: "app-pedido",
  templateUrl: "./crear-ventas.component.html",
  styleUrls: ["./crear-ventas.component.scss"],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class CrearVentasComponent implements OnInit, AfterViewChecked, OnChanges {
  @ViewChild("buscarPor") buscarPor: ElementRef;
  @ViewChild("documentoBusqueda") documentoBusqueda: ElementRef;
  @ViewChild("quickView") QuickView: QuickViewComponent;
  @ViewChild("carrito") carrito: CarritoComponent;
  @ViewChild("products", { static: false }) productos: EcomerceProductsComponent;
  @ViewChild("notaspedidos") notaspedido: NotasComponent;
  @ViewChild("resumen") resumen: CheckOutComponent;
  @ViewChild('wizard') mywizard: WizardComponent
  @ViewChild(WizardComponent) public wizard: WizardComponent;
  @ViewChild('whatsapp') whatsapp: ElementRef
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
  generarFacturaElectronica: boolean = false
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
  idenxFacturacion: any;
  idenxEntrega: any;
  @Input() pedidoGral: Pedido
  pedidoPrm: string;
  showPedidoConfirm: boolean = false;
  showSteper: boolean = true;
  empresaActual: any;
  data: any[] = [
    {
      RefDatEntrega: 'R001',
      Nombres: 'John',
      Apellidos: 'Doe',
      IndicativoCel: '+57',
      NumCel: '3001234567',
      IndicativoOtroTel: '+57',
      NumOtroTel: '4001234567',
      Direccion: 'Calle 123 #45-67',
      NombreUnidadOEdificio: 'Edificio A',
      TorreAptoOficina: 'Apto 101',
      ObservacionesAdicionales: 'Entregar antes de las 5 PM',
      Barrio: 'Modelia',
      Pais: 'Colombia',
      Departamento: 'Antioquia',
      Ciudad: 'Medellín',
      ZonaCobro: 'Zona Centro 2',
      CodigoPostal: '050012'
    },
    {
      RefDatEntrega: 'R002',
      Nombres: 'Jane',
      Apellidos: 'Doe',
      IndicativoCel: '+57',
      NumCel: '3007654321',
      IndicativoOtroTel: '+57',
      NumOtroTel: '4007654321',
      Direccion: 'Calle 124 #46-68',
      NombreUnidadOEdificio: 'Edificio B',
      TorreAptoOficina: 'Apto 102',
      ObservacionesAdicionales: 'Dejar en la portería',
      Barrio: 'Centro',
      Pais: 'Colombia',
      Departamento: 'Antioquia',
      Ciudad: 'Medellín',
      ZonaCobro: 'Zona Centro 2',
      CodigoPostal: '050013'
    }

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
  documentoBuscar: any;

  @Input("icon") public icon;

  public col1: string = "4";
  public col2: string = "6";

  originalDataEntregas: any[];
  originalDataFacturacionElectronica: any[];
  nextAvailable: boolean;
  datosEntregaNoEncontradosParaCiudadSeleccionada: boolean;
  mostrarFormularioCliente: boolean = false;
  clienteRecienCreado: boolean = false;
  creandoCliente: boolean = false;
  public bodegas: any[] = [];
  public selectedWarehouse: string = '';
  public selectedCity: string = '';
  public bodega: any = null;
  isChannelManual: boolean = true;
  
  // Formulario y propiedades para notas de cliente
  notasClienteForm: FormGroup;
  fechaActual: Date;


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
    private inventarioService: InventarioService
  ) {
    this.initForm();

    this.maxDate = new Date();
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');

    
    // Inicializar pedidoGral inmediatamente para evitar errores de null
    this.initializePedidoGral();

    this.pedidoPrm = this.route.snapshot.queryParamMap.get('pedido') || '';
    this.numberProduct = this.route.snapshot.queryParamMap.get('product') || '';

    if (this.pedidoPrm) {
      this.pedidoGral = JSON.parse(this.pedidoPrm)
    }
    else {
      this.newPedido();
      
      if (this.numberProduct) {
        this.ventasService.getProductByNumber(this.numberProduct).subscribe((res: any) => {

          this.productos.isOpenModalDirect = true;
          this.productos.productos = res;
          this.productos.obtenerFiltros();
        });
      }
    }

    this.cargarBodegas();
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidoGral']) {

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
        notasFacturacionPagos: []
      },
      carrito: undefined,
      facturacion: undefined,
      envio: undefined,
      estadoPago: EstadoPago.Pendiente,
      estadoProceso: EstadoProceso.SinProducir
    };
  }

  private newPedido() {
    this.pedidoSinGuardar = true;
    this.formulario.reset();
    
    // Limpiar completamente el caché
    this.limpiarCacheCompleto();
    
    this.cartService.clearCart();
    this.ventasService.getNextRef(this.empresaActual.nomComercial).subscribe((res: any) => {
      const texto = this.empresaActual.nomComercial.toString();
      const ultimasLetras = texto.substring(texto.length - 3);
      this.pedidoGral.nroPedido = ultimasLetras + '-' + res.nextConsecutive.toString().padStart(6, '0');
      this.pedidoGral.referencia = "";
    });
  }

  // Método para limpiar completamente el caché y empezar de cero
  public limpiarCacheCompleto(): void {

    
    // Limpiar localStorage
    localStorage.removeItem('carrito');
    localStorage.removeItem('selectedCity');
    localStorage.removeItem('warehouse');
    
    // Limpiar sessionStorage
    sessionStorage.removeItem('pedidoTemporal');
    sessionStorage.removeItem('cliente');
    
    // Resetear variables del componente
    this.encontrado = false;
    this.mostrarFormularioCliente = false;
    this.clienteRecienCreado = false;
    this.creandoCliente = false;
    this.selectedCity = '';
    this.selectedWarehouse = '';
    this.bodega = null;
    
    // Limpiar arrays de datos
    this.datosEntregas = [];
    this.datosFacturacionElectronica = [];
    this.originalDataEntregas = [];
    this.originalDataFacturacionElectronica = [];
    
    // Re-inicializar pedidoGral para evitar errores de null
    this.initializePedidoGral();
    

    
    // Mostrar feedback al usuario
    this.toastrService.success('Caché limpiado completamente. Sistema reiniciado.', 'Reset Exitoso', {
      closeButton: true,
      timeOut: 3000
    });
    
    // Forzar detección de cambios después de que pedidoGral esté inicializado
    setTimeout(() => {
      this.ref.detectChanges();
    }, 0);
  }



  ngAfterViewChecked(): void {

  }
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
    this.originalDataFacturacionElectronica = []
    const data = {
      documento: this.documentoBusqueda.nativeElement.value,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      // Agregar el consumidor final si no existe
      if (!this.existeConsumidorFinal()) {
        this.agregarConsumidorFinal();
      }
      
      res.datosFacturacionElectronica.map((x) => {
        this.datosFacturacionElectronica.push(x);
      });

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
    // Cargar zonas de cobro
    this.cargarZonasCobro();
    // Inicializar indicativos con valores por defecto
    this.indicativo_celular_facturacion = "57";
    this.indicativo_celular_entrega = "57";
    this.indicativo_celular_entrega2 = "57";

    // Cargar bodegas y verificar si hay una bodega guardada en localStorage
    this.cargarBodegas();

    // Verificar si hay una ciudad seleccionada previamente en localStorage
    const ciudadGuardada = localStorage.getItem('selectedCity');
    if (ciudadGuardada) {
      this.selectedCity = ciudadGuardada;
      // Si hay una ciudad guardada, utilizarla para el pedido
      if (this.pedidoGral && !this.pedidoGral.envio) {
        this.pedidoGral.envio = {
          ciudad: ciudadGuardada
        } as any;
      } else if (this.pedidoGral && this.pedidoGral.envio) {
        this.pedidoGral.envio.ciudad = ciudadGuardada;
      }
    }

    // Verificar si hay una bodega guardada en localStorage
    const bodegaGuardada = JSON.parse(localStorage.getItem('warehouse') || 'null');
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
          if (this.selectedCity && this.selectedCity !== 'seleccione') {
            this.productos.ciudad = this.selectedCity;
          }

          // Cargar productos con los filtros establecidos
          if (typeof this.productos.cargarTodo === 'function') {
            this.productos.cargarTodo();
          }
        }
      }, 0);
    }
  }

  // Método para cargar las zonas de cobro
  cargarZonasCobro(): void {
    // Intentar recuperar zonas de cobro de sessionStorage primero
    const zonasGuardadas = sessionStorage.getItem('allBillingZone');
    if (zonasGuardadas) {
      try {
        this.allBillingZone = JSON.parse(zonasGuardadas);
        console.log('Zonas de cobro cargadas desde sessionStorage');
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
          } else if (typeof zonas === 'string') {
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
          sessionStorage.setItem('allBillingZone', JSON.stringify(this.allBillingZone));
        } else {
          this.allBillingZone = [];
        }
      },
      error: (err) => {
        this.allBillingZone = [];
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
    this.identificarCiu();   // Para cargar las ciudades de Antioquia

    // Inicializar formulario de notas de cliente
    this.notasClienteForm = this.formBuilder.group({
      nota: ['', Validators.required]
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
      tipo_documento_comprador: ["", Validators.required],
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
      cd: [""]
    });
  }

  downloadExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    XLSX.writeFile(wb, 'export.xlsx');

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
          nombres_completos: res.nombres_completos,
          apellidos_completos: res.apellidos_completos,
          tipo_documento_comprador: res.tipo_documento_comprador,
          documento: res.documento,
          indicativo_celular_comprador: res.indicativo_celular_comprador,
          numero_celular_comprador: res.numero_celular_comprador,
          indicativo_celular_whatsapp: res.indicativo_celular_whatsapp,
          numero_celular_whatsapp: res.numero_celular_whatsapp,
          correo_electronico_comprador: res.correo_electronico_comprador,
          estado: res.estado || 'activo'
        });
        this.datos = res;
        this.documentoBuscar = this.formulario.value.documento; // Guardar el documento para futuras referencias

        // Si se ingresaron dirección, país, departamento, ciudad y código postal, heredarlos a facturación y entrega
        // Asegurar que los apellidos se incluyan en la creación de datos iniciales
        if (this.direccion_facturacion && this.pais && this.departamento && this.ciudad_municipio) {
          // Crear datos iniciales de facturación usando los datos del cliente
          const datoFacturacionInicial = {
            alias: "Principal",
            nombres: this.formulario.value.nombres_completos,
            apellidos: this.formulario.value.apellidos_completos,
            tipoDocumento: this.formulario.value.tipo_documento_comprador,
            documento: this.formulario.value.documento,
            indicativoCel: this.formulario.value.indicativo_celular_comprador,
            celular: this.formulario.value.numero_celular_comprador,
            correoElectronico: this.formulario.value.correo_electronico_comprador,
            direccion: this.direccion_facturacion,
            pais: this.pais,
            departamento: this.departamento,
            ciudad: this.ciudad_municipio,
            codigoPostal: this.codigo_postal || ""
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
            codigoPV: this.codigo_postal || ""
          };

          // Asignar datos iniciales a los arreglos
          this.datosFacturacionElectronica = [datoFacturacionInicial];
          this.datosEntregas = [datoEntregaInicial];

          // Guardar estos datos en el cliente
          this.formulario.controls["datosFacturacionElectronica"].setValue(this.datosFacturacionElectronica);
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
          estado: this.formulario.value.estado || "activo"
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
            this.originalDataEntregas = this.utils.deepClone(this.datosEntregas) || [];
            
            // Preservar notas existentes y actualizar solo las del cliente
            if (!this.pedidoGral.notasPedido) {
              this.pedidoGral.notasPedido = {
                notasCliente: clienteData.notas as Notas[],
                notasDespachos: [] as Notas[],
                notasEntregas: [] as Notas[],
                notasProduccion: [] as Notas[],
                notasFacturacionPagos: [] as Notas[]
              };
            } else {
              // Solo actualizar las notas del cliente sin tocar las demás
              this.pedidoGral.notasPedido.notasCliente = clienteData.notas as Notas[];
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
              `Cliente ${clienteData.nombres_completos} ${clienteData.apellidos_completos || ''} actualizado correctamente`,
              'Cliente Actualizado',
              {
                closeButton: true,
                timeOut: 3000
              }
            );
          },
          error: (error) => {
            Swal.fire({
              title: "Error al actualizar",
              text: "Ha ocurrido un error al actualizar el cliente. Por favor, intente nuevamente.",
              icon: "error",
              confirmButtonText: "Ok",
            });
          }
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
        tipo_documento_comprador: this.pedidoGral.cliente.tipo_documento_comprador,
        documento: this.pedidoGral.cliente.documento,
        indicativo_celular_comprador: this.pedidoGral.cliente.indicativo_celular_comprador,
        numero_celular_comprador: this.pedidoGral.cliente.numero_celular_comprador,
        indicativo_celular_whatsapp: this.pedidoGral.cliente.indicativo_celular_whatsapp,
        numero_celular_whatsapp: this.pedidoGral.cliente.numero_celular_whatsapp,
        correo_electronico_comprador: this.pedidoGral.cliente.correo_electronico_comprador,
        estado: this.pedidoGral.cliente.estado || 'activo'
      });

      // Asegurar que los datos de facturación y entrega estén disponibles
      this.datosFacturacionElectronica = this.pedidoGral.cliente.datosFacturacionElectronica || [];
      this.datosEntregas = this.pedidoGral.cliente.datosEntrega || [];
      this.originalDataEntregas = this.utils.deepClone(this.datosEntregas) || [];

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
        tipo_documento_comprador: this.pedidoGral.cliente.tipo_documento_comprador,
        documento: this.pedidoGral.cliente.documento,
        indicativo_celular_comprador: this.pedidoGral.cliente.indicativo_celular_comprador,
        numero_celular_comprador: this.pedidoGral.cliente.numero_celular_comprador,
        indicativo_celular_whatsapp: this.pedidoGral.cliente.indicativo_celular_whatsapp,
        numero_celular_whatsapp: this.pedidoGral.cliente.numero_celular_whatsapp,
        correo_electronico_comprador: this.pedidoGral.cliente.correo_electronico_comprador,
        estado: this.pedidoGral.cliente.estado || 'activo'
      });

      // Restaurar datos de facturación y entrega originales
      this.datosFacturacionElectronica = this.pedidoGral.cliente.datosFacturacionElectronica || [];
      this.datosEntregas = this.pedidoGral.cliente.datosEntrega || [];
      this.originalDataEntregas = this.utils.deepClone(this.datosEntregas) || [];
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
    this.originalDataEntregas = []
    const data = {
      documento: this.documentoBusqueda.nativeElement.value,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.datosEntrega.map((x) => {
        this.datosEntregas.push(x);

      });
      this.originalDataEntregas = [...this.datosEntregas]
    });

  }

  buscar() {
    this.bloqueado = false;
    this.formulario.reset();
    this.documentoBuscar = this.documentoBusqueda.nativeElement.value;
    if (this.buscarPor.nativeElement.value == "CC-NIT") {
      const data = { documento: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        console.log('🔍 Respuesta del servicio getClientByDocument:', res);
        if (res.length == 0) {
          // Cliente no encontrado: se muestra el formulario de creación (incluyendo facturación y entrega)
          this.formulario.controls["documento"].setValue(this.documentoBusqueda.nativeElement.value);
          this.pedidoGral.cliente = undefined;
          this.encontrado = false;
          this.bloqueado = false;
          this.mostrarFormularioCliente = true; // activar formulario de creación
          Swal.fire({
            title: "No encontrado!",
            text: "No se encuentra el documento. Llene los datos para crear el cliente.",
            icon: "warning",
            confirmButtonText: "Ok",
          });
        } else {
          // Cliente encontrado: se oculta el formulario de creación
          console.log('📋 Campos disponibles en el cliente encontrado:', Object.keys(res));
          console.log('👤 Datos del cliente:', {
            nombres: res.nombres_completos,
            apellidos: res.apellidos_completos,
            documento: res.documento
          });
          this.pedidoGral.cliente = res;
          this.ref.markForCheck();
          sessionStorage.setItem("cliente", JSON.stringify(res));
          this.formulario.patchValue({
            nombres_completos: res.nombres_completos,
            apellidos_completos: res.apellidos_completos,
            tipo_documento_comprador: res.tipo_documento_comprador,
            documento: res.documento,
            indicativo_celular_comprador: res.indicativo_celular_comprador,
            numero_celular_comprador: res.numero_celular_comprador,
            indicativo_celular_whatsapp: res.indicativo_celular_whatsapp,
            numero_celular_whatsapp: res.numero_celular_whatsapp,
            correo_electronico_comprador: res.correo_electronico_comprador,
            estado: res.estado || 'activo'
          });
          // Preservar notas existentes si ya existen, sino inicializar con las del cliente
          if (!this.pedidoGral.notasPedido) {
            this.pedidoGral.notasPedido = {
              notasCliente: this.formulario.value.notas as Notas[],
              notasDespachos: [] as Notas[],
              notasEntregas: [] as Notas[],
              notasProduccion: [] as Notas[],
              notasFacturacionPagos: [] as Notas[]
            };
          } else {
            // Solo actualizar las notas del cliente sin tocar las demás
            this.pedidoGral.notasPedido.notasCliente = this.formulario.value.notas as Notas[];
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
          this.datos = res;
          this.identificarDepto();
          this.identificarCiu();
          this.identificarDepto1();
          this.identificarCiu1();
          this.encontrado = true;
          this.mostrarFormularioCliente = false;
          this.clienteRecienCreado = false; // Asegurar que este flag esté en false para clientes encontrados
          if (this.formulario.value.estado == "Bloqueado") {
            this.bloqueado = true;
          }
          this.toastrService.show('<p class="mb-0 mt-1">Cliente encontrado!</p>', '', { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 });
          this.verDatosFacturacion();
          this.datosEntregas = [];
          res.datosEntrega.map((x) => {
            this.datosEntregas.push(x);
          });
          this.originalDataEntregas = this.utils.deepClone(this.datosEntregas) || [];
        }
      });
    }
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
      codigoPV: this.codigo_postal_entrega,
    };
    this.datosEntregas[this.idenxEntrega] = datosEntreg;
    const data = {
      documento: this.documentoBusqueda.nativeElement.value,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica
      );
      this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {

        Swal.fire({
          title: "Editado!",
          text: "Editado con exito",
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
    const data = {
      documento: this.documentoBusqueda.nativeElement.value,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica
      );
      this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {

        Swal.fire({
          title: "Editado!",
          text: "Editado con exito",
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
      }
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
    this.datosEntregas = []
    const reader = new FileReader();
    reader.onload = (e) => {
      const data1 = e.target?.result;
      const workbook = XLSX.read(data1, { type: 'binary' });
      const wsName = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsName];
      const json = XLSX.utils.sheet_to_json(ws);
      this.jsonData = json

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
          codigoPV: x.CodigoPostal
        };
        this.datosEntregas.push(datosEntreg)
      })
      const data = {
        documento: this.documentoBusqueda.nativeElement.value,
      };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        res.datosEntrega.map((x) => {
          this.datosEntregas.push(x);
        });

        this.formulario.controls["datosFacturacionElectronica"].setValue(
          res.datosFacturacionElectronica
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
        })
      })


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
      documento: this.documentoBusqueda.nativeElement.value,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.datosEntregas.push(datosEntreg);
      res.datosEntrega.map((x) => {
        this.datosEntregas.push(x);
      });
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica
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
      documento: this.documentoBusqueda.nativeElement.value,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.datosFacturacionElectronica.map((x) => {
        this.datosFacturacionElectronica.push(x);
      });
      this.datosFacturacionElectronica.push(datosFacturacionElec);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica
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
      }
    );
  }
  replicarWhatsApp(event) {
    if (this.whatsapp.nativeElement.checked === true) {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue(this.formulario.value.indicativo_celular_comprador)
      this.formulario.controls['numero_celular_whatsapp'].setValue(this.formulario.value.numero_celular_comprador)
    } else {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue("")
      this.formulario.controls['numero_celular_whatsapp'].setValue("")
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
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica
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
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica
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
    if (value === 'seleccione') {
      this.selectedCity = '';
      return;
    }

    // Guardar la ciudad seleccionada
    this.selectedCity = value;

    // Actualizar componentes relacionados
    if (this.productos) {
      this.productos.ciudad = value;
      this.productos.filtrarProductos();
    }

    // Resto del código existente...
    this.pedidoGral.envio = {
      ...(this.pedidoGral.envio || {}),
      ciudad: value
    } as any;

    // Guardar la ciudad seleccionada en localStorage
    localStorage.setItem('selectedCity', value);



    // Filtrar direcciones de entrega por la ciudad seleccionada
    if (this.originalDataEntregas) {
      this.datosEntregas = this.originalDataEntregas?.filter(x => x.ciudad === this.selectedCity) || [];
      if (this.datosEntregas.length === 0) {
        Swal.fire({
          title: "No encontrado!",
          text: "No se ha encontrado la ciudad en los datos de entrega, recuerda registrarla",
          icon: "warning",
          confirmButtonText: "Ok",
        });
        this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
        this.activarDatosEntrega = true;
      } else {
        this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
        this.activarDatosEntrega = false;
      }
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
        notasFacturacionPagos: []
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

    // Verificar si debemos saltar el paso de envío (4) cuando la forma de entrega es "recoge"
    if (index === 4) { // Estamos en el paso del cliente
      // Cargar datos del carrito para verificar la forma de entrega
      const carrito = localStorage.getItem('carrito');
      try {
        if (carrito) {
          const carritoObj = JSON.parse(carrito);
          // Verificar si la forma de entrega contiene la palabra "recoge"
          if (carritoObj && carritoObj.length > 0) {
            const formaEntrega = carritoObj[0]?.configuracion?.datosEntrega?.formaEntrega?.toString().toLowerCase();
            if (formaEntrega && formaEntrega.includes('recoge')) {

              // Crear datos de envío simplificados para recogida en tienda
              const envioRecoge = {
                alias: 'Recoge',
                nombres: 'N/A',
                apellidos: 'N/A',
                indicativoCel: 'N/A',
                celular: 'N/A',
                indicativoOtroNumero: 'N/A',
                otroNumero: 'N/A',
                direccionEntrega: 'N/A',
                observaciones: 'N/A',
                barrio: 'N/A',
                nombreUnidad: 'N/A',
                especificacionesInternas: 'N/A',
                pais: 'N/A',
                departamento: 'N/A',
                ciudad: this.selectedCity || 'N/A',
                zonaCobro: 'N/A',
                valorZonaCobro: '0',
                codigoPV: 'N/A'
              };

              // Asignar al pedido
              this.pedidoGral.envio = envioRecoge;
              this.pedidoGral.formaEntrega = 'Recoge';

              // Si se ha validado el cliente y estamos avanzando al siguiente paso,
              // saltar directamente al paso 5 (facturación)
              if (this.pedidoGral.cliente && $event === MovingDirection.Forwards) {
                // setTimeout(() => {
                // }, 100);
                this.mywizard.goToNextStep(); // El índice interno del wizard es 0-based, así que 4 es el paso 5 (Facturación)

                return;
              }
              else if (this.pedidoGral.cliente && $event === MovingDirection.Backwards) {
                this.mywizard.goToPreviousStep();
                return;
              }
            }
          }
        }
      } catch (error) {
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
            tipo_documento_comprador: this.pedidoGral.cliente.tipo_documento_comprador,
            documento: this.pedidoGral.cliente.documento,
            indicativo_celular_comprador: this.pedidoGral.cliente.indicativo_celular_comprador,
            numero_celular_comprador: this.pedidoGral.cliente.numero_celular_comprador,
            indicativo_celular_whatsapp: this.pedidoGral.cliente.indicativo_celular_whatsapp,
            numero_celular_whatsapp: this.pedidoGral.cliente.numero_celular_whatsapp,
            correo_electronico_comprador: this.pedidoGral.cliente.correo_electronico_comprador
          });
        }
      }
    }

    if (index == 4) {
      // Paso de envío - Cargar datos de dirección del cliente
      if (this.pedidoGral && this.pedidoGral.cliente) {
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        // Verificar si se necesitan cargar datos de entrega
        this.service.getClientByDocument({ documento: this.documentoBuscar }).subscribe({
          next: (res: any) => {
            if (res && res.datosEntrega && res.datosEntrega.length > 0) {
              // Guardar todos los datos de entrega originales
              this.originalDataEntregas = this.utils.deepClone(res.datosEntrega);

              // Si no hay ciudad seleccionada, mostrar todas las direcciones
              if (!this.selectedCity || this.selectedCity === '') {
                this.datosEntregas = this.utils.deepClone(this.originalDataEntregas);
                this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
              } else {
                // Si hay ciudad seleccionada, filtrar por esa ciudad
                const direccionesFiltradas = this.originalDataEntregas.filter(x => x.ciudad === this.selectedCity);
                if (direccionesFiltradas.length > 0) {
                  this.datosEntregas = direccionesFiltradas;
                  this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
                } else {
                  // Si no hay direcciones para la ciudad seleccionada, mostrar todas pero indicar que no hay específicas
                  this.datosEntregas = this.utils.deepClone(this.originalDataEntregas);
                  this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
                }
              }
              this.ref.detectChanges();
            } else {
              this.originalDataEntregas = [];
              this.datosEntregas = [];
              this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
              this.ref.detectChanges();
            }
          },
          error: (err) => {

            this.originalDataEntregas = [];
            this.datosEntregas = [];
            this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
            this.ref.detectChanges();
          }
        });
      }
    }

    if (index == 5) {
      // Paso de facturación
      if (this.pedidoGral && this.pedidoGral.cliente) {
        // Intentar cargar datos de facturación si no se han cargado
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        if (!this.datosFacturacionElectronica || this.datosFacturacionElectronica.length === 0) {
          this.ventasService.getDatosFacturacion(this.documentoBuscar).subscribe({
            next: (res: any) => {
              if (res && res.length > 0) {
                this.datosFacturacionElectronica = res;
                this.originalDataFacturacionElectronica = this.utils.deepClone(res);
                // Agregar el consumidor final si no existe
                if (!this.existeConsumidorFinal()) {
                  this.agregarConsumidorFinal();
                }
                this.ref.detectChanges();
              }
            },
            error: (err) => {
            }
          });
        }
      }

      // Si ya había datos previos de entrega, asegurarnos que se muestran
      if (this.pedidoGral && this.pedidoGral.envio) {
        this.ref.detectChanges();
      }
    }

    if (index == 7) {
      this.carrito1 = localStorage.getItem('carrito');
    }

    // Forzar la detección de cambios para actualizar la vista
    this.ref.detectChanges();

    // Al finalizar cualquier cambio de paso, forzar detección de cambios
    this.ref.detectChanges();
  }


  // Método para verificar si ya existe un consumidor final en la lista
  existeConsumidorFinal(): boolean {
    if (!this.datosFacturacionElectronica) return false;
    return this.datosFacturacionElectronica.some(item => item.documento === '222222222222');
  }

  // Método para agregar un consumidor final a la lista de facturación
  agregarConsumidorFinal(): void {
    const consumidorFinal = {
      alias: 'Consumidor Final',
      nombres: 'Consumidor Final',
      tipoDocumento: 'CC-NIT',
      documento: '222222222222',
      indicativoCel: '',
      celular: '',
      correoElectronico: '',
      direccion: this.direccion_facturacion || 'N/A',
      pais: this.pais || 'Colombia',
      departamento: this.departamento || '',
      ciudad: this.ciudad_municipio || '',
      codigoPostal: this.codigo_postal || ''
    };

    // Si la lista no está inicializada, crearla
    if (!this.datosFacturacionElectronica) {
      this.datosFacturacionElectronica = [];
    }

    // Agregar el consumidor final
    this.datosFacturacionElectronica.push(consumidorFinal);
  }

  private reviewStepAndExecute(index: number) {


    if (index == 3) {
      // Paso del cliente - Validar que existe un cliente
      if (!this.pedidoGral.cliente) {
        Swal.fire({
          title: 'Advertencia',
          text: 'Debe seleccionar o crear un cliente para continuar',
          icon: 'warning'
        });
        return;
      }
    }

    if (index == 4) {
      // Paso de envío - Preparar datos de envío
      if (this.pedidoGral.cliente) {
        // Si hay cliente, intentar cargar sus datos de envío
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        // Siempre cargar los datos de entrega actualizados para asegurar que estén disponibles
        this.service.getClientByDocument({ documento: this.documentoBuscar }).subscribe({
          next: (res: any) => {
            if (res && res.datosEntrega && res.datosEntrega.length > 0) {
              // Guardar todos los datos originales primero
              this.originalDataEntregas = this.utils.deepClone(res.datosEntrega);

              // Si no hay ciudad seleccionada, mostrar todas las direcciones
              if (!this.selectedCity || this.selectedCity === '') {
                this.datosEntregas = this.utils.deepClone(this.originalDataEntregas);
                this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
              } else {
                // Si hay ciudad seleccionada, filtrar por esa ciudad
                const filtradas = this.originalDataEntregas.filter(x => x.ciudad === this.selectedCity);
                if (filtradas.length > 0) {
                  this.datosEntregas = filtradas;
                  this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
                } else {
                  // No hay direcciones para esta ciudad específica
                  this.datosEntregas = this.utils.deepClone(this.originalDataEntregas); // Mostrar todas las direcciones igualmente
                  this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
                }
              }
            } else {
              this.originalDataEntregas = [];
              this.datosEntregas = [];
              this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
            }
            this.ref.detectChanges();
          },
          error: (err) => {
            this.originalDataEntregas = [];
            this.datosEntregas = [];
            this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
            this.ref.detectChanges();
          }
        });
      }
    }

    if (index == 5) {
      // Paso de facturación - Preparar datos de facturación
      if (this.pedidoGral.cliente) {
        // Si hay cliente, intentar cargar sus datos de facturación
        this.documentoBuscar = this.pedidoGral.cliente.documento;

        // Verificamos si ya hay datos cargados previamente
        if (!this.datosFacturacionElectronica || this.datosFacturacionElectronica?.length === 0) {
          this.ventasService.getDatosFacturacion(this.documentoBuscar).subscribe({
            next: (res: any) => {
              if (res && res.length > 0) {
                this.datosFacturacionElectronica = res;
              }
            },
            error: (err) => {
              console.error('Error al cargar datos de facturación:', err);
            }
          });
        }

        // Verificar si la forma de entrega es "recoge" para no validar datos de envío
        const carrito = localStorage.getItem('carrito');
        let esRecogeEnTienda = false;

        try {
          if (carrito) {
            const carritoObj = JSON.parse(carrito);
            // Verificar si la forma de entrega contiene la palabra "recoge"
            if (carritoObj && carritoObj.length > 0) {
              const formaEntrega = carritoObj[0]?.configuracion?.datosEntrega?.formaEntrega?.toString().toLowerCase();
              if (formaEntrega && formaEntrega.includes('recoge')) {
                esRecogeEnTienda = true;

                // Si es recogida en tienda y no hay datos de envío, crear datos mínimos
                if (!this.pedidoGral.envio) {
                  const envioRecoge = {
                    alias: 'Recoge',
                    nombres: 'N/A',
                    apellidos: 'N/A',
                    indicativoCel: 'N/A',
                    celular: 'N/A',
                    indicativoOtroNumero: 'N/A',
                    otroNumero: 'N/A',
                    direccionEntrega: 'N/A',
                    observaciones: 'N/A',
                    barrio: 'N/A',
                    nombreUnidad: 'N/A',
                    especificacionesInternas: 'N/A',
                    pais: 'N/A',
                    departamento: 'N/A',
                    ciudad: this.selectedCity || 'N/A',
                    zonaCobro: 'N/A',
                    valorZonaCobro: '0',
                    codigoPV: 'N/A'
                  };
                  this.pedidoGral.envio = envioRecoge;
                  this.pedidoGral.formaEntrega = 'Recoge';
                }
              }
            }
          }
        } catch (error) {
          console.error('Error al procesar carrito para verificar forma de entrega:', error);
        }

        // Si no es recogida en tienda, verificar que existan datos de envío
        if (!esRecogeEnTienda && !this.pedidoGral.envio) {
          Swal.fire({
            title: 'Advertencia',
            text: 'Debe seleccionar o crear datos de envío antes de continuar',
            icon: 'warning'
          });
          return;
        }
      }
    }

    if (index == 6) {
      // Paso de resumen - Validar que existe información de facturación
      if (!this.pedidoGral.facturacion) {
        Swal.fire({
          title: 'Advertencia',
          text: 'Debe seleccionar o crear datos de facturación antes de continuar',
          icon: 'warning'
        });
        return;
      }

      // Cargar datos del carrito para el resumen
      this.carrito1 = localStorage.getItem('carrito');
      try {
        if (this.carrito1) {
          this.carrito1 = JSON.parse(this.carrito1);

          // Si es forma de entrega "recoge", crear datos de envío simplificados
          if (this.carrito1[0]?.configuracion?.datosEntrega?.formaEntrega?.toString().toLowerCase().includes('recoge')) {
            this.activarEntrega = false;
            const envioRecoge = {
              alias: 'Recoge',
              nombres: 'N/A',
              apellidos: 'N/A',
              indicativoCel: 'N/A',
              celular: 'N/A',
              indicativoOtroNumero: 'N/A',
              otroNumero: 'N/A',
              direccionEntrega: 'N/A',
              observaciones: 'N/A',
              barrio: 'N/A',
              nombreUnidad: 'N/A',
              especificacionesInternas: 'N/A',
              pais: 'N/A',
              departamento: 'N/A',
              ciudad: this.pedidoGral.envio?.ciudad || this.selectedCity || 'N/A',
              zonaCobro: 'N/A',
              valorZonaCobro: '0',
              codigoPV: 'N/A'
            };
            this.pedidoGral.envio = envioRecoge;
          }
        }
      } catch (e) {
      }
    }
  }

  // Método para preparar el pago llamando primero al método del checkout
  prepararPago() {
    if (!this.resumen) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo acceder al formulario de pago. Intente nuevamente.',
        icon: 'error'
      });
      return;
    }

    // Llamar al método del checkout para preparar los datos del pedido
    this.resumen.gotToPaymentOrder().then(() => {
      // El evento comprarYPagar será emitido por el checkout y capturado 
      // mediante el binding (comprarYPagar)="comprarYPagar($event)" en el HTML
    }).catch(error => {
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al preparar el pago. Verifique los datos e intente nuevamente.',
        icon: 'error'
      });
    });
  }

  // Método para procesar el pago después de recibir los datos completos del checkout
  comprarYPagar(pedidoProcesado: Pedido) {

    // Asegurarnos de mantener la información correcta del pedido
    this.pedidoGral = { ...pedidoProcesado };

    // Añadir información de canal y tipo de orden
    this.pedidoGral.typeOrder = "E-commerce";
    this.pedidoGral.channel = {
      name: "Venta Asistida",
      tipo: "E-commerce",
      activo: true,
      createdAt: new Date().toISOString()
    }

    // Verificar que se haya seleccionado una bodega
    if (this.bodega) {
      this.pedidoGral.bodegaId = this.bodega?.idBodega;
    }
    else {
      Swal.fire({
        title: 'Error',
        text: 'No se ha seleccionado una bodega',
        icon: 'error'
      });
      return;
    }



    // Actualizar estado según los productos
    this.cambiarEstadoSegunLosProductos();

    // Verificar la forma de pago
    const formaPago = this.pedidoGral.formaDePago?.toLowerCase() || '';
    if (formaPago.includes('wompi')) {
      // Para Wompi, primero guardar el pedido y después mostrar el widget de pago
      this.pedidoGral.estadoPago = EstadoPago.Pendiente; // Asegurar que el estado comienza como pendiente
      this.guardarPedidoParaWompi().then(pedidoGuardado => {
        if (pedidoGuardado) {
          // Si el pedido se guardó correctamente, mostrar el widget de pago
          this.iniciarPagoConWompi().then(pagoExitoso => {
            if (pagoExitoso) {
              // El pago fue exitoso, actualizar estado del pedido
              this.actualizarEstadoPedido(this.pedidoGral.nroPedido as string, EstadoPago.Pendiente);
              this.showPedidoConfirm = true;
              this.showSteper = true; // Mantener visible el wizard para mostrar el paso de confirmación
              this.mywizard.goToNextStep();
            } else {
              // El pago fue rechazado o cancelado
              this.actualizarEstadoPedido(this.pedidoGral.nroPedido as string, EstadoPago.Rechazado);
              Swal.fire({
                title: "Pago no completado",
                text: "No se pudo completar el pago con Wompi. El pedido ha sido guardado con estado pendiente.",
                icon: "warning",
                confirmButtonText: "Ok",
              });
            }
          }).catch(error => {
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
    context.ventasService.validateNroPedido(context.pedidoGral.nroPedido as string).subscribe({
      next: (res: any) => {
        // Configurar la visualización del paso de confirmación
        this.showPedidoConfirm = true;
        this.showSteper = true; // Mantener el wizard visible para mostrar el paso de confirmación

        // Generar contenido HTML del pedido
        const htmlSanizado = context.pyamentService.getHtmlContent(context.pedidoGral);

        // Crear el pedido en el sistema
        context.ventasService.createOrder({ order: this.pedidoGral, emailHtml: htmlSanizado }).subscribe({
          next: (res: any) => {
            const orderSiigo = context.facturacionElectronicaService.transformarPedidoLite(context.pedidoGral);
            if (res.order?.pagoInformation) {
              // Actualizar con información adicional que pueda haber agregado el backend
              this.pedidoGral = { ...this.pedidoGral, ...res.order };
            }
            context.cartService.clearCart();
            context.pedidoSinGuardar = false;
            this.mywizard.goToNextStep();


            // Mostrar mensaje de éxito
            Swal.fire({
              title: "¡Pedido creado!",
              text: "El pedido se ha creado exitosamente",
              icon: "success",
              confirmButtonText: "Ok",
            });
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
          }
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

    const siTodosSonParaProducir = this.pedidoGral.carrito.some(item => {
      return item?.producto?.crearProducto?.paraProduccion;
    });

    if (!siTodosSonParaProducir) {
      this.pedidoGral.estadoProceso = EstadoProceso.ParaDespachar;
    }
  }

  overridePedido(event: Pedido) {
    this.pedidoGral = event;
    console.log(this.pedidoGral);

    // Usar operadores de acceso seguro para evitar errores
    if (this.pedidoGral?.facturacion && this.pedidoGral.facturacion.hasOwnProperty('direccion')) {
      if (this.pedidoGral.carrito &&
        this.pedidoGral.carrito[0]?.configuracion?.datosEntrega?.formaEntrega?.toString().toLowerCase().includes("domicilio")) {

        // Verificar que existe envío y tiene dirección
        if (this.pedidoGral.envio && this.pedidoGral.envio.hasOwnProperty('direccionEntrega')) {
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

  onBillingSame(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      // Copiar datos de contacto del comprador desde el formulario reactivo
      this.alias_facturacion = this.formulario.value.nombres_completos;
      this.razon_social = this.formulario.value.nombres_completos;
      this.tipo_documento_facturacion = this.formulario.value.tipo_documento_comprador;
      this.numero_documento_facturacion = this.formulario.value.documento;
      this.indicativo_celular_facturacion = this.formulario.value.indicativo_celular_comprador;
      this.numero_celular_facturacion = this.formulario.value.numero_celular_comprador;
      this.correo_electronico_facturacion = this.formulario.value.correo_electronico_comprador;
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
            // this.ciudadesOrigen1 = this.ciudades.map(city => ({
            //   value: city, label: city
            // }))
          }
        });
      }
    });
  }

  idBillingZone(zona_cobro: any) {

    const ciudad = this.ciudad_municipio_entrega
    const context = this;
    context.filteredResults = context.allBillingZone.filter(item => item.ciudad === ciudad);
    if (zona_cobro.zonaCobro) {
      context.zona_cobro = zona_cobro.zonaCobro;
      context.valor_zona_cobro = zona_cobro.valorZonaCobro;
    }
  }

  // NUEVO MÉTODO: Crear cliente de forma rápida usando los datos mínimos del formulario
  crearClienteRapido() {
    // Activar indicador de carga
    this.creandoCliente = true;

    // Recopilar datos mínimos para la creación del cliente
    const clienteData = {
      ...this.formulario.value,
      datosFacturacionElectronica: this.formulario.value.datosFacturacionElectronica || [],
      datosEntrega: this.formulario.value.datosEntrega || [],
      notas: this.formulario.value.notas || [],
      estado: "activo"
    };
    this.pedidoGral.cliente = this.utils.deepClone(clienteData);
    // Si no tiene datos de facturación, se preconfiguran usando campos del formulario
    if (!clienteData.datosFacturacionElectronica?.length && this.direccion_facturacion) {
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
        codigoPostal: this.codigo_postal || ""
      };
      this.formulario.controls["datosFacturacionElectronica"].setValue([datoFacturacion]);
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
        codigoPV: this.codigo_postal || ""
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
        const client = (r instanceof ArrayBuffer) ? JSON.parse(new TextDecoder().decode(r)) : r;
        
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
              <strong>Cliente:</strong> ${this.formulario.value.nombres_completos} ${this.formulario.value.apellidos_completos || ''}<br>
              <strong>Documento:</strong> ${this.formulario.value.documento}<br>
              <strong>El cliente ha sido guardado y está listo para continuar.</strong>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Continuar",
          timer: 3000,
          timerProgressBar: true
        });

        // Mostrar notificación toast adicional
        this.toastrService.success(
          `Cliente ${this.formulario.value.nombres_completos} ${this.formulario.value.apellidos_completos || ''} creado correctamente`, 
          'Cliente Creado', 
          { 
            closeButton: true, 
            enableHtml: true, 
            positionClass: 'toast-bottom-right', 
            timeOut: 3000 
          }
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
        
        console.error('Error al crear cliente:', error);
        Swal.fire({
          title: "Error al crear cliente",
          text: "Ha ocurrido un error al crear el cliente. Por favor, intente nuevamente.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    });
  }

  onVoiceTranscription(text: string): void {
    console.log('Texto transcrito:', text);
    // Aquí se podría utilizar la transcripción para realizar alguna acción
  }

  cargarBodegas() {
    this.bodegaService.getBodegasByChannelName('Venta Asistida').subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        // Ya no necesitamos esta parte aquí, se maneja en ngOnInit
        // const bodegaGuardada = JSON.parse(localStorage.getItem('warehouse') || 'null');
        // if (bodegaGuardada) {
        //   this.onWarehouseChange({ target: { value: bodegaGuardada.idBodega } } as any);
        // }
      },
      error: (error) => {
        this.toastrService.error('Error al cargar las bodegas', 'Error');
      }
    });
  }

  onWarehouseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    const selected = this.bodegas.find(warehouse => warehouse.idBodega === selectedId);

    if (selected) {
      this.selectedWarehouse = selected.nombre;
      this.bodega = selected;
      localStorage.setItem('warehouse', JSON.stringify(selected));

      // Actualizar el bodegaId en el pedido
      if (this.pedidoGral) {
        this.pedidoGral.bodegaId = selected.idBodega;
      }

      // Actualizar productos con la nueva bodega seleccionada
      if (this.productos) {
        this.productos.bodega = selected;

        // Si también hay una ciudad seleccionada, aplicarla junto con la bodega
        if (this.selectedCity && this.selectedCity !== 'seleccione') {
          this.productos.ciudad = this.selectedCity;
          // Refrescar la lista de productos con los nuevos filtros
          if (typeof this.productos.cargarTodo === 'function') {
            this.productos.cargarTodo();
          }
        } else {
          // Si no hay ciudad, solo actualizar con la bodega
          if (typeof this.productos.cargarTodo === 'function') {
            this.productos.cargarTodo();
          }
        }

        this.toastrService.success('Bodega seleccionada: ' + selected.nombre, 'Éxito');
      }
    } else {
      this.selectedWarehouse = '';
      this.bodega = null;
      if (this.pedidoGral) {
        this.pedidoGral.bodegaId = undefined;
      }
    }
  }

  // Nuevo método para guardar el pedido antes de iniciar el pago con Wompi
  private guardarPedidoParaWompi(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const context = this;
      context.ventasService.validateNroPedido(context.pedidoGral.nroPedido as string).subscribe({
        next: (res: any) => {
          const htmlSanizado = context.pyamentService.getHtmlContent(context.pedidoGral);

          // Guardar pedido con estado de pago pendiente
          context.ventasService.createOrder({ order: this.pedidoGral, emailHtml: htmlSanizado }).subscribe({
            next: (res: any) => {
              const orderSiigo = context.facturacionElectronicaService.transformarPedidoLite(context.pedidoGral);
              if (res.order.pagoInformation) {
                context.pedidoGral = res.order;
                context.pedidoGral = { ...context.pedidoGral };


              }
              context.pedidoSinGuardar = false;
              resolve(true); // Pedido guardado exitosamente
            },
            error: (err: any) => {
              resolve(false); // Error al guardar el pedido
            }
          });
        },
        error: (err) => {
          resolve(false); // Error al validar el número de pedido
        },
      });
    });
  }

  // Método modificado para actualizar el estado del pedido después del pago
  private actualizarEstadoPedido(numeroPedido: string, estadoPago: EstadoPago): void {
    // Si el método no existe, usamos un enfoque alternativo
    this.actualizarPedidoCompleto(numeroPedido, estadoPago);
  }

  // Método alternativo para actualizar el pedido completo si el método específico no está disponible
  private actualizarPedidoCompleto(numeroPedido: string, estadoPago: EstadoPago): void {
    // Actualizamos el estado en el objeto pedido
    this.pedidoGral.estadoPago = estadoPago;

    // Usamos el método editOrder en lugar de updateOrder
    this.ventasService.editOrder(this.pedidoGral).subscribe({
      next: (res: any) => {

        // Opcionalmente, también podemos enviar el correo de confirmación si es necesario
        const htmlSanizado = this.pyamentService.getHtmlContent(this.pedidoGral);
        this.ventasService.enviarCorreoConfirmacionPedido({
          order: this.pedidoGral,
          emailHtml: htmlSanizado
        }).subscribe({
          next: (emailRes: any) => {
          },
          error: (emailErr: any) => {
          }
        });
      },
      error: (err: any) => {
      }
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
        if (!this.pedidoGral.pagoInformation || !this.pedidoGral.pagoInformation.linkPago) {
          reject(new Error('Link de pago no disponible'));
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
      // Actualizar el pedido completo con las notas actualizadas
      this.pedidoGral = { ...event.pedido };
      
      // Forzar detección de cambios
      this.ref.detectChanges();
    }
  }

  /**
   * Maneja el evento notasActualizadas del componente de notas
   * @param event Información actualizada de notas
   */
  public onNotasActualizadas(event: any): void {
    // Verificar que el evento tenga la información necesaria
    if (event && event.notasPedido) {
      // Preservar notas existentes y actualizar solo las que vienen en el evento
      if (!this.pedidoGral.notasPedido) {
        this.pedidoGral.notasPedido = event.notasPedido;
      } else {
        // Actualizar cada categoría individualmente para preservar las que no vienen en el evento
        if (event.notasPedido.notasProduccion !== undefined) {
          this.pedidoGral.notasPedido.notasProduccion = event.notasPedido.notasProduccion;
        }
        if (event.notasPedido.notasCliente !== undefined) {
          this.pedidoGral.notasPedido.notasCliente = event.notasPedido.notasCliente;
        }
        if (event.notasPedido.notasDespachos !== undefined) {
          this.pedidoGral.notasPedido.notasDespachos = event.notasPedido.notasDespachos;
        }
        if (event.notasPedido.notasEntregas !== undefined) {
          this.pedidoGral.notasPedido.notasEntregas = event.notasPedido.notasEntregas;
        }
        if (event.notasPedido.notasFacturacionPagos !== undefined) {
          this.pedidoGral.notasPedido.notasFacturacionPagos = event.notasPedido.notasFacturacionPagos;
        }
      }

      // Si el evento incluye el carrito actualizado, actualizar también el carrito
      if (event.carrito) {
        this.pedidoGral.carrito = event.carrito;
      }

      // Forzar detección de cambios
      this.ref.detectChanges();
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
        notasFacturacionPagos: []
      };
    }

    // Inicializar notasCliente si no existe
    if (!this.pedidoGral.notasPedido.notasCliente) {
      this.pedidoGral.notasPedido.notasCliente = [];
    }

    // Agregar la nueva nota al inicio del array
    this.pedidoGral.notasPedido.notasCliente.unshift(nota);

    // Limpiar el formulario
    this.notasClienteForm.reset();

    // Forzar detección de cambios
    this.ref.detectChanges();

    // Mostrar mensaje de confirmación
    this.toastrService.success('Nota del cliente agregada exitosamente', 'Nota Agregada', {
      closeButton: true,
      timeOut: 3000
    });


  }

  /**
   * Método para eliminar una nota de cliente
   * @param index Índice de la nota a eliminar
   */
  eliminarNotaCliente(index: number): void {
    if (!this.pedidoGral?.notasPedido?.notasCliente) {
      return;
    }

    // Confirmar eliminación
    Swal.fire({
      title: '¿Eliminar nota?',
      text: '¿Está seguro de que desea eliminar esta nota del cliente?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Eliminar la nota del array
        this.pedidoGral.notasPedido.notasCliente.splice(index, 1);

        // Forzar detección de cambios
        this.ref.detectChanges();

        // Mostrar mensaje de confirmación
        this.toastrService.success('Nota eliminada exitosamente', 'Nota Eliminada', {
          closeButton: true,
          timeOut: 3000
        });


      }
    });
  }


}
