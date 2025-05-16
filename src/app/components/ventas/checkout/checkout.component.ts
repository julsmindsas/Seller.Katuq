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
    // Inicializar el pedido en el servicio
    if (this.pedido) {
      this.pedidoUtilService.pedido = this.pedido;
    }
    
    // Asegurarse de que allBillingZone está inicializado
    if (!this.allBillingZone) {
      this.service.getBillingZone().subscribe({
        next: (zonas) => {
          // Verificar y convertir la respuesta para asegurar que sea un array
          if (zonas) {
            // Si es un ArrayBuffer, convertirlo primero a string y luego a JSON
            if (zonas instanceof ArrayBuffer) {
              const decoder = new TextDecoder();
              const jsonStr = decoder.decode(zonas);
              try {
                this.allBillingZone = JSON.parse(jsonStr);
              } catch (e) {
                console.error('Error al parsear zonas de cobro:', e);
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
                console.error('Error al parsear string de zonas:', e);
                this.allBillingZone = [];
              }
            } else {
              // Si no es ninguno de los anteriores, intentar convertirlo a array
              try {
                this.allBillingZone = Array.isArray(zonas) ? zonas : [];
              } catch (e) {
                console.error('Error al procesar zonas de cobro:', e);
                this.allBillingZone = [];
              }
            }
          } else {
            this.allBillingZone = [];
          }
          this.ref.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar zonas de cobro:', err);
          this.allBillingZone = [];
        }
      });
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

    // Asegurarse que pedidoUtilService tiene la referencia correcta del pedido
    this.pedidoUtilService.pedido = this.pedido;
    
    // Calcular valores monetarios del pedido
    this.pedido.totalDescuento = this.pedidoUtilService.getDiscount();
    this.pedido.totalEnvio = this.pedidoUtilService.getShippingCost(this.allBillingZone);

    // Calcular impuestos
    const ivaBreakdown = this.checkIVAPrice(); 
    this.pedido.totalImpuesto = ivaBreakdown.totalPrecioIVADef; 

    // Calcular subtotal y total
    this.pedido.totalPedidoSinDescuento = this.checkPriceScale(); 
    this.pedido.subtotal = this.pedido.totalPedidoSinDescuento; // Asegurar que subtotal esté explícitamente definido
    this.pedido.totalPedididoConDescuento = this.pedido.totalPedidoSinDescuento + this.pedido.totalImpuesto + this.pedido.totalEnvio - this.pedido.totalDescuento;

    // Asignar forma de pago
    let opcionSeleccionadaId = this.form.value.opcionSeleccionada;
    let opcionSeleccionada = this.formasPago?.filter(formaPago => formaPago.id === opcionSeleccionadaId);

    if (opcionSeleccionada && opcionSeleccionada.length > 0) {
      this.pedido.formaDePago = opcionSeleccionada[0].nombre;
    } else {
      this.pedido.formaDePago = 'N/A'; 
    }
    
    // Información adicional
    this.pedido.cuponAplicado = ''; 
    this.pedido.anticipo = 0; // Valor por defecto
    this.pedido.faltaPorPagar = this.pedido.totalPedididoConDescuento; // Por defecto, falta todo por pagar
    
    // Asignar asesor desde localStorage
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString) as UserLogged;
        const userLite: UserLite = {
          name: user.name,
          email: user.email,
          nit: user.nit
        };
        this.pedido.asesorAsignado = userLite;
      } catch (e) {
        console.warn('Error al parsear usuario del localStorage:', e);
      }
    }

    // Asignar fechas
    this.pedido.fechaCreacion = new Date().toISOString();

    // Información de entrega desde los productos
    const firstCartItemConfig = this.pedido?.carrito?.[0]?.configuracion?.datosEntrega;
    
    // Fecha de entrega
    if (firstCartItemConfig?.fechaEntrega) {
      const { year, month, day } = firstCartItemConfig.fechaEntrega;
      this.pedido.fechaEntrega = new Date(year, month === 0 ? 0 : month - 1, day).toISOString();
    } else {
      // Usar fecha actual + 3 días como fecha de entrega por defecto
      const fechaEntrega = new Date();
      fechaEntrega.setDate(fechaEntrega.getDate() + 3);
      this.pedido.fechaEntrega = fechaEntrega.toISOString(); 
    }

    // Horario de entrega
    if (firstCartItemConfig?.horarioEntrega) {
      this.pedido.horarioEntrega = firstCartItemConfig.horarioEntrega;
    } else {
      this.pedido.horarioEntrega = 'Horario laboral'; // Valor predeterminado más descriptivo
    }

    // Forma de entrega
    if (firstCartItemConfig?.formaEntrega) {
      this.pedido.formaEntrega = firstCartItemConfig.formaEntrega;
    } else if (this.pedido.envio?.zonaCobro) {
      this.pedido.formaEntrega = 'Domicilio'; // Si hay zona de cobro, asumir domicilio
    } else {
      this.pedido.formaEntrega = 'Por definir'; // Valor predeterminado más descriptivo
    }

    // Verificaciones adicionales para evitar errores en el email
    // Asegurar que los objetos anidados existen
    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasProduccion: [],
        notasFacturacionPagos: []
      };
    }

    // Verificar que existan datos de envío y facturación
    if (!this.pedido.envio) {
      console.warn('Datos de envío faltantes al procesar pago');
    }
    
    if (!this.pedido.facturacion) {
      console.warn('Datos de facturación faltantes al procesar pago');
    }
    
    // Asegurar que el carrito existe y tiene elementos
    if (!this.pedido.carrito || this.pedido.carrito.length === 0) {
      console.warn('Carrito vacío al procesar pago');
    }

    // Hacer una copia profunda del pedido antes de emitirlo para evitar referencias
    const pedidoFinal = JSON.parse(JSON.stringify(this.pedido));
    
    // Emitir el evento con todos los datos completos
    console.log('Pedido final a procesar:', pedidoFinal);
    this.comprarYPagar.emit(pedidoFinal);
  }


}
