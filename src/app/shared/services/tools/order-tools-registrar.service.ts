import { Injectable } from '@angular/core';
import { ToolRegistrar } from './tool-registrar';
import { ToolAdapter } from './tool-adapter';
import { VentasService } from '../ventas/ventas.service';
import { PaymentService } from '../ventas/payment.service';
import { ToastrService } from 'ngx-toastr';
import { Carrito, Pedido, Cliente, Facturacion, Envio, EstadoProceso, EstadoPago, Notas } from '../../../components/ventas/modelo/pedido';
import { CartSingletonService } from "../ventas/cart.singleton.service";
import { MaestroService } from "../maestros/maestro.service";
import { BodegaService } from "../bodegas/bodega.service";
import { InventarioService } from "../inventarios/inventario.service";
import { PedidosUtilService } from '../../../components/ventas/service/pedidos.util.service';
import { Producto } from '../../models/productos/Producto';
import { UserLogged } from '../../models/User/UserLogged';
import { UserLite } from '../../models/User/UserLite';
import { VoiceAgentService } from '../voice-agent.service';


@Injectable({ providedIn: 'root' })
export class OrderToolsRegistrarService implements ToolRegistrar {
  // Estado interno del proceso de venta, ahora usando el modelo Pedido
  private pedidoEnProgreso: Pedido;
  private bodegaSeleccionada: any;
  private productosCatalogo: Producto[] = [];
  private empresaActual: any;
  private allBillingZone: any[] = [];

  constructor(
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private toastr: ToastrService,
    private cartService: CartSingletonService,
    private maestroService: MaestroService,
    private bodegaService: BodegaService,
    private inventarioService: InventarioService,
    private pedidosUtilService: PedidosUtilService,
    private voiceAgentService: VoiceAgentService
  ) {
    console.log('OrderToolsRegistrarService constructor inicializado');
    this.empresaActual = JSON.parse(localStorage.getItem("company") || '{}');
    this.inicializarNuevoPedido();
    this.maestroService.getBillingZone().subscribe(data => {
      this.allBillingZone = data as unknown as any[]; // Asegurar tipado correcto sin advertencia de ArrayBuffer
    });
  }

  private inicializarNuevoPedido(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}') as UserLogged;
    const asesor: UserLite = { name: user.name, email: user.email, nit: user.nit };

