import { Component, OnInit } from '@angular/core';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-venta-asistida',
  templateUrl: './venta-asistida.component.html',
  styleUrls: ['./venta-asistida.component.scss']
})
export class VentaAsistidaComponent implements OnInit {
  clientesFiltrados: any[] = [];
  clienteSeleccionado: any = null;
  terminoBusqueda: string = '';
  productosCarrito: any[] = [];
  metodosPago: any[] = [];
  metodoPagoSeleccionado: any = null;
  loadingVenta: boolean = false;
  ventaExitosa: boolean = false;
  errorVenta: string | null = null;
  datosFacturacion: any = null;
  datosEntrega: any = null;
  costoEnvio: number = 0;
  advertenciaCobertura: string | null = null;
  productosFiltrados: any[] = [];
  productoSeleccionado: any = null;
  loadingProductos: boolean = false;
  errorStockProducto: string | null = null;
  mostrarModalCliente: boolean = false;

  constructor(private maestroService: MaestroService, private ventasService: VentasService, private messageService: MessageService) { }

  ngOnInit(): void {
    // Inicialización de la venta asistida
    this.cargarMetodosPago();
  }

  cargarMetodosPago(): void {
    this.maestroService.consultarFormaPago().subscribe((res: any) => {
      this.metodosPago = Array.isArray(res) ? res : (res?.formasPago || []);
    });
  }

  seleccionarMetodoPago(metodo: any): void {
    this.metodoPagoSeleccionado = metodo;
  }

  buscarClientes(event: any): void {
    const query = event.query;
    if (!query || query.length < 2) {
      this.clientesFiltrados = [];
      return;
    }
    this.maestroService.obtenerClientes().subscribe((clientes: any) => {
      this.clientesFiltrados = clientes.filter((cliente: any) =>
        (cliente.nombres_completos && cliente.nombres_completos.toLowerCase().includes(query.toLowerCase())) ||
        (cliente.documento && cliente.documento.toLowerCase().includes(query.toLowerCase()))
      );
    });
  }

  onClienteSeleccionado(cliente: any): void {
    this.clienteSeleccionado = cliente;
  }

  get subtotalCarrito(): number {
    return this.productosCarrito.reduce((acc, prod) => acc + (prod.precio?.precioUnitarioConIva * prod.cantidad), 0);
  }

  limpiarCarrito(): void {
    this.productosCarrito = [];
  }

  onEntregaChange(entrega: any) {
    this.datosEntrega = entrega;
    this.actualizarCostoEnvioYCobertura();
  }

  actualizarCostoEnvioYCobertura() {
    this.costoEnvio = 0;
    this.advertenciaCobertura = null;
    if (!this.datosEntrega || !this.datosEntrega.zonaCobro) return;
    const zona = this.obtenerZonaSeleccionada();
    if (zona) {
      // Buscar campo de costo
      this.costoEnvio = zona.valor || zona.costo || zona.tarifa || 0;
      // Validar cobertura
      if (zona.ciudades && Array.isArray(zona.ciudades)) {
        if (!zona.ciudades.includes(this.datosEntrega.ciudad)) {
          this.advertenciaCobertura = 'La ciudad seleccionada no está cubierta por la zona de envío.';
        }
      } else if (zona.departamentos && Array.isArray(zona.departamentos)) {
        if (!zona.departamentos.includes(this.datosEntrega.departamento)) {
          this.advertenciaCobertura = 'El departamento seleccionado no está cubierto por la zona de envío.';
        }
      }
    }
  }

  obtenerZonaSeleccionada() {
    if (!this.datosEntrega || !this.datosEntrega.zonaCobro) return null;
    // Buscar la zona en el array de zonasCobro del subcomponente (emitirlo si es necesario)
    // Por simplicidad, buscar en la última entrega recibida
    const zonas = (window as any).zonasCobroGlobal || [];
    return zonas.find((z: any) => z.id == this.datosEntrega.zonaCobro || z.nombre == this.datosEntrega.zonaCobro || z.descripcion == this.datosEntrega.zonaCobro);
  }

  get totalPedido(): number {
    return this.subtotalCarrito + (this.costoEnvio || 0);
  }

  get puedeConfirmarVenta(): boolean {
    const facturacionValida = this.datosFacturacion && Object.values(this.datosFacturacion).every(v => v !== '' && v !== null && v !== undefined);
    const entregaValida = this.datosEntrega && Object.values(this.datosEntrega).every(v => v !== '' && v !== null && v !== undefined);
    return !!(this.clienteSeleccionado && this.productosCarrito.length > 0 && this.metodoPagoSeleccionado && facturacionValida && entregaValida && !this.advertenciaCobertura);
  }

  onFacturacionChange(facturacion: any) {
    this.datosFacturacion = facturacion;
  }

