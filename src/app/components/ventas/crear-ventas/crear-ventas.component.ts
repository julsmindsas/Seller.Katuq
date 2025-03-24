import { Component, Input, OnInit, ViewChild, ElementRef, ChangeDetectorRef, AfterViewChecked, OnChanges, SimpleChanges } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { InfoIndicativos } from "../../../../Mock/indicativosPais";
import { InfoPaises } from "../../../../Mock/pais-estado-ciudad";
import { QuickViewComponent } from "../quick-view/quick-view.component";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import * as XLSX from 'xlsx';
import Swal from "sweetalert2";
import { CarritoComponent } from "../carrito/carrito.component";
import { EstadoPago, EstadoProceso, Notas, Pedido } from '../modelo/pedido'
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
import { VoiceInteractionComponent } from 'src/app/shared/components/voice-interaction/voice-interaction.component';

@Component({
  selector: "app-pedido",
  templateUrl: "./crear-ventas.component.html",
  styleUrls: ["./crear-ventas.component.scss"],
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

  originalDataEntregas: any[];
  originalDataFacturacionElectronica: any[];
  nextAvailable: boolean;
  datosEntregaNoEncontradosParaCiudadSeleccionada: boolean;
  mostrarFormularioCliente: boolean = false;
  clienteRecienCreado: boolean = false;


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
    private facturacionElectronicaService: FacturacionIntegracionService
  ) {
    this.initForm();

    // this._hotkeysService.register({
    //   combo: 'shift+g',
    //   handler: () => {
    //     this.guardarPrePedido(this.pedidoGral);
    //     console.log('Combo saved!');
    //   },
    //   description: 'Sends a secret message to the console.'
    // });

    // this._hotkeysService.register({
    //   combo: 'shift+n',
    //   handler: () => {
    //     if (!this.pedidoSinGuardar) {
    //       this.showPedidoConfirm = false;
    //       this.showSteper = true;
    //       this.newPedido();
    //       this.wizard.goToStep(0);
    //       console.log('Nuevo pedido');
    //     }

    //     Swal.fire({
    //       title: 'Nuevo Pedido',
    //       text: "¿Desea crear un nuevo pedido?, Recuerde que esto borrara el proceso que lleva actualmente",
    //       icon: 'warning',
    //       showCancelButton: true,
    //       confirmButtonColor: '#3085d6',
    //       cancelButtonColor: '#d33',
    //       confirmButtonText: 'Nuevo',
    //       cancelButtonText: 'Cancelar'
    //     }).then((result) => {
    //       if (result.isConfirmed) {
    //         this.showPedidoConfirm = false;
    //         this.showSteper = true;
    //         this.newPedido();
    //         this.wizard.goToStep(0);
    //         console.log('Nuevo pedido');
    //       }
    //     })
    //   },
    //   description: 'Sends a secret message to the console.'
    // });

    this.maxDate = new Date();
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany"));
    console.log("empresa", this.empresaActual);
    this.pedidoGral = {
      referencia: "",
      company: this.empresaActual.nomComercial,
      cliente: null,
      notasPedido: null,
      carrito: null,
      facturacion: null,
      envio: null,
      estadoPago: EstadoPago.Pendiente,
      estadoProceso: EstadoProceso.SinProducir
    }

    this.newPedido();

    this.pedidoPrm = this.route.snapshot.queryParamMap.get('pedido');
    this.numberProduct = this.route.snapshot.queryParamMap.get('product');

    if (this.pedidoPrm) {
      this.pedidoGral = JSON.parse(this.pedidoPrm)
    }
    else {
      if (this.numberProduct) {
        this.ventasService.getProductByNumber(this.numberProduct).subscribe((res: any) => {
          console.log(res);
          this.productos.isOpenModalDirect = true;
          this.productos.productos = res;
          this.productos.obtenerFiltros();
        });
      }
    }

  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidoGral']) {
      console.log('pedidogral', this.pedidoGral)
      this.guardarPrePedido(this.pedidoGral);
    }
  }


  private newPedido() {
    this.pedidoSinGuardar = true;
    this.formulario.reset();
    this.cartService.clearCart();
    this.ventasService.getNextRef(this.empresaActual.nomComercial).subscribe((res: any) => {
      const texto = this.empresaActual.nomComercial.toString();
      const ultimasLetras = texto.substring(texto.length - 3);
      this.pedidoGral = {
        referencia: "",
        nroPedido: ultimasLetras + '-' + res.nextConsecutive.toString().padStart(6, '0'),
        company: this.empresaActual.nomComercial,
        cliente: null,
        notasPedido: null,
        carrito: null,
        facturacion: null,
        envio: null,
        estadoPago: EstadoPago.Pendiente,
        estadoProceso: EstadoProceso.SinProducir
      };
    });
  }

  guardarPrePedido(pedido: any): void {
    this.ventasService.savePreOrders(pedido);
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
    const context = this;
    this.service.getBillingZone().subscribe({
      next(value: any) {
        context.allBillingZone = value;
        sessionStorage.setItem('allBillingZone', JSON.stringify(context.allBillingZone))

      },
      error(err) {
        console.log(err);
      },
    })
    // Inicializar indicativos con valores por defecto
    this.indicativo_celular_facturacion = "57";
    this.indicativo_celular_entrega = "57";
    this.indicativo_celular_entrega2 = "57";
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
        this.formulario.patchValue(res);
        this.datos = res;
        this.documentoBuscar = this.formulario.value.documento; // Guardar el documento para futuras referencias

        // Si se ingresaron dirección, país, departamento, ciudad y código postal, heredarlos a facturación y entrega
        if (this.direccion_facturacion && this.pais && this.departamento && this.ciudad_municipio) {
          // Crear datos iniciales de facturación usando los datos del cliente
          const datoFacturacionInicial = {
            alias: "Principal",
            nombres: this.formulario.value.nombres_completos,
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
            apellidos: "",
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

    //crear un confirm
    Swal.fire({
      title: "Editar Cliente",
      text: "¿Desea editar el cliente?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Editar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        const data = {
          documento: this.documentoBusqueda.nativeElement.value,
        };

        this.service.getClientByDocument(data).subscribe((res: any) => {
          this.formulario.controls["datosFacturacionElectronica"].setValue(
            res.datosFacturacionElectronica
          );
          this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
          this.formulario.controls["notas"].setValue(res.notas);
          this.formulario.controls["estado"].setValue(res.estado);
          this.service.editClient(this.formulario.value).subscribe((r) => {
            console.log(r);
            Swal.fire({
              title: "Editado!",
              text: "Usuario editado con exito",
              icon: "success",
              confirmButtonText: "Ok",
            });
          });
        });
      }
    });

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
        console.log(res);
        if (res.length == 0) {
          // Cliente no encontrado: se muestra el formulario de creación (incluyendo facturación y entrega)
          this.formulario.controls["documento"].setValue(this.documentoBusqueda.nativeElement.value);
          this.pedidoGral.cliente = null;
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
          this.pedidoGral.cliente = res;
          this.ref.markForCheck();
          sessionStorage.setItem("cliente", JSON.stringify(res));
          this.formulario.patchValue(res);
          this.pedidoGral.notasPedido = {
            notasCliente: this.formulario.value.notas as Notas[],
            notasDespachos: [] as Notas[],
            notasEntregas: [] as Notas[],
            notasProduccion: [] as Notas[],
            notasFacturacionPagos: [] as Notas[]
          };
          this.datos = res;
          this.identificarDepto();
          this.identificarCiu();
          this.identificarDepto1();
          this.identificarCiu1();
          this.encontrado = true;
          this.mostrarFormularioCliente = false;
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

    console.log(this.pedidoGral)
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
    console.log(this.pedidoGral)
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
        console.log(r);
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
      this.formulario.controls["datosEntrega"].setValue(res.datosEntregas);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        console.log(r);
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
      console.log('Datos del archivo Excel:', this.jsonData);
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
          console.log(r);
          Swal.fire({
            title: "Guardado!",
            text: "Guardado con exito",
            icon: "success",
            confirmButtonText: "Ok",
          });
        })
      })
      console.log('Datos del archivo Excel:', this.jsonData);

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
        console.log(r);
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
        console.log(r);
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
    console.log(event)
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
        console.log(r);
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
        console.log(r);
        Swal.fire({
          title: "Eliminado!",
          text: "Eliminado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
      });
    });
  }
  onSelectCity(event: any): void {
    this.pedidoGral.envio = {
      ...this.pedidoGral.envio,
      ciudad: event.target.value
    };
    // Asignar la ciudad seleccionada al componente catálogo
    this.productos.ciudad = this.pedidoGral.envio.ciudad;
    // Llamar al método que recarga el catálogo filtrado según la ciudad
    if (this.productos && typeof this.productos.cargarTodo === 'function') {
      this.productos.cargarTodo();
    }
    console.log(`Ciudad seleccionada: ${this.pedidoGral.envio.ciudad}`);
    
    this.datosEntregas = this.originalDataEntregas.filter(x => x.ciudad === this.pedidoGral.envio.ciudad);
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
    switch ($event) {
      case MovingDirection.Forwards:
        this.reviewStepAndExecute(index);
        break;
      case MovingDirection.Backwards:
        console.log(this.pedidoGral);
        break;
      default:
        // this.col1 = "4";
        // this.col2 = "6";
        break;
    }
    console.log($event);
  }

  @Input("icon") public icon;

  public col1: string = "4";
  public col2: string = "6";




  private reviewStepAndExecute(index: number) {
    if (index == 3) {
      this.productos.cargarTodo();
    }
    if (index == 5) {
      this.carrito1 = localStorage.getItem('carrito')
    }
    if (index == 6) {
      this.carrito1 = JSON.parse(localStorage.getItem('carrito'))
      if (this.carrito1[0].configuracion.datosEntrega.formaEntrega.toString().toLowerCase().includes('recoge')) {
        this.activarEntrega = false
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
          ciudad: this.pedidoGral.envio.ciudad,
          zonaCobro: 'N/A',
          valorZonaCobro: '0',
          codigoPV: 'N/A'
        };
        this.pedidoGral.envio = envioRecoge;
      }
    }
  }

  comprarYPagar(event: Pedido) {

    this.pedidoGral = event;
    console.log(this.pedidoGral);
    const context = this;

    this.cambiarEstadoSegunLosProductos();

    context.ventasService.validateNroPedido(context.pedidoGral.nroPedido as string).subscribe({
      next: (res: any) => {
        this.showPedidoConfirm = true;
        this.showSteper = false;
        if (res.nextConsecutive !== -1) {
          const texto = this.empresaActual.nomComercial.toString();
          const ultimasLetras = texto.substring(texto.length - 3);
          context.pedidoGral.nroPedido = ultimasLetras + '-' + res.nextConsecutive;
        }
        const htmlSanizado = context.pyamentService.getHtmlContent(context.pedidoGral);
        //cambiar el estado de los productos que no se producen
        context.pedidoGral.carrito.forEach((x) => {
          if (!x.producto.crearProducto.paraProduccion) {
            x.estadoProcesoProducto = EstadoProceso.ParaDespachar;
          }
        });
        context.ventasService.createOrder({ order: this.pedidoGral, emailHtml: htmlSanizado }).subscribe({
          next: (res: any) => {

            const orderSiigo = context.facturacionElectronicaService.transformarPedidoLite(context.pedidoGral);
            console.log('oderSiigo', orderSiigo);
            context.cartService.clearCart();
            context.pedidoSinGuardar = false;
            // context.ventasService.removePreOrder(context.pedidoGral.referencia);
            Swal.fire({
              title: "Pedido creado!",
              text: "Pedido creado con exito",
              icon: "success",
              confirmButtonText: "Ok",
            });
            // if (context.generarFacturaElectronica) {
            if (false) { // mientras organizo el tema de facturacion electronica 

              context.facturacionElectronicaService.createFacturaSiigo(orderSiigo).subscribe({
                next: (value: any) => {
                  if (value.isSuccess) {
                    Swal.fire({
                      title: "Pedido creado!",
                      text: `Pedido creado con exito y factura ${value.result.name} creada`,
                      icon: "success",
                      confirmButtonText: "Ok",
                    });
                  }
                  else {
                    Swal.fire({
                      title: "Error al crear el pedido y generar el pedido",
                      text: value.result.error[0].message,
                      icon: "error",
                      confirmButtonText: "Ok",
                    });
                  }
                },
                error: (err: any) => {
                  console.error(err);
                  Swal.fire({
                    title: "Error!",
                    text: "Error al crear el pedido y generar el pedido",
                    icon: "error",
                    confirmButtonText: "Ok",
                  });
                }
              })
            }
            else {
              Swal.fire({
                title: "Pedido creado!",
                text: "Pedido creado con exito",
                icon: "success",
                confirmButtonText: "Ok",
              });
            }

          },
          error: (err: any) => {
            console.error(err);
            Swal.fire({
              title: "Error!",
              text: "Error al crear el pedido",
              icon: "error",
              confirmButtonText: "Ok",
            });
          }
        });

        // ir al siguiente steper
        this.mywizard.goToNextStep();
      },
      error: (err) => {
        console.log(err);
      },
    });


  }
  cambiarEstadoSegunLosProductos() {
    const siTodosSonParaProducir = this.pedidoGral.carrito.some(x =>
      x.producto.crearProducto.paraProduccion
    );

    if (!siTodosSonParaProducir) {
      this.pedidoGral.estadoProceso = EstadoProceso.ParaDespachar;
    }
  }

  overridePedido(event: Pedido) {
    this.pedidoGral = event;
    console.log(this.pedidoGral);
    if (this.pedidoGral.facturacion.hasOwnProperty('direccion')) {
      if (this.pedidoGral.carrito[0]?.configuracion?.datosEntrega?.formaEntrega.toString().toLowerCase().includes("domicilio")) {
        if (this.pedidoGral.envio.hasOwnProperty('direccionEntrega')) {
          this.nextAvailable = true
        } else {
          this.nextAvailable = false
        }
      } else {
        this.nextAvailable = true
      }

    } else {
      this.nextAvailable = false
    }


    // this.showPedidoConfirm = true;
    // this.showSteper = false;
    // this.mywizard.goToNextStep();
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
    console.log(this.ciudad_municipio_entrega)
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
        apellidos: "",
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
    this.service.createClient(clienteData).subscribe((r: any) => {
      this.pedidoGral.facturacion = this.datosFacturacionElectronica[0];
      this.pedidoGral.envio = this.datosEntregas[0];
      // Si la respuesta es un ArrayBuffer, se decodifica y se parsea a JSON
      const client = (r instanceof ArrayBuffer) ? JSON.parse(new TextDecoder().decode(r)) : r;
      Swal.fire({
        title: "Guardado!",
        text: "Cliente creado rápidamente",
        icon: "success",
        confirmButtonText: "Ok",
      });
      sessionStorage.setItem("cliente", JSON.stringify(clienteData));
      this.clienteRecienCreado = true; // Esto activará la visualización de facturación y entrega
      this.pedidoGral = { ...this.pedidoGral };
    });
  }

  onVoiceTranscription(text: string): void {
    console.log('Texto transcrito:', text);
    // Aquí se podría utilizar la transcripción para realizar alguna acción
  }
}
