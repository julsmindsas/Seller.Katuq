import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Entrega, Facturacion, Pedido } from '../modelo/pedido';
import { CartSingletonService } from '../../../shared/services/ventas/cart.singleton.service';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { environment } from 'src/environments/environment';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { PedidosUtilService } from '../service/pedidos.util.service';
import { UserLogged } from 'src/app/shared/models/User/UserLogged';
import { UserLite } from 'src/app/shared/models/User/UserLite';
import { InfoIndicativos } from "../../../../Mock/indicativosPais";
import { InfoPaises } from "../../../../Mock/pais-estado-ciudad";
import Swal from "sweetalert2";
import { ToastrService } from "ngx-toastr";
import { UtilsService } from 'src/app/shared/services/utils.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
declare var WidgetCheckout: any;
@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckOutComponent implements OnInit, OnChanges {
  @ViewChild("buscarPor") buscarPor: ElementRef;
  @ViewChild("documentoBusqueda") documentoBusqueda: ElementRef;
  @ViewChild("whatsapp") whatsapp: ElementRef;
  @ViewChild('modalFacturacion') modalFacturacion: ElementRef;
  @ViewChild('modalEntrega') modalEntrega: ElementRef;

  public checkoutForm: UntypedFormGroup;
  form = new FormGroup({
    opcionSeleccionada: new FormControl('edo-ani') // 'edo-ani' es el valor por defecto
  });
  // private pedido: Pedido;
  pub_key: string;
  signature: string;
  formasPago: any[];

  // Variables para datos adicionales de entrega
  formaEntrega: string = 'domicilio';
  fechaEntrega: string = '';
  fechaMinima: string = new Date().toISOString().split('T')[0]; // Fecha mínima es hoy
  horarioEntrega: string = 'manana';
  instruccionesEntrega: string = '';

  // Variables para búsqueda y gestión de clientes
  formulario: FormGroup;
  encontrado: boolean = false;
  bloqueado: boolean = false;
  mostrarFormularioCliente: boolean = false;
  clienteRecienCreado: boolean = false;
  documentoBuscar: string = '';
  datos: any;
  indicativos: any[];
  paises: string[];
  departamentos: string[] = [];
  ciudades: string[] = [];
  ciudadesOrigen: { value: string; label: string }[] = [];
  originalDataEntregas: any[] = [];
  originalDataFacturacionElectronica: any[] = [];
  generarFacturaElectronica: boolean = false;
  activarEntrega: boolean = true;
  datosEntregaNoEncontradosParaCiudadSeleccionada: boolean = false;

  //crear un un evento emit para que el padre se entere que se hizo el pago
  @Output() comprarYPagar = new EventEmitter<any>();

  @Input()
  public pedido: Pedido;

  @Input()
  allBillingZone: any[];
  categoriasFormasPago: { categoria: string; formasPago: any; }[];
  precioproducto: any;

  // Nuevas variables para manejo de direcciones
  usarDatosClienteFacturacion: boolean = false;
  usarDatosClienteEntrega: boolean = false;
  editandoFacturacion: boolean = false;
  editandoEntrega: boolean = false;
  indexFacturacionEditando: number = -1;
  indexEntregaEditando: number = -1;

  // Variables para direcciones de facturación
  alias_facturacion: string = '';
  razon_social: string = '';
  tipo_documento_facturacion: string = '';
  numero_documento_facturacion: string = '';
  indicativo_celular_facturacion: string = '57';
  numero_celular_facturacion: string = '';
  correo_electronico_facturacion: string = '';
  direccion_facturacion: string = '';
  ciudad_municipio: string = '';
  pais: string = 'Colombia';
  departamento: string = 'Antioquia';
  codigo_postal: string = '';
  datosFacturacionElectronica: any[] = [];

  // Variables para direcciones de entrega
  alias_entrega: string = '';
  nombres_entrega: string = '';
  apellidos_entrega: string = '';
  indicativo_celular_entrega: string = '57';
  numero_celular_entrega: string = '';
  indicativo_celular_entrega2: string = '57';
  otro_numero_entrega: string = '';
  direccion_entrega: string = '';
  observaciones: string = '';
  barrio: string = '';
  nombreUnidad: string = '';
  especificacionesInternas: string = '';
  pais_entrega: string = 'Colombia';
  departamento_entrega: string = 'Antioquia';
  ciudad_municipio_entrega: string = '';
  zona_cobro: string = '';
  valor_zona_cobro: string = '';
  codigo_postal_entrega: string = '';
  datosEntregas: any[] = [];
  filteredResults: any[] = [];

  // Variable para controlar el paso activo del timeline
  activeStep: number = 1;

  constructor(
    private fb: UntypedFormBuilder,
    private ref: ChangeDetectorRef,
    private singleton: CartSingletonService,
    private payment: PaymentService,
    private service: MaestroService,
    private formBuilder: FormBuilder,
    private infoIndicativo: InfoIndicativos,
    private inforPaises: InfoPaises,
    private toastrService: ToastrService,
    private utils: UtilsService,
    public pedidoUtilService: PedidosUtilService,
    private modalService: NgbModal
  ) {
    this.initForm();

    this.service.consultarFormaPago().subscribe((r: any) => {
      this.formasPago = (r as any[]);
      const formasPagoOnline = this.formasPago.filter(formaPago => formaPago.online === 'Online');
      const formasPagoOffline = this.formasPago.filter(formaPago => formaPago.online.includes('Offline'));
      const formasPagoBilleterasVirtuales = this.formasPago.filter(formaPago => formaPago.online === 'Billeteras Virtuales');
      const formasPagoCriptomonedas = this.formasPago.filter(formaPago => formaPago.online === 'Criptomonedas');
      const formasPagoCredito = this.formasPago.filter(formaPago => formaPago.online === 'Pago a Credito');
      const formasPagoEnvioDinero = this.formasPago.filter(formaPago => formaPago.online === 'Envío de dinero a Colombia desde cualquier lugar del mundo')
      this.categoriasFormasPago = [
        { categoria: 'Online', formasPago: formasPagoOnline },
        { categoria: 'Offline', formasPago: formasPagoOffline },
        { categoria: 'Billeteras Virtuales', formasPago: formasPagoBilleterasVirtuales },
        { categoria: 'Criptomonedas', formasPago: formasPagoCriptomonedas },
        { categoria: 'Pago a Crédito', formasPago: formasPagoCredito },
        { categoria: 'Envío de Dinero a Colombia', formasPago: formasPagoEnvioDinero }
      ];
    });

    this.pub_key = environment.wompi.public_key;

    if (this.pedido) {
      this.pedidoUtilService.pedido = this.pedido;
    }
  }

  private initForm() {
    this.paises = this.inforPaises.paises.map((x) => {
      return x.Pais;
    });
    this.indicativos = this.infoIndicativo.datos;

    this.pais = "Colombia";
    this.departamento = "Antioquia";
    this.identificarDepto();
    this.identificarCiu();

    this.formulario = this.formBuilder.group({
      nombres_completos: ["", Validators.required],
      apellidos_completos: [""],
      tipo_documento_comprador: ["", Validators.required],
      documento: ["", Validators.required],
      indicativo_celular_comprador: ["57", Validators.required],
      numero_celular_comprador: ["", Validators.required],
      correo_electronico_comprador: [
        "",
        [Validators.required, Validators.email],
      ],
      indicativo_celular_whatsapp: ["57", Validators.required],
      numero_celular_whatsapp: ["", Validators.required],
      datosFacturacionElectronica: [[""]],
      datosEntrega: [[""]],
      notas: [[""]],
      estado: ["Activo"],
      cd: [""]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedido'] && changes['pedido'].currentValue) {
      this.pedido = changes['pedido'].currentValue;
    }
    this.pedidoUtilService.pedido = this.pedido;
    this.singleton.refreshCart().subscribe((data: any) => {
      this.pedido.carrito = data;
      this.pedido.carrito = [...this.pedido.carrito];
      // this.payment.pauymentWompi(this.pedido).then((data: any) => {
      //   this.signature = data;
      // });
    });
  }

  onSubmit() {
  }

  ngOnInit() {
    if (this.pedido) {
      this.pedidoUtilService.pedido = this.pedido;
    }
  }

  // Método para buscar clientes
  buscar() {
    this.bloqueado = false;
    this.formulario.reset();
    this.documentoBuscar = this.documentoBusqueda.nativeElement.value;

    // Verificar tipo de búsqueda
    if (this.buscarPor.nativeElement.value == "CC-NIT") {
      const data = { documento: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        this.procesarResultadoBusqueda(res);
      });
    } else if (this.buscarPor.nativeElement.value == "PA") {
      // Búsqueda por correo electrónico
      const data = { email: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByEmail(data).subscribe((res: any) => {
        this.procesarResultadoBusqueda(res);
      });
    } else if (this.buscarPor.nativeElement.value == "TI") {
      // Búsqueda por nombre y apellido
      const data = { nombres: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByName(data).subscribe((res: any) => {
        this.procesarResultadoBusqueda(res);
      });
    }
  }

  // Método para procesar de manera unificada el resultado de la búsqueda
  private procesarResultadoBusqueda(res: any) {
    console.log('Resultado búsqueda:', res);
    if (!res || res.length == 0) {
      this.formulario.controls["documento"].setValue(this.documentoBusqueda.nativeElement.value);
      this.pedido.cliente = undefined;
      this.encontrado = false;
      this.bloqueado = false;
      this.mostrarFormularioCliente = true;
      this.toastrService.warning('Cliente no encontrado. Por favor, complete los datos para crear uno nuevo.', 'Atención');
    } else {
      this.pedido.cliente = res;
      this.ref.markForCheck();
      sessionStorage.setItem("cliente", JSON.stringify(res));
      this.formulario.patchValue(res);
      this.datos = res;
      this.documentoBuscar = this.formulario.value.documento;

      this.identificarDepto();
      this.identificarCiu();

      this.encontrado = true;
      this.mostrarFormularioCliente = false;

      if (this.formulario.value.estado == "Bloqueado") {
        this.bloqueado = true;
        this.toastrService.error('¡Este cliente está bloqueado!', 'Error');
      } else {
        this.toastrService.success('Cliente encontrado', 'Éxito');
        
        // Avanzar automáticamente después de un breve retraso
        setTimeout(() => {
          this.setActiveStep(2);
        }, 1000);
      }

      // Cargar datos de facturación y entrega del cliente
      this.cargarDireccionesCliente(res);
    }
  }

  // Método para cargar direcciones del cliente
  private cargarDireccionesCliente(res: any) {
    this.datosFacturacionElectronica = [];
    this.datosEntregas = [];
    this.originalDataEntregas = [];
    this.originalDataFacturacionElectronica = [];

    if (res.datosFacturacionElectronica && res.datosFacturacionElectronica.length > 0) {
      res.datosFacturacionElectronica.forEach(x => {
        this.datosFacturacionElectronica.push(x);
        this.originalDataFacturacionElectronica.push(this.utils.deepClone(x));
      });
      // Asignar el primer dato de facturación al pedido
      this.pedido.facturacion = this.datosFacturacionElectronica[0];
    }

    if (res.datosEntrega && res.datosEntrega.length > 0) {
      res.datosEntrega.forEach(x => {
        this.datosEntregas.push(x);
        this.originalDataEntregas.push(this.utils.deepClone(x));
      });
      // Asignar el primer dato de entrega al pedido
      this.pedido.envio = this.datosEntregas[0];
    }
  }

  // Método para crear cliente rápido
  crearClienteRapido() {
    const clienteData = {
      ...this.formulario.value,
      datosFacturacionElectronica: this.formulario.value.datosFacturacionElectronica || [],
      datosEntrega: this.formulario.value.datosEntrega || [],
      notas: this.formulario.value.notas || [],
      estado: "activo"
    };
    this.pedido.cliente = this.utils.deepClone(clienteData);
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
      this.pedido.facturacion = this.datosFacturacionElectronica[0];
      this.pedido.envio = this.datosEntregas[0];
      this.toastrService.success('Cliente creado exitosamente', 'Éxito');
      sessionStorage.setItem("cliente", JSON.stringify(clienteData));
      this.clienteRecienCreado = true;
      this.encontrado = true;
      this.mostrarFormularioCliente = false;
      this.pedido = { ...this.pedido };
      
      // Avanzar automáticamente después de un breve retraso
      setTimeout(() => {
        this.setActiveStep(2);
      }, 1000);
    });
  }

  // Método para editar cliente
  editarCliente() {
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
        this.formulario.controls["datosFacturacionElectronica"].setValue(
          this.datosFacturacionElectronica || []
        );
        this.formulario.controls["datosEntrega"].setValue(
          this.datosEntregas || []
        );
        this.service.editClient(this.formulario.value).subscribe((r) => {
          console.log(r);
          Swal.fire({
            title: "Editado!",
            text: "Usuario editado con exito",
            icon: "success",
            confirmButtonText: "Ok",
          });
          // Actualizar el cliente en el pedido
          this.pedido.cliente = this.formulario.value;
          this.mostrarFormularioCliente = false;
        });
      }
    });
  }

  // Métodos para manejar regiones
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
        this.departamentos = x.Regiones.map((c) => {
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
            this.ciudades = y.ciudades.map((c) => {
              return c;
            });
          }
        });
      }
    });
  }

  idBillingZone(zona_cobro: any) {
    const ciudad = this.ciudad_municipio_entrega;
    this.filteredResults = this.allBillingZone?.filter(item => item.ciudad === ciudad) || [];
    if (zona_cobro?.zonaCobro) {
      this.zona_cobro = zona_cobro.zonaCobro;
      this.valor_zona_cobro = zona_cobro.valorZonaCobro;
    }
  }

  onBillingSame(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.alias_facturacion = this.pedido.cliente?.nombres_completos || '';
      this.razon_social = this.pedido.cliente?.nombres_completos || '';
      this.tipo_documento_facturacion = this.pedido.cliente?.tipo_documento_comprador || '';
      this.numero_documento_facturacion = this.pedido.cliente?.documento || '';
      this.indicativo_celular_facturacion = this.pedido.cliente?.indicativo_celular_comprador || '57';
      this.numero_celular_facturacion = this.pedido.cliente?.numero_celular_comprador || '';
      this.correo_electronico_facturacion = this.pedido.cliente?.correo_electronico_comprador || '';
    } else {
      this.alias_facturacion = '';
      this.razon_social = '';
      this.tipo_documento_facturacion = '';
      this.numero_documento_facturacion = '';
      this.indicativo_celular_facturacion = '57';
      this.numero_celular_facturacion = '';
      this.correo_electronico_facturacion = '';
    }
  }

  redirectToPostalCode() {
    window.open("https://visor.codigopostal.gov.co/472/visor", "_blank");
  }

  // Método para seleccionar una dirección de facturación
  seleccionarDireccionFE(index: number) {
    this.pedido.facturacion = this.datosFacturacionElectronica[index];
    this.pedido = { ...this.pedido };
    this.toastrService.success(`Dirección seleccionada: ${this.datosFacturacionElectronica[index].direccion}`, 'Éxito');
    
    // Si estamos en el paso de facturación, avanzar automáticamente después de un breve retraso
    if (this.activeStep === 3) {
      setTimeout(() => {
        this.setActiveStep(4);
      }, 800);
    }
  }

  // Método para seleccionar una dirección de entrega
  seleccionarDireccionEntrega(index: number) {
    this.pedido.envio = this.datosEntregas[index];
    this.pedido = { ...this.pedido };
    this.toastrService.success(`Dirección seleccionada: ${this.datosEntregas[index].direccionEntrega}`, 'Éxito');
    
    // Si estamos en el paso de entrega, avanzar automáticamente después de un breve retraso
    if (this.activeStep === 2) {
      setTimeout(() => {
        this.setActiveStep(3);
      }, 800);
    }
  }

  // Método para replicar información de teléfono a WhatsApp
  replicarWhatsApp(event: Event) {
    if (this.whatsapp && this.whatsapp.nativeElement.checked === true) {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue(this.formulario.value.indicativo_celular_comprador);
      this.formulario.controls['numero_celular_whatsapp'].setValue(this.formulario.value.numero_celular_comprador);
    } else {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue("");
      this.formulario.controls['numero_celular_whatsapp'].setValue("");
    }
  }

  // Método para filtrar direcciones de entrega basado en la ciudad
  onSelectCity(event: any): void {
    const selectedCity = event.target.value;

    if (this.originalDataEntregas && this.originalDataEntregas.length > 0) {
      this.datosEntregas = this.originalDataEntregas.filter(x => x.ciudad === selectedCity);

      this.datosEntregaNoEncontradosParaCiudadSeleccionada =
        !this.datosEntregas || this.datosEntregas.length === 0;
    }
  }

  // Método para aplicar cambios al pedido general
  overridePedido(event: Pedido) {
    this.pedido = { ...event };
  }

  checkPriceScaleProd(item) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;

    if (item.producto.precio.preciosVolumen.length > 0) {
      item.producto.precio.preciosVolumen.map(x => {
        if (item.cantidad >= x.numeroUnidadesInicial && item.cantidad <= x.numeroUnidadesLimite) {
          totalPrecioSinIVA = x.valorUnitarioPorVolumenSinIVA * item.cantidad;
        } else {
          totalPrecioSinIVA = (item.producto?.precio?.precioUnitarioSinIva) * item.cantidad;
        }

      });
    } else {
      totalPrecioSinIVA = (item.producto?.precio?.precioUnitarioSinIva) * item.cantidad;
    }
    // Sumar precios de adiciones
    if (item.configuracion && item.configuracion.adiciones) {
      item.configuracion.adiciones.forEach(adicion => {
        totalPrecioSinIVA += (adicion['cantidad'] * adicion['referencia']['precioUnitario']) * item.cantidad;
      });
    }

    // Sumar precios de preferencias
    if (item.configuracion && item.configuracion.preferencias) {
      item.configuracion.preferencias.forEach(preferencia => {
        totalPrecioSinIVA += (preferencia['valorUnitarioSinIva']) * item.cantidad;
      });
    }
    totalPrecioSinIVADef += totalPrecioSinIVA


    return totalPrecioSinIVADef;
  }

  checkPriceScale() {
    // ... resto del método sin cambios
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;
    this.pedido.carrito.map(itemCarrito => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.map(x => {
          if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
            totalPrecioSinIVA = x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
          } else {
            totalPrecioSinIVA = (itemCarrito.producto?.precio?.precioUnitarioSinIva) * itemCarrito.cantidad;
          }

        });
      } else {
        totalPrecioSinIVA = (itemCarrito.producto?.precio?.precioUnitarioSinIva) * itemCarrito.cantidad;
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach(adicion => {
          totalPrecioSinIVA += (adicion['cantidad'] * adicion['referencia']['precioUnitario']) * itemCarrito.cantidad;
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(preferencia => {
          totalPrecioSinIVA += (preferencia['valorUnitarioSinIva']) * itemCarrito.cantidad;
        });
      }
      totalPrecioSinIVADef += totalPrecioSinIVA
    });

    return totalPrecioSinIVADef;
  }

  checkIVAPrice() {
    // ... resto del método sin cambios
    let totalPrecioIVA = 0;
    let totalPrecioIVADef = 0;
    let totalExcluidosDef = 0
    let totalIva5Def = 0
    let totalImpoDef = 0
    let totalIva19Def = 0
    let totalExcluidos = 0
    let totalIva5 = 0
    let totalImpo = 0
    let totalIva19 = 0
    this.pedido.carrito.forEach(itemCarrito => {
      //sumar precios productos
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.forEach(x => {
          totalExcluidos = 0
          totalIva5 = 0
          totalImpo = 0
          totalIva19 = 0

          if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
            totalPrecioIVA = x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
            switch (x.valorIVAPorVolumen.toString()) {
              case "0":
                totalExcluidos = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
                break
              case "5":
                totalIva5 = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
                break
              case "8":
                totalImpo = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
                break
              case "19":
                totalIva19 = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
                break
              default:
                break
            }
          } else {
            totalPrecioIVA = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
            switch (x.valorIVAPorVolumen.toString()) {
              case "0":
                totalExcluidos = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
                break
              case "5":
                totalIva5 = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
                break
              case "8":
                totalImpo = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
                break
              case "19":
                totalIva19 = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
                break
              default:
                break
            }
          }
        });
      } else {
        totalPrecioIVA = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
        switch (itemCarrito.producto?.precio?.precioUnitarioIva) {
          case "0":
            totalExcluidos = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
            break
          case "5":
            totalIva5 = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
            break
          case "8":
            totalImpo = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
            break
          case "19":
            totalIva19 = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100)));
            break
          default:
            break
        }
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach(adicion => {
          totalPrecioIVA += ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
          switch (adicion.porcentajeIva.toString()) {
            case "0":
              totalExcluidos = totalExcluidos + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            case "5":
              totalIva5 = totalIva5 + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            case "8":
              totalImpo = totalImpo + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            case "19":
              totalIva19 = totalIva19 + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            default:
              break
          }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(preferencia => {
          totalPrecioIVA += (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
          switch (preferencia.porcentajeIva) {
            case "0":
              totalExcluidos = totalExcluidos + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            case "5":
              totalIva5 = totalIva5 + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            case "8":
              totalImpo = totalImpo + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            case "19":
              totalIva19 = totalIva19 + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (this.pedido.porceDescuento ?? 0 / 100));
              break
            default:
              break
          }
        });
      }
      // sumarprecio impuesto domicilio


      totalPrecioIVADef += totalPrecioIVA
      totalExcluidosDef += totalExcluidos
      totalIva5Def += totalIva5
      totalImpoDef += totalImpo
      totalIva19Def += totalIva19
    });
    switch (this.pedidoUtilService.getShippingTaxValue(this.allBillingZone)) {
      case "0":
        totalExcluidosDef = totalExcluidosDef + this.pedidoUtilService.getShippingTaxCost(this.allBillingZone);
        break
      case "5":
        totalIva5Def = totalIva5Def + this.pedidoUtilService.getShippingTaxCost(this.allBillingZone);
        break
      case "8":
        totalImpoDef = totalImpoDef + this.pedidoUtilService.getShippingTaxCost(this.allBillingZone);
        break
      case "19":
        totalIva19Def = totalIva19Def + this.pedidoUtilService.getShippingTaxCost(this.allBillingZone);
        break
      default:
        break
    }
    return {
      totalPrecioIVADef: totalPrecioIVADef,
      totalExcluidos: totalExcluidosDef,
      totalIva5: totalIva5Def,
      totalImpo: totalImpoDef,
      totalIva19: totalIva19Def
    };
  }

  async gotToPaymentOrder() {
    if (!this.pedido.cliente) {
      this.toastrService.error('Por favor seleccione un cliente', 'Error');
      this.setActiveStep(1);
      return;
    }

    if (this.activarEntrega && !this.pedido.envio) {
      this.toastrService.error('Por favor seleccione los datos de entrega', 'Error');
      this.setActiveStep(2);
      return;
    }

    if (this.generarFacturaElectronica && !this.pedido.facturacion) {
      this.toastrService.error('Por favor seleccione los datos de facturación', 'Error');
      this.setActiveStep(3);
      return;
    }

    const formaPago = this.form.get('opcionSeleccionada')?.value;
    if (!formaPago) {
      this.toastrService.error('Por favor seleccione una forma de pago', 'Error');
      return;
    }

    this.pedido.formaDePago = formaPago;
    
    this.toastrService.info('Procesando la orden...', 'Procesando');

    this.comprarYPagar.emit(this.pedido);
  }

  // Métodos para direcciones de facturación
  copiarDatosClienteFacturacion(event: any) {
    if (event.target.checked && this.pedido?.cliente) {
      this.alias_facturacion = this.pedido.cliente.nombres_completos || '';
      this.razon_social = this.pedido.cliente.nombres_completos || '';
      this.tipo_documento_facturacion = this.pedido.cliente.tipo_documento_comprador || '';
      this.numero_documento_facturacion = this.pedido.cliente.documento || '';
      this.indicativo_celular_facturacion = this.pedido.cliente.indicativo_celular_comprador || '57';
      this.numero_celular_facturacion = this.pedido.cliente.numero_celular_comprador || '';
      this.correo_electronico_facturacion = this.pedido.cliente.correo_electronico_comprador || '';
    } else {
      this.alias_facturacion = '';
      this.razon_social = '';
      this.tipo_documento_facturacion = '';
      this.numero_documento_facturacion = '';
      this.indicativo_celular_facturacion = '57';
      this.numero_celular_facturacion = '';
      this.correo_electronico_facturacion = '';
    }
  }

  guardarDireccionFacturacion() {
    if (!this.razon_social || !this.direccion_facturacion || !this.ciudad_municipio) {
      this.toastrService.warning('Por favor complete todos los campos obligatorios', 'Atención');
      return;
    }

    const nuevaDireccionFacturacion = {
      alias: this.alias_facturacion || this.razon_social,
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

    if (!this.datosFacturacionElectronica) {
      this.datosFacturacionElectronica = [];
    }

    this.datosFacturacionElectronica.push(nuevaDireccionFacturacion);

    // Actualizar datos del cliente
    this.actualizarDatosClienteFacturacion();

    // Seleccionar la dirección recién creada
    this.seleccionarDireccionFE(this.datosFacturacionElectronica.length - 1);

    // Limpiar formulario
    this.limpiarFormularioFacturacion();
    
    // Volver a la pestaña de direcciones guardadas
    setTimeout(() => {
      const tabView = document.querySelector('.billing-tabs .p-tabview-nav li:first-child a');
      if (tabView) {
        (tabView as HTMLElement).click();
      }
    }, 300);
  }

  private actualizarDatosClienteFacturacion() {
    if (!this.pedido?.cliente) return;

    const clienteActualizado = { ...this.pedido.cliente };
    // Crear un objeto del tipo esperado para datosFacturacionElectronica
    const datosFacturacion: Facturacion = {
      tipoDocumento: this.tipo_documento_facturacion,
      codigoPostal: this.codigo_postal,
      indicativoCel: this.indicativo_celular_facturacion,
      ciudad: this.ciudad_municipio,
      departamento: this.departamento,
      pais: this.pais,
      direccion: this.direccion_facturacion,
      celular: this.numero_celular_facturacion,
      documento: this.numero_documento_facturacion,
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      correoElectronico: this.correo_electronico_facturacion
    };

    clienteActualizado.datosFacturacionElectronica = datosFacturacion;

    this.service.editClient(clienteActualizado).subscribe({
      next: (response) => {
        this.toastrService.success('Dirección de facturación guardada correctamente');
      },
      error: (error) => {
        console.error('Error al actualizar direcciones de facturación:', error);
        this.toastrService.error('Error al guardar la dirección de facturación');
      }
    });
  }

  limpiarFormularioFacturacion() {
    this.alias_facturacion = '';
    this.razon_social = '';
    this.tipo_documento_facturacion = '';
    this.numero_documento_facturacion = '';
    this.indicativo_celular_facturacion = '57';
    this.numero_celular_facturacion = '';
    this.correo_electronico_facturacion = '';
    this.direccion_facturacion = '';
    this.codigo_postal = '';
    this.usarDatosClienteFacturacion = false;
  }

  editarDireccionFacturacion(direccion: any, index: number) {
    this.indexFacturacionEditando = index;
    this.editandoFacturacion = true;

    // Cargar datos en formulario de edición
    this.alias_facturacion = direccion.alias;
    this.razon_social = direccion.nombres;
    this.tipo_documento_facturacion = direccion.tipoDocumento;
    this.numero_documento_facturacion = direccion.documento;
    this.indicativo_celular_facturacion = direccion.indicativoCel;
    this.numero_celular_facturacion = direccion.celular;
    this.correo_electronico_facturacion = direccion.correoElectronico;
    this.direccion_facturacion = direccion.direccion;
    this.pais = direccion.pais;
    this.departamento = direccion.departamento;
    this.ciudad_municipio = direccion.ciudad;
    this.codigo_postal = direccion.codigoPostal;

    // Identificar departamento y ciudades
    this.identificarDepto();
    this.identificarCiu();

    // Abrir modal de edición
    const modalRef = this.modalService.open(this.modalFacturacion, { size: 'lg' });
  }

  guardarEdicionFacturacion() {
    if (this.indexFacturacionEditando < 0 || !this.editandoFacturacion) return;

    const direccionActualizada = {
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

    this.datosFacturacionElectronica[this.indexFacturacionEditando] = direccionActualizada;

    // Actualizar datos del cliente
    this.actualizarDatosClienteFacturacion();

    // Cerrar modal
    this.modalService.dismissAll();
    this.limpiarFormularioFacturacion();
    this.editandoFacturacion = false;
    this.indexFacturacionEditando = -1;
  }

  eliminarDireccionFacturacion(index: number) {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'Se eliminará esta dirección de facturación',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.datosFacturacionElectronica.splice(index, 1);
        this.actualizarDatosClienteFacturacion();

        if (this.pedido?.facturacion) {
          // Si se elimina la dirección seleccionada, seleccionar otra si existe
          if (this.datosFacturacionElectronica.length > 0) {
            this.pedido.facturacion = this.datosFacturacionElectronica[0];
          } else {
            this.pedido.facturacion = undefined;
          }
        }
      }
    });
  }

  // Métodos para direcciones de entrega
  copiarDatosClienteEntrega(event: any) {
    if (event.target.checked && this.pedido?.cliente) {
      this.alias_entrega = this.pedido.cliente.nombres_completos || '';
      this.nombres_entrega = this.pedido.cliente.nombres_completos || '';
      this.apellidos_entrega = this.pedido.cliente.apellidos_completos || '';
      this.indicativo_celular_entrega = this.pedido.cliente.indicativo_celular_comprador || '57';
      this.numero_celular_entrega = this.pedido.cliente.numero_celular_comprador || '';
      this.indicativo_celular_entrega2 = this.pedido.cliente.indicativo_celular_whatsapp || '57';
      this.otro_numero_entrega = this.pedido.cliente.numero_celular_whatsapp || '';
    } else {
      this.alias_entrega = '';
      this.nombres_entrega = '';
      this.apellidos_entrega = '';
      this.indicativo_celular_entrega = '57';
      this.numero_celular_entrega = '';
      this.indicativo_celular_entrega2 = '57';
      this.otro_numero_entrega = '';
    }
  }

  guardarDireccionEntrega() {
    if (!this.nombres_entrega || !this.direccion_entrega || !this.ciudad_municipio_entrega) {
      this.toastrService.warning('Por favor complete todos los campos obligatorios', 'Atención');
      return;
    }

    const nuevaDireccionEntrega = {
      alias: this.alias_entrega || this.nombres_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoCel2: this.indicativo_celular_entrega2,
      celular2: this.otro_numero_entrega,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      direccion: this.direccion_entrega,
      zonaCobro: this.zona_cobro,
      valorZonaCobro: this.valor_zona_cobro,
      codigoPostal: this.codigo_postal_entrega,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      observaciones: this.observaciones,
      especificacionesInternas: this.especificacionesInternas
    };

    if (!this.datosEntregas) {
      this.datosEntregas = [];
    }

    this.datosEntregas.push(nuevaDireccionEntrega);

    // Actualizar datos del cliente
    this.actualizarDatosClienteEntrega();

    // Seleccionar la dirección recién creada
    this.seleccionarDireccionEntrega(this.datosEntregas.length - 1);

    // Limpiar formulario
    this.limpiarFormularioEntrega();
    
    // Volver a la pestaña de direcciones guardadas
    setTimeout(() => {
      const tabView = document.querySelector('.delivery-tabs .p-tabview-nav li:first-child a');
      if (tabView) {
        (tabView as HTMLElement).click();
      }
    }, 300);
  }

  private actualizarDatosClienteEntrega() {
    if (!this.pedido?.cliente) return;

    const clienteActualizado = { ...this.pedido.cliente };
    // Crear un objeto del tipo esperado para datosEntrega
    const datosEntregaObj: Entrega = {
      alias: this.alias_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoCel2: this.indicativo_celular_entrega2,
      celular2: this.otro_numero_entrega,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      direccionEntrega: this.direccion_entrega,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      observaciones: this.observaciones,
      especificacionesInternas: this.especificacionesInternas
    };

    clienteActualizado.datosEntrega = datosEntregaObj;

    this.service.editClient(clienteActualizado).subscribe({
      next: (response) => {
        this.toastrService.success('Dirección de entrega guardada correctamente');
      },
      error: (error) => {
        console.error('Error al actualizar direcciones de entrega:', error);
        this.toastrService.error('Error al guardar la dirección de entrega');
      }
    });
  }

  limpiarFormularioEntrega() {
    this.alias_entrega = '';
    this.nombres_entrega = '';
    this.apellidos_entrega = '';
    this.indicativo_celular_entrega = '57';
    this.numero_celular_entrega = '';
    this.indicativo_celular_entrega2 = '57';
    this.otro_numero_entrega = '';
    this.direccion_entrega = '';
    this.observaciones = '';
    this.barrio = '';
    this.nombreUnidad = '';
    this.especificacionesInternas = '';
    this.codigo_postal_entrega = '';
    this.usarDatosClienteEntrega = false;
  }

  editarDireccionEntrega(direccion: any, index: number) {
    this.indexEntregaEditando = index;
    this.editandoEntrega = true;

    // Cargar datos en formulario de edición
    this.alias_entrega = direccion.alias;
    this.nombres_entrega = direccion.nombres;
    this.apellidos_entrega = direccion.apellidos;
    this.indicativo_celular_entrega = direccion.indicativoCel;
    this.numero_celular_entrega = direccion.celular;
    this.indicativo_celular_entrega2 = direccion.indicativoCel2;
    this.otro_numero_entrega = direccion.celular2;
    this.direccion_entrega = direccion.direccion;
    this.observaciones = direccion.observaciones;
    this.barrio = direccion.barrio;
    this.nombreUnidad = direccion.nombreUnidad;
    this.especificacionesInternas = direccion.especificacionesInternas;
    this.pais_entrega = direccion.pais;
    this.departamento_entrega = direccion.departamento;
    this.ciudad_municipio_entrega = direccion.ciudad;
    this.zona_cobro = direccion.zonaCobro;
    this.valor_zona_cobro = direccion.valorZonaCobro;
    this.codigo_postal_entrega = direccion.codigoPostal;

    // Identificar departamento y ciudades
    this.identificarDepto1();
    this.identificarCiu1();
    this.idBillingZone(direccion);

    // Abrir modal de edición
    const modalRef = this.modalService.open(this.modalEntrega, { size: 'lg' });
  }

  guardarEdicionEntrega() {
    if (this.indexEntregaEditando < 0 || !this.editandoEntrega) return;

    const direccionActualizada = {
      alias: this.alias_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoCel2: this.indicativo_celular_entrega2,
      celular2: this.otro_numero_entrega,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      direccion: this.direccion_entrega,
      zonaCobro: this.zona_cobro,
      valorZonaCobro: this.valor_zona_cobro,
      codigoPostal: this.codigo_postal_entrega,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      observaciones: this.observaciones,
      especificacionesInternas: this.especificacionesInternas
    };

    this.datosEntregas[this.indexEntregaEditando] = direccionActualizada;

    // Actualizar datos del cliente
    this.actualizarDatosClienteEntrega();

    // Cerrar modal
    this.modalService.dismissAll();
    this.limpiarFormularioEntrega();
    this.editandoEntrega = false;
    this.indexEntregaEditando = -1;
  }

  eliminarDireccionEntrega(index: number) {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'Se eliminará esta dirección de entrega',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.datosEntregas.splice(index, 1);
        this.actualizarDatosClienteEntrega();

        if (this.pedido?.envio) {
          // Si se elimina la dirección seleccionada, seleccionar otra si existe
          if (this.datosEntregas.length > 0) {
            this.pedido.envio = this.datosEntregas[0];
          } else {
            this.pedido.envio = undefined;
          }
        }
      }
    });
  }

  // Método para cambiar el paso activo
  setActiveStep(step: number): void {
    // Validaciones para asegurar que se cumplan los requisitos antes de avanzar
    if (step > 1 && !this.pedido?.cliente) {
      this.toastrService.warning('Debe seleccionar o crear un cliente primero', 'Atención');
      return;
    }

    if (step > 2 && this.activarEntrega && !this.pedido?.envio) {
      this.toastrService.warning('Debe seleccionar o crear una dirección de entrega', 'Atención');
      return;
    }

    if (step > 3 && this.generarFacturaElectronica && !this.pedido?.facturacion) {
      this.toastrService.warning('Debe seleccionar o crear una dirección de facturación', 'Atención');
      return;
    }

    this.activeStep = step;
  }

  // Método para activar la pestaña de nueva dirección de entrega
  newDeliveryTabActive(): void {
    const tabView = document.querySelector('.delivery-tabs .p-tabview-nav li:nth-child(2) a');
    if (tabView) {
      (tabView as HTMLElement).click();
    }
  }

  // Método para activar la pestaña de nueva dirección de facturación
  newBillingTabActive(): void {
    const tabView = document.querySelector('.billing-tabs .p-tabview-nav li:nth-child(2) a');
    if (tabView) {
      (tabView as HTMLElement).click();
    }
  }

  // Método para obtener el icono correspondiente a cada forma de pago
  getPaymentIcon(paymentName: string): string {
    // Mapeo de nombres de formas de pago a iconos
    const iconMap: { [key: string]: string } = {
      'Tarjeta de Crédito': 'credit-card',
      'Tarjeta Débito': 'credit-card',
      'PSE': 'university',
      'Transferencia Bancaria': 'bank',
      'Efectivo': 'money',
      'PayPal': 'paypal',
      'Bitcoin': 'bitcoin',
      'Nequi': 'mobile',
      'Daviplata': 'mobile',
      'Crédito': 'handshake-o',
      'Efecty': 'building',
      'Western Union': 'globe'
    };

    // Buscar coincidencias parciales
    for (const [key, icon] of Object.entries(iconMap)) {
      if (paymentName.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }

    // Icono por defecto
    return 'money';
  }
}
