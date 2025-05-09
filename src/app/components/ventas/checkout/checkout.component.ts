import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Pedido } from '../modelo/pedido';
import { CartSingletonService } from '../../../shared/services/ventas/cart.singleton.service';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { environment } from 'src/environments/environment';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { PedidosUtilService } from '../service/pedidos.util.service';
import { UserLogged } from 'src/app/shared/models/User/UserLogged';
import { UserLite } from 'src/app/shared/models/User/UserLite';
declare var WidgetCheckout: any;
@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckOutComponent implements OnInit, OnChanges {

  public checkoutForm: UntypedFormGroup;
  form = new FormGroup({
    opcionSeleccionada: new FormControl('edo-ani') // 'edo-ani' es el valor por defecto
  });
  // private pedido: Pedido;
  pub_key: string;
  signature: string;
  formasPago: any[];

  //crear un un evento emit para que el padre se entere que se hizo el pago
  @Output() comprarYPagar = new EventEmitter<any>();

  @Input()
  public pedido: Pedido;

  @Input()
  allBillingZone: any[];
  categoriasFormasPago: { categoria: string; formasPago: any; }[];
  precioproducto: any;


  constructor(private fb: UntypedFormBuilder, private ref: ChangeDetectorRef,
    private singleton: CartSingletonService, private payment: PaymentService, private service: MaestroService,
    public pedidoUtilService: PedidosUtilService) {

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
  ngOnChanges(changes: SimpleChanges): void {
    this.pedido = { ...this.pedido };
    console.log(this.pedido);
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
  checkPriceScaleProd(item) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;

    let unitPriceSinIVA: number;
    const productoPrecio = itemCarrito.producto?.precio;

    if (productoPrecio && productoPrecio.preciosVolumen && productoPrecio.preciosVolumen.length > 0) {
      const rangoActual = productoPrecio.preciosVolumen.find(pv =>
        itemCarrito.cantidad >= pv.numeroUnidadesInicial && itemCarrito.cantidad <= pv.numeroUnidadesLimite
      );
      if (rangoActual) {
        unitPriceSinIVA = rangoActual.valorUnitarioPorVolumenSinIVA;
      } else {
        // Fallback to base price if no volume tier matches but preciosVolumen array exists
        unitPriceSinIVA = productoPrecio.precioUnitarioSinIva || 0;
      }
    } else {
      totalPrecioSinIVA = (item.producto?.precio?.precioUnitarioSinIva) * item.cantidad;
    }
    totalPrecioSinIVA = unitPriceSinIVA * itemCarrito.cantidad;
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

    this.pedidoUtilService.pedido = this.pedido;
    this.pedido.totalDescuento = this.pedidoUtilService.getDiscount();
    this.pedido.totalEnvio = this.pedidoUtilService.getShippingCost(this.allBillingZone);
    this.pedido.totalImpuesto = this.pedidoUtilService.checkIVAPrice() + this.pedidoUtilService.getShippingTaxCost(this.allBillingZone)
    this.pedido.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();
    this.pedido.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(this.pedido.totalEnvio) + this.pedidoUtilService.checkIVAPrice();
    let opcionSeleccionadaId = this.form.value.opcionSeleccionada;
    let opcionSeleccionada = this.formasPago.filter(formaPago => formaPago.id === opcionSeleccionadaId);

    // Ahora opcionSeleccionada[0].nombre tiene el nombre correspondiente al id
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

    this.comprarYPagar.emit(this.pedido);

  }


}
