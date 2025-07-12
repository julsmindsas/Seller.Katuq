import { Injectable } from '@angular/core';
import { ToolRegistrar } from './tool-registrar';
import { ToolAdapter } from './tool-adapter';
import { VentasService } from '../ventas/ventas.service';
import { PaymentService } from '../ventas/payment.service';
import { ToastrService } from 'ngx-toastr';
import { UtilsService } from '../utils.service';
import { Carrito, Pedido, Cliente, Facturacion, Envio, EstadoProceso, EstadoPago } from '../../../components/ventas/modelo/pedido';

@Injectable({ providedIn: 'root' })
export class OrderToolsRegistrarService implements ToolRegistrar {
  // Estado interno del proceso de venta
  private currentSaleProcess = {
    step: 0,
    cart: [] as any[],
    client: null as any,
    deliveryInfo: null as any,
    billingInfo: null as any,
    paymentInfo: null as any,
    completed: false
  };

  // Catálogo simulado (idéntico al usado en FloatingButton)
  private catalogProducts = [] as any[];

  constructor(
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private toastr: ToastrService,
    private utils: UtilsService
  ) {
    // Por simplicidad copiamos una referencia al catálogo ya existente
    // En producción debería cargarse desde un servicio compartido.
  }

  register(adapter: ToolAdapter): void {
    // searchProducts
    adapter.registerTool(
      {
        name: 'searchProducts',
        description: 'Busca productos en catálogo',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'integer' }
          },
          required: ['query']
        }
      },
      async ({ query, category, limit }) => {
        let results = this.catalogProducts;
        if (query) {
          const q = query.toLowerCase();
          results = results.filter(p => p.crearProducto.titulo.toLowerCase().includes(q));
        }
        if (category) {
          results = results.filter(p => p.exposicion?.etiquetas?.includes(category));
        }
        if (limit && limit > 0) {
          results = results.slice(0, limit);
        }
        return { success: true, products: results };
      }
    );

    // addToCart
    adapter.registerTool(
      {
        name: 'addToCart',
        description: 'Añade producto al carrito',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'integer', default: 1 }
          },
          required: ['productId']
        }
      },
      ({ productId, quantity }) => {
        const product = this.catalogProducts.find(p => p.cd === productId);
        if (!product) {
          return { success: false, error: 'Producto no encontrado' };
        }
        const existing = this.currentSaleProcess.cart.find((c: any) => c.product.id === productId);
        if (existing) {
          existing.quantity += quantity;
          existing.total = existing.quantity * product.precio.precioUnitarioConIva;
        } else {
          this.currentSaleProcess.cart.push({
            product: {
              id: product.cd,
              name: product.crearProducto.titulo,
              price: product.precio.precioUnitarioConIva
            },
            quantity,
            total: quantity * product.precio.precioUnitarioConIva
          });
        }
        this.currentSaleProcess.step = Math.max(this.currentSaleProcess.step, 2);
        return { success: true, cart: this.currentSaleProcess.cart };
      }
    );

    // getCartContents
    adapter.registerTool(
      {
        name: 'getCartContents',
        description: 'Devuelve los items del carrito',
        parameters: { type: 'object', properties: {} }
      },
      () => ({ success: true, items: this.currentSaleProcess.cart })
    );

    // resetSaleProcess
    adapter.registerTool(
      { name: 'resetSaleProcess', description: 'Reinicia el proceso de venta', parameters: { type: 'object', properties: {} } },
      () => {
        this.currentSaleProcess = {
          step: 0,
          cart: [],
          client: null,
          deliveryInfo: null,
          billingInfo: null,
          paymentInfo: null,
          completed: false
        };
        return { success: true };
      }
    );

    // setClientInfo
    adapter.registerTool(
      {
        name: 'setClientInfo',
        description: 'Guarda información del cliente',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            isNewClient: { type: 'boolean' }
          },
          required: ['name', 'email', 'address']
        }
      },
      (args) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(args.email)) {
          return { success: false, error: 'Email no válido' };
        }
        if (!args.address || args.address.trim().length === 0) {
          return { success: false, error: 'La dirección es obligatoria' };
        }
        this.currentSaleProcess.client = {
          name: args.name,
          email: args.email,
          phone: args.phone || 'No especificado',
          address: args.address,
          isNewClient: !!args.isNewClient,
          id: args.isNewClient ? 'NUEVO' : 'CL' + Math.floor(Math.random() * 10000)
        };
        this.currentSaleProcess.step = Math.max(this.currentSaleProcess.step, 3);
        return { success: true, clientInfo: this.currentSaleProcess.client };
      }
    );

    // setBillingInfo
    adapter.registerTool(
      {
        name: 'setBillingInfo',
        description: 'Guarda información de facturación',
        parameters: {
          type: 'object',
          properties: {
            taxId: { type: 'string' },
            billingAddress: { type: 'string' },
            billingEmail: { type: 'string' }
          }
        }
      },
      (args) => {
        this.currentSaleProcess.billingInfo = {
          taxId: args.taxId || 'N/A',
          billingAddress: args.billingAddress || this.currentSaleProcess.client?.address || '',
          billingEmail: args.billingEmail || this.currentSaleProcess.client?.email || '',
          billingDate: new Date().toISOString().split('T')[0]
        };
        this.currentSaleProcess.step = Math.max(this.currentSaleProcess.step, 4);
        return { success: true, billingInfo: this.currentSaleProcess.billingInfo };
      }
    );

    // setDeliveryInfo
    adapter.registerTool(
      {
        name: 'setDeliveryInfo',
        description: 'Guarda información de entrega',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            city: { type: 'string' },
            zipCode: { type: 'string' },
            deliveryDate: { type: 'string' }
          },
          required: ['address']
        }
      },
      (args) => {
        this.currentSaleProcess.deliveryInfo = {
          address: args.address,
          city: args.city || 'Ciudad',
          zipCode: args.zipCode || '',
          deliveryDate: args.deliveryDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          deliveryMethod: 'Estándar'
        };
        this.currentSaleProcess.step = Math.max(this.currentSaleProcess.step, 5);
        return { success: true, deliveryInfo: this.currentSaleProcess.deliveryInfo };
      }
    );

    // getCurrentSaleProcess
    adapter.registerTool(
      {
        name: 'getCurrentSaleProcess',
        description: 'Obtiene el estado del proceso de venta',
        parameters: { type: 'object', properties: {} }
      },
      () => ({ success: true, process: this.currentSaleProcess })
    );

    // processSale (versión simplificada)
    adapter.registerTool(
      {
        name: 'processSale',
        description: 'Procesa el pedido y lo envía al backend',
        parameters: {
          type: 'object',
          properties: {
            paymentMethod: { type: 'string' },
            notes: { type: 'string' }
          }
        }
      },
      async ({ paymentMethod, notes }) => {
        if (!this.currentSaleProcess.client || !this.currentSaleProcess.deliveryInfo || this.currentSaleProcess.cart.length === 0) {
          return { success: false, error: 'Información incompleta para procesar la venta' };
        }

        this.currentSaleProcess.paymentInfo = {
          method: paymentMethod || 'Efectivo',
          date: new Date().toISOString(),
          notes: notes || '',
          status: 'Procesado'
        };

        const subtotal = this.currentSaleProcess.cart.reduce((s, i) => s + i.total, 0);
        const taxes = subtotal * 0.16;
        const total = subtotal + taxes;

        // Construimos objeto Pedido muy reducido (demo)
        const pedido: Pedido = {
          referencia: `REF-${Date.now()}`,
          nroPedido: 'ORD' + Math.floor(Math.random() * 100000),
          cliente: { nombres_completos: this.currentSaleProcess.client.name } as Cliente,
          carrito: [] as Carrito[],
          formaDePago: paymentMethod || 'Efectivo',
          subtotal,
          totalImpuesto: taxes,
          totalPedididoConDescuento: total,
          envio: { direccionEntrega: this.currentSaleProcess.deliveryInfo.address } as Envio,
          estadoProceso: EstadoProceso.SinProducir,
          estadoPago: EstadoPago.Pendiente,
          fechaCreacion: new Date().toISOString()
        };

        try {
          await this.ventasService.validateNroPedido(pedido.nroPedido as string).toPromise();
          const htmlContent = this.paymentService.getHtmlContent(pedido);
          await this.ventasService.createOrder({ order: pedido, emailHtml: htmlContent }).toPromise();
          this.toastr.success(`Pedido ${pedido.nroPedido} creado`, 'Pedido');
          this.currentSaleProcess.completed = true;
          this.currentSaleProcess.step = 7;
          return { success: true, pedido };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Error al crear pedido' };
        }
      }
    );

    // searchCatalog (API)
    adapter.registerTool(
      {
        name: 'searchCatalog',
        description: 'Busca productos en el catálogo usando la API de ventas',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'integer' }
          },
          required: ['query']
        }
      },
      async ({ query, category, limit }) => {
        try {
          let results = await this.ventasService.findProduct(query).toPromise();
          if (Array.isArray(results)) {
            if (category) {
              results = results.filter((p: any) =>
                p?.exposicion?.etiquetas?.includes(category)
              );
            }
            if (limit && limit > 0) {
              results = results.slice(0, limit);
            }
          }
          return { success: true, products: results };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Error al buscar productos' };
        }
      }
    );
  }
} 