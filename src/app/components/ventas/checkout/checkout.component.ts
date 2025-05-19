import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Pedido } from '../modelo/pedido';
import { CartSingletonService } from 'src/app/shared/services/ventas/cart.singleton.service';
import { PaymentService } from 'src/app/shared/services/ventas/payment.service';
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

  // Formularios y datos generales
  public checkoutForm: UntypedFormGroup;
  form = new FormGroup({
    opcionSeleccionada: new FormControl('edo-ani', Validators.required)
  });
  
  // Control del acordeón
  activeStep: string = 'cliente'; // Estado de acordeón activo por defecto
  
  // Control de pestañas de pago
  activePaymentTab: string = ''; // Categoría de pago activa
  
  // Keys y datos de API
  pub_key: string;
  signature: string;
  
  // Datos de pago
  formasPago: any[] = [];
  categoriasFormasPago: { categoria: string; formasPago: any[]; }[] = [];
  
  // Estado del proceso de pago
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  
  // Emite el evento de comprar y pagar al componente padre
  @Output() comprarYPagar = new EventEmitter<any>();

  // Datos del pedido recibidos del componente padre
  @Input()
  public pedido: Pedido;

  // Zonas de cobro
  @Input()
  allBillingZone: any[] = [];
  
  // Cálculos de precio
  precioproducto: any;

  /**
   * Constructor del componente
   */
  constructor(
    private fb: UntypedFormBuilder, 
    private ref: ChangeDetectorRef,
    private singleton: CartSingletonService, 
    private payment: PaymentService, 
    private service: MaestroService,
    public pedidoUtilService: PedidosUtilService
  ) {
    // Cargar las formas de pago disponibles
    this.cargarFormasPago();
    
    // Asignar la llave pública de Wompi
    this.pub_key = environment.wompi.public_key;
  }
  
  /**
   * Maneja la navegación del acordeón
   * @param step El paso del acordeón a activar
   */
  toggleStep(step: string): void {
    this.activeStep = this.activeStep === step ? '' : step;
    this.ref.detectChanges();
  }
  
  /**
   * Establece la pestaña activa para formas de pago
   * @param categoria La categoría a activar
   */
  setActivePaymentTab(categoria: string): void {
    this.activePaymentTab = categoria;
    this.ref.detectChanges();
  }
  
  /**
   * Retorna el icono adecuado para una categoría de pago
   * @param categoria Nombre de la categoría
   * @returns Clase CSS para el icono FontAwesome
   */
  getPaymentCategoryIcon(categoria: string): string {
    switch (categoria.toLowerCase()) {
      case 'online':
        return 'fa fa-globe';
      case 'offline':
        return 'fa fa-store';
      case 'billeteras virtuales':
        return 'fa fa-wallet';
      case 'criptomonedas':
        return 'fab fa-bitcoin';
      case 'pago a crédito':
        return 'fa fa-credit-card';
      case 'envío de dinero a colombia':
        return 'fa fa-money-bill-wave';
      default:
        return 'fa fa-credit-card';
    }
  }
  
  /**
   * Retorna el icono adecuado para un método de pago
   * @param metodo Nombre del método de pago
   * @returns Clase CSS para el icono FontAwesome
   */
  getPaymentMethodIcon(metodo: string): string {
    const nombre = metodo.toLowerCase();
    
    if (nombre.includes('credit') || nombre.includes('crédito') || nombre.includes('visa') || nombre.includes('mastercard')) {
      return 'fa fa-credit-card';
    } else if (nombre.includes('debit') || nombre.includes('débito')) {
      return 'fa fa-credit-card';
    } else if (nombre.includes('paypal')) {
      return 'fab fa-paypal';
    } else if (nombre.includes('efectivo') || nombre.includes('cash')) {
      return 'fa fa-money-bill';
    } else if (nombre.includes('transferencia') || nombre.includes('transfer')) {
      return 'fa fa-exchange-alt';
    } else if (nombre.includes('bitcoin') || nombre.includes('crypto')) {
      return 'fab fa-bitcoin';
    } else if (nombre.includes('wallet') || nombre.includes('nequi') || nombre.includes('daviplata')) {
      return 'fa fa-wallet';
    } else if (nombre.includes('giro') || nombre.includes('internacional')) {
      return 'fa fa-globe';
    } else if (nombre.includes('contra entrega') || nombre.includes('delivery')) {
      return 'fa fa-box';
    } else if (nombre.includes('wompi') || nombre.includes('pagos')) {
      return 'fa fa-money-check-alt';
    } else if (nombre.includes('pse')) {
      return 'fa fa-university';
    } else {
      return 'fa fa-money-bill-alt';
    }
  }
  
  /**
   * Detecta si todos los datos del cliente son válidos
   */
  get clienteCompleto(): boolean {
    return !!(
      this.pedido?.cliente?.nombres_completos && 
      this.pedido?.cliente?.apellidos_completos &&
      this.pedido?.cliente?.documento &&
      this.pedido?.cliente?.correo_electronico_comprador
    );
  }
  
  /**
   * Detecta si todos los datos de envío son válidos
   */
  get envioCompleto(): boolean {
    return !!(
      this.pedido?.envio?.direccionEntrega && 
      this.pedido?.envio?.ciudad &&
      this.pedido?.envio?.celular
    );
  }
  
  /**
   * Detecta si todos los datos de facturación son válidos
   */
  get facturacionCompleta(): boolean {
    return !!(
      this.pedido?.facturacion?.nombres && 
      this.pedido?.facturacion?.documento &&
      this.pedido?.facturacion?.direccion
    );
  }
  
  /**
   * Carga las formas de pago disponibles
   */
  private cargarFormasPago(): void {
    this.service.consultarFormaPago().subscribe({
      next: (response: any) => {
        this.formasPago = response as any[];
        
        // Agrupar por categoría
        this.agruparFormasPagoPorCategoria();
        
        // Establecer la categoría activa por defecto (la primera)
        if (this.categoriasFormasPago.length > 0) {
          this.activePaymentTab = this.categoriasFormasPago[0].categoria;
        }
        
        // Establecer una opción por defecto si hay disponible
        if (this.formasPago && this.formasPago.length > 0) {
          this.form.get('opcionSeleccionada')?.setValue(this.formasPago[0].id);
        }
        
        this.ref.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar formas de pago:', error);
        this.paymentError = 'No se pudieron cargar las formas de pago. Por favor, intente de nuevo.';
      }
    });
  }
  
  /**
   * Agrupa las formas de pago por categoría
   */
  private agruparFormasPagoPorCategoria(): void {
    const formasPagoOnline = this.formasPago.filter(formaPago => formaPago.online === 'Online');
    const formasPagoOffline = this.formasPago.filter(formaPago => formaPago.online && formaPago.online.includes('Offline'));
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
    ].filter(categoria => categoria.formasPago && categoria.formasPago.length > 0); // Solo mostrar categorías con opciones
  }
  
  /**
   * Se ejecuta cuando cambian las propiedades de entrada
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia el pedido, actualizar la referencia
    if (changes['pedido'] && changes['pedido'].currentValue) {
      this.pedido = { ...this.pedido };
      this.pedidoUtilService.pedido = this.pedido;
      
      // Refrescar carrito
      this.actualizarCarrito();
      
      // Determinar el paso del acordeón inicial basado en datos del pedido
      this.determinarPasoInicial();
    }
    
    // Si cambian las zonas de cobro, actualizar cálculos
    if (changes['allBillingZone'] && changes['allBillingZone'].currentValue) {
      this.ref.detectChanges();
    }
  }
  
  /**
   * Determina el paso inicial del acordeón basado en los datos del pedido
   */
  private determinarPasoInicial(): void {
    if (!this.clienteCompleto) {
      this.activeStep = 'cliente';
    } else if (!this.envioCompleto) {
      this.activeStep = 'envio';
    } else if (!this.facturacionCompleta) {
      this.activeStep = 'facturacion';
    } else {
      this.activeStep = 'entrega';
    }
    this.ref.detectChanges();
  }
  
  /**
   * Actualiza los datos del carrito desde el servicio
   */
  private actualizarCarrito(): void {
    this.singleton.refreshCart().subscribe({
      next: (data: any[]) => {
        if (this.pedido) {
          this.pedido.carrito = data;
          this.pedido.carrito = [...this.pedido.carrito];
          this.ref.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error al actualizar el carrito:', error);
      }
    });
  }

  /**
   * Maneja el envío del formulario (no utilizado actualmente)
   */
  onSubmit() {
    // Método para uso futuro
  }

  /**
   * Se ejecuta al iniciar el componente
   */
  ngOnInit() {
    // Inicializar el pedido en el servicio
    if (this.pedido) {
      this.pedidoUtilService.pedido = this.pedido;
    }
    
    // Asegurarse de que allBillingZone está inicializado
    if (!this.allBillingZone || this.allBillingZone.length === 0) {
      this.cargarZonasDeCobro();
    }
    
    // Determinar el paso inicial del acordeón
    setTimeout(() => {
      this.determinarPasoInicial();
    }, 100);
  }
  
  /**
   * Carga las zonas de cobro desde el servicio
   */
  private cargarZonasDeCobro(): void {
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

  /**
   * Obtiene el precio unitario sin IVA con escala de volumen
   */
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

  /**
   * Calcula el precio de un producto específico considerando cantidad, adiciones y preferencias
   */
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

  /**
   * Calcula el precio total sin IVA de todos los productos
   */
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
  
  /**
   * Calcula el desglose del IVA por categoría (0%, 5%, 8%, 19%)
   */
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

  /**
   * Procesa el pago y emite el evento al componente padre
   */
  async gotToPaymentOrder() {
    if (!this.pedido) {
      console.error("Pedido no inicializado en gotToPaymentOrder");
      this.mostrarError("No se pudo procesar el pedido. Por favor, intente de nuevo.");
      return; 
    }
    
    // Verificar forma de pago seleccionada
    if (!this.form.valid) {
      this.mostrarError("Por favor, seleccione una forma de pago.");
      return;
    }
    
    // Evitar múltiples clicks
    if (this.isProcessingPayment) {
      return;
    }
    
    // Iniciar procesamiento
    this.isProcessingPayment = true;
    this.paymentError = null;

    try {
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
      this.asignarAsesorDesdeLocalStorage();

      // Asignar fechas
      this.pedido.fechaCreacion = new Date().toISOString();

      // Información de entrega desde los productos
      this.asignarDatosEntregaDesdePedido();

      // Verificaciones adicionales para evitar errores en el email
      this.verificarIntegridadObjetos();
      
      // Hacer una copia profunda del pedido antes de emitirlo para evitar referencias
      const pedidoFinal = JSON.parse(JSON.stringify(this.pedido));
      
      // Emitir el evento con todos los datos completos
      console.log('Pedido final a procesar:', pedidoFinal);
      this.comprarYPagar.emit(pedidoFinal);
      
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      this.mostrarError("Se produjo un error al procesar su pago. Por favor, intente de nuevo.");
    } finally {
      // Finalizar procesamiento (puede ser reactivado si el componente padre lo requiere)
      setTimeout(() => {
        this.isProcessingPayment = false;
        this.ref.detectChanges();
      }, 1000);
    }
  }
  
  /**
   * Asigna el asesor al pedido desde el localStorage
   */
  private asignarAsesorDesdeLocalStorage(): void {
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
  }
  
  /**
   * Asigna datos de entrega desde la configuración del pedido
   */
  private asignarDatosEntregaDesdePedido(): void {
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
  }
  
  /**
   * Verifica la integridad de objetos para evitar errores
   */
  private verificarIntegridadObjetos(): void {
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
  }
  
  /**
   * Muestra un mensaje de error
   */
  private mostrarError(mensaje: string): void {
    this.paymentError = mensaje;
    this.isProcessingPayment = false;
    this.ref.detectChanges();
    
    // Limpiar el error después de unos segundos
    setTimeout(() => {
      this.paymentError = null;
      this.ref.detectChanges();
    }, 5000);
  }

  /**
   * Obtiene la fecha de entrega estimada formateada
   */
  get fechaEntregaEstimada(): string {
    if (this.pedido?.carrito?.[0]?.configuracion?.datosEntrega?.fechaEntrega) {
      const { day, month, year } = this.pedido.carrito[0].configuracion.datosEntrega.fechaEntrega;
      return `${day}/${month}/${year}`;
    }
    
    // Si no hay fecha, devolver fecha actual + 3 días
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 3);
    return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
  }
  
  /**
   * Verifica si el pedido tiene datos válidos para procesar
   */
  get pedidoValido(): boolean {
    return !!(
      this.pedido && 
      this.pedido.cliente && 
      this.pedido.envio && 
      this.pedido.facturacion && 
      this.pedido.carrito && 
      this.pedido.carrito.length > 0
    );
  }
}