  confirmarVenta(): void {
    if (!this.puedeConfirmarVenta) return;
    this.loadingVenta = true;
    this.ventaExitosa = false;
    this.errorVenta = null;
    const pedido = {
      cliente: this.clienteSeleccionado,
      carrito: this.productosCarrito.map(p => ({ ...p, cantidad: p.cantidad })),
      formaDePago: this.metodoPagoSeleccionado.tipo || this.metodoPagoSeleccionado.nombre,
      subtotal: this.subtotalCarrito,
      facturacion: this.datosFacturacion,
      entrega: this.datosEntrega
      // Agregar más campos según sea necesario
    };
    this.ventasService.createOrder(pedido).subscribe({
      next: (res) => {
        this.ventaExitosa = true;
        this.loadingVenta = false;
        this.productosCarrito = [];
        this.metodoPagoSeleccionado = null;
        this.messageService.add({severity:'success', summary:'Venta realizada', detail:'¡Venta realizada con éxito!'});
      },
      error: (err) => {
        this.errorVenta = 'Error al crear la venta. Intenta nuevamente.';
        this.loadingVenta = false;
        this.messageService.add({severity:'error', summary:'Error', detail:this.errorVenta});
      }
    });
  }

  buscarProductos(event: any): void {
    const query = event.query;
    if (!query || query.length < 2) {
      this.productosFiltrados = [];
      return;
    }
    this.loadingProductos = true;
    this.errorStockProducto = null;
    this.maestroService.getProductsBySearch(query, 10, 1).subscribe((res: any) => {
      console.log('Respuesta getProductsBySearch:', res);
      this.productosFiltrados = Array.isArray(res) ? res : (res?.productos || []);
      console.log('Productos filtrados:', this.productosFiltrados);
      this.loadingProductos = false;
    }, err => {
      console.error('Error en getProductsBySearch:', err);
      this.productosFiltrados = [];
      this.loadingProductos = false;
    });
  }

  onProductoSeleccionado(event: any): void {
    const producto = event;
    if (!producto) return;
    // Si ya está en el carrito, suma cantidad
    const idx = this.productosCarrito.findIndex(p => p.cd === producto.cd);
    if (idx > -1) {
      // Validar stock antes de sumar
      const nuevoTotal = this.productosCarrito[idx].cantidad + 1;
      if (producto.disponibilidad && producto.disponibilidad.stock < nuevoTotal) {
        this.errorStockProducto = 'No hay suficiente stock para agregar más unidades de este producto.';
        this.messageService.add({severity:'warn', summary:'Stock insuficiente', detail:this.errorStockProducto});
        return;
      }
      this.productosCarrito[idx].cantidad = nuevoTotal;
      this.errorStockProducto = null;
      this.messageService.add({severity:'success', summary:'Producto agregado', detail:'Cantidad actualizada en el carrito.'});
    } else {
      if (producto.disponibilidad && producto.disponibilidad.stock < 1) {
        this.errorStockProducto = 'No hay stock disponible para este producto.';
        this.messageService.add({severity:'warn', summary:'Sin stock', detail:this.errorStockProducto});
        return;
      }
      this.productosCarrito.push({ ...producto, cantidad: 1 });
      this.errorStockProducto = null;
      this.messageService.add({severity:'success', summary:'Producto agregado', detail:'Producto añadido al carrito.'});
    }
    this.productoSeleccionado = null;
    this.productosFiltrados = [];
  }

  actualizarCantidad(producto: any, nuevaCantidad: number): void {
    if (nuevaCantidad < 1) {
      this.eliminarProductoCarrito(producto);
      return;
    }
    // Validar stock
    if (producto.disponibilidad && producto.disponibilidad.stock < nuevaCantidad) {
      // Opcional: mostrar advertencia visual
      producto.cantidad = producto.disponibilidad.stock;
      return;
    }
    producto.cantidad = nuevaCantidad;
  }

  eliminarProductoCarrito(producto: any): void {
    this.productosCarrito = this.productosCarrito.filter(p => p.cd !== producto.cd);
  }

  abrirModalCliente() {
    this.mostrarModalCliente = true;
  }

  cerrarModalCliente() {
    this.mostrarModalCliente = false;
  }

  onClienteCreado(cliente: any) {
    // Llamar al servicio para crear el cliente
    this.maestroService.createClient(cliente).subscribe({
      next: (res: any) => {
        this.clienteSeleccionado = res || cliente;
        this.messageService.add({severity:'success', summary:'Cliente creado', detail:'Cliente registrado y seleccionado.'});
        this.mostrarModalCliente = false;
      },
      error: (err) => {
        this.messageService.add({severity:'error', summary:'Error', detail:'No se pudo crear el cliente.'});
      }
    });
  }
} 