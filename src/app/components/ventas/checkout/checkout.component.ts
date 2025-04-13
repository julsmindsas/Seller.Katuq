import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Pedido } from '../modelo/pedido';
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

  public checkoutForm: UntypedFormGroup;
  form = new FormGroup({
    opcionSeleccionada: new FormControl('edo-ani') // 'edo-ani' es el valor por defecto
  });
  // private pedido: Pedido;
  pub_key: string;
  signature: string;
  formasPago: any[];

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
  departamentos: string[];
  ciudades: string[] = [];
  ciudadesOrigen: { value: string; label: string }[];
  pais: string = "Colombia";
  departamento: string = "Antioquia";
  ciudad_municipio: string;
  codigo_postal: string;
  direccion_facturacion: string;
  datosFacturacionElectronica: any[] = [];
  datosEntregas: any[] = [];
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
    public pedidoUtilService: PedidosUtilService
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
    if (this.buscarPor.nativeElement.value == "CC-NIT") {
      const data = { documento: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        console.log(res);
        if (res.length == 0) {
          this.formulario.controls["documento"].setValue(this.documentoBusqueda.nativeElement.value);
          this.pedido.cliente = undefined;
          this.encontrado = false;
          this.bloqueado = false;
          this.mostrarFormularioCliente = true;
          Swal.fire({
            title: "No encontrado!",
            text: "No se encuentra el documento. Llene los datos para crear el cliente.",
            icon: "warning",
            confirmButtonText: "Ok",
          });
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
          }
          this.toastrService.show('<p class="mb-0 mt-1">Cliente encontrado!</p>', '', { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 });
          
          // Cargar datos de facturación y entrega del cliente
          this.datosFacturacionElectronica = [];
          this.datosEntregas = [];
          this.originalDataEntregas = [];
          this.originalDataFacturacionElectronica = [];
          
          if (res.datosFacturacionElectronica && res.datosFacturacionElectronica.length > 0) {
            res.datosFacturacionElectronica.forEach(x => {
              this.datosFacturacionElectronica.push(x);
              this.originalDataFacturacionElectronica.push(x);
            });
            // Asignar el primer dato de facturación al pedido
            this.pedido.facturacion = this.datosFacturacionElectronica[0];
          }
          
          if (res.datosEntrega && res.datosEntrega.length > 0) {
            res.datosEntrega.forEach(x => {
              this.datosEntregas.push(x);
              this.originalDataEntregas.push(x);
            });
            // Asignar el primer dato de entrega al pedido
            this.pedido.envio = this.datosEntregas[0];
          }
        }
      });
    } else if (this.buscarPor.nativeElement.value == "PA") {
      // Búsqueda por correo electrónico
      const data = { email: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByEmail(data).subscribe((res: any) => {
        this.handleClientResponse(res);
      });
    } else if (this.buscarPor.nativeElement.value == "TI") {
      // Búsqueda por nombre y apellido
      const data = { nombres: this.documentoBusqueda.nativeElement.value };
      this.service.getClientByName(data).subscribe((res: any) => {
        this.handleClientResponse(res);
      });
    }
  }

  // Manejo común para la respuesta de la búsqueda de clientes
  private handleClientResponse(res: any) {
    if (!res || res.length == 0) {
      this.pedido.cliente = undefined;
      this.encontrado = false;
      this.bloqueado = false;
      this.mostrarFormularioCliente = true;
      Swal.fire({
        title: "No encontrado!",
        text: "No se encuentra el cliente. Llene los datos para crear uno nuevo.",
        icon: "warning",
        confirmButtonText: "Ok",
      });
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
      }
      
      this.loadClientAddresses(res);
    }
  }

  // Cargar direcciones del cliente
  private loadClientAddresses(res: any) {
    this.datosFacturacionElectronica = [];
    this.datosEntregas = [];
    this.originalDataEntregas = [];
    this.originalDataFacturacionElectronica = [];
    
    if (res.datosFacturacionElectronica && res.datosFacturacionElectronica.length > 0) {
      res.datosFacturacionElectronica.forEach(x => {
        this.datosFacturacionElectronica.push(x);
        this.originalDataFacturacionElectronica.push(x);
      });
      this.pedido.facturacion = this.datosFacturacionElectronica[0];
    }
    
    if (res.datosEntrega && res.datosEntrega.length > 0) {
      res.datosEntrega.forEach(x => {
        this.datosEntregas.push(x);
        this.originalDataEntregas.push(x);
      });
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
      const client = (r instanceof ArrayBuffer) ? JSON.parse(new TextDecoder().decode(r)) : r;
      Swal.fire({
        title: "Guardado!",
        text: "Cliente creado rápidamente",
        icon: "success",
        confirmButtonText: "Ok",
      });
      sessionStorage.setItem("cliente", JSON.stringify(clienteData));
      this.clienteRecienCreado = true;
      this.encontrado = true;
      this.mostrarFormularioCliente = false;
      this.pedido = { ...this.pedido };
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

  // Método para seleccionar una dirección de facturación
  seleccionarDireccionFE(index: number) {
    this.pedido.facturacion = this.datosFacturacionElectronica[index];
    this.pedido = { ...this.pedido };
    Swal.fire({
      title: "Dirección Seleccionada!",
      text: this.datosFacturacionElectronica[index].direccion,
      icon: "success",
      confirmButtonText: "Ok",
    });
  }

  // Método para seleccionar una dirección de entrega
  seleccionarDireccionEntrega(index: number) {
    this.pedido.envio = this.datosEntregas[index];
    this.pedido = { ...this.pedido };
    Swal.fire({
      title: "Dirección Seleccionada!",
      text: this.datosEntregas[index].direccionEntrega,
      icon: "success",
      confirmButtonText: "Ok",
    });
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
      return;
    }

    if (this.generarFacturaElectronica && !this.pedido.facturacion) {
      this.toastrService.error('Por favor seleccione los datos de facturación', 'Error');
      return;
    }

    if (this.activarEntrega && !this.pedido.envio) {
      this.toastrService.error('Por favor seleccione los datos de entrega', 'Error');
      return;
    }
    
    // Asignar forma de pago seleccionada
    const formaPago = this.form.get('opcionSeleccionada')?.value;
    if (formaPago) {
      this.pedido.formaDePago = formaPago;
    }
    
    // Emitir evento de compra para que lo capture el componente padre
    this.comprarYPagar.emit(this.pedido);
  }
}
