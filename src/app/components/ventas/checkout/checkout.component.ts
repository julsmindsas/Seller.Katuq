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

  private getUnitPriceSinIVAWithScale(item: any): number {
    const productoPrecio = item?.producto?.precio;
    if (!productoPrecio) return 0;

    if (productoPrecio.preciosVolumen && productoPrecio.preciosVolumen.length > 0) {
      const cantidad = parseInt(item.cantidad?.toString() || '0');
      const rangoActual = productoPrecio.preciosVolumen.find(pv =>
        cantidad >= pv.numeroUnidadesInicial && cantidad <= pv.numeroUnidadesLimite
      );
      if (rangoActual) {
        return rangoActual.valorUnitarioPorVolumenSinIVA || 0;
      } else {
        return productoPrecio.precioUnitarioSinIva || 0;
      }
    } else {
      return productoPrecio.precioUnitarioSinIva || 0;
    }
  }

  checkPriceScaleProd(item: any): number {
    if (!item || !item.producto || !item.producto.precio) {
      return 0;
    }

    const cantidad = parseInt(item.cantidad?.toString() || '0');
    if (cantidad === 0) {
      return 0;
    }

    const unitPriceSinIVA = this.getUnitPriceSinIVAWithScale(item);
    let totalItemSinIVA = unitPriceSinIVA * cantidad;

    if (item.configuracion && item.configuracion.adiciones) {
      let totalAdicionesSinIVA = 0;
      item.configuracion.adiciones.forEach(adicion => {
        const precioAdicionUnitarioSinIVA = adicion?.referencia?.precioUnitario || 0;
        const cantidadAdicion = parseInt(adicion?.cantidad?.toString() || '0');
        totalAdicionesSinIVA += cantidadAdicion * precioAdicionUnitarioSinIVA;
      });
      totalItemSinIVA += totalAdicionesSinIVA * cantidad; 
    }

    if (item.configuracion && item.configuracion.preferencias) {
      let totalPreferenciasSinIVA = 0;
      item.configuracion.preferencias.forEach(preferencia => {
        totalPreferenciasSinIVA += preferencia?.valorUnitarioSinIva || 0;
      });
      totalItemSinIVA += totalPreferenciasSinIVA * cantidad; 
    }

    return totalItemSinIVA;
  }

  checkPriceScale(): number {
    if (!this.pedido || !this.pedido.carrito) {
      return 0;
    }

    let totalPedidoSinIVA = 0;
    this.pedido.carrito.forEach(itemCarrito => {
      totalPedidoSinIVA += this.checkPriceScaleProd(itemCarrito);
    });

    return totalPedidoSinIVA;
  }
  checkIVAPrice() {
    let totalPrecioIVA = 0;
    let totalPrecioIVADef = 0;
    let totalExcluidosDef = 0;
    let totalIva5Def = 0;
    let totalImpoDef = 0;
    let totalIva19Def = 0;
    let totalExcluidos = 0;
    let totalIva5 = 0;
    let totalImpo = 0;
    let totalIva19 = 0;

    if (!this.pedido || !this.pedido.carrito) {
      return {
        totalPrecioIVADef: 0,
        totalExcluidos: 0,
        totalIva5: 0,
        totalImpo: 0,
        totalIva19: 0
      };
    }

    this.pedido.carrito.forEach(itemCarrito => {
      totalExcluidos = 0;
      totalIva5 = 0;
      totalImpo = 0;
      totalIva19 = 0;
      totalPrecioIVA = 0; 

      const cantidadItem = parseInt(itemCarrito?.cantidad?.toString() || '0');
      if (cantidadItem === 0) return; 

      const productoPrecio = itemCarrito?.producto?.precio;
      const porceDescuento = (this.pedido?.porceDescuento ?? 0) / 100;

      if (productoPrecio && productoPrecio.preciosVolumen && productoPrecio.preciosVolumen.length > 0) {
        const rangoActual = productoPrecio.preciosVolumen.find(pv =>
          cantidadItem >= pv.numeroUnidadesInicial && cantidadItem <= pv.numeroUnidadesLimite
        );

        if (rangoActual) {
          const valorUnitarioConIVA = rangoActual.valorUnitarioPorVolumenIva || 0;
          const valorIVAPorVolumen = rangoActual.valorIVAPorVolumen?.toString();
          const precioItemConDescuento = (valorUnitarioConIVA * cantidadItem) * (1 - porceDescuento);
          totalPrecioIVA += precioItemConDescuento; 

          switch (valorIVAPorVolumen) {
            case "0": totalExcluidos += precioItemConDescuento; break;
            case "5": totalIva5 += precioItemConDescuento; break;
            case "8": totalImpo += precioItemConDescuento; break;
            case "19": totalIva19 += precioItemConDescuento; break;
          }
        } else {
          const valorUnitarioConIVA = productoPrecio.valorIva || 0; 
          const valorIVABase = productoPrecio.precioUnitarioIva?.toString(); 
          const precioItemConDescuento = (valorUnitarioConIVA * cantidadItem) * (1 - porceDescuento);
          totalPrecioIVA += precioItemConDescuento;
          switch (valorIVABase) {
            case "0": totalExcluidos += precioItemConDescuento; break;
            case "5": totalIva5 += precioItemConDescuento; break;
            case "8": totalImpo += precioItemConDescuento; break;
            case "19": totalIva19 += precioItemConDescuento; break;
          }
        }
      } else if (productoPrecio) {
        const valorUnitarioConIVA = productoPrecio.valorIva || 0; 
        const valorIVABase = productoPrecio.precioUnitarioIva?.toString(); 
        const precioItemConDescuento = (valorUnitarioConIVA * cantidadItem) * (1 - porceDescuento);
        totalPrecioIVA += precioItemConDescuento;
        switch (valorIVABase) {
          case "0": totalExcluidos += precioItemConDescuento; break;
          case "5": totalIva5 += precioItemConDescuento; break;
          case "8": totalImpo += precioItemConDescuento; break;
          case "19": totalIva19 += precioItemConDescuento; break;
        }
      }

      if (itemCarrito?.configuracion?.adiciones) {
        itemCarrito.configuracion.adiciones.forEach(adicion => {
          const cantidadAdicion = parseInt(adicion['cantidad']?.toString() || '0');
          const precioIvaAdicion = adicion['referencia']?.['precioIva'] || 0;
          const valorAdicionConIVA = (cantidadAdicion * precioIvaAdicion * cantidadItem) * (1 - porceDescuento);
          totalPrecioIVA += valorAdicionConIVA;
          switch (adicion['porcentajeIva']?.toString()) {
            case "0": totalExcluidos += valorAdicionConIVA; break;
            case "5": totalIva5 += valorAdicionConIVA; break;
            case "8": totalImpo += valorAdicionConIVA; break;
            case "19": totalIva19 += valorAdicionConIVA; break;
          }
        });
      }

      if (itemCarrito?.configuracion?.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(preferencia => {
          const valorIvaPreferencia = preferencia?.valorIva || 0;
          const valorPreferenciaConIVA = (valorIvaPreferencia * cantidadItem) * (1 - porceDescuento);
          totalPrecioIVA += valorPreferenciaConIVA; 
          switch (preferencia?.porcentajeIva?.toString()) { 
            case "0": totalExcluidos += valorPreferenciaConIVA; break;
            case "5": totalIva5 += valorPreferenciaConIVA; break;
            case "8": totalImpo += valorPreferenciaConIVA; break;
            case "19": totalIva19 += valorPreferenciaConIVA; break;
          }
        });
      }

      totalPrecioIVADef += totalPrecioIVA;
      totalExcluidosDef += totalExcluidos;
      totalIva5Def += totalIva5;
      totalImpoDef += totalImpo;
      totalIva19Def += totalIva19;
    });

    const shippingTaxCost = this.pedidoUtilService.getShippingTaxCost(this.allBillingZone) || 0;
    const shippingTaxValue = this.pedidoUtilService.getShippingTaxValue(this.allBillingZone)?.toString();

    switch (shippingTaxValue) {
      case "0": totalExcluidosDef += shippingTaxCost; break;
      case "5": totalIva5Def += shippingTaxCost; break;
      case "8": totalImpoDef += shippingTaxCost; break;
      case "19": totalIva19Def += shippingTaxCost; break;
    }
    totalPrecioIVADef += shippingTaxCost; 

    return {
      totalPrecioIVADef: totalPrecioIVADef,
      totalExcluidos: totalExcluidosDef,
      totalIva5: totalIva5Def,
      totalImpo: totalImpoDef,
      totalIva19: totalIva19Def
    };
  }

  async gotToPaymentOrder() {

    if (!this.pedido) {
      console.error("Pedido no inicializado en gotToPaymentOrder");
      return; 
    }

    this.pedidoUtilService.pedido = this.pedido;
    this.pedido.totalDescuento = this.pedidoUtilService.getDiscount();
    this.pedido.totalEnvio = this.pedidoUtilService.getShippingCost(this.allBillingZone);

    const ivaBreakdown = this.checkIVAPrice(); 
    this.pedido.totalImpuesto = ivaBreakdown.totalPrecioIVADef; 

    this.pedido.totalPedidoSinDescuento = this.checkPriceScale(); 

    this.pedido.totalPedididoConDescuento = this.pedido.totalPedidoSinDescuento + this.pedido.totalImpuesto + this.pedido.totalEnvio - this.pedido.totalDescuento;

    let opcionSeleccionadaId = this.form.value.opcionSeleccionada;
    let opcionSeleccionada = this.formasPago.filter(formaPago => formaPago.id === opcionSeleccionadaId);

    if (opcionSeleccionada && opcionSeleccionada.length > 0) {
      this.pedido.formaDePago = opcionSeleccionada[0].nombre;
    } else {
      this.pedido.formaDePago = 'N/A'; 
    }
    this.pedido.cuponAplicado = ''; 

    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString) as UserLogged;
      const userLite: UserLite = {
        name: user.name,
        email: user.email,
        nit: user.nit
      };
      this.pedido.asesorAsignado = userLite;
    } else {
      console.warn('Usuario no encontrado en localStorage');
    }

    this.pedido.fechaCreacion = new Date().toISOString();

    const firstCartItemConfig = this.pedido?.carrito?.[0]?.configuracion?.datosEntrega;
    if (firstCartItemConfig?.fechaEntrega) {
      const { year, month, day } = firstCartItemConfig.fechaEntrega;
      this.pedido.fechaEntrega = new Date(year, month === 0 ? 0 : month - 1, day).toISOString();
    } else {
      this.pedido.fechaEntrega = new Date().toISOString(); 
    }

    if (firstCartItemConfig?.horarioEntrega) {
      this.pedido.horarioEntrega = firstCartItemConfig.horarioEntrega;
    } else {
      this.pedido.horarioEntrega = 'N/A'; 
    }

    if (firstCartItemConfig?.formaEntrega) {
      this.pedido.formaEntrega = firstCartItemConfig.formaEntrega;
    } else {
      this.pedido.formaEntrega = 'N/A'; 
    }

    this.comprarYPagar.emit(this.pedido);

  }


}
