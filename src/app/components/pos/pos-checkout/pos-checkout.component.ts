import { ChangeDetectorRef, Component, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, EventEmitter } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { POSPedido } from '../pos-modelo/pedido';
import { CartSingletonService } from '../../../shared/services/ventas/cart.singleton.service';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { environment } from 'src/environments/environment';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { POSPedidosUtilService } from '../pos-service/pos-pedidos.util.service';
import { UserLogged } from 'src/app/shared/models/User/UserLogged';
import { UserLite } from 'src/app/shared/models/User/UserLite';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

declare var WidgetCheckout: any;
@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})
export class CheckOutPOSComponent implements OnInit, OnChanges {

  public checkoutForm: UntypedFormGroup;
  form = new FormGroup({
    opcionSeleccionada: new FormControl('edo-ani') // 'edo-ani' es el valor por defecto
  });
  // private pedido: Pedido;
  pub_key: string;
  signature: string;
  formasPago: any[];
  isMobile: boolean = false;

  //crear un un evento emit para que el padre se entere que se hizo el pago
  @Output() comprarYPagar = new EventEmitter<any>();

  @Input()
  public pedido: POSPedido;

  @Input()
  allBillingZone: any[];
  categoriasFormasPago: { categoria: string; formasPago: any; }[];
  precioproducto: any;
  paymentForm: FormGroup;
  changeDue: number = 0;

  constructor(private fb: UntypedFormBuilder, private ref: ChangeDetectorRef,
    private singleton: CartSingletonService, private payment: PaymentService, private service: MaestroService,
    public pedidoUtilService: POSPedidosUtilService,
    private modalService: NgbModal) {

    this.pedidoUtilService.getAllMaestro$().subscribe((data: any) => {

      this.formasPago = data.formasPago;

      const categorias = [
        { categoria: 'Online', online: 'Online' },
        { categoria: 'Offline', online: 'Offline' },
        { categoria: 'Billeteras Virtuales', online: 'Billeteras Virtuales' },
        { categoria: 'Criptomonedas', online: 'Criptomonedas' },
        { categoria: 'Pago a Crédito', online: 'Pago a Credito' },
        { categoria: 'Envío de Dinero a Colombia', online: 'Envío de dinero a Colombia desde cualquier lugar del mundo' }
      ];

      this.categoriasFormasPago = categorias.map(categoria => ({
        categoria: categoria.categoria,
        formasPago: this.formasPago?.filter(formaPago =>
          categoria.online === formaPago.online ||
          formaPago.online.includes(categoria.online)
        )
      })).filter(categoria => categoria.formasPago?.length > 0);

    });

    this.pub_key = environment.wompi.public_key;

    if (this.pedido) {
      this.pedidoUtilService.pedido = this.pedido;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.isMobile = event.target.innerWidth < 768;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.pedido = { ...this.pedido };
    console.log(this.pedido);
    this.pedidoUtilService.pedido = this.pedido;
    this.singleton.refreshCart().subscribe((data: any) => {
      this.pedido.carrito = data;
      this.pedido.carrito = [...this.pedido.carrito];
      this.payment.pauymentWompi(this.pedido).then((data: any) => {
        this.signature = data;
      });
    });
  }


  onSubmit() {
  }

  ngOnInit() {

    if (this.pedido) {
      this.pedidoUtilService.pedido = this.pedido;
      this.paymentForm = new FormGroup({
        amountReceived: new FormControl('', Validators.required)
      });

      this.paymentForm.get('amountReceived')?.valueChanges.subscribe(value => {
        this.updateChangeDue(value);
      });
    }
    this.isMobile = window.innerWidth < 768;
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

    return {
      totalPrecioIVADef: totalPrecioIVADef,
      totalExcluidos: totalExcluidosDef,
      totalIva5: totalIva5Def,
      totalImpo: totalImpoDef,
      totalIva19: totalIva19Def
    };
  }

  async gotToPaymentOrder(paymentModal: any) {

    this.pedidoUtilService.pedido = this.pedido;
    this.pedido.totalEnvio = 0;
    this.pedido.totalDescuento = this.pedidoUtilService.getDiscount();
    this.pedido.totalImpuesto = this.checkIVAPrice().totalPrecioIVADef
    this.pedido.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();
    this.pedido.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(this.pedido.totalEnvio) + this.checkIVAPrice().totalPrecioIVADef
    let opcionSeleccionadaId = this.form.value.opcionSeleccionada;
    let opcionSeleccionada = this.formasPago.filter(formaPago => formaPago.id === opcionSeleccionadaId);
    console.log('Opción seleccionada:', opcionSeleccionada[0]); // Debug
    this.pedido.formaDePago = opcionSeleccionada[0].nombre;
    this.pedido.cuponAplicado = '';

    const userString = localStorage.getItem('user');
    const user = JSON.parse(userString) as UserLogged;
    const userLite: UserLite = {
      name: user.name,
      email: user.email,
      nit: user.nit
    }
    this.pedido.asesorAsignado = userLite;
    this.pedido.fechaCreacion = new Date().toISOString();
    this.pedido.fechaEntrega = new Date(this.pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega.year, this.pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega.month == 0 ? 0 : this.pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega.month - 1, this.pedido.carrito[0].configuracion?.datosEntrega?.fechaEntrega.day).toISOString();
    this.pedido.horarioEntrega = this.pedido.carrito[0].configuracion.datosEntrega.horarioEntrega;
    this.pedido.formaEntrega = this.pedido.carrito[0].configuracion.datosEntrega.formaEntrega;
    if (opcionSeleccionada[0].nombre.toString().toLowerCase().includes('efectivo')) {
      // Abrir modal de cuadre de caja
      this.modalService.open(paymentModal, { size: 'lg' }).result.then(result => {
        console.log('Modal result:', result);
        if (result === 'confirmado') {
          this.processPayment();
        }
      });
    } else {

      this.comprarYPagar.emit(this.pedido);
    }
  }
  updateChangeDue(received: number): void {
    this.pedido.totalEnvio = 0;
    const total = this.pedidoUtilService.getDiscount() + this.checkPriceScale() + this.checkIVAPrice().totalPrecioIVADef
    this.changeDue = (received || 0) - total;
  }

  processPayment() {
    if (this.changeDue >= 0) {
      // lógica para procesar el pago
      this.modalService.dismissAll();
      this.pedido.pagoRecibido = this.paymentForm.value.amountReceived;
      this.pedido.cambioEntregado = this.changeDue;
      this.comprarYPagar.emit(this.pedido);
    } else {
      Swal.fire({
        title: 'Error',
        text: 'La cantidad recibida es insuficiente.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

}
