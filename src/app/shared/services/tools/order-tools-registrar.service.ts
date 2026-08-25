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
  private pasoActual: number = 1; // Paso actual del proceso (1-8)

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

  /**
   * Bodega activa real: la elegida vía tools o la que el vendedor eligió en la
   * pantalla de venta asistida (localStorage['warehouse'], escrita por
   * CrearVentasComponent.onWarehouseChange).
   */
  private getBodegaActual(): any | null {
    if (this.bodegaSeleccionada) return this.bodegaSeleccionada;
    try {
      return JSON.parse(localStorage.getItem('warehouse') || 'null');
    } catch {
      return null;
    }
  }

  /** Stock de un producto en la bodega activa: los ítems de la UI traen stockPorBodega; los de las tools, disponibilidad.cantidadDisponible. */
  private getStockEnBodega(p: any, idBodega?: string): number {
    const bodega = idBodega || this.getBodegaActual()?.idBodega;
    if (p?.stockPorBodega && bodega && p.stockPorBodega[bodega] !== undefined) {
      return p.stockPorBodega[bodega];
    }
    return p?.disponibilidad?.cantidadDisponible ?? 0;
  }

  /**
   * Los 6 pasos REALES del wizard de crear-ventas (aw-wizard en
   * crear-ventas.component.html): cliente primero, envío y facturación son un
   * solo paso con pestañas. Única fuente de verdad para todas las tools de pasos.
   */
  private getWizardStepsReales(): Array<{ number: number; name: string; key: string; completed: boolean; current: boolean; description: string }> {
    const cart = this.cartService.productInCart.getValue() || [];
    const steps = [
      { number: 1, name: 'Selección de Cliente', key: 'cliente', completed: !!this.pedidoEnProgreso.cliente, description: 'Seleccionar o crear el cliente del pedido' },
      { number: 2, name: 'Selección de Productos', key: 'productos', completed: cart.length > 0, description: 'Buscar productos y agregarlos al carrito' },
      { number: 3, name: 'Carrito y Notas', key: 'carrito', completed: cart.length > 0, description: 'Revisar el carrito y agregar notas del pedido' },
      { number: 4, name: 'Envío y Facturación', key: 'envio-facturacion', completed: !!this.pedidoEnProgreso.envio?.direccionEntrega && !!this.pedidoEnProgreso.facturacion, description: 'Configurar entrega y datos de facturación (un paso con dos pestañas)' },
      { number: 5, name: 'Resumen y Pago', key: 'pago', completed: !!this.pedidoEnProgreso.formaDePago, description: 'Revisar totales y elegir método de pago' },
      { number: 6, name: 'Confirmación', key: 'confirmacion', completed: !!this.pedidoEnProgreso._id, description: 'Pedido creado y confirmado' }
    ];
    return steps.map(s => ({ ...s, current: this.pasoActual === s.number }));
  }

  private inicializarNuevoPedido(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}') as UserLogged;
    const asesor: UserLite = { name: user.name, email: user.email, nit: user.nit };

    this.pasoActual = 1; // Reiniciar al primer paso

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
    let stepIndex = -1;
    
    // Mapeo mejorado de acciones a pasos visuales (basado en el wizard real)
    const stepMapping: { [key: string]: number } = {
      // Paso 1: Productos/Catálogo
      'productos': 0,
      'catalogo': 0,
      'bodega': 0,
      'warehouse': 0,
      'producto': 0,
      'catalog': 0,
      
      // Paso 2: Carrito
      'carrito': 1,
      'cart': 1,
      'notas': 1,
      'notes': 1,
      
      // Paso 3: Cliente
      'cliente': 2,
      'client': 2,
      'customer': 2,
      'datos_cliente': 2,
      
      // Paso 4: Envío/Entrega
      'envio': 3,
      'entrega': 3,
      'delivery': 3,
      'shipping': 3,
      'direccion': 3,
      'address': 3,
      
      // Paso 5: Facturación
      'facturacion': 4,
      'billing': 4,
      'factura': 4,
      'invoice': 4,
      
      // Paso 6: Pago/Resumen
      'pago': 5,
      'payment': 5,
      'resumen': 5,
      'summary': 5,
      'checkout': 5,
      
      // Paso 7: Confirmación
      'confirmacion': 6,
      'confirmation': 6,
      'confirmed': 6,
      'finalizado': 6,
      'completed': 6
    };
    
    // Buscar por mapeo directo primero
    stepIndex = stepMapping[stepName.toLowerCase()];
    
    // Si no se encuentra, buscar por stepKey en los pasos
    if (stepIndex === undefined || stepIndex === -1) {
      stepIndex = steps.findIndex(s => s.stepKey === stepName.toLowerCase());
    }
    
    // Si aún no se encuentra, buscar por contenido de caption
    if (stepIndex === undefined || stepIndex === -1) {
      stepIndex = steps.findIndex(s => s.caption.toLowerCase().includes(stepName.toLowerCase()));
    }
    
    if (stepIndex !== -1 && stepIndex < steps.length) {
      this.voiceAgentService.goToStep(stepIndex);
      
      // Actualizar el paso basado en el estado actual del proceso
      const processStatus = this._getProcessStatus();
      const completionPercentage = this.calculateCompletionPercentage(processStatus);
      
      // Agregar información contextual al paso visual
      const updatedSteps = steps.map((step, index) => {
        if (index === stepIndex) {
          return {
            ...step,
            caption: `${step.caption.replace(' ✅', '')} ✅`,
            completed: true,
            active: true
          };
        } else if (index < stepIndex) {
          return {
            ...step,
            caption: step.caption.replace(' ✅', '') + ' ✅',
            completed: true,
            active: false
          };
        } else {
          return {
            ...step,
            caption: step.caption.replace(' ✅', ''),
            completed: false,
            active: false
          };
        }
      });
      
      this.voiceAgentService.setVisualSteps(updatedSteps);
      
      console.log(`📍 Paso visual actualizado: ${stepName} (índice ${stepIndex}) - Progreso: ${completionPercentage}%`);
    } else {
      console.warn(`⚠️ No se pudo encontrar el paso visual para: ${stepName}`);
    }
  }

  private getInitialProcessSteps() {
    return [
      {
        imageUrl: 'assets/images/ventas/paso1-productos.png',
        caption: '1. Productos: Selecciona una bodega y elige productos del catálogo disponible',
        icon: 'fa-shopping-basket',
        stepKey: 'productos'
      },
      {
        imageUrl: 'assets/images/ventas/paso2-carrito.png',
        caption: '2. Carrito: Revisa tus productos seleccionados y agrega notas al pedido',
        icon: 'fa-shopping-cart',
        stepKey: 'carrito'
      },
      {
        imageUrl: 'assets/images/ventas/paso3-cliente.png',
        caption: '3. Cliente: Busca un cliente existente o crea uno nuevo con sus datos completos',
        icon: 'fa-user',
        stepKey: 'cliente'
      },
      {
        imageUrl: 'assets/images/ventas/paso4-envio.png',
        caption: '4. Envío: Define la dirección y detalles para la entrega del pedido',
        icon: 'fa-truck',
        stepKey: 'envio'
      },
      {
        imageUrl: 'assets/images/ventas/paso5-facturacion.png',
        caption: '5. Facturación: Completa la información para la facturación electrónica',
        icon: 'fa-file-invoice',
        stepKey: 'facturacion'
      },
      {
        imageUrl: 'assets/images/ventas/paso6-pago.png',
        caption: '6. Pago: Revisa el pedido completo y procede al pago',
        icon: 'fa-credit-card',
        stepKey: 'pago'
      },
      {
        imageUrl: 'assets/images/ventas/paso7-confirmacion.png',
        caption: '7. Confirmación: ¡Venta completada exitosamente!',
        icon: 'fa-check-circle',
        stepKey: 'confirmacion'
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

  private calculateCompletionPercentage(processStatus: any): number {
    const completedSteps = Object.values(processStatus.completedSteps).filter(Boolean).length;
    const totalSteps = Object.keys(processStatus.completedSteps).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  private getNextActions(processStatus: any): string[] {
    const actions: string[] = [];
    
    if (!processStatus.completedSteps.warehouse) {
      actions.push('Seleccionar bodega con selectWarehouse');
    }
    if (!processStatus.completedSteps.products) {
      actions.push('Agregar productos con addToCart');
    }
    if (!processStatus.completedSteps.client) {
      actions.push('Configurar cliente con searchClient o setClientToOrder');
    }
    if (!processStatus.completedSteps.delivery) {
      actions.push('Configurar datos de entrega con setDeliveryInfo');
    }
    if (!processStatus.completedSteps.billing) {
      actions.push('Configurar datos de facturación con setBillingInfo');
    }
    if (processStatus.readyForPayment) {
      actions.push('Procesar venta con processSale');
    }
    
    return actions;
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
                const bodegas = (await this.bodegaService.getBodegasByChannelName('Venta Asistida').toPromise()) || [];
                const warehouseList = bodegas.map(b => ({id: b.idBodega || b.id, idBodega: b.idBodega, nombre: b.nombre}));
                
                if (warehouseList.length === 0) {
                    return { 
                        success: false, 
                        error: 'No hay bodegas disponibles en este momento. Contacta al administrador del sistema.',
                        warehouses: []
                    };
                }
                
                return { 
                    success: true, 
                    warehouses: warehouseList,
                    count: warehouseList.length,
                    message: `Encontré ${warehouseList.length} bodega${warehouseList.length > 1 ? 's' : ''} disponible${warehouseList.length > 1 ? 's' : ''} para realizar ventas.`
                };
            } catch (error: any) {
                return { 
                    success: false, 
                    error: `Error al cargar las bodegas: ${error.message}. Intenta nuevamente o contacta soporte técnico.`,
                    warehouses: []
                };
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
                const bodegas = (await this.bodegaService.getBodegasByChannelName('Venta Asistida').toPromise()) || [];
                this.bodegaSeleccionada = bodegas.find(b => b.idBodega === warehouseId);

                if (!this.bodegaSeleccionada) {
                    return { 
                        success: false, 
                        error: `No encontré la bodega con ID "${warehouseId}". Verifica el ID y usa la herramienta listWarehouses para ver las bodegas disponibles.`,
                        availableWarehouses: bodegas.map(b => ({id: b.idBodega, nombre: b.nombre}))
                    };
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

                this.toastr.success(`Bodega "${this.bodegaSeleccionada.nombre}" seleccionada correctamente.`, 'Bodega Configurada');
                this.updateVisualStep('catalogo');

                return { 
                    success: true, 
                    selectedWarehouse: this.bodegaSeleccionada.nombre, 
                    warehouseId: this.bodegaSeleccionada.idBodega,
                    productsLoaded: this.productosCatalogo.length,
                    message: `Perfecto! Seleccioné la bodega "${this.bodegaSeleccionada.nombre}" y cargué ${this.productosCatalogo.length} productos disponibles. Ya puedes buscar productos para agregar al carrito.`,
                    nextStep: 'Ahora puedes usar searchProducts para buscar productos específicos o addToCart para agregar productos al pedido.'
                };
            } catch (error: any) {
                return { 
                    success: false, 
                    error: `Error al cargar la bodega: ${error.message}. Verifica tu conexión a internet o intenta con otra bodega.`,
                    suggestion: 'Usa listWarehouses para ver otras bodegas disponibles.'
                };
            }
        }
    );

    // Herramienta para buscar productos en el catálogo de la bodega seleccionada
    adapter.registerTool(
      {
        name: 'searchProducts',
        description: 'Busca productos en el catálogo con filtros avanzados. Puedes buscar por nombre, código de barras, referencia, filtrar por precio, categoría, stock mínimo y ordenar los resultados.',
        parameters: {
          type: 'object',
          properties: {
            query: { 
              type: 'string', 
              description: 'Término de búsqueda para nombre, código de barras o referencia del producto.' 
            },
            category: { 
              type: 'string', 
              description: 'Categoría específica para filtrar los productos.' 
            },
            minPrice: { 
              type: 'number', 
              description: 'Precio mínimo del producto (incluye IVA).' 
            },
            maxPrice: { 
              type: 'number', 
              description: 'Precio máximo del producto (incluye IVA).' 
            },
            minStock: { 
              type: 'integer', 
              description: 'Stock mínimo disponible requerido.' 
            },
            sortBy: { 
              type: 'string', 
              enum: ['name', 'price-asc', 'price-desc', 'stock-desc', 'stock-asc'],
              description: 'Ordenar por: name (alfabético), price-asc/desc (precio), stock-asc/desc (disponibilidad).' 
            },
            limit: { 
              type: 'integer', 
              description: 'Número máximo de resultados a devolver (por defecto 10, máximo 50).' 
            }
          }
        }
      },
      async ({ query, category, minPrice, maxPrice, minStock, sortBy, limit = 10 }) => {
        const bodegaActual = this.getBodegaActual();
        if (!bodegaActual?.idBodega) {
            return {
                success: false,
                error: "Primero necesitas seleccionar una bodega. Usa la herramienta 'selectWarehouse' con el ID de la bodega que deseas usar, o elígela en la pantalla de venta asistida.",
                suggestion: "Prueba con 'listWarehouses' para ver las bodegas disponibles."
            };
        }

        const term = (query || '').trim();
        if (term.length < 2) {
            return {
                success: false,
                error: 'Necesito un término de búsqueda de al menos 2 caracteres (nombre, referencia o código de barras).'
            };
        }

        // Validar límite
        const safeLimit = Math.min(limit || 10, 50);

        // Búsqueda por servidor (mismo índice que usa la pantalla de venta asistida),
        // filtrada por la bodega activa para que el stock sea el de esa bodega.
        let results: Producto[] = [];
        let appliedFilters: string[] = [];
        try {
          const resp: any = await this.ventasService
            .quickSearchProducts(term, Math.max(safeLimit * 2, 20), 'all', bodegaActual.idBodega)
            .toPromise();
          results = [...(resp?.products || [])];
        } catch (error: any) {
          return { success: false, error: `Error buscando productos en el servidor: ${error?.message || error}` };
        }
        appliedFilters.push(`búsqueda: "${term}"`);

        // Filtro por categoría
        if (category) {
          results = results.filter(p => {
            const etiquetas = p.exposicion?.etiquetas || [];
            const categoriasNombre = p.categorias?.label?.toLowerCase() || '';
            return etiquetas.includes(category) || categoriasNombre.includes(category.toLowerCase());
          });
          appliedFilters.push(`categoría: "${category}"`);
        }
        
        // Filtro por rango de precios
        if (minPrice !== undefined) {
          results = results.filter(p => {
            const precio = p.precio?.precioUnitarioConIva || 0;
            return precio >= minPrice;
          });
          appliedFilters.push(`precio mín: $${minPrice.toLocaleString()}`);
        }
        
        if (maxPrice !== undefined) {
          results = results.filter(p => {
            const precio = p.precio?.precioUnitarioConIva || 0;
            return precio <= maxPrice;
          });
          appliedFilters.push(`precio máx: $${maxPrice.toLocaleString()}`);
        }
        
        // Filtro por stock mínimo
        if (minStock !== undefined) {
          results = results.filter(p => this.getStockEnBodega(p, bodegaActual.idBodega) >= minStock);
          appliedFilters.push(`stock mín: ${minStock}`);
        }
        
        // Ordenamiento
        if (sortBy) {
          switch (sortBy) {
            case 'name':
              results.sort((a, b) => {
                const nameA = a.crearProducto?.titulo || '';
                const nameB = b.crearProducto?.titulo || '';
                return nameA.localeCompare(nameB);
              });
              appliedFilters.push('ordenado por nombre');
              break;
            case 'price-asc':
              results.sort((a, b) => {
                const priceA = a.precio?.precioUnitarioConIva || 0;
                const priceB = b.precio?.precioUnitarioConIva || 0;
                return priceA - priceB;
              });
              appliedFilters.push('ordenado por precio (menor a mayor)');
              break;
            case 'price-desc':
              results.sort((a, b) => {
                const priceA = a.precio?.precioUnitarioConIva || 0;
                const priceB = b.precio?.precioUnitarioConIva || 0;
                return priceB - priceA;
              });
              appliedFilters.push('ordenado por precio (mayor a menor)');
              break;
            case 'stock-desc':
              results.sort((a, b) => this.getStockEnBodega(b, bodegaActual.idBodega) - this.getStockEnBodega(a, bodegaActual.idBodega));
              appliedFilters.push('ordenado por stock (mayor a menor)');
              break;
            case 'stock-asc':
              results.sort((a, b) => this.getStockEnBodega(a, bodegaActual.idBodega) - this.getStockEnBodega(b, bodegaActual.idBodega));
              appliedFilters.push('ordenado por stock (menor a mayor)');
              break;
          }
        }
        
        const totalFound = results.length;
        
        // Aplicar límite
        if (safeLimit > 0) {
          results = results.slice(0, safeLimit);
        }
        
        if (totalFound === 0) {
            const filterText = appliedFilters.length > 0 ? ` con ${appliedFilters.join(', ')}` : '';
            return { 
                success: false, 
                error: `No encontré productos${filterText}.`,
                suggestion: 'Intenta ajustar los filtros o usa términos más generales.',
                appliedFilters: appliedFilters
            };
        }
        
        const productList = results.map(p => ({
            id: p.cd, 
            nombre: p.crearProducto?.titulo, 
            precio: p.precio?.precioUnitarioConIva || 0,
            disponible: this.getStockEnBodega(p),
            categoria: p.exposicion?.etiquetas?.[0] || p.categorias?.label || 'Sin categoría',
            referencia: p.identificacion?.referencia || '',
            codigoBarras: p.identificacion?.codigoBarras || '',
            marca: p.identificacion?.marca || '',
            precioFormateado: `$${(p.precio?.precioUnitarioConIva || 0).toLocaleString()}`
        }));
        
        const filtersText = appliedFilters.length > 0 ? ` (filtros: ${appliedFilters.join(', ')})` : '';
        const limitText = results.length < totalFound ? ` Mostrando ${results.length} de ${totalFound}.` : '';
        
        return { 
            success: true, 
            products: productList,
            totalFound: totalFound,
            totalShowing: results.length,
            appliedFilters: appliedFilters,
            searchSummary: {
                query: query || null,
                category: category || null,
                priceRange: {
                    min: minPrice || null,
                    max: maxPrice || null
                },
                minStock: minStock || null,
                sortBy: sortBy || null,
                limit: safeLimit
            },
            message: `Encontré ${totalFound} producto${totalFound > 1 ? 's' : ''}${filtersText}.${limitText}`,
            nextActions: [
                'Usa addToCart con el ID del producto para agregarlo al carrito',
                'Usa searchProducts con otros filtros para refinar la búsqueda',
                'Usa getAvailableSteps para ver el progreso del pedido'
            ],
            helpfulInfo: results.length < totalFound ? 
                `Hay ${totalFound - results.length} productos más. Usa un límite mayor o filtros más específicos.` : 
                null
        };
      }
    );

    // Herramienta para obtener información de filtros disponibles para búsqueda
    adapter.registerTool(
      {
        name: 'getProductFilters',
        description: 'Obtiene información sobre los filtros disponibles para la búsqueda de productos, incluyendo categorías, rangos de precios y opciones de ordenamiento.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        if (!this.bodegaSeleccionada) {
            return { 
                success: false, 
                error: "Primero necesitas seleccionar una bodega para ver los filtros disponibles.",
                suggestion: "Usa 'selectWarehouse' para seleccionar una bodega."
            };
        }

        const categoriesAvailable = this.getAvailableCategories();
        const priceRange = this.getPriceRange();
        const totalProducts = this.productosCatalogo.length;

        return {
            success: true,
            warehouse: this.bodegaSeleccionada.nombre,
            totalProducts: totalProducts,
            availableFilters: {
                categories: {
                    count: categoriesAvailable.length,
                    options: categoriesAvailable,
                    usage: 'Usa el parámetro "category" con uno de estos valores'
                },
                priceRange: {
                    min: priceRange.min,
                    max: priceRange.max,
                    average: priceRange.average,
                    formatted: {
                        min: `$${priceRange.min.toLocaleString()}`,
                        max: `$${priceRange.max.toLocaleString()}`,
                        average: `$${priceRange.average.toLocaleString()}`
                    },
                    usage: 'Usa "minPrice" y/o "maxPrice" con valores numéricos'
                },
                sortOptions: [
                    { value: 'name', description: 'Ordenar alfabéticamente por nombre' },
                    { value: 'price-asc', description: 'Ordenar por precio de menor a mayor' },
                    { value: 'price-desc', description: 'Ordenar por precio de mayor a menor' },
                    { value: 'stock-asc', description: 'Ordenar por stock de menor a mayor' },
                    { value: 'stock-desc', description: 'Ordenar por stock de mayor a menor' }
                ],
                searchFields: [
                    'Nombre del producto',
                    'Código de barras',
                    'Referencia del producto'
                ]
            },
            exampleUsage: [
                'searchProducts con query="pantalón" - buscar por nombre',
                'searchProducts con category="Ropa" - filtrar por categoría',
                'searchProducts con minPrice=50000 maxPrice=200000 - rango de precios',
                'searchProducts con minStock=5 - solo productos con stock mínimo',
                'searchProducts con sortBy="price-asc" - ordenar por precio',
                'searchProducts con query="123456" - buscar por código de barras'
            ],
            message: `Bodega: ${this.bodegaSeleccionada.nombre} | ${totalProducts} productos | ${categoriesAvailable.length} categorías | Precios: $${priceRange.min.toLocaleString()} - $${priceRange.max.toLocaleString()}`,
            nextStep: 'Usa searchProducts con los filtros que necesites para encontrar productos específicos.'
        };
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
            quantity: { type: 'integer', default: 1, description: 'La cantidad a añadir (mínimo 1).' }
          },
          required: ['productId']
        }
      },
      ({ productId, quantity = 1 }) => {
        if (!this.bodegaSeleccionada) {
            return { 
                success: false, 
                error: "Necesitas seleccionar una bodega antes de agregar productos al carrito.",
                suggestion: "Usa 'selectWarehouse' para elegir una bodega primero."
            };
        }
        
        const product = this.productosCatalogo.find(p => p.cd === productId);
        if (!product) {
          return { 
              success: false, 
              error: `No encontré el producto con ID "${productId}" en la bodega "${this.bodegaSeleccionada.nombre}".`,
              suggestion: "Usa 'searchProducts' para buscar productos disponibles en esta bodega.",
              currentWarehouse: this.bodegaSeleccionada.nombre
          };
        }
        
        if (quantity < 1) {
            return {
                success: false,
                error: "La cantidad debe ser al menos 1.",
                suggestion: "Especifica una cantidad válida (número entero positivo)."
            };
        }
        
        const cantidadDisponible = product.disponibilidad?.cantidadDisponible || 0;
        if (quantity > cantidadDisponible) {
            return {
                success: false,
                error: `Solo hay ${cantidadDisponible} unidades disponibles de "${product.crearProducto?.titulo}". Solicitas ${quantity} unidades.`,
                available: cantidadDisponible,
                suggested: Math.min(quantity, cantidadDisponible)
            };
        }
        
        const productoCompra = {
            producto: product,
            configuracion: {
                producto: product,
                datosEntrega: null,
                cantidad: quantity,
                preferencias: [],
                adiciones: [],
                tarjetas: []
            },
            cantidad: quantity
        };
        
        this.cartService.addToCart(productoCompra);
        this.pedidoEnProgreso.carrito = this.cartService.productInCart.getValue();
        this.toastr.success(`${product.crearProducto?.titulo} añadido al carrito.`, 'Producto Añadido');
        this.updateVisualStep('carrito');

        const cartStatus = this._getCartStatus();
        const processStatus = this._getProcessStatus();
        
        return { 
            success: true, 
            productAdded: {
                name: product.crearProducto?.titulo,
                price: product.precio?.precioUnitarioConIva || 0,
                quantity: quantity,
                total: (product.precio?.precioUnitarioConIva || 0) * quantity
            },
            cart: cartStatus,
            process: processStatus,
            message: `Perfecto! Agregué ${quantity} unidad${quantity > 1 ? 'es' : ''} de "${product.crearProducto?.titulo}" al carrito. Total del carrito: $${cartStatus.subtotal?.toLocaleString() || 0}`,
            nextStep: cartStatus.count === 1 ? 'Puedes seguir agregando productos o continuar con setClientToOrder para configurar el cliente.' : 'Carrito actualizado. Puedes continuar agregando productos o proceder con el cliente.'
        };
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
                type: 'object', 
                properties: { 
                    document: { 
                        type: 'string', 
                        description: 'Número de documento del cliente (sin puntos ni espacios).'
                    } 
                }, 
                required: ['document']
            }
        },
        async ({ document }) => {
            if (!document || document.trim().length === 0) {
                return {
                    success: false,
                    error: 'El número de documento es requerido.',
                    suggestion: 'Proporciona un número de documento válido sin puntos ni espacios.'
                };
            }

            // Limpiar el documento de caracteres especiales
            const cleanDocument = document.replace(/[^0-9]/g, '');
            
            if (cleanDocument.length < 6) {
                return {
                    success: false,
                    error: 'El número de documento debe tener al menos 6 dígitos.',
                    suggestion: 'Verifica que el documento esté completo y sea válido.'
                };
            }

            try {
                const client: any = await this.maestroService.getClientByDocument({documento: cleanDocument}).toPromise();
                if (client && client.documento) {
                    this.pedidoEnProgreso.cliente = client;
                    this.toastr.success(`Cliente encontrado: ${client.nombres_completos}`, 'Cliente Seleccionado');
                    this.updateVisualStep('cliente');
                    
                    return { 
                        success: true, 
                        client: {
                            name: client.nombres_completos,
                            document: client.documento,
                            email: client.correo_electronico_comprador,
                            phone: client.numero_celular_comprador,
                            status: client.estado || 'Activo'
                        },
                        message: `¡Perfecto! Encontré al cliente ${client.nombres_completos} (${client.documento}). El cliente está configurado para el pedido.`,
                        nextStep: 'Ahora puedes continuar con setDeliveryInfo para configurar los datos de entrega.',
                        processStatus: this._getProcessStatus() 
                    };
                } else {
                    return { 
                        success: false, 
                        error: `No encontré ningún cliente con el documento "${cleanDocument}".`,
                        suggestion: 'Puedes crear un nuevo cliente usando la herramienta setClientToOrder con todos los datos necesarios.',
                        documentSearched: cleanDocument,
                        nextStep: 'Usa setClientToOrder para registrar un nuevo cliente.',
                        processStatus: this._getProcessStatus() 
                    };
                }
            } catch (error: any) {
                return { 
                    success: false, 
                    error: `Error al consultar la base de datos: ${error.message}`,
                    suggestion: 'Verifica tu conexión a internet o intenta nuevamente. Si el problema persiste, contacta soporte técnico.',
                    documentSearched: cleanDocument,
                    troubleshooting: 'Error de conexión con la base de datos de clientes.'
                };
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
      () => {
        const processStatus = this._getProcessStatus();
        const cartStatus = this._getCartStatus();
        
        return {
            success: true,
            order: {
                orderNumber: this.pedidoEnProgreso.nroPedido,
                reference: this.pedidoEnProgreso.referencia,
                warehouse: this.getBodegaActual()?.nombre || 'No seleccionada',
                client: this.pedidoEnProgreso.cliente ? {
                    name: this.pedidoEnProgreso.cliente.nombres_completos,
                    document: this.pedidoEnProgreso.cliente.documento,
                    email: this.pedidoEnProgreso.cliente.correo_electronico_comprador
                } : null,
                cart: cartStatus,
                delivery: this.pedidoEnProgreso.envio ? {
                    address: this.pedidoEnProgreso.envio.direccionEntrega,
                    city: this.pedidoEnProgreso.envio.ciudad,
                    method: this.pedidoEnProgreso.formaEntrega
                } : null,
                billing: this.pedidoEnProgreso.facturacion ? {
                    name: this.pedidoEnProgreso.facturacion.nombres,
                    document: this.pedidoEnProgreso.facturacion.documento,
                    address: this.pedidoEnProgreso.facturacion.direccion
                } : null,
                totals: {
                    subtotal: this.pedidoEnProgreso.subtotal || 0,
                    shipping: this.pedidoEnProgreso.totalEnvio || 0,
                    taxes: this.pedidoEnProgreso.totalImpuesto || 0,
                    total: this.pedidoEnProgreso.totalPedididoConDescuento || 0
                },
                paymentMethod: this.pedidoEnProgreso.formaDePago || 'No seleccionado',
                status: {
                    process: this.pedidoEnProgreso.estadoProceso,
                    payment: this.pedidoEnProgreso.estadoPago
                }
            },
            process: processStatus,
            message: `Estado del pedido ${this.pedidoEnProgreso.nroPedido}: ${processStatus.currentStep}. ${processStatus.nextStep}`,
            completionPercentage: this.calculateCompletionPercentage(processStatus),
            nextActions: this.getNextActions(processStatus)
        };
      }
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
      async ({ paymentMethod = 'Efectivo', notes }) => {
        // Validación exhaustiva antes de procesar
        const validationErrors: string[] = [];
        const cart = this.cartService.productInCart.getValue();
        
        if (!this.bodegaSeleccionada) {
            validationErrors.push('No hay bodega seleccionada');
        }
        if (!this.pedidoEnProgreso.cliente) {
            validationErrors.push('Falta información del cliente');
        }
        if (!this.pedidoEnProgreso.envio) {
            validationErrors.push('Faltan datos de envío');
        }
        if (!this.pedidoEnProgreso.facturacion) {
            validationErrors.push('Faltan datos de facturación');
        }
        if (!cart || cart.length === 0) {
            validationErrors.push('El carrito está vacío');
        }
        
        if (validationErrors.length > 0) {
            return { 
                success: false, 
                error: `No se puede procesar la venta. Problemas encontrados: ${validationErrors.join(', ')}.`,
                missingData: validationErrors,
                suggestion: 'Completa la información faltante usando las herramientas apropiadas.',
                currentStep: this._getProcessStatus().currentStep
            };
        }

        this.pedidoEnProgreso.carrito = cart;
        this.pedidoEnProgreso.formaDePago = paymentMethod;
        
        if (notes) {
            if (!this.pedidoEnProgreso.notasPedido) {
                this.pedidoEnProgreso.notasPedido = {
                    notasCliente: [],
                    notasProduccion: [],
                    notasDespachos: [],
                    notasEntregas: [],
                    notasFacturacionPagos: []
                };
            }
            this.pedidoEnProgreso.notasPedido.notasFacturacionPagos.push({
                nota: notes, 
                fecha: new Date().toISOString(), 
                usuario: 'KAI'
            });
        }

        // Calcular totales usando el servicio de utilidades
        this.pedidosUtilService.pedido = this.pedidoEnProgreso;
        this.pedidoEnProgreso.subtotal = this.pedidosUtilService.getSubtotal();
        this.pedidoEnProgreso.totalImpuesto = this.pedidosUtilService.checkIVAPrice();
        this.pedidoEnProgreso.totalPedididoConDescuento = (this.pedidoEnProgreso.subtotal || 0) + (this.pedidoEnProgreso.totalImpuesto || 0) + (this.pedidoEnProgreso.totalEnvio || 0);
        
        try {
          // Validar número de pedido
          await this.ventasService.validateNroPedido(this.pedidoEnProgreso.nroPedido as string).toPromise();
          
          // Generar contenido HTML para email
          const htmlContent = this.paymentService.getHtmlContent(this.pedidoEnProgreso);
          
          // Crear el pedido
          const result = await this.ventasService.createOrder({ 
              order: this.pedidoEnProgreso, 
              emailHtml: htmlContent 
          }).toPromise();
          
          this.toastr.success(`¡Venta completada exitosamente!`, 'Pedido Creado');
          this.updateVisualStep('confirmacion');

          const orderSummary = {
              orderNumber: this.pedidoEnProgreso.nroPedido,
              client: this.pedidoEnProgreso.cliente?.nombres_completos,
              total: this.pedidoEnProgreso.totalPedididoConDescuento,
              paymentMethod: paymentMethod,
              itemsCount: cart.length
          };

          // Guardar copia antes de reiniciar
          const createdOrder = { ...this.pedidoEnProgreso };
          this.inicializarNuevoPedido();
          
          return { 
              success: true, 
              order: result,
              summary: orderSummary,
              message: `¡Excelente! Pedido ${orderSummary.orderNumber} creado exitosamente para ${orderSummary.client}. Total: $${orderSummary.total?.toLocaleString()}. Sistema listo para la siguiente venta.`,
              nextStep: 'El sistema está listo para procesar una nueva venta. Puedes empezar seleccionando una bodega.'
          };
        } catch (e: any) {
          this.toastr.error('Error al procesar la venta', 'Error');
          return { 
              success: false, 
              error: `Error al crear el pedido: ${e?.message || 'Error desconocido'}`,
              suggestion: 'Verifica los datos del pedido y tu conexión a internet. Intenta nuevamente.',
              currentOrder: this.pedidoEnProgreso.nroPedido,
              troubleshooting: 'Si el error persiste, contacta soporte técnico con el número de pedido.'
          };
        }
      }
    );

    // === HERRAMIENTAS PARA OPTIMIZACIÓN DEL FLUJO DE CONFIRMACIÓN ===

    // Herramienta para validar pedido antes del pago
    adapter.registerTool(
      {
        name: 'validateOrderBeforePay',
        description: 'Realiza una validación completa del pedido antes del pago, identificando todos los problemas que deben resolverse.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const validationReport = {
          passed: [] as string[],
          warnings: [] as string[],
          errors: [] as string[],
          canProceed: true
        };

        const cart = this.cartService.productInCart.getValue();

        // Validación de bodega
        if (this.bodegaSeleccionada) {
          validationReport.passed.push(`✓ Bodega seleccionada: ${this.bodegaSeleccionada.nombre}`);
        } else {
          validationReport.errors.push('❌ No hay bodega seleccionada');
          validationReport.canProceed = false;
        }

        // Validación de cliente
        if (this.pedidoEnProgreso.cliente) {
          validationReport.passed.push(`✓ Cliente: ${this.pedidoEnProgreso.cliente.nombres_completos}`);
          
          // Validar datos críticos del cliente
          if (!this.pedidoEnProgreso.cliente.correo_electronico_comprador) {
            validationReport.warnings.push('⚠️ Cliente sin email - no podrá recibir confirmación');
          }
          if (!this.pedidoEnProgreso.cliente.numero_celular_comprador) {
            validationReport.warnings.push('⚠️ Cliente sin teléfono - contacto limitado');
          }
        } else {
          validationReport.errors.push('❌ No hay cliente seleccionado');
          validationReport.canProceed = false;
        }

        // Validación de carrito
        if (cart && cart.length > 0) {
          validationReport.passed.push(`✓ Carrito con ${cart.length} producto${cart.length > 1 ? 's' : ''}`);
          
          // Validar stock de productos
          let stockIssues = 0;
          cart.forEach((item, index) => {
            const producto = (item.producto ?? null);
            const stockDisponible = producto?.disponibilidad?.cantidadDisponible || 0;
            const cantidadSolicitada = item.cantidad || 0;
            
            if (cantidadSolicitada > stockDisponible) {
              validationReport.warnings.push(`⚠️ Producto ${index + 1}: Stock insuficiente (solicitas ${cantidadSolicitada}, disponible ${stockDisponible})`);
              stockIssues++;
            }
          });
          
          if (stockIssues === 0) {
            validationReport.passed.push('✓ Todos los productos tienen stock suficiente');
          }
        } else {
          validationReport.errors.push('❌ El carrito está vacío');
          validationReport.canProceed = false;
        }

        // Validación de facturación
        if (this.pedidoEnProgreso.facturacion?.nombres) {
          validationReport.passed.push(`✓ Datos de facturación: ${this.pedidoEnProgreso.facturacion.nombres}`);
          
          if (!this.pedidoEnProgreso.facturacion.documento) {
            validationReport.warnings.push('⚠️ Documento de facturación faltante');
          }
          if (!this.pedidoEnProgreso.facturacion.direccion) {
            validationReport.warnings.push('⚠️ Dirección de facturación faltante');
          }
        } else {
          validationReport.errors.push('❌ Faltan datos de facturación');
          validationReport.canProceed = false;
        }

        // Validación de entrega
        if (this.pedidoEnProgreso.envio?.direccionEntrega) {
          validationReport.passed.push(`✓ Dirección de entrega: ${this.pedidoEnProgreso.envio.direccionEntrega}`);
          
          if (!this.pedidoEnProgreso.envio.ciudad) {
            validationReport.warnings.push('⚠️ Ciudad de entrega no especificada');
          }
          if (!this.pedidoEnProgreso.envio.celular) {
            validationReport.warnings.push('⚠️ Teléfono de entrega faltante');
          }
        } else {
          validationReport.errors.push('❌ Falta dirección de entrega');
          validationReport.canProceed = false;
        }

        // Calcular totales preliminares
        let subtotal = 0;
        if (cart) {
          cart.forEach(item => {
            const producto = (item.producto ?? null);
            const precio = producto?.precio?.precioUnitarioConIva || 0;
            subtotal += precio * (item.cantidad || 0);
          });
        }

        const finalReport = {
          success: true,
          validationStatus: validationReport.canProceed ? 'READY_TO_PAY' : 'NEEDS_ATTENTION',
          passed: validationReport.passed,
          warnings: validationReport.warnings,
          errors: validationReport.errors,
          canProceedToPay: validationReport.canProceed,
          estimatedTotal: subtotal,
          estimatedTotalFormatted: `$${subtotal.toLocaleString()}`,
          summary: {
            totalChecks: validationReport.passed.length + validationReport.warnings.length + validationReport.errors.length,
            passedChecks: validationReport.passed.length,
            warningCount: validationReport.warnings.length,
            errorCount: validationReport.errors.length
          },
          message: validationReport.canProceed ? 
            `✅ Pedido listo para pago. ${validationReport.passed.length} validaciones exitosas${validationReport.warnings.length > 0 ? `, ${validationReport.warnings.length} advertencias` : ''}.` :
            `❌ Pedido NO listo. ${validationReport.errors.length} errores deben corregirse.`,
          nextActions: validationReport.canProceed ? 
            ['Usa processSale para finalizar el pedido', 'Usa getOrderSummary para ver el resumen completo'] :
            ['Corrige los errores listados', 'Usa las herramientas apropiadas para completar la información faltante']
        };

        return finalReport;
      }
    );

    // Herramienta para obtener resumen detallado del pedido
    adapter.registerTool(
      {
        name: 'getOrderSummary',
        description: 'Obtiene un resumen completo y detallado del pedido actual, incluyendo totales, productos, cliente y datos de entrega.',
        parameters: {
          type: 'object',
          properties: {
            includeProductDetails: { 
              type: 'boolean', 
              description: 'Incluir detalles completos de cada producto (por defecto true)' 
            }
          }
        }
      },
      ({ includeProductDetails = true }) => {
        const cart = this.cartService.productInCart.getValue();
        
        if (!cart || cart.length === 0) {
          return {
            success: false,
            error: 'No hay productos en el carrito para mostrar resumen',
            suggestion: 'Usa searchProducts para encontrar productos y addToCart para agregarlos'
          };
        }

        // Calcular totales detallados
        let subtotalSinIVA = 0;
        let totalIVA = 0;
        let subtotalConIVA = 0;
        const productDetails = [];

        for (const item of cart) {
          const producto = (item.producto ?? null);
          if (producto) {
            const precioUnitario = producto.precio?.precioUnitarioConIva || 0;
            const precioSinIVA = producto.precio?.precioUnitarioSinIva || precioUnitario;
            const cantidad = item.cantidad || 0;
            
            const subtotalProducto = precioUnitario * cantidad;
            const subtotalSinIVAProducto = precioSinIVA * cantidad;
            const ivaProducto = subtotalProducto - subtotalSinIVAProducto;
            
            subtotalConIVA += subtotalProducto;
            subtotalSinIVA += subtotalSinIVAProducto;
            totalIVA += ivaProducto;

            if (includeProductDetails) {
              productDetails.push({
                nombre: producto.crearProducto?.titulo || 'Sin nombre',
                referencia: producto.identificacion?.referencia || '',
                cantidad: cantidad,
                precioUnitario: precioUnitario,
                precioUnitarioFormateado: `$${precioUnitario.toLocaleString()}`,
                subtotal: subtotalProducto,
                subtotalFormateado: `$${subtotalProducto.toLocaleString()}`,
                disponible: producto.disponibilidad?.cantidadDisponible || 0,
                categoria: producto.exposicion?.etiquetas?.[0] || 'Sin categoría'
              });
            }
          }
        }

        const costoEnvio = this.pedidoEnProgreso.totalEnvio || 0;
        const descuentos = this.pedidoEnProgreso.totalDescuento || 0;
        const totalFinal = subtotalConIVA + costoEnvio - descuentos;

        const summary = {
          success: true,
          orderNumber: this.pedidoEnProgreso.nroPedido || 'Por generar',
          currentStep: this.pasoActual,
          stepName: this.getStepName(this.pasoActual),
          
          // Información del cliente
          customer: {
            name: this.pedidoEnProgreso.cliente?.nombres_completos || 'No seleccionado',
            document: this.pedidoEnProgreso.cliente?.documento || '',
            email: this.pedidoEnProgreso.cliente?.correo_electronico_comprador || '',
            phone: this.pedidoEnProgreso.cliente?.numero_celular_comprador || ''
          },

          // Información de entrega
          shipping: {
            address: this.pedidoEnProgreso.envio?.direccionEntrega || 'No configurada',
            city: this.pedidoEnProgreso.envio?.ciudad || '',
            department: this.pedidoEnProgreso.envio?.departamento || '',
            phone: this.pedidoEnProgreso.envio?.celular || '',
            cost: costoEnvio,
            costFormatted: `$${costoEnvio.toLocaleString()}`
          },

          // Información de facturación
          billing: {
            name: this.pedidoEnProgreso.facturacion?.nombres || 'No configurada',
            document: this.pedidoEnProgreso.facturacion?.documento || '',
            address: this.pedidoEnProgreso.facturacion?.direccion || '',
            city: this.pedidoEnProgreso.facturacion?.ciudad || ''
          },

          // Productos (solo si se solicita)
          products: includeProductDetails ? productDetails : {
            count: cart.length,
            message: 'Usa includeProductDetails=true para ver detalles completos'
          },

          // Totales financieros
          totals: {
            itemCount: cart.length,
            subtotalSinIVA: subtotalSinIVA,
            totalIVA: totalIVA,
            subtotalConIVA: subtotalConIVA,
            shippingCost: costoEnvio,
            discounts: descuentos,
            finalTotal: totalFinal,
            formatted: {
              subtotalSinIVA: `$${subtotalSinIVA.toLocaleString()}`,
              totalIVA: `$${totalIVA.toLocaleString()}`,
              subtotalConIVA: `$${subtotalConIVA.toLocaleString()}`,
              shippingCost: `$${costoEnvio.toLocaleString()}`,
              discounts: descuentos > 0 ? `-$${descuentos.toLocaleString()}` : '$0',
              finalTotal: `$${totalFinal.toLocaleString()}`
            }
          },

          // Información del warehouse
          warehouse: {
            name: this.getBodegaActual()?.nombre || 'No seleccionada',
            id: this.bodegaSeleccionada?.idBodega || ''
          },

          // Estado del pedido
          status: {
            paymentMethod: this.pedidoEnProgreso.formaDePago || 'No seleccionado',
            paymentStatus: this.pedidoEnProgreso.estadoPago || 'Pendiente',
            processStatus: this.pedidoEnProgreso.estadoProceso || 'SinProducir'
          },

          message: `Resumen del pedido: ${cart.length} producto${cart.length > 1 ? 's' : ''} por $${totalFinal.toLocaleString()} para ${this.pedidoEnProgreso.cliente?.nombres_completos || 'cliente sin seleccionar'}`,
          
          nextActions: [
            'Usa validateOrderBeforePay para validar el pedido completo',
            'Usa processSale para finalizar la venta',
            'Usa las herramientas de navegación para ir a pasos específicos'
          ]
        };

        return summary;
      }
    );

    // Herramienta para validar datos específicos del pedido
    adapter.registerTool(
      {
        name: 'validateSpecificData',
        description: 'Valida datos específicos del pedido: cliente, productos, facturación, entrega o totales.',
        parameters: {
          type: 'object',
          properties: {
            dataType: {
              type: 'string',
              enum: ['cliente', 'productos', 'facturacion', 'entrega', 'totales', 'todo'],
              description: 'Tipo de datos a validar específicamente'
            }
          },
          required: ['dataType']
        }
      },
      ({ dataType }) => {
        const validation = { success: true, issues: [] as string[], passed: [] as string[] };

        switch (dataType) {
          case 'cliente':
            if (this.pedidoEnProgreso.cliente) {
              validation.passed.push('Cliente seleccionado');
              if (!this.pedidoEnProgreso.cliente.correo_electronico_comprador) {
                validation.issues.push('Email del cliente faltante');
              }
              if (!this.pedidoEnProgreso.cliente.numero_celular_comprador) {
                validation.issues.push('Teléfono del cliente faltante');
              }
              if (!this.pedidoEnProgreso.cliente.documento) {
                validation.issues.push('Documento del cliente faltante');
              }
            } else {
              validation.issues.push('No hay cliente seleccionado');
            }
            break;

          case 'productos':
            const cart = this.cartService.productInCart.getValue();
            if (cart && cart.length > 0) {
              validation.passed.push(`${cart.length} productos en el carrito`);
              // Validar stock para cada producto
              cart.forEach((item, index) => {
                const producto = (item.producto ?? null);
                const stockDisponible = producto?.disponibilidad?.cantidadDisponible || 0;
                const cantidadSolicitada = item.cantidad || 0;
                
                if (cantidadSolicitada > stockDisponible) {
                  validation.issues.push(`Producto ${index + 1}: Stock insuficiente (${cantidadSolicitada}/${stockDisponible})`);
                } else {
                  validation.passed.push(`Producto ${index + 1}: Stock OK`);
                }
              });
            } else {
              validation.issues.push('Carrito vacío');
            }
            break;

          case 'facturacion':
            if (this.pedidoEnProgreso.facturacion?.nombres) {
              validation.passed.push('Datos de facturación presentes');
              if (!this.pedidoEnProgreso.facturacion.documento) {
                validation.issues.push('Documento de facturación faltante');
              }
              if (!this.pedidoEnProgreso.facturacion.direccion) {
                validation.issues.push('Dirección de facturación faltante');
              }
            } else {
              validation.issues.push('Datos de facturación faltantes');
            }
            break;

          case 'entrega':
            if (this.pedidoEnProgreso.envio?.direccionEntrega) {
              validation.passed.push('Dirección de entrega configurada');
              if (!this.pedidoEnProgreso.envio.ciudad) {
                validation.issues.push('Ciudad de entrega faltante');
              }
              if (!this.pedidoEnProgreso.envio.celular) {
                validation.issues.push('Teléfono de entrega faltante');
              }
            } else {
              validation.issues.push('Dirección de entrega faltante');
            }
            break;

          case 'totales':
            const cartItems = this.cartService.productInCart.getValue();
            if (cartItems && cartItems.length > 0) {
              let total = 0;
              cartItems.forEach(item => {
                const producto = (item.producto ?? null);
                const precio = producto?.precio?.precioUnitarioConIva || 0;
                total += precio * (item.cantidad || 0);
              });
              validation.passed.push(`Total calculado: $${total.toLocaleString()}`);
            } else {
              validation.issues.push('No hay productos para calcular totales');
            }
            break;

          case 'todo':
            // Ejecutar todas las validaciones
            return this.internalValidateOrderBeforePay();
        }

        return {
          success: true,
          dataType: dataType,
          validationPassed: validation.passed,
          validationIssues: validation.issues,
          isValid: validation.issues.length === 0,
          message: validation.issues.length === 0 ? 
            `✅ Validación de ${dataType} exitosa` : 
            `⚠️ Validación de ${dataType} encontró ${validation.issues.length} problema${validation.issues.length > 1 ? 's' : ''}`,
          nextActions: validation.issues.length > 0 ? 
            ['Corrige los problemas identificados', 'Usa las herramientas apropiadas para completar la información'] :
            ['Continúa con el siguiente paso del proceso']
        };
      }
    );

    // === HERRAMIENTAS SHORTCUTS PARA ACCIONES FRECUENTES ===

    // Shortcut: Búsqueda rápida y adición al carrito
    adapter.registerTool(
      {
        name: 'quickAddToCart',
        description: 'Shortcut que busca un producto y lo agrega directamente al carrito en una sola operación.',
        parameters: {
          type: 'object',
          properties: {
            productQuery: { 
              type: 'string', 
              description: 'Nombre, código de barras o referencia del producto a buscar' 
            },
            quantity: { 
              type: 'integer', 
              description: 'Cantidad a agregar (por defecto 1)' 
            },
            useFirstMatch: { 
              type: 'boolean', 
              description: 'Si es true, agrega automáticamente el primer resultado encontrado (por defecto false)' 
            }
          },
          required: ['productQuery']
        }
      },
      async ({ productQuery, quantity = 1, useFirstMatch = false }) => {
        if (!this.bodegaSeleccionada) {
          return { 
            success: false, 
            error: 'Primero selecciona una bodega',
            suggestion: 'Usa selectWarehouse para seleccionar una bodega'
          };
        }

        // Buscar productos usando los parámetros correctos
        const searchParams = {
          query: productQuery,
          limit: 5
        };
        
        // Ejecutar la búsqueda usando la lógica interna de searchProducts
        let results: Producto[] = this.productosCatalogo;
        const q = productQuery.toLowerCase().trim();
        results = results.filter(p => {
          const titulo = p.crearProducto?.titulo?.toLowerCase() || '';
          const codigoBarras = p.identificacion?.codigoBarras?.toLowerCase() || '';
          const referencia = p.identificacion?.referencia?.toLowerCase() || '';
          
          return titulo.includes(q) || codigoBarras.includes(q) || referencia.includes(q);
        });

        const searchResults = {
          success: results.length > 0,
          products: results.slice(0, 5).map(p => ({
            id: p.cd, 
            nombre: p.crearProducto?.titulo, 
            precio: p.precio?.precioUnitarioConIva || 0,
            disponible: this.getStockEnBodega(p),
            precioFormateado: `$${(p.precio?.precioUnitarioConIva || 0).toLocaleString()}`
          }))
        };
        
        if (!searchResults.success || !searchResults.products || searchResults.products.length === 0) {
          return {
            success: false,
            error: `No se encontraron productos con "${productQuery}"`,
            suggestion: 'Intenta con otros términos de búsqueda o usa searchProducts para ver opciones disponibles'
          };
        }

        let selectedProduct;
        
        if (useFirstMatch || searchResults.products.length === 1) {
          selectedProduct = searchResults.products[0];
        } else {
          // Mostrar opciones para que el usuario elija
          return {
            success: false,
            error: `Se encontraron ${searchResults.products.length} productos. Especifica cuál quieres agregar.`,
            foundProducts: searchResults.products.map((p, index) => ({
              option: index + 1,
              id: p.id,
              name: p.nombre,
              price: p.precioFormateado,
              available: p.disponible
            })),
            suggestion: 'Usa addToCart con el ID específico del producto que deseas, o quickAddToCart con useFirstMatch=true para agregar el primero automáticamente'
          };
        }

        // Agregar al carrito
        const addResult = await this.internalAddToCart(selectedProduct.id, quantity);

        if (addResult.success) {
          return {
            success: true,
            productAdded: {
              name: selectedProduct.nombre,
              quantity: quantity,
              price: selectedProduct.precioFormateado,
              subtotal: `$${(selectedProduct.precio * quantity).toLocaleString()}`
            },
            cartTotal: addResult.cartTotal,
            message: `✅ ${selectedProduct.nombre} (${quantity} unidades) agregado al carrito`,
            nextActions: [
              'Usa quickAddToCart para agregar más productos',
              'Usa getOrderSummary para ver el resumen del pedido',
              'Usa nextStep para continuar con el proceso'
            ]
          };
        } else {
          return addResult;
        }
      }
    );

    // Shortcut: Crear cliente rápido con datos mínimos
    adapter.registerTool(
      {
        name: 'quickCreateClient',
        description: 'Shortcut para crear un cliente rápidamente con datos básicos y seleccionarlo automáticamente.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre completo del cliente' },
            document: { type: 'string', description: 'Documento de identificación' },
            email: { type: 'string', description: 'Correo electrónico (opcional)' },
            phone: { type: 'string', description: 'Número de teléfono (opcional)' }
          },
          required: ['name', 'document']
        }
      },
      async ({ name, document, email, phone }) => {
        // Validar datos básicos
        if (!name.trim() || !document.trim()) {
          return {
            success: false,
            error: 'Nombre y documento son obligatorios',
            suggestion: 'Proporciona al menos el nombre completo y documento del cliente'
          };
        }

        // Crear objeto cliente con datos mínimos
        const clienteData = {
          nombres_completos: name.trim(),
          documento: document.trim(),
          correo_electronico_comprador: email?.trim() || '',
          numero_celular_comprador: phone?.trim() || '',
          datosFacturacionElectronica: {
            nombres: name.trim(),
            documento: document.trim(),
            correoElectronico: email?.trim() || '',
            celular: phone?.trim() || '',
            tipoDocumento: 'CC', // Por defecto cédula
            ciudad: '',
            direccion: '',
            departamento: '',
            pais: 'Colombia'
          }
        };

        try {
          // Seleccionar cliente (esto internamente lo crea si no existe)
          const selectResult = await this.internalSelectClient(clienteData);
          
          if (selectResult.success) {
            // Actualizar paso actual
            this.pasoActual = 2; // Ir al paso de productos
            this.updateVisualStep('productos');

            return {
              success: true,
              clientCreated: {
                name: name,
                document: document,
                email: email || 'No proporcionado',
                phone: phone || 'No proporcionado'
              },
              message: `✅ Cliente ${name} creado y seleccionado exitosamente`,
              currentStep: 2,
              stepName: 'Selección de Productos',
              nextActions: [
                'Usa searchProducts o quickAddToCart para agregar productos',
                'Usa getAvailableSteps para ver el progreso completo'
              ]
            };
          } else {
            return selectResult;
          }
        } catch (error: any) {
          return {
            success: false,
            error: `Error al crear cliente: ${error.message}`,
            suggestion: 'Verifica que los datos sean válidos e intenta nuevamente'
          };
        }
      }
    );

    // Shortcut: Avance rápido con validación automática
    adapter.registerTool(
      {
        name: 'smartNextStep',
        description: 'Shortcut que avanza al siguiente paso automáticamente completando datos básicos si es posible.',
        parameters: {
          type: 'object',
          properties: {
            autoComplete: { 
              type: 'boolean', 
              description: 'Intentar completar automáticamente datos faltantes con valores por defecto (por defecto true)' 
            }
          }
        }
      },
      ({ autoComplete = true }) => {
        const validation = this.validateCurrentStep();
        
        if (validation.canProceed) {
          // Si puede proceder, avanzar normalmente
          return this.internalNextStep();
        }

        if (!autoComplete) {
          return {
            success: false,
            error: 'No se puede avanzar sin completar los requisitos',
            missingRequirements: validation.missingRequirements,
            suggestion: 'Completa la información faltante o usa smartNextStep con autoComplete=true'
          };
        }

        // Intentar autocompletar según el paso actual
        const completionAttempts = [];
        let canProceedAfterCompletion = false;

        switch (this.pasoActual) {
          case 4: // Facturación
            if (!this.pedidoEnProgreso.facturacion?.nombres && this.pedidoEnProgreso.cliente) {
              // Autocompletar facturación con datos del cliente
              this.pedidoEnProgreso.facturacion = {
                nombres: this.pedidoEnProgreso.cliente.nombres_completos || '',
                documento: this.pedidoEnProgreso.cliente.documento || '',
                correoElectronico: this.pedidoEnProgreso.cliente.correo_electronico_comprador || '',
                celular: this.pedidoEnProgreso.cliente.numero_celular_comprador || '',
                tipoDocumento: 'CC',
                ciudad: 'Bogotá', // Por defecto
                direccion: 'Dirección por confirmar',
                departamento: 'Cundinamarca',
                pais: 'Colombia',
                codigoPostal: '',
                indicativoCel: '57',
                alias: 'Facturación principal'
              };
              completionAttempts.push('✓ Datos de facturación autocompletados con información del cliente');
              canProceedAfterCompletion = true;
            }
            break;

          case 5: // Entrega
            if (!this.pedidoEnProgreso.envio?.direccionEntrega && this.pedidoEnProgreso.cliente) {
              // Autocompletar entrega básica
              this.pedidoEnProgreso.envio = {
                apellidos: '',
                nombres: this.pedidoEnProgreso.cliente.nombres_completos || '',
                direccionEntrega: 'Por confirmar con el cliente',
                ciudad: 'Bogotá',
                departamento: 'Cundinamarca',
                pais: 'Colombia',
                celular: this.pedidoEnProgreso.cliente.numero_celular_comprador || '',
                observaciones: 'Confirmar dirección exacta antes del despacho',
                barrio: '',
                indicativoOtroNumero: '',
                especificacionesInternas: '',
                otroNumero: '',
                indicativoCel: '57',
                alias: 'Entrega principal',
                codigoPV: '',
                nombreUnidad: '',
                zonaCobro: ''
              };
              completionAttempts.push('✓ Datos de entrega autocompletados (requieren confirmación posterior)');
              canProceedAfterCompletion = true;
            }
            break;

          case 7: // Pago
            if (!this.pedidoEnProgreso.formaDePago) {
              // Seleccionar método de pago por defecto
              this.pedidoEnProgreso.formaDePago = 'Efectivo';
              completionAttempts.push('✓ Método de pago establecido como Efectivo (se puede cambiar)');
              canProceedAfterCompletion = true;
            }
            break;
        }

        if (completionAttempts.length > 0 && canProceedAfterCompletion) {
          // Intentar avanzar después del autocompletado
          this.pasoActual++;
          this.updateVisualStep(this.getStepKeyForNumber(this.pasoActual));

          return {
            success: true,
            autoCompletions: completionAttempts,
            previousStep: this.pasoActual - 1,
            currentStep: this.pasoActual,
            stepName: this.getStepName(this.pasoActual),
            message: `✅ Paso avanzado con autocompletado. ${completionAttempts.length} elemento${completionAttempts.length > 1 ? 's' : ''} completado${completionAttempts.length > 1 ? 's' : ''} automáticamente.`,
            note: 'Los datos autocompletados pueden necesitar revisión y confirmación',
            nextActions: this.getNextActions(this._getProcessStatus())
          };
        } else {
          return {
            success: false,
            error: 'No se pudo autocompletar la información faltante para este paso',
            missingRequirements: validation.missingRequirements,
            currentStep: this.pasoActual,
            suggestion: 'Usa las herramientas específicas para completar la información requerida'
          };
        }
      }
    );

    // Shortcut: Estado completo del proceso en una vista
    adapter.registerTool(
      {
        name: 'getQuickStatus',
        description: 'Shortcut que muestra el estado completo del proceso de venta en un formato compacto y fácil de leer.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const cart = this.cartService.productInCart.getValue();
        const currentStepName = this.getStepName(this.pasoActual);
        
        // Calcular total rápido
        let totalEstimado = 0;
        if (cart) {
          cart.forEach(item => {
            const producto = (item.producto ?? null);
            const precio = producto?.precio?.precioUnitarioConIva || 0;
            totalEstimado += precio * (item.cantidad || 0);
          });
        }

        const quickStatus = {
          success: true,
          snapshot: {
            timestamp: new Date().toLocaleString('es-CO'),
            orderNumber: this.pedidoEnProgreso.nroPedido || 'Por generar',
            currentStep: `${this.pasoActual}/6 - ${currentStepName}`,
            warehouse: this.getBodegaActual()?.nombre || '❌ No seleccionada',
            client: this.pedidoEnProgreso.cliente?.nombres_completos || '❌ No seleccionado',
            itemsInCart: cart?.length || 0,
            estimatedTotal: `$${totalEstimado.toLocaleString()}`,
            paymentMethod: this.pedidoEnProgreso.formaDePago || '⏳ Pendiente'
          },
          
          completionStatus: {
            warehouse: !!this.bodegaSeleccionada,
            client: !!this.pedidoEnProgreso.cliente,
            products: cart && cart.length > 0,
            billing: !!this.pedidoEnProgreso.facturacion?.nombres,
            shipping: !!this.pedidoEnProgreso.envio?.direccionEntrega,
            payment: !!this.pedidoEnProgreso.formaDePago
          },

          progress: {
            completed: this.calculateCompletionPercentage(this._getProcessStatus()),
            readyToPay: this.pasoActual >= 5 && this.isReadyForPayment(),
            canProceed: this.validateCurrentStep().canProceed
          },

          quickActions: this.getQuickActionsForCurrentStep(),

          message: (this.pasoActual >= 5 && this.isReadyForPayment()) ? 
            `🎉 Pedido listo para procesar (${this.calculateCompletionPercentage(this._getProcessStatus())}% completo)` :
            `⚡ Proceso en curso: Paso ${this.pasoActual}/6 (${this.calculateCompletionPercentage(this._getProcessStatus())}% completo)`,

          suggestedNextAction: this.getSuggestedNextAction()
        };

        return quickStatus;
      }
    );

    // Shortcut: Finalizar pedido con validación express
    adapter.registerTool(
      {
        name: 'expressCheckout',
        description: 'Shortcut para finalizar el pedido rápidamente con validación automática y procesamiento express.',
        parameters: {
          type: 'object',
          properties: {
            paymentMethod: { 
              type: 'string', 
              description: 'Método de pago (por defecto Efectivo)' 
            },
            skipFinalValidation: { 
              type: 'boolean', 
              description: 'Omitir validación final detallada (por defecto false)' 
            }
          }
        }
      },
      async ({ paymentMethod = 'Efectivo', skipFinalValidation = false }) => {
        // Validación express
        if (!skipFinalValidation) {
          const validation = this.internalValidateOrderBeforePay();
          if (!validation.canProceedToPay) {
            return {
              success: false,
              error: 'El pedido no está listo para procesamiento express',
              validationErrors: validation.errors,
              suggestion: 'Usa validateOrderBeforePay para ver todos los problemas, o expressCheckout con skipFinalValidation=true para forzar el procesamiento'
            };
          }
        }

        // Ir directamente al paso de confirmación
        this.pasoActual = 8;
        this.updateVisualStep('confirmacion');

        // Procesar la venta
        const saleResult = await this.internalProcessSale(paymentMethod);

        if (saleResult.success) {
          return {
            success: true,
            expressProcessing: true,
            orderCreated: saleResult.summary,
            processingTime: 'Express (validación automática)',
            message: `🚀 ¡Pedido procesado exitosamente en modo express! ${saleResult.summary.orderNumber}`,
            nextAction: 'Sistema listo para nueva venta'
          };
        } else {
          return {
            success: false,
            error: 'Error en procesamiento express',
            details: saleResult.error,
            suggestion: 'Intenta con processSale normal o revisa los datos del pedido'
          };
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
        
        if (!cart || cart.length === 0) {
          return {
            success: false,
            error: 'No hay productos en el carrito para validar.',
            suggestion: 'Agrega productos al carrito usando addToCart antes de validar el stock.'
          };
        }

        const stockIssues: any[] = [];
        const validProducts: any[] = [];
        let totalProductsChecked = 0;

        cart.forEach((item: any) => {
          totalProductsChecked++;
          const stockDisponible = item.producto?.disponibilidad?.cantidadDisponible || 0;
          const productName = item.producto.crearProducto?.titulo || 'Producto sin nombre';
          
          if (item.cantidad > stockDisponible) {
            stockIssues.push({
              productId: item.producto.cd,
              productName: productName,
              requested: item.cantidad,
              available: stockDisponible,
              shortage: item.cantidad - stockDisponible,
              suggestedAction: stockDisponible > 0 ? 
                `Reduce la cantidad a ${stockDisponible} unidades` : 
                'Remueve este producto del carrito (sin stock)'
            });
          } else {
            validProducts.push({
              productId: item.producto.cd,
              productName: productName,
              quantity: item.cantidad,
              available: stockDisponible
            });
          }
        });

        if (stockIssues.length > 0) {
          const totalShortage = stockIssues.reduce((sum, issue) => sum + issue.shortage, 0);
          return { 
            success: false, 
            error: `Stock insuficiente para ${stockIssues.length} de ${totalProductsChecked} productos en el carrito.`,
            stockIssues,
            validProducts,
            summary: {
              totalProducts: totalProductsChecked,
              productsWithIssues: stockIssues.length,
              productsValid: validProducts.length,
              totalShortage: totalShortage
            },
            suggestion: 'Ajusta las cantidades o remueve los productos sin stock usando updateCartQuantity o removeFromCart.',
            nextActions: stockIssues.map(issue => 
              `updateCartQuantity(${issue.productId}, ${issue.available}) para "${issue.productName}"`
            )
          };
        }

        return { 
          success: true, 
          message: `Stock validado correctamente para todos los ${totalProductsChecked} productos en el carrito.`,
          validProducts,
          summary: {
            totalProducts: totalProductsChecked,
            allProductsValid: true,
            totalUnitsValidated: validProducts.reduce((sum, p) => sum + p.quantity, 0)
          },
          nextStep: 'El stock está confirmado. Puedes proceder con la configuración del cliente o procesar la venta.'
        };
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
        const validationResults = {
          warehouse: { valid: false, message: '', action: '' },
          cart: { valid: false, message: '', action: '' },
          client: { valid: false, message: '', action: '' },
          delivery: { valid: false, message: '', action: '' },
          billing: { valid: false, message: '', action: '' },
          stock: { valid: false, message: '', action: '', issues: [] as any[] }
        };

        // Validar bodega
        if (this.bodegaSeleccionada) {
          validationResults.warehouse = {
            valid: true,
            message: `Bodega "${this.bodegaSeleccionada.nombre}" seleccionada ✅`,
            action: ''
          };
        } else {
          validationResults.warehouse = {
            valid: false,
            message: 'No hay bodega seleccionada ❌',
            action: 'Usa selectWarehouse para elegir una bodega'
          };
        }

        // Validar carrito
        const cart = this.cartService.productInCart.getValue();
        if (cart && cart.length > 0) {
          validationResults.cart = {
            valid: true,
            message: `${cart.length} producto${cart.length > 1 ? 's' : ''} en el carrito ✅`,
            action: ''
          };
        } else {
          validationResults.cart = {
            valid: false,
            message: 'El carrito está vacío ❌',
            action: 'Usa addToCart para agregar productos'
          };
        }

        // Validar cliente
        if (this.pedidoEnProgreso.cliente) {
          validationResults.client = {
            valid: true,
            message: `Cliente: ${this.pedidoEnProgreso.cliente.nombres_completos} ✅`,
            action: ''
          };
        } else {
          validationResults.client = {
            valid: false,
            message: 'No hay cliente configurado ❌',
            action: 'Usa searchClient o setClientToOrder para configurar el cliente'
          };
        }

        // Validar entrega
        if (this.pedidoEnProgreso.envio && this.pedidoEnProgreso.envio.direccionEntrega) {
          validationResults.delivery = {
            valid: true,
            message: `Entrega: ${this.pedidoEnProgreso.envio.direccionEntrega} ✅`,
            action: ''
          };
        } else {
          validationResults.delivery = {
            valid: false,
            message: 'No hay información de entrega ❌',
            action: 'Usa setDeliveryInfo para configurar la entrega'
          };
        }

        // Validar facturación
        if (this.pedidoEnProgreso.facturacion && this.pedidoEnProgreso.facturacion.documento) {
          validationResults.billing = {
            valid: true,
            message: `Facturación: ${this.pedidoEnProgreso.facturacion.nombres} ✅`,
            action: ''
          };
        } else {
          validationResults.billing = {
            valid: false,
            message: 'No hay información de facturación ❌',
            action: 'Usa setBillingInfo para configurar la facturación'
          };
        }

        // Validar stock detalladamente
        if (cart && cart.length > 0) {
          const stockIssues: any[] = [];
          cart.forEach((item: any) => {
            const stockDisponible = item.producto?.disponibilidad?.cantidadDisponible || 0;
            if (item.cantidad > stockDisponible) {
              stockIssues.push({
                product: item.producto.crearProducto?.titulo,
                requested: item.cantidad,
                available: stockDisponible,
                action: `updateCartQuantity("${item.producto.cd}", ${stockDisponible})`
              });
            }
          });

          if (stockIssues.length === 0) {
            validationResults.stock = {
              valid: true,
              message: `Stock validado para todos los productos ✅`,
              action: '',
              issues: []
            };
          } else {
            validationResults.stock = {
              valid: false,
              message: `Stock insuficiente para ${stockIssues.length} producto${stockIssues.length > 1 ? 's' : ''} ❌`,
              action: 'Ajusta las cantidades con updateCartQuantity',
              issues: stockIssues
            };
          }
        }

        // Contar validaciones pasadas
        const validationCount = Object.values(validationResults).filter(r => r.valid).length;
        const totalValidations = Object.keys(validationResults).length;
        const completionPercentage = Math.round((validationCount / totalValidations) * 100);
        
        // Obtener errores y acciones pendientes
        const pendingActions = Object.entries(validationResults)
          .filter(([key, result]) => !result.valid)
          .map(([key, result]) => ({
            section: key,
            issue: result.message,
            action: result.action
          }));

        if (pendingActions.length > 0) {
          return { 
            success: false,
            validation: validationResults,
            summary: {
              completionPercentage,
              validationsCompleted: validationCount,
              totalValidations,
              pendingActions: pendingActions.length
            },
            pendingActions,
            message: `El pedido está ${completionPercentage}% completo. Quedan ${pendingActions.length} validación${pendingActions.length > 1 ? 'es' : ''} pendiente${pendingActions.length > 1 ? 's' : ''}.`,
            nextSteps: pendingActions.map(a => a.action).slice(0, 3) // Mostrar solo las primeras 3 acciones
          };
        }

        return { 
          success: true,
          validation: validationResults,
          summary: {
            completionPercentage: 100,
            validationsCompleted: validationCount,
            totalValidations,
            pendingActions: 0
          },
          message: '¡Perfecto! El pedido está completo y listo para procesar el pago. 🎉',
          nextStep: 'Usa processSale para finalizar la venta.',
          orderSummary: {
            orderNumber: this.pedidoEnProgreso.nroPedido,
            warehouse: this.bodegaSeleccionada?.nombre,
            client: this.pedidoEnProgreso.cliente?.nombres_completos,
            itemsCount: cart?.length || 0
          }
        };
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

    // === HERRAMIENTAS DE NAVEGACIÓN DEL PROCESO ===

    // Herramienta para ir a un paso específico del proceso
    adapter.registerTool(
      {
        name: 'goToStep',
        description: 'Navega a un paso específico del proceso de creación de pedidos. Los pasos disponibles son: cliente, productos, carrito, envio-facturacion, pago, confirmacion.',
        parameters: {
          type: 'object',
          properties: {
            step: {
              type: 'string',
              enum: ['cliente', 'productos', 'carrito', 'envio-facturacion', 'pago', 'confirmacion'],
              description: 'El paso al que se desea navegar'
            }
          },
          required: ['step']
        }
      },
      (args: { step: string }) => {
        const targetStep = this.getWizardStepsReales().find(s => s.key === args.step);
        if (!targetStep) {
          return {
            success: false,
            error: `Paso no válido: ${args.step}. Pasos disponibles: ${this.getWizardStepsReales().map(s => s.key).join(', ')}`
          };
        }

        this.pasoActual = targetStep.number;
        this.updateVisualStep(targetStep.key);

        return {
          success: true,
          currentStep: targetStep.number,
          stepName: targetStep.name,
          message: `Navegado al paso ${targetStep.number}: ${targetStep.name}`,
          availableActions: this.getNextActions(this._getProcessStatus())
        };
      }
    );

    // Herramienta para avanzar al siguiente paso
    adapter.registerTool(
      {
        name: 'nextStep',
        description: 'Avanza al siguiente paso en el proceso de creación de pedidos si es posible.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        if (this.pasoActual >= 6) {
          return { 
            success: false, 
            error: 'Ya estás en el último paso del proceso',
            currentStep: this.pasoActual
          };
        }

        // Validaciones básicas antes de avanzar
        const validationResult = this.validateCurrentStep();
        if (!validationResult.canProceed) {
          return {
            success: false,
            error: `No se puede avanzar: ${validationResult.reason}`,
            currentStep: this.pasoActual,
            missingRequirements: validationResult.missingRequirements
          };
        }

        this.pasoActual++;
        this.updateVisualStep(this.getStepKeyForNumber(this.pasoActual));

        const stepNames = {
          1: 'Selección de Cliente',
          2: 'Selección de Productos', 
          3: 'Revisión del Carrito',
          4: 'Datos de Facturación',
          5: 'Información de Entrega',
          6: 'Notas del Pedido',
          7: 'Método de Pago',
          8: 'Confirmación Final'
        };

        return {
          success: true,
          previousStep: this.pasoActual - 1,
          currentStep: this.pasoActual,
          stepName: stepNames[this.pasoActual],
          message: `Avanzado al paso ${this.pasoActual}: ${stepNames[this.pasoActual]}`,
          availableActions: this.getNextActions(this._getProcessStatus())
        };
      }
    );

    // Herramienta para retroceder al paso anterior
    adapter.registerTool(
      {
        name: 'previousStep',
        description: 'Retrocede al paso anterior en el proceso de creación de pedidos.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        if (this.pasoActual <= 1) {
          return { 
            success: false, 
            error: 'Ya estás en el primer paso del proceso',
            currentStep: this.pasoActual
          };
        }

        this.pasoActual--;
        this.updateVisualStep(this.getStepKeyForNumber(this.pasoActual));

        const stepNames = {
          1: 'Selección de Cliente',
          2: 'Selección de Productos', 
          3: 'Revisión del Carrito',
          4: 'Datos de Facturación',
          5: 'Información de Entrega',
          6: 'Notas del Pedido',
          7: 'Método de Pago',
          8: 'Confirmación Final'
        };

        return {
          success: true,
          previousStep: this.pasoActual + 1,
          currentStep: this.pasoActual,
          stepName: stepNames[this.pasoActual],
          message: `Retrocedido al paso ${this.pasoActual}: ${stepNames[this.pasoActual]}`,
          availableActions: this.getNextActions(this._getProcessStatus())
        };
      }
    );

    // Herramienta para obtener los pasos disponibles y el estado actual
    adapter.registerTool(
      {
        name: 'getAvailableSteps',
        description: 'Muestra todos los pasos disponibles en el proceso de creación de pedidos, incluyendo el paso actual y su estado de completitud.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const allSteps = this.getWizardStepsReales();

        const completedSteps = allSteps.filter(step => step.completed).length;
        const progressPercentage = Math.round((completedSteps / allSteps.length) * 100);

        return {
          success: true,
          currentStep: this.pasoActual,
          currentStepName: allSteps.find(step => step.current)?.name,
          allSteps: allSteps,
          progress: {
            completed: completedSteps,
            total: allSteps.length,
            percentage: progressPercentage
          },
          message: `Proceso en paso ${this.pasoActual}/${allSteps.length} (${progressPercentage}% completado)`,
          nextActions: this.getNextActions(this._getProcessStatus())
        };
      }
    );

    // =================== HERRAMIENTAS DE NAVEGACIÓN DE PASOS DEL WIZARD ===================

    // Herramienta para ir directamente a un paso específico del wizard
    adapter.registerTool(
      {
        name: 'goToWizardStep',
        description: 'Navega directamente a un paso específico del proceso de ventas si las validaciones lo permiten.',
        parameters: {
          type: 'object',
          properties: {
            stepNumber: { 
              type: 'integer', 
              description: 'Número del paso al que ir (1-7): 1=Productos, 2=Carrito, 3=Cliente, 4=Envío, 5=Facturación, 6=Pago, 7=Confirmación',
              minimum: 1,
              maximum: 7
            }
          },
          required: ['stepNumber']
        }
      },
      ({ stepNumber }) => {
        if (stepNumber < 1 || stepNumber > 7) {
          return {
            success: false,
            error: 'Número de paso inválido. Debe ser entre 1 y 7.',
            availableSteps: [
              '1: Productos (Selección de bodega y productos)',
              '2: Carrito (Revisión de productos)',
              '3: Cliente (Datos del cliente)',
              '4: Envío (Dirección de entrega)',
              '5: Facturación (Datos de facturación)',
              '6: Pago (Métodos de pago y resumen)',
              '7: Confirmación (Finalización del pedido)'
            ]
          };
        }

        // Validar si se puede ir al paso solicitado
        const currentStatus = this._getProcessStatus();
        const steps = this.getInitialProcessSteps();
        
        // Lógica de validación para cada paso
        const validationMessages: string[] = [];
        
        if (stepNumber >= 2) { // Carrito requiere bodega y productos
          if (!this.bodegaSeleccionada) {
            validationMessages.push('Debe seleccionar una bodega antes de ir al paso de carrito');
          }
          if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
            validationMessages.push('Debe agregar productos al carrito');
          }
        }
        
        if (stepNumber >= 3) { // Cliente requiere carrito con productos
          if (!currentStatus.completedSteps.products) {
            validationMessages.push('Debe completar la selección de productos antes de configurar el cliente');
          }
        }
        
        if (stepNumber >= 4) { // Envío requiere cliente
          if (!currentStatus.completedSteps.client) {
            validationMessages.push('Debe configurar los datos del cliente antes del envío');
          }
        }
        
        if (stepNumber >= 5) { // Facturación requiere envío (excepto si es recogida)
          const esRecogida = this.pedidoEnProgreso.formaEntrega?.toLowerCase().includes('recoge');
          if (!esRecogida && !currentStatus.completedSteps.delivery) {
            validationMessages.push('Debe configurar los datos de entrega antes de la facturación');
          }
        }
        
        if (stepNumber >= 6) { // Pago requiere facturación
          if (!currentStatus.completedSteps.billing) {
            validationMessages.push('Debe configurar los datos de facturación antes del pago');
          }
        }

        if (validationMessages.length > 0) {
          return {
            success: false,
            error: `No se puede avanzar al paso ${stepNumber}`,
            validationErrors: validationMessages,
            currentStep: this.pasoActual,
            suggestion: 'Complete los pasos anteriores antes de continuar',
            nextActions: this.getNextActions(currentStatus)
          };
        }

        // Si pasa todas las validaciones, ir al paso
        this.pasoActual = stepNumber;
        this.updateVisualStep(steps[stepNumber - 1].stepKey);

        return {
          success: true,
          currentStep: stepNumber,
          stepName: steps[stepNumber - 1].caption,
          stepKey: steps[stepNumber - 1].stepKey,
          message: `Navegando al paso ${stepNumber}: ${steps[stepNumber - 1].caption}`,
          processStatus: this._getProcessStatus()
        };
      }
    );

    // Herramienta para obtener información detallada del paso actual
    adapter.registerTool(
      {
        name: 'getCurrentStepInfo',
        description: 'Obtiene información detallada del paso actual del proceso de ventas.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const steps = this.getWizardStepsReales();
        const currentStepIndex = Math.max(0, Math.min(this.pasoActual - 1, steps.length - 1));
        const currentStep = steps[currentStepIndex];
        const processStatus = this._getProcessStatus();
        const bodegaActual = this.getBodegaActual();

        // Información específica según el paso actual (wizard real de 6 pasos)
        let stepSpecificInfo: any = {};

        switch (currentStep.number) {
          case 1: // Cliente
            stepSpecificInfo = {
              clientConfigured: !!this.pedidoEnProgreso.cliente,
              clientInfo: this.pedidoEnProgreso.cliente ? {
                name: this.pedidoEnProgreso.cliente.nombres_completos,
                document: this.pedidoEnProgreso.cliente.documento,
                email: this.pedidoEnProgreso.cliente.correo_electronico_comprador
              } : null,
              nextAction: !this.pedidoEnProgreso.cliente ?
                'Usa searchClient para buscar un cliente o setClientToOrder para crear uno nuevo' :
                'Cliente configurado. Continúa con la selección de productos'
            };
            break;

          case 2: // Productos
            stepSpecificInfo = {
              warehouses: bodegaActual ?
                { selected: bodegaActual.nombre, id: bodegaActual.idBodega } :
                { message: 'No hay bodega seleccionada' },
              nextAction: !bodegaActual ?
                'Usa selectWarehouse para elegir una bodega' :
                'Usa searchProducts para buscar productos o addToCart para agregar al carrito'
            };
            break;

          case 3: { // Carrito y notas
            const cart = this.cartService.productInCart.getValue();
            stepSpecificInfo = {
              itemsInCart: cart?.length || 0,
              cartTotal: this.calculateCartTotal(),
              nextAction: (cart?.length || 0) > 0 ?
                'Revisa el carrito y continúa con envío y facturación' :
                'Agrega productos al carrito con addToCart'
            };
            break;
          }

          case 4: // Envío y facturación (un solo paso con dos pestañas)
            stepSpecificInfo = {
              deliveryConfigured: !!this.pedidoEnProgreso.envio,
              deliveryInfo: this.pedidoEnProgreso.envio ? {
                address: this.pedidoEnProgreso.envio.direccionEntrega,
                city: this.pedidoEnProgreso.envio.ciudad,
                method: this.pedidoEnProgreso.formaEntrega
              } : null,
              isPickup: this.pedidoEnProgreso.formaEntrega?.toLowerCase().includes('recoge'),
              billingConfigured: !!this.pedidoEnProgreso.facturacion,
              billingInfo: this.pedidoEnProgreso.facturacion ? {
                name: this.pedidoEnProgreso.facturacion.nombres,
                document: this.pedidoEnProgreso.facturacion.documento,
                address: this.pedidoEnProgreso.facturacion.direccion
              } : null,
              nextAction: !this.pedidoEnProgreso.envio ?
                'Usa setDeliveryInfo para configurar la entrega' :
                (!this.pedidoEnProgreso.facturacion ?
                  'Usa setBillingInfo para configurar la facturación' :
                  'Envío y facturación configurados. Continúa al resumen y pago')
            };
            break;

          case 5: // Resumen y pago
            stepSpecificInfo = {
              paymentMethodSelected: !!this.pedidoEnProgreso.formaDePago,
              paymentMethod: this.pedidoEnProgreso.formaDePago || 'No seleccionado',
              orderTotals: {
                subtotal: this.pedidoEnProgreso.subtotal || 0,
                shipping: this.pedidoEnProgreso.totalEnvio || 0,
                taxes: this.pedidoEnProgreso.totalImpuesto || 0,
                total: this.pedidoEnProgreso.totalPedididoConDescuento || 0
              },
              readyToProcess: processStatus.readyForPayment,
              nextAction: processStatus.readyForPayment ?
                'Usa processSale para finalizar la venta' :
                'Completa la información faltante antes de procesar'
            };
            break;

          case 6: // Confirmación
            stepSpecificInfo = {
              orderProcessed: this.pedidoEnProgreso.estadoProceso !== 'SinProducir',
              orderNumber: this.pedidoEnProgreso.nroPedido,
              orderStatus: this.pedidoEnProgreso.estadoProceso,
              paymentStatus: this.pedidoEnProgreso.estadoPago,
              nextAction: 'Proceso completado. El pedido ha sido creado exitosamente.'
            };
            break;
        }

        return {
          success: true,
          currentStep: {
            number: currentStep.number,
            name: currentStep.name,
            key: currentStep.key,
            description: currentStep.description
          },
          stepSpecificInfo,
          processStatus,
          navigation: {
            canGoBack: this.pasoActual > 1,
            canGoForward: this.pasoActual < steps.length && this.validateCurrentStep().canProceed,
            availableSteps: steps.map((step) => ({
              number: step.number,
              name: step.name,
              key: step.key,
              accessible: this.canAccessStep(step.number)
            }))
          },
          completionPercentage: this.calculateCompletionPercentage(processStatus),
          nextActions: this.getNextActions(processStatus)
        };
      }
    );

    // Herramienta para obtener el mapa completo del proceso y navegación
    adapter.registerTool(
      {
        name: 'getWizardMap',
        description: 'Obtiene un mapa completo del proceso de ventas con el estado de cada paso.',
        parameters: { type: 'object', properties: {} }
      },
      () => {
        const steps = this.getWizardStepsReales();
        const processStatus = this._getProcessStatus();

        const stepMap = steps.map((step) => {
          const stepNumber = step.number;
          return {
            number: stepNumber,
            name: step.name,
            key: step.key,
            status: {
              isCurrent: step.current,
              isCompleted: step.completed,
              canAccess: this.canAccessStep(stepNumber),
              description: this.getStepStatusDescription(stepNumber)
            }
          };
        });

        return {
          success: true,
          wizardMap: stepMap,
          currentStep: this.pasoActual,
          processStatus,
          summary: {
            totalSteps: steps.length,
            completedSteps: stepMap.filter(s => s.status.isCompleted).length,
            accessibleSteps: stepMap.filter(s => s.status.canAccess).length,
            completionPercentage: this.calculateCompletionPercentage(processStatus)
          },
          navigation: {
            canGoBack: this.pasoActual > 1,
            canGoForward: this.pasoActual < steps.length && this.validateCurrentStep().canProceed,
            recommendedNextStep: this.getRecommendedNextStep()
          },
          quickActions: this.getQuickActionsForCurrentStep()
        };
      }
    );
  }

  // Métodos auxiliares requeridos por las nuevas herramientas de navegación
  private getStepDescription(stepNumber: number): string {
    return this.getWizardStepsReales().find(s => s.number === stepNumber)?.description || 'Paso no identificado';
  }

  private canAccessStep(stepNumber: number): boolean {
    // Lógica para determinar si se puede acceder a un paso específico
    if (stepNumber <= 1) return true; // Siempre se puede acceder al primer paso
    
    // Se puede acceder a un paso si todos los pasos anteriores están completos o es el paso siguiente
    for (let i = 1; i < stepNumber; i++) {
      if (!this.isStepCompleted(i) && i < this.pasoActual) {
        return false;
      }
    }
    return stepNumber <= this.pasoActual + 1; // Permitir el paso actual + 1
  }

  private isStepCompleted(stepNumber: number): boolean {
    return this.getWizardStepsReales().find(s => s.number === stepNumber)?.completed ?? false;
  }

  private getStepStatusDescription(stepNumber: number): string {
    const isCompleted = this.isStepCompleted(stepNumber);
    const canAccess = this.canAccessStep(stepNumber);
    const isCurrent = this.pasoActual === stepNumber;
    
    if (isCurrent) return 'Paso actual';
    if (isCompleted) return 'Completado';
    if (canAccess) return 'Disponible';
    return 'Bloqueado';
  }

  private getStepRequirements(stepNumber: number): string[] {
    const requirements: { [key: number]: string[] } = {
      1: ['Tener una bodega seleccionada'],
      2: ['Al menos un producto en el carrito'],
      3: ['Productos seleccionados'],
      4: ['Cliente seleccionado'],
      5: ['Información de envío configurada'],
      6: ['Datos de facturación completos'],
      7: ['Método de pago seleccionado']
    };
    return requirements[stepNumber] || [];
  }

  private getStepAvailableActions(stepNumber: number): string[] {
    const actions: { [key: number]: string[] } = {
      1: ['Buscar productos', 'Agregar al carrito', 'Cambiar bodega'],
      2: ['Modificar cantidades', 'Aplicar descuentos', 'Eliminar productos'],
      3: ['Buscar cliente', 'Crear cliente nuevo', 'Editar cliente'],
      4: ['Configurar dirección', 'Seleccionar método de envío', 'Calcular costos'],
      5: ['Completar datos fiscales', 'Seleccionar tipo de documento'],
      6: ['Elegir método de pago', 'Configurar datos de pago'],
      7: ['Revisar pedido', 'Confirmar y crear', 'Volver a pasos anteriores']
    };
    return actions[stepNumber] || [];
  }

  private getRecommendedNextStep(): number {
    // Recomienda el siguiente paso lógico basado en el estado actual
    for (let step = 1; step <= 7; step++) {
      if (!this.isStepCompleted(step)) {
        return step;
      }
    }
    return 7; // Si todo está completo, ir a confirmación
  }

  private getQuickActionsForCurrentStep(): string[] {
    return this.getStepAvailableActions(this.pasoActual);
  }

  // Método auxiliar para validar si se puede avanzar desde el paso actual
  private validateCurrentStep(): { canProceed: boolean; reason?: string; missingRequirements?: string[] } {
    const missing: string[] = [];

    switch (this.pasoActual) {
      case 1: // Productos
        if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
          missing.push('Agregar al menos un producto al carrito');
        }
        break;
      case 2: // Carrito
        if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
          missing.push('El carrito no puede estar vacío');
        }
        break;
      case 3: // Cliente
        if (!this.pedidoEnProgreso.cliente) {
          missing.push('Seleccionar un cliente');
        }
        break;
      case 4: // Envío
        if (!this.pedidoEnProgreso.envio?.direccionEntrega) {
          missing.push('Completar dirección de entrega');
        }
        break;
      case 5: // Facturación
        if (!this.pedidoEnProgreso.facturacion?.nombres) {
          missing.push('Completar datos de facturación');
        }
        break;
      case 6: // Pago
        if (!this.pedidoEnProgreso.formaDePago) {
          missing.push('Seleccionar método de pago');
        }
        break;
      case 7: // Confirmación - último paso
        break;
    }

    if (missing.length > 0) {
      return {
        canProceed: false,
        reason: `Faltan requisitos en el paso actual`,
        missingRequirements: missing
      };
    }

    return { canProceed: true };
  }

  // Métodos auxiliares para mejorar la búsqueda de productos
  private getAvailableCategories(): string[] {
    const categories = new Set<string>();
    
    this.productosCatalogo.forEach(producto => {
      // Agregar etiquetas de exposición
      if (producto.exposicion?.etiquetas) {
        producto.exposicion.etiquetas.forEach(etiqueta => categories.add(etiqueta));
      }
      
      // Agregar categorías principales
      if (producto.categorias?.label) {
        categories.add(producto.categorias.label);
      }
      
      // Agregar subcategorías si existen
      if (producto.categorias?.children) {
        producto.categorias.children.forEach(child => {
          if (child.label) categories.add(child.label);
        });
      }
    });
    
    return Array.from(categories).sort();
  }

  private getPriceRange(): { min: number; max: number; average: number } {
    const prices = this.productosCatalogo
      .map(p => p.precio?.precioUnitarioConIva || 0)
      .filter(price => price > 0);
    
    if (prices.length === 0) {
      return { min: 0, max: 0, average: 0 };
    }
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
    
    return { min, max, average };
  }

  private getStepName(stepNumber: number): string {
    return this.getWizardStepsReales().find(s => s.number === stepNumber)?.name || 'Paso desconocido';
  }
  
  private getStepKeyForNumber(stepNumber: number): string {
    return this.getWizardStepsReales().find(s => s.number === stepNumber)?.key || 'cliente';
  }


  private getSuggestedNextAction(): string {
    const cart = this.cartService.productInCart.getValue();
    
    if (!this.bodegaSeleccionada) {
      return 'Selecciona una bodega con selectWarehouse';
    }
    
    if (!this.pedidoEnProgreso.cliente) {
      return 'Crea o selecciona un cliente con quickCreateClient';
    }
    
    if (!cart || cart.length === 0) {
      return 'Agrega productos al carrito con quickAddToCart';
    }
    
    if (this.pasoActual < 4) {
      return 'Avanza al siguiente paso con smartNextStep';
    }
    
    if (!this.pedidoEnProgreso.facturacion?.nombres) {
      return 'Completa datos de facturación con smartNextStep';
    }
    
    if (!this.pedidoEnProgreso.envio?.direccionEntrega) {
      return 'Completa datos de entrega con smartNextStep';
    }
    
    if (this.pasoActual >= 7) {
      return 'Finaliza el pedido con expressCheckout';
    }
    
    return 'Continúa con nextStep o smartNextStep';
  }

  private isReadyForPayment(): boolean {
    const cart = this.cartService.productInCart.getValue();
    return !!(
      this.bodegaSeleccionada &&
      this.pedidoEnProgreso.cliente &&
      cart && cart.length > 0 &&
      this.pedidoEnProgreso.facturacion?.nombres &&
      this.pedidoEnProgreso.envio?.direccionEntrega
    );
  }

  // Métodos internos para evitar dependencias circulares
  private internalValidateOrderBeforePay() {
    const cart = this.cartService.productInCart.getValue();
    const canProceed = !!(
      this.bodegaSeleccionada &&
      this.pedidoEnProgreso.cliente &&
      cart && cart.length > 0 &&
      this.pedidoEnProgreso.facturacion?.nombres &&
      this.pedidoEnProgreso.envio?.direccionEntrega
    );

    return {
      canProceedToPay: canProceed,
      errors: canProceed ? [] : ['Faltan datos requeridos para el procesamiento']
    };
  }

  private async internalProcessSale(paymentMethod: string) {
    try {
      const cart = this.cartService.productInCart.getValue();
      
      // Validaciones básicas
      if (!this.bodegaSeleccionada || !this.pedidoEnProgreso.cliente || !cart || cart.length === 0) {
        return {
          success: false,
          error: 'Faltan datos requeridos para procesar la venta'
        };
      }

      // Configurar datos del pedido
      this.pedidoEnProgreso.carrito = cart;
      this.pedidoEnProgreso.formaDePago = paymentMethod;
      // Asegurar fechaEntrega para filtro en lista de pedidos
      if (!this.pedidoEnProgreso.fechaEntrega) {
        this.pedidoEnProgreso.fechaEntrega = new Date().toISOString();
      }
      
      // Calcular totales
      this.pedidosUtilService.pedido = this.pedidoEnProgreso;
      this.pedidoEnProgreso.subtotal = this.pedidosUtilService.getSubtotal();
      this.pedidoEnProgreso.totalImpuesto = this.pedidosUtilService.checkIVAPrice();
      this.pedidoEnProgreso.totalPedididoConDescuento = (this.pedidoEnProgreso.subtotal || 0) + (this.pedidoEnProgreso.totalImpuesto || 0) + (this.pedidoEnProgreso.totalEnvio || 0);
      
      // Generar contenido HTML para email
      const htmlContent = this.paymentService.getHtmlContent(this.pedidoEnProgreso);
      
      // Crear el pedido
      const result = await this.ventasService.createOrder({ 
          order: this.pedidoEnProgreso, 
          emailHtml: htmlContent 
      }).toPromise();
      
      const orderSummary = {
          orderNumber: this.pedidoEnProgreso.nroPedido,
          client: this.pedidoEnProgreso.cliente?.nombres_completos,
          total: this.pedidoEnProgreso.totalPedididoConDescuento,
          paymentMethod: paymentMethod,
          itemsCount: cart.length
      };

      // Guardar copia antes de reiniciar
      const createdOrder = { ...this.pedidoEnProgreso };
      this.inicializarNuevoPedido();
      
      this.toastr.success(`¡Venta completada exitosamente!`, 'Pedido Creado');
      
      return { 
          success: true, 
          order: result,
          summary: orderSummary,
          message: `¡Excelente! Pedido ${orderSummary.orderNumber} creado exitosamente para ${orderSummary.client}. Total: $${orderSummary.total?.toLocaleString()}. Sistema listo para la siguiente venta.`
      };
    } catch (e: any) {
      this.toastr.error('Error al procesar la venta', 'Error');
      return { 
          success: false, 
          error: `Error al crear el pedido: ${e?.message || 'Error desconocido'}`
      };
    }
  }

  private async internalAddToCart(productId: string, quantity: number = 1) {
    const product = this.productosCatalogo.find(p => p.cd === productId);
    
    if (!product) {
      return {
        success: false,
        error: `Producto con ID ${productId} no encontrado`
      };
    }

    const cantidadDisponible = product.disponibilidad?.cantidadDisponible || 0;
    
    if (quantity > cantidadDisponible) {
      return {
        success: false,
        error: `Stock insuficiente. Disponible: ${cantidadDisponible}, solicitado: ${quantity}`
      };
    }

    const productoCompra = {
      producto: product,
      configuracion: {
        producto: product,
        datosEntrega: null,
        cantidad: quantity,
        preferencias: [],
        adiciones: [],
        tarjetas: []
      },
      cantidad: quantity
    };

    this.cartService.addToCart(productoCompra);
    this.pedidoEnProgreso.carrito = this.cartService.productInCart.getValue();

    return {
      success: true,
      productAdded: {
        name: product.crearProducto?.titulo,
        quantity: quantity,
        price: product.precio?.precioUnitarioConIva || 0
      },
      cartTotal: this.calculateCartTotal()
    };
  }

  private async internalSelectClient(clienteData: any) {
    this.pedidoEnProgreso.cliente = clienteData;
    
    return {
      success: true,
      clientInfo: this.pedidoEnProgreso.cliente
    };
  }

  private internalNextStep() {
    if (this.pasoActual >= 6) {
      return { 
        success: false, 
        error: 'Ya estás en el último paso del proceso',
        currentStep: this.pasoActual
      };
    }

    const validation = this.validateCurrentStep();
    if (!validation.canProceed) {
      return {
        success: false,
        error: `No se puede avanzar: ${validation.reason}`,
        currentStep: this.pasoActual,
        missingRequirements: validation.missingRequirements
      };
    }

    this.pasoActual++;
    this.updateVisualStep(this.getStepKeyForNumber(this.pasoActual));

    const stepNames = {
      1: 'Selección de Cliente',
      2: 'Selección de Productos', 
      3: 'Revisión del Carrito',
      4: 'Datos de Facturación',
      5: 'Información de Entrega',
      6: 'Notas del Pedido',
      7: 'Método de Pago',
      8: 'Confirmación Final'
    };

    return {
      success: true,
      previousStep: this.pasoActual - 1,
      currentStep: this.pasoActual,
      stepName: stepNames[this.pasoActual],
      message: `Avanzado al paso ${this.pasoActual}: ${stepNames[this.pasoActual]}`
    };
  }

  private calculateCartTotal(): string {
    const cart = this.cartService.productInCart.getValue();
    if (!cart || cart.length === 0) {
      return '$0';
    }

    const total = cart.reduce((acc, item) => {
      const producto = (item.producto ?? null);
      const precio = producto?.precio?.precioUnitarioConIva || 0;
      const cantidad = item.cantidad || 0;
      return acc + (precio * cantidad);
    }, 0);

    return `$${total.toLocaleString()}`;
  }
} 