    this.pedidoEnProgreso = {
        referencia: `VOICE-REF-${Date.now()}`,
        nroPedido: 'VPI' + Math.floor(Math.random() * 100000), // Venta Por Interfaz
        estadoProceso: EstadoProceso.SinProducir,
        estadoPago: EstadoPago.Pendiente,
        carrito: [],
        company: this.empresaActual.id,
        asesorAsignado: asesor,
        fechaCreacion: new Date().toISOString()
    };
    // Limpiar carrito al iniciar un nuevo pedido
    this.cartService.clearCart();
    this.bodegaSeleccionada = null;
    this.productosCatalogo = [];
    console.log('Nuevo proceso de pedido inicializado.');
    this.voiceAgentService.setVisualSteps(this.getInitialProcessSteps());
  }

  private updateVisualStep(stepName: string) {
    const steps = this.getInitialProcessSteps();
    const stepIndex = steps.findIndex(s => s.caption.toLowerCase().includes(stepName.toLowerCase()));
    if (stepIndex !== -1) {
      this.voiceAgentService.goToStep(stepIndex);
    }
  }

  private getInitialProcessSteps() {
    return [
      {
        imageUrl: 'assets/images/ventas/paso1-catalogo.png',
        caption: '1. Catálogo: Selecciona una ubicación de destino y elige los productos del catálogo'
      },
      {
        imageUrl: 'assets/images/ventas/paso2-carrito.png',
        caption: '2. Carrito y Notas: Revisa tus productos seleccionados y agrega notas al pedido'
      },
      {
        imageUrl: 'assets/images/ventas/paso3-cliente.png',
        caption: '3. Datos Cliente: Busca un cliente existente o crea uno nuevo con sus datos completos'
      },
      {
        imageUrl: 'assets/images/ventas/paso4-facturacion.png',
        caption: '4. Datos de Facturación: Completa la información para la facturación electrónica'
      },
      {
        imageUrl: 'assets/images/ventas/paso5-entrega.png',
        caption: '5. Datos de Entrega: Define la dirección y detalles para la entrega del pedido'
      },
      {
        imageUrl: 'assets/images/ventas/paso6-pago.png',
        caption: '6. Resumen y Pago: Revisa el pedido completo y procede al pago'
      },
      {
        imageUrl: 'assets/images/ventas/paso7-confirmacion.png',
        caption: '7. Confirmación: ¡Venta completada exitosamente!'
      }
    ];
  }

  private _getCartStatus() {
    const cartItems = this.cartService.productInCart.getValue();
    this.pedidoEnProgreso.carrito = cartItems;
    this.pedidosUtilService.pedido = this.pedidoEnProgreso;
    const subtotal = this.pedidosUtilService.getSubtotal();
    return { items: cartItems, count: cartItems.length, subtotal: subtotal };
  }
  private _getProcessStatus(): any {
    const hasWarehouse = !!this.bodegaSeleccionada;
    const hasProducts = this.pedidoEnProgreso.carrito && this.pedidoEnProgreso.carrito.length > 0;
    const hasClient = !!this.pedidoEnProgreso.cliente;
    const hasDeliveryInfo = !!this.pedidoEnProgreso.envio && !!this.pedidoEnProgreso.fechaEntrega && !!this.pedidoEnProgreso.formaEntrega;
    const hasBillingInfo = !!this.pedidoEnProgreso.facturacion;

    let currentStep = 'warehouse_selection';
    let nextStep = 'Seleccionar bodega';

    if (hasWarehouse) {
        currentStep = 'product_selection';
        nextStep = 'Agregar productos al carrito';
        if (hasProducts) {
            currentStep = 'client_info';
            nextStep = 'Configurar información del cliente';
            if (hasClient) {
                currentStep = 'delivery_info';
                nextStep = 'Configurar información de entrega';
                if (hasDeliveryInfo) {
                    currentStep = 'billing_info';
                    nextStep = 'Configurar información de facturación';
                    if (hasBillingInfo) {
                        currentStep = 'ready_for_payment';
                        nextStep = 'Procesar el pago';
                    }
                }
            }
        }
    }
    
    return {
        currentStep,
        completedSteps: {
            warehouse: hasWarehouse,
            products: hasProducts,
            client: hasClient,
            delivery: hasDeliveryInfo,
            billing: hasBillingInfo
        },
        nextStep,
        readyForPayment: hasWarehouse && hasProducts && hasClient && hasDeliveryInfo && hasBillingInfo
    };
  }
  register(adapter: ToolAdapter): void {
    
    // Herramienta para listar bodegas disponibles
    adapter.registerTool(
        {
            name: 'listWarehouses',
            description: 'Lista las bodegas o sucursales disponibles para realizar una venta.',
            parameters: { type: 'object', properties: {} }
        },
        async () => {
            try {
                const bodegas = (await this.bodegaService.getBodegas().toPromise()) || [];
                return { success: true, warehouses: bodegas.map(b => ({id: b.idBodega, nombre: b.nombre})) };
            } catch (error: any) {
                return { success: false, error: `No se pudieron cargar las bodegas: ${error.message}` };
            }
        }
    );
    
    // Herramienta para seleccionar una bodega y cargar su catálogo
    adapter.registerTool(
        {
            name: 'selectWarehouse',
            description: 'Selecciona una bodega para la venta y carga su catálogo de productos.',
            parameters: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string', description: 'El ID de la bodega a seleccionar.' }
                },
                required: ['warehouseId']
            }
        },
        async ({ warehouseId }) => {
            try {
                const bodegas = (await this.bodegaService.getBodegas().toPromise()) || [];
                this.bodegaSeleccionada = bodegas.find(b => b.idBodega === warehouseId);

                if (!this.bodegaSeleccionada) {
                    return { success: false, error: `Bodega con ID ${warehouseId} no encontrada.` };
                }
                
                this.pedidoEnProgreso.bodegaId = this.bodegaSeleccionada.idBodega;
                const inventario: any = await this.inventarioService.obtenerInventarioPorBodega(warehouseId).toPromise();
                this.productosCatalogo = (inventario?.productos || inventario || []).map((item: any) => ({
                    ...item.producto,
                    disponibilidad: {
                        ...item.producto?.disponibilidad,
                        cantidadDisponible: item.cantidad,
                    },
                    bodegaId: item.bodegaId || warehouseId,
                }));

                this.toastr.info(`Catálogo de ${this.bodegaSeleccionada.nombre} cargado.`, 'Bodega Seleccionada');
                this.updateVisualStep('catalogo');

                return { success: true, selectedWarehouse: this.bodegaSeleccionada.nombre, productsLoaded: this.productosCatalogo.length };
            } catch (error: any) {
                return { success: false, error: `Error al seleccionar la bodega: ${error.message}` };
            }
        }
    );

    // Herramienta para buscar productos en el catálogo de la bodega seleccionada
    adapter.registerTool(
      {
        name: 'searchProducts',
        description: 'Busca productos en el catálogo de la bodega actualmente seleccionada.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Término de búsqueda para el nombre del producto.' },
            category: { type: 'string', description: 'Categoría para filtrar los productos.' },
            limit: { type: 'integer', description: 'Número máximo de resultados a devolver.' }
          }
        }
      },
      async ({ query, category, limit }) => {
        if (!this.bodegaSeleccionada) {
            return { success: false, error: "Por favor, selecciona primero una bodega usando la herramienta 'selectWarehouse'." };
        }
        let results: Producto[] = this.productosCatalogo;
        if (query) {
          const q = query.toLowerCase();
          results = results.filter(p => p.crearProducto?.titulo.toLowerCase().includes(q));
        }
        if (category) {
          results = results.filter(p => p.exposicion?.etiquetas?.includes(category));
        }
        if (limit && limit > 0) {
          results = results.slice(0, limit);
        }
        return { success: true, products: results.map(p => ({id: p.cd, nombre: p.crearProducto?.titulo, precio: p.precio?.precioUnitarioConIva})) };
      }
    );

    // Herramienta para añadir un producto al carrito
    adapter.registerTool(
      {
        name: 'addToCart',
        description: 'Añade un producto con una cantidad específica al carrito de compras.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'El ID (cd) del producto a añadir.' },
            quantity: { type: 'integer', default: 1, description: 'La cantidad a añadir.' }
          },
          required: ['productId']
        }
      },
      ({ productId, quantity }) => {
        if (!this.bodegaSeleccionada) {
            return { success: false, error: "Por favor, selecciona primero una bodega." };
        }
        const product = this.productosCatalogo.find(p => p.cd === productId);
        if (!product) {
          return { success: false, error: `Producto con ID '${productId}' no encontrado en el catálogo de la bodega actual.` };
        }
        
        const cantidad = quantity || 1;
        const productoCompra = {
            producto: product,
            configuracion: {
                producto: product,
                datosEntrega: null,
                cantidad,
                preferencias: [],
                adiciones: [],
                tarjetas: []
            },
            cantidad
        };
        this.cartService.addToCart(productoCompra);
        this.pedidoEnProgreso.carrito = this.cartService.productInCart.getValue();
        this.toastr.success(`${product.crearProducto?.titulo} añadido al carrito.`, 'Producto Añadido');
        this.updateVisualStep('carrito');

        return { success: true, ...this._getCartStatus(), processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para obtener el contenido actual del carrito
    adapter.registerTool(
      {
        name: 'getCartContents',
        description: 'Devuelve los productos y cantidades actuales en el carrito de compras.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        return { success: true, ...this._getCartStatus() };
      }
    );
    
    // Herramienta para buscar un cliente
    adapter.registerTool(
        {
            name: 'searchClient',
            description: 'Busca un cliente existente por su número de documento.',
            parameters: {
                type: 'object', properties: { document: { type: 'string', description: 'Número de documento del cliente.'} }, required: ['document']
            }
        },
        async ({ document }) => {
            try {
                const client: any = await this.maestroService.getClientByDocument({documento: document}).toPromise();
                if (client) {
                    this.pedidoEnProgreso.cliente = client;
                    this.toastr.info(`Cliente ${client.nombres_completos} seleccionado.`, 'Cliente Encontrado');
                    this.updateVisualStep('cliente');
                    return { success: true, client: client, processStatus: this._getProcessStatus() };
                } else {
                    return { success: false, error: 'Cliente no encontrado. Se puede crear con la herramienta setClientToOrder.', processStatus: this._getProcessStatus() };
                }
            } catch (error: any) {
                return { success: false, error: `Error al buscar el cliente: ${error.message}`, processStatus: this._getProcessStatus() };
            }
        }
    );

    // Herramienta para asignar/crear un cliente en el pedido
    adapter.registerTool(
      {
        name: 'setClientToOrder',
        description: 'Asigna la información de un cliente nuevo o existente al pedido.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            document: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' }
          },
          required: ['name', 'document', 'email', 'address']
        }
      },
      (args) => {
        this.pedidoEnProgreso.cliente = {
            nombres_completos: args.name,
            documento: args.document,
            correo_electronico_comprador: args.email,
            numero_celular_comprador: args.phone
        };
        
        this.pedidoEnProgreso.envio = { 
            direccionEntrega: args.address,
            nombres: args.name,
            celular: args.phone,
            apellidos: '',
            barrio: '',
            ciudad: '',
            codigoPV: '',
            departamento: '',
            especificacionesInternas: '',
            indicativoCel: '',
            indicativoOtroNumero: '',
            nombreUnidad: '',
            otroNumero: '',
            pais: '',
            observaciones: '',
            alias: '',
            zonaCobro:''
        };

        this.pedidoEnProgreso.facturacion = {
            direccion: args.address,
            nombres: args.name,
            correoElectronico: args.email,
            celular: args.phone,
            documento: args.document,
            tipoDocumento: '',
            codigoPostal: '',
            indicativoCel: '',
            ciudad: '',
            alias: '',
            departamento: '',
            pais: ''
        };

        this.toastr.info(`Datos del cliente ${args.name} asignados al pedido.`, 'Cliente Asignado');
        this.updateVisualStep('cliente');
        return { success: true, clientInfo: this.pedidoEnProgreso.cliente, processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para configurar la información de entrega
    adapter.registerTool(
      {
        name: 'setDeliveryInfo',
        description: 'Guarda la información de entrega para el pedido, como dirección y ciudad.',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            city: { type: 'string' },
            notes: { type: 'string' }
          },
          required: ['address', 'city']
        }
      },
      async (args) => {
        if (!this.pedidoEnProgreso.cliente) {
            return { success: false, error: 'Primero debes asignar un cliente al pedido.' };
        }
        const envio: Envio = {
            ...(this.pedidoEnProgreso.envio as Envio),
            direccionEntrega: args.address,
            ciudad: args.city,
            observaciones: args.notes || '',
        };
        this.pedidoEnProgreso.envio = envio;
        
        this.pedidosUtilService.pedido = this.pedidoEnProgreso;
        this.pedidoEnProgreso.totalEnvio = this.pedidosUtilService.getShippingCost(this.allBillingZone);
        this.toastr.info(`Costo de envío calculado: ${this.pedidoEnProgreso.totalEnvio ?? 0}`, 'Envío');
        this.updateVisualStep('entrega');

        return { success: true, deliveryInfo: this.pedidoEnProgreso.envio, shippingCost: this.pedidoEnProgreso.totalEnvio, processStatus: this._getProcessStatus() };
      }
    );
    
    // Herramienta para obtener el estado actual del pedido en progreso
    adapter.registerTool(
      {
        name: 'getCurrentOrder',
        description: 'Obtiene el estado completo del pedido que se está creando.',
        parameters: { type: 'object', properties: {} }
      },
      () => ({ success: true, order: this.pedidoEnProgreso, processStatus: this._getProcessStatus() })
    );

    // Herramienta para obtener opciones de entrega
    adapter.registerTool(
      {
        name: 'getDeliveryOptions',
        description: 'Obtiene las formas y horarios de entrega disponibles.',
        parameters: { type: 'object', properties: {} }
      },
      async () => {
        try {
          const formasEntrega = await this.maestroService.getFormaEntrega().toPromise();
          const horarios = await this.maestroService.getHorarioEntregas().toPromise();
          return {
            success: true,
            deliveryMethods: (formasEntrega as unknown as any[])?.map(f => f.nombre),
            deliveryTimes: (horarios as unknown as any[])?.map(h => `${h.nombre} (${h.horaInicio} - ${h.horaFin})`)
          };
        } catch (error: any) {
          return { success: false, error: `Error al obtener opciones de entrega: ${error.message}` };
        }
      }
    );

    // Herramienta para configurar detalles de la entrega
    adapter.registerTool(
      {
        name: 'setDeliveryDetails',
        description: 'Configura la fecha, forma y horario de entrega del pedido.',
        parameters: {
          type: 'object',
          properties: {
            deliveryDate: { type: 'string', description: 'Fecha de entrega en formato YYYY-MM-DD.' },
            deliveryMethod: { type: 'string', description: 'Forma de entrega seleccionada (ej. Domicilio, Recoge en tienda).' },
            deliveryTime: { type: 'string', description: 'Horario de entrega seleccionado.' }
          },
          required: ['deliveryDate', 'deliveryMethod', 'deliveryTime']
        }
      },
      (args) => {
        if (!this.pedidoEnProgreso) {
          return { success: false, error: 'No hay un pedido en progreso.' };
        }

        this.pedidoEnProgreso.fechaEntrega = args.deliveryDate;
        this.pedidoEnProgreso.formaEntrega = args.deliveryMethod;
        this.pedidoEnProgreso.horarioEntrega = args.deliveryTime;
        
        this.updateVisualStep('entrega');
        this.toastr.info(`Datos de entrega configurados para el ${args.deliveryDate}.`, 'Entrega Configurada');

        return { success: true, deliveryDetails: { date: args.deliveryDate, method: args.deliveryMethod, time: args.deliveryTime }, processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para procesar y finalizar la venta
    adapter.registerTool(
      {
        name: 'processSale',
        description: 'Procesa el pedido, calcula los totales y lo envía al sistema para su creación final.',
        parameters: {
          type: 'object',
          properties: {
            paymentMethod: { type: 'string', description: 'Método de pago (ej. Efectivo, Wompi).', default: 'Efectivo' },
            notes: { type: 'string', description: 'Notas adicionales para el pedido.' }
          }
        }
      },
      async ({ paymentMethod, notes }) => {
        const cart = this.cartService.productInCart.getValue();
        if (!this.pedidoEnProgreso.cliente || !this.pedidoEnProgreso.envio || !this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
          return { success: false, error: 'Información incompleta. Se requiere cliente, datos de envío y productos en el carrito.' };
        }

        this.pedidoEnProgreso.carrito = cart;
        this.pedidoEnProgreso.formaDePago = paymentMethod || 'Efectivo';
        if (notes) {
            if (!this.pedidoEnProgreso.notasPedido) this.pedidoEnProgreso.notasPedido = {} as any;
            this.pedidoEnProgreso.notasPedido!.notasFacturacionPagos = [{ nota: notes, fecha: new Date().toISOString(), usuario: 'KAI' }];
        }

        // Calcular totales usando el servicio de utilidades
        this.pedidosUtilService.pedido = this.pedidoEnProgreso;
        this.pedidoEnProgreso.subtotal = this.pedidosUtilService.getSubtotal();
        this.pedidoEnProgreso.totalImpuesto = this.pedidosUtilService.checkIVAPrice();
        // El envío ya se calculó en setDeliveryInfo
        this.pedidoEnProgreso.totalPedididoConDescuento = (this.pedidoEnProgreso.subtotal || 0) + (this.pedidoEnProgreso.totalImpuesto || 0) + (this.pedidoEnProgreso.totalEnvio || 0);
        
        try {
          await this.ventasService.validateNroPedido(this.pedidoEnProgreso.nroPedido as string).toPromise();
          const htmlContent = this.paymentService.getHtmlContent(this.pedidoEnProgreso);
          const result = await this.ventasService.createOrder({ order: this.pedidoEnProgreso, emailHtml: htmlContent }).toPromise();
          
          this.toastr.success(`Pedido ${this.pedidoEnProgreso.nroPedido} creado con éxito.`, 'Venta Completada');
          this.updateVisualStep('confirmacion');

          const createdOrder = { ...this.pedidoEnProgreso }; // Guardar copia antes de reiniciar
          this.inicializarNuevoPedido(); // Reiniciar para la siguiente venta
          
          return { success: true, order: result, processStatus: this._getProcessStatus() };
        } catch (e: any) {
          this.toastr.error(e?.message || 'Error desconocido al crear el pedido', 'Error en Creación');
          return { success: false, error: `Error al crear el pedido: ${e?.message}`, processStatus: this._getProcessStatus() };
        }
      }
    );

    // Herramienta para reiniciar el proceso de venta
    adapter.registerTool(
      { name: 'resetSaleProcess', description: 'Cancela la operación actual y reinicia el proceso de venta.', parameters: { type: 'object', properties: {} } },
      () => {
        this.inicializarNuevoPedido();
        this.toastr.warning('El proceso de venta ha sido reiniciado.', 'Proceso Reiniciado');
        return { success: true, message: 'Proceso de venta reiniciado.', processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para gestionar cupones de descuento
    adapter.registerTool(
      {
        name: 'applyCoupon',
        description: 'Aplica un cupón de descuento al pedido actual.',
        parameters: {
          type: 'object',
          properties: {
            couponCode: { type: 'string', description: 'Código del cupón a aplicar.' }
          },
          required: ['couponCode']
        }
      },
      async ({ couponCode }) => {
        try {
          // Validar cupón usando el servicio de ventas
          const cuponValido = await this.ventasService.validateCupon(couponCode).toPromise();
          if (cuponValido) {
            this.pedidoEnProgreso.cuponAplicado = couponCode;
            this.pedidoEnProgreso.porceDescuento = cuponValido.porcentaje || 0;
            this.toastr.success(`Cupón ${couponCode} aplicado correctamente.`, 'Cupón Aplicado');
            return { success: true, coupon: cuponValido, processStatus: this._getProcessStatus() };
          } else {
            return { success: false, error: 'Cupón no válido o expirado.', processStatus: this._getProcessStatus() };
          }
        } catch (error: any) {
          return { success: false, error: `Error al validar cupón: ${error.message}`, processStatus: this._getProcessStatus() };
        }
      }
    );

    // Herramienta para remover cupón
    adapter.registerTool(
      {
        name: 'removeCoupon',
        description: 'Remueve el cupón aplicado del pedido actual.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        this.pedidoEnProgreso.cuponAplicado = undefined;
        this.pedidoEnProgreso.porceDescuento = 0;
        this.toastr.info('Cupón removido del pedido.', 'Cupón Removido');
        return { success: true, message: 'Cupón removido correctamente.', processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para agregar notas al pedido
    adapter.registerTool(
      {
        name: 'addOrderNote',
        description: 'Agrega una nota general al pedido.',
        parameters: {
          type: 'object',
          properties: {
            noteText: { type: 'string', description: 'Texto de la nota a agregar.' },
            noteType: { 
              type: 'string', 
              description: 'Tipo de nota: cliente, produccion, despacho, entrega, facturacion', 
              enum: ['cliente', 'produccion', 'despacho', 'entrega', 'facturacion'] 
            }
          },
          required: ['noteText', 'noteType']
        }
      },
      ({ noteText, noteType }) => {
        if (!this.pedidoEnProgreso.notasPedido) {
          this.pedidoEnProgreso.notasPedido = {
            notasCliente: [],
            notasProduccion: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: []
          };
        }

        const nota = {
          nota: noteText,
          fecha: new Date().toISOString(),
          usuario: 'KAI'
        };

        switch (noteType) {
          case 'cliente':
            this.pedidoEnProgreso.notasPedido.notasCliente.push(nota);
            break;
          case 'produccion':
            this.pedidoEnProgreso.notasPedido.notasProduccion.push(nota);
            break;
          case 'despacho':
            this.pedidoEnProgreso.notasPedido.notasDespachos.push(nota);
            break;
          case 'entrega':
            this.pedidoEnProgreso.notasPedido.notasEntregas.push(nota);
            break;
          case 'facturacion':
            this.pedidoEnProgreso.notasPedido.notasFacturacionPagos.push(nota);
            break;
        }

        this.toastr.info(`Nota de ${noteType} agregada al pedido.`, 'Nota Agregada');
        return { success: true, noteAdded: nota, processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para obtener métodos de pago disponibles
    adapter.registerTool(
      {
        name: 'getPaymentMethods',
        description: 'Obtiene la lista de métodos de pago disponibles.',
        parameters: { type: 'object', properties: {} }
      },
      async () => {
        try {
          const formasPago = await this.maestroService.consultarFormaPago().toPromise();
          return { 
            success: true, 
            paymentMethods: (formasPago as any)?.map((fp: any) => ({ 
              id: fp.id, 
              nombre: fp.nombre, 
              categoria: fp.categoria 
            })) || []
          };
        } catch (error: any) {
          return { success: false, error: `Error al cargar formas de pago: ${error.message}` };
        }
      }
    );

    // Herramienta para validar stock de productos
    adapter.registerTool(
      {
        name: 'validateProductStock',
        description: 'Valida que haya suficiente stock para todos los productos en el carrito.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const cart = this.cartService.productInCart.getValue();
        const stockIssues: any[] = [];

        cart.forEach((item: any) => {
          const stockDisponible = item.producto?.disponibilidad?.cantidadDisponible || 0;
          if (item.cantidad > stockDisponible) {
            stockIssues.push({
              productId: item.producto.cd,
              productName: item.producto.crearProducto?.titulo,
              requested: item.cantidad,
              available: stockDisponible
            });
          }
        });

        if (stockIssues.length > 0) {
          return { 
            success: false, 
            error: 'Stock insuficiente para algunos productos.',
            stockIssues 
          };
        }

        return { success: true, message: 'Stock validado correctamente.' };
      }
    );

    // Herramienta para calcular totales del pedido
    adapter.registerTool(
      {
        name: 'calculateOrderTotals',
        description: 'Calcula todos los totales del pedido (subtotal, impuestos, envío, descuentos).',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        this.pedidosUtilService.pedido = this.pedidoEnProgreso;
        
        const subtotal = this.pedidosUtilService.getSubtotal();
        const impuestos = this.pedidosUtilService.checkIVAPrice();
        const envio = this.pedidoEnProgreso.totalEnvio || 0;
        const descuento = this.pedidoEnProgreso.totalDescuento || 0;
        const total = subtotal + impuestos + envio - descuento;

        this.pedidoEnProgreso.subtotal = subtotal;
        this.pedidoEnProgreso.totalImpuesto = impuestos;
        this.pedidoEnProgreso.totalPedididoConDescuento = total;

        return {
          success: true,
          totals: {
            subtotal,
            impuestos,
            envio,
            descuento,
            total
          }
        };
      }
    );

    // Herramienta para remover producto del carrito
    adapter.registerTool(
      {
        name: 'removeFromCart',
        description: 'Remueve un producto específico del carrito.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'ID del producto a remover.' }
          },
          required: ['productId']
        }
      },
      ({ productId }) => {
        const currentCart = this.cartService.productInCart.getValue();
        const updatedCart = currentCart.filter((item: any) => item.producto.cd !== productId);
        
        this.cartService.productInCart.next(updatedCart);
        this.pedidoEnProgreso.carrito = updatedCart;
        
        this.toastr.info('Producto removido del carrito.', 'Producto Removido');
        return { success: true, ...this._getCartStatus(), processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para actualizar cantidad de producto en carrito
    adapter.registerTool(
      {
        name: 'updateCartQuantity',
        description: 'Actualiza la cantidad de un producto específico en el carrito.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'ID del producto a actualizar.' },
            quantity: { type: 'integer', description: 'Nueva cantidad del producto.' }
          },
          required: ['productId', 'quantity']
        }
      },
      ({ productId, quantity }) => {
        if (quantity <= 0) {
          return { success: false, error: 'La cantidad debe ser mayor a 0.' };
        }

        const currentCart = this.cartService.productInCart.getValue();
        const itemIndex = currentCart.findIndex((item: any) => item.producto.cd === productId);
        
        if (itemIndex === -1) {
          return { success: false, error: 'Producto no encontrado en el carrito.' };
        }

        currentCart[itemIndex].cantidad = quantity;
        this.cartService.productInCart.next(currentCart);
        this.pedidoEnProgreso.carrito = currentCart;
        
        this.toastr.success('Cantidad actualizada en el carrito.', 'Cantidad Actualizada');
        return { success: true, ...this._getCartStatus(), processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para limpiar carrito
    adapter.registerTool(
      {
        name: 'clearCart',
        description: 'Limpia todos los productos del carrito.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        this.cartService.clearCart();
        this.pedidoEnProgreso.carrito = [];
        this.toastr.warning('Carrito limpiado.', 'Carrito Vacío');
        return { success: true, message: 'Carrito limpiado correctamente.', processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para obtener información del proceso actual
    adapter.registerTool(
      {
        name: 'getProcessStatus',
        description: 'Obtiene el estado actual del proceso de venta y los pasos completados.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        return { success: true, status: this._getProcessStatus() };
      }
    );

    // Herramienta para validar pedido antes del pago
    adapter.registerTool(
      {
        name: 'validateOrderBeforePayment',
        description: 'Valida que el pedido esté completo y listo para procesar el pago.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const validationErrors: string[] = [];

        if (!this.bodegaSeleccionada) {
          validationErrors.push('Debe seleccionar una bodega.');
        }

        if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
          validationErrors.push('El carrito está vacío.');
        }

        if (!this.pedidoEnProgreso.cliente) {
          validationErrors.push('Debe configurar la información del cliente.');
        }

        if (!this.pedidoEnProgreso.envio || !this.pedidoEnProgreso.envio.direccionEntrega) {
          validationErrors.push('Debe configurar la información de entrega.');
        }

        if (!this.pedidoEnProgreso.facturacion || !this.pedidoEnProgreso.facturacion.documento) {
          validationErrors.push('Debe configurar la información de facturación.');
        }

        // Validar stock
        const cart = this.cartService.productInCart.getValue();
        cart.forEach((item: any) => {
          const stockDisponible = item.producto?.disponibilidad?.cantidadDisponible || 0;
          if (item.cantidad > stockDisponible) {
            validationErrors.push(`Stock insuficiente para ${item.producto.crearProducto?.titulo}`);
          }
        });

        if (validationErrors.length > 0) {
          return { 
            success: false, 
            errors: validationErrors,
            message: 'El pedido tiene errores que deben corregirse antes del pago.'
          };
        }

        return { 
          success: true, 
          message: 'El pedido está listo para procesar el pago.' 
        };
      }
    );

    // Herramienta para obtener resumen del pedido
    adapter.registerTool(
      {
        name: 'getOrderSummary',
        description: 'Obtiene un resumen completo del pedido actual.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        this.pedidosUtilService.pedido = this.pedidoEnProgreso;
        
        const summary = {
          orderNumber: this.pedidoEnProgreso.nroPedido,
          warehouse: this.bodegaSeleccionada?.nombre || 'No seleccionada',
          client: this.pedidoEnProgreso.cliente?.nombres_completos || 'No configurado',
          itemsCount: this.pedidoEnProgreso.carrito?.length || 0,
          subtotal: this.pedidosUtilService.getSubtotal(),
          taxes: this.pedidosUtilService.checkIVAPrice(),
          shipping: this.pedidoEnProgreso.totalEnvio || 0,
          discount: this.pedidoEnProgreso.totalDescuento || 0,
          total: (this.pedidosUtilService.getSubtotal() + this.pedidosUtilService.checkIVAPrice() + (this.pedidoEnProgreso.totalEnvio || 0) - (this.pedidoEnProgreso.totalDescuento || 0)),
          paymentMethod: this.pedidoEnProgreso.formaDePago || 'No seleccionado',
          deliveryAddress: this.pedidoEnProgreso.envio?.direccionEntrega || 'No configurada',
          status: this.pedidoEnProgreso.estadoProceso,
          paymentStatus: this.pedidoEnProgreso.estadoPago
        };

        return { success: true, summary };
      }
    );

    // Herramienta para configurar información de facturación
    adapter.registerTool(
      {
        name: 'setBillingInfo',
        description: 'Configura la información de facturación para el pedido.',
        parameters: {
          type: 'object',
          properties: {
            documentType: { type: 'string', description: 'Tipo de documento (CC-NIT, PA, TI)' },
            document: { type: 'string', description: 'Número de documento' },
            businessName: { type: 'string', description: 'Razón social o nombre' },
            email: { type: 'string', description: 'Correo electrónico' },
            phone: { type: 'string', description: 'Teléfono' },
            address: { type: 'string', description: 'Dirección de facturación' },
            city: { type: 'string', description: 'Ciudad' },
            alias: { type: 'string', description: 'Alias para los datos de facturación' }
          },
          required: ['documentType', 'document', 'businessName', 'email', 'address', 'city']
        }
      },
      (args) => {
        this.pedidoEnProgreso.facturacion = {
          tipoDocumento: args.documentType,
          documento: args.document,
          nombres: args.businessName,
          correoElectronico: args.email,
          celular: args.phone || '',
          direccion: args.address,
          ciudad: args.city,
          alias: args.alias || 'Principal',
          codigoPostal: '',
          indicativoCel: '57',
          departamento: '',
          pais: 'Colombia'
        };

        this.toastr.success('Información de facturación configurada.', 'Facturación');
        this.updateVisualStep('facturacion');
        return { success: true, billingInfo: this.pedidoEnProgreso.facturacion, processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para obtener ciudades de entrega disponibles
    adapter.registerTool(
      {
        name: 'getDeliveryCities',
        description: 'Obtiene la lista de ciudades disponibles para entrega.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        try {
          const ciudades = this.empresaActual?.ciudadess?.ciudadesEntrega || [];
          return { 
            success: true, 
            cities: ciudades.map((ciudad: any) => ({
              value: ciudad.value,
              label: ciudad.label
            }))
          };
        } catch (error: any) {
          return { success: false, error: `Error al obtener ciudades: ${error.message}` };
        }
      }
    );

    // Herramienta para seleccionar ciudad de entrega
    adapter.registerTool(
      {
        name: 'selectDeliveryCity',
        description: 'Selecciona una ciudad específica para la entrega.',
        parameters: {
          type: 'object',
          properties: {
            cityValue: { type: 'string', description: 'Valor de la ciudad seleccionada' }
          },
          required: ['cityValue']
        }
      },
      ({ cityValue }) => {
        // Actualizar la ciudad seleccionada en el pedido
        if (this.pedidoEnProgreso.envio) {
          this.pedidoEnProgreso.envio.ciudad = cityValue;
        }
        
        this.toastr.info(`Ciudad de entrega seleccionada: ${cityValue}`, 'Ciudad Seleccionada');
        return { success: true, selectedCity: cityValue, processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para agregar notas específicas por tipo (como en crear-ventas)
    adapter.registerTool(
      {
        name: 'addClientNote',
        description: 'Agrega una nota específica para el cliente en el pedido.',
        parameters: {
          type: 'object',
          properties: {
            noteText: { type: 'string', description: 'Texto de la nota para el cliente.' }
          },
          required: ['noteText']
        }
      },
      ({ noteText }) => {
        if (!this.pedidoEnProgreso.notasPedido) {
          this.pedidoEnProgreso.notasPedido = {
            notasCliente: [],
            notasProduccion: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: []
          };
        }

        const nota = {
          nota: noteText,
          fecha: new Date().toISOString(),
          usuario: 'KAI'
        };

        this.pedidoEnProgreso.notasPedido.notasCliente.push(nota);
        this.toastr.success('Nota del cliente agregada.', 'Nota Agregada');
        return { success: true, noteAdded: nota, processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para verificar si el proceso está completo (como reviewStepAndExecute)
    adapter.registerTool(
      {
        name: 'validateOrderCompletion',
        description: 'Valida que el pedido esté completo y listo para finalizar.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const validationErrors: string[] = [];
        const warnings: string[] = [];

        // Validación de bodega
        if (!this.bodegaSeleccionada) {
          validationErrors.push('Debe seleccionar una bodega');
        }

        // Validación de productos en carrito
        if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
          validationErrors.push('Debe agregar productos al carrito');
        }

        // Validación de cliente
        if (!this.pedidoEnProgreso.cliente) {
          validationErrors.push('Debe configurar los datos del cliente');
        }

        // Validación de envío (considerando si es recogida en tienda)
        const esRecogeEnTienda = this.pedidoEnProgreso.formaEntrega?.toLowerCase().includes('recoge');
        if (!esRecogeEnTienda && !this.pedidoEnProgreso.envio) {
          validationErrors.push('Debe configurar los datos de envío');
        } else if (esRecogeEnTienda) {
          warnings.push('Pedido configurado para recogida en tienda');
        }

        // Validación de facturación
        if (!this.pedidoEnProgreso.facturacion) {
          validationErrors.push('Debe configurar los datos de facturación');
        }

        // Validación de forma de pago
        if (!this.pedidoEnProgreso.formaDePago) {
          warnings.push('No se ha seleccionado forma de pago');
        }

        const isComplete = validationErrors.length === 0;
        
        return {
          success: true,
          isComplete,
          validationErrors,
          warnings,
          message: isComplete ? 'El pedido está completo y listo para procesar' : 'Hay errores que deben corregirse'
        };
      }
    );

    // Herramienta para configurar forma de entrega (recoge/envío)
    adapter.registerTool(
      {
        name: 'setDeliveryMethod',
        description: 'Configura el método de entrega (envío a domicilio o recogida en tienda).',
        parameters: {
          type: 'object',
          properties: {
            deliveryMethod: { 
              type: 'string', 
              description: 'Método de entrega: "Envío" o "Recoge"',
              enum: ['Envío', 'Recoge']
            }
          },
          required: ['deliveryMethod']
        }
      },
      ({ deliveryMethod }) => {
        this.pedidoEnProgreso.formaEntrega = deliveryMethod;
        
        // Si es recogida en tienda, configurar datos de envío mínimos
        if (deliveryMethod.toLowerCase().includes('recoge')) {
          this.pedidoEnProgreso.envio = {
            alias: 'Recoge',
            nombres: 'N/A',
            apellidos: 'N/A',
            indicativoCel: 'N/A',
            celular: 'N/A',
            indicativoOtroNumero: 'N/A',
            otroNumero: 'N/A',
            direccionEntrega: 'N/A',
            observaciones: 'Recogida en tienda',
            barrio: 'N/A',
            nombreUnidad: 'N/A',
            especificacionesInternas: 'N/A',
            pais: 'N/A',
            departamento: 'N/A',
            ciudad: 'N/A',
            zonaCobro: 'N/A',
            codigoPV: 'N/A'
          };
          this.pedidoEnProgreso.totalEnvio = 0; // Sin costo de envío para recogida
        }

        this.toastr.info(`Forma de entrega configurada: ${deliveryMethod}`, 'Entrega');
        return { success: true, deliveryMethod: deliveryMethod, isPickup: deliveryMethod.toLowerCase().includes('recoge'), processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para obtener datos del cliente existente desde localStorage
    adapter.registerTool(
      {
        name: 'loadClientFromCache',
        description: 'Carga los datos del cliente desde el caché local si existe.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        try {
          const cachedClient = localStorage.getItem('currentClient');
          if (cachedClient) {
            const clientData = JSON.parse(cachedClient);
            this.pedidoEnProgreso.cliente = clientData;
            this.toastr.success(`Cliente ${clientData.nombres_completos} cargado desde caché.`, 'Cliente Cargado');
            return { success: true, client: clientData, processStatus: this._getProcessStatus() };
          } else {
            return { success: false, message: 'No hay cliente en caché', processStatus: this._getProcessStatus() };
          }
        } catch (error: any) {
          return { success: false, error: `Error al cargar cliente: ${error.message}`, processStatus: this._getProcessStatus() };
        }
      }
    );

    // Herramienta para limpiar y reiniciar completamente el pedido
    adapter.registerTool(
      {
        name: 'clearCompleteOrder',
        description: 'Limpia completamente el pedido y reinicia todo el proceso (equivalente a limpiarCacheCompleto).',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        // Limpiar localStorage
        localStorage.removeItem('carrito');
        localStorage.removeItem('currentClient');
        localStorage.removeItem('currentOrder');
        
        // Reinicializar pedido
        this.inicializarNuevoPedido();
        
        // Limpiar carrito del servicio
        this.cartService.clearCart();
        
        this.toastr.warning('Todo el proceso de venta ha sido limpiado y reiniciado.', 'Proceso Reiniciado');
        return { success: true, message: 'Proceso completamente reiniciado', processStatus: this._getProcessStatus() };
      }
    );

    // Herramienta para manejar el estado del pedido según productos
    adapter.registerTool(
      {
        name: 'updateOrderStatus',
        description: 'Actualiza el estado del pedido basado en los productos y la configuración actual.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        // Lógica similar a cambiarEstadoSegunLosProductos() en crear-ventas
        let estadoCalculado = EstadoProceso.SinProducir;
        
        if (this.pedidoEnProgreso.carrito && this.pedidoEnProgreso.carrito.length > 0) {
          // Verificar si todos los productos están producidos
          const todosProducidos = this.pedidoEnProgreso.carrito.every(item => 
            item.estadoProcesoProducto === EstadoProceso.Producido || 
            item.estadoProcesoProducto === EstadoProceso.ProducidoTotalmente
          );
          
          if (todosProducidos) {
            estadoCalculado = EstadoProceso.ProducidoTotalmente;
          } else {
            // Verificar si algunos están producidos
            const algunosProducidos = this.pedidoEnProgreso.carrito.some(item => 
              item.estadoProcesoProducto === EstadoProceso.Producido || 
              item.estadoProcesoProducto === EstadoProceso.ProducidoTotalmente
            );
            
            if (algunosProducidos) {
              estadoCalculado = EstadoProceso.ProducidoParcialmente;
            }
          }
        }
        
        this.pedidoEnProgreso.estadoProceso = estadoCalculado;
        this.toastr.info(`Estado del pedido actualizado: ${estadoCalculado}`, 'Estado Actualizado');
        
        return { 
          success: true, 
          newStatus: estadoCalculado,
          message: `Pedido actualizado a: ${estadoCalculado}`
        };
      }
    );
  }
} 