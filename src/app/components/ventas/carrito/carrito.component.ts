import { Component, Input, OnInit, EventEmitter, Output } from "@angular/core";
import { CartSingletonService } from "../../../shared/services/ventas/cart.singleton.service";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import Swal from "sweetalert2";
import { Pedido } from "../modelo/pedido";
import { ToastrService } from "ngx-toastr";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

@Component({
  selector: "app-carrito",
  templateUrl: "./carrito.component.html",
  styleUrls: ["./carrito.component.scss"],
})
export class CarritoComponent implements OnInit {
  productos: any[] = [];
  cupon: string = '';
  valorDescuento: number = 0;
  porcentajeDescuento: number = 0;
  rangoPreciosActual1: any = null;
  precioproducto: number = 0;
  preciosAdiciones: number = 0;
  preciosPreferencias: number = 0;
  
  // Modal para notas de producción
  notaProduccionForm: FormGroup;
  productoSeleccionado: any = null;

  @Input()
  public pedido: Pedido;
  
  @Output() 
  notaAgregada = new EventEmitter<any>();

  constructor(
    private carsingleton: CartSingletonService,
    private service: VentasService,
    private toastrService: ToastrService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    // Limpiar datos fantasma al inicializar
    this.limpiarDatosFantasma();
    
    this.refreshCartWithProducts();
    
    // Inicializar formulario de notas
    this.notaProduccionForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });
  }

  refreshCartWithProducts(): void {
    this.carsingleton.productInCartChanges$.subscribe((data) => {
      this.productos = Array.isArray(data) ? [...data] : [];
      
      // Limpiar propiedades notaProduccion de productos individuales
      this.productos.forEach(producto => {
        if (producto.notaProduccion) {
          console.log('🧹 Limpiando notaProduccion obsoleta del producto:', producto.producto?.crearProducto?.titulo);
          delete producto.notaProduccion;
        }
      });
      
      // Actualizar localStorage sin las propiedades obsoletas
      localStorage.setItem('carrito', JSON.stringify(this.productos));
    });
  }

  removeThisProduct(producto: any): void {
    if (!producto) return;
    this.carsingleton.removeProduct(producto);
  }
  
  agregarNotaProduccion(producto: any): void {
    this.productoSeleccionado = producto;
    
    // Mostrar Sweet Alert con campo de texto para la nota
    Swal.fire({
      title: 'Agregar Nota de Producción',
      html: `
        <div class="text-start mb-3">
          <span class="fw-bold">${producto?.producto?.crearProducto?.titulo || 'Producto'}</span>
        </div>
        <textarea id="nota-produccion" class="form-control" placeholder="Escribe la nota de producción aquí..." rows="4"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Nota',
      cancelButtonText: 'Cancelar',
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      },
      preConfirm: () => {
        const nota = (document.getElementById('nota-produccion') as HTMLTextAreaElement).value;
        if (!nota.trim()) {
          Swal.showValidationMessage('Por favor ingresa una nota');
          return false;
        }
        return nota;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.guardarNotaProduccion(producto, result.value);
      }
    });
  }
  
  guardarNotaProduccion(producto: any, nota: string): void {
    // Inicializar notasPedido si no existe
    if (!this.pedido?.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    // Crear nota estructurada para el pedido
    const nuevaNota = {
      fecha: new Date().toISOString(),
      descripcion: nota,
      producto: producto?.producto?.crearProducto?.titulo || 'Producto',
      usuario: 'Usuario', // Se puede obtener del contexto de usuario actual
      productoId: producto?.producto?.identificacion?.referencia || ''
    };

    // Agregar a las notas de producción del pedido
    this.pedido.notasPedido.notasProduccion.push(nuevaNota);
    
    // Emitir evento de nota agregada con toda la información del pedido
    this.notaAgregada.emit({
      pedido: this.pedido,
      nuevaNota: nuevaNota,
      producto: producto
    });
    
    // Mostrar mensaje de éxito
    this.toastrService.success('Nota de producción agregada correctamente', 'Éxito');
  }

  private calculateAdicionesPrice(adiciones: any[]): number {
    if (!adiciones || !Array.isArray(adiciones)) return 0;
    return adiciones.reduce((total, adicion) => {
      const precio = adicion?.referencia?.precioTotal || 0;
      const cantidad = adicion?.cantidad || 0;
      return total + (precio * cantidad);
    }, 0);
  }

  private calculatePreferenciasPrice(preferencias: any[]): number {
    if (!preferencias || !Array.isArray(preferencias)) return 0;
    return preferencias.reduce((total, preferencia) => {
      const precio = preferencia?.precioTotalConIva || 0;
      return total + precio;
    }, 0);
  }

  private getProductPriceWithScale(producto: any): number {
    if (!producto?.producto?.precio) return 0;
    
    const preciosVolumen = producto.producto.precio.preciosVolumen;
    if (!preciosVolumen || preciosVolumen.length === 0) {
      return producto.producto.precio.precioUnitarioConIva || 0;
    }

    const cantidad = parseInt(producto.cantidad);
    const rangoActual = preciosVolumen.find(x =>
      cantidad >= x.numeroUnidadesInicial && cantidad <= x.numeroUnidadesLimite
    );

    return rangoActual?.valorUnitarioPorVolumenConIVA || producto.producto.precio.precioUnitarioConIva || 0;
  }

  getTotalProductPriceInCart(): number {
    if (!this.productos || this.productos.length === 0) return 0;

    return this.productos.reduce((total, producto) => {
      const precioBase = this.getProductPriceWithScale(producto);
      const precioAdiciones = this.calculateAdicionesPrice(producto.configuracion?.adiciones);
      const precioPreferencias = this.calculatePreferenciasPrice(producto.configuracion?.preferencias);
      const cantidad = parseInt(producto.cantidad) || 0;

      return total + ((precioBase + precioAdiciones + precioPreferencias) * cantidad);
    }, 0);
  }

  checkPriceScale(itemCarrito: any): number {
    if (!itemCarrito?.producto?.precio) return 0;
    return this.getProductPriceWithScale(itemCarrito);
  }

  checkAditionPrice(item: any): boolean {
    if (!item?.configuracion?.adiciones) return false;
    return item.configuracion.adiciones.some(adicion => 
      adicion?.referencia?.precioTotal > 0
    );
  }

  checkPreferencePrice(item: any): boolean {
    if (!item?.configuracion?.preferencias) return false;
    return item.configuracion.preferencias.some(preferencia => 
      preferencia?.precioTotalConIva > 0
    );
  }

  getTotalProductPriceWithDescountInCart(): number {
    const total = this.getTotalProductPriceInCart();
    return total - this.valorDescuento;
  }

  menosCantidad(itemCarrito: any): void {
    if (!itemCarrito || !itemCarrito.producto?.disponibilidad) return;

    const cantidadMinima = itemCarrito.producto.disponibilidad.cantidadMinVenta || 1;
    if (itemCarrito.cantidad > cantidadMinima) {
      itemCarrito.cantidad--;
      this.updateCartAndCheckPriceScale(itemCarrito);
    }
  }

  masCantidad(itemCarrito: any): void {
    if (!itemCarrito) return;
    itemCarrito.cantidad++;
    this.updateCartAndCheckPriceScale(itemCarrito);
  }

  private updateCartAndCheckPriceScale(itemCarrito: any): void {
    // Solo actualizar el carrito singleton, no localStorage
    this.carsingleton.updateProductQuantity(itemCarrito);

    const rangoActual = this.getCurrentPriceRange(itemCarrito);
    if (rangoActual?.numeroUnidadesInicial && 
        this.rangoPreciosActual1?.numeroUnidadesInicial !== rangoActual.numeroUnidadesInicial) {
      this.toastrService.show(
        '<p class="mb-0 mt-1">Cambio de rango de precio!</p>',
        '',
        { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 }
      );
      this.rangoPreciosActual1 = rangoActual;
    }
  }

  private getCurrentPriceRange(itemCarrito: any): any {
    if (!itemCarrito?.producto?.precio?.preciosVolumen) return null;
    return itemCarrito.producto.precio.preciosVolumen.find(x =>
      parseInt(itemCarrito.cantidad) >= x.numeroUnidadesInicial && 
      parseInt(itemCarrito.cantidad) <= x.numeroUnidadesLimite
    );
  }

  async validarCuponYAplica(): Promise<void> {
    if (!this.cupon) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor ingrese un código de cupón',
      });
      return;
    }

    this.service.validateCupon({ code: this.cupon }).subscribe({
      next: (value) => {
        if (!value || value.length === 0) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Cupón no válido',
          });
          return;
        }

        this.valorDescuento = 0;
        this.porcentajeDescuento = parseFloat(value[0]?.valor) || 0;
        this.pedido.porceDescuento = this.porcentajeDescuento;
        this.valorDescuento = (this.getTotalProductPriceInCart() * this.porcentajeDescuento) / 100;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al validar el cupón',
        });
      },
    });
  }
  
  // Método para mostrar las notas existentes
  mostrarNotasExistentes(producto: any): void {
    // Obtener notas del producto desde el pedido centralizado
    const notasDelProducto = this.obtenerNotasDelProducto(producto);
    
    if (!notasDelProducto || notasDelProducto.length === 0) {
      this.toastrService.info('Este producto no tiene notas de producción', 'Información');
      return;
    }
    
    let notasHtml = '';
    notasDelProducto.forEach((nota, index) => {
      const descripcion = nota.descripcion || nota.nota || '';
      const fecha = nota.fecha ? new Date(nota.fecha).toLocaleString() : '';
      
      notasHtml += `
        <div class="note-item mb-2 p-2 border-bottom">
          <div class="d-flex justify-content-between">
            <span class="note-number fw-bold">${index + 1}</span>
            <span class="note-actions">
              <button type="button" class="btn btn-sm btn-outline-danger delete-nota" data-index="${index}">
                <i class="pi pi-trash"></i>
              </button>
            </span>
          </div>
          <div class="note-content mt-1">${descripcion}</div>
          ${fecha ? `<div class="note-date text-muted"><small>${fecha}</small></div>` : ''}
        </div>
      `;
    });
    
    Swal.fire({
      title: 'Notas de Producción',
      html: `
        <div class="product-title mb-3 fw-bold">
          ${producto?.producto?.crearProducto?.titulo || 'Producto'}
        </div>
        <div class="notes-container" style="max-height: 300px; overflow-y: auto; text-align: left;">
          ${notasHtml}
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      width: '600px',
      didOpen: () => {
        // Agregar event listeners para los botones de eliminar
        document.querySelectorAll('.delete-nota').forEach(button => {
          button.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const index = parseInt(target.getAttribute('data-index') || '0');
            this.eliminarNotaProduccion(producto, index);
            Swal.close();
          });
        });
      }
    });
  }

  // Obtener notas específicas de un producto desde el pedido centralizado
  private obtenerNotasDelProducto(producto: any): any[] {
    if (!this.pedido?.notasPedido?.notasProduccion) {
      return [];
    }

    const productoId = producto?.producto?.identificacion?.referencia;
    const productoTitulo = producto?.producto?.crearProducto?.titulo;

    return this.pedido.notasPedido.notasProduccion.filter(nota => {
      // Filtrar por ID del producto o por título si no hay ID
      return (nota as any).productoId === productoId || 
             (nota as any).producto === productoTitulo;
    });
  }

  // Contar notas de un producto específico
  contarNotasDelProducto(producto: any): number {
    return this.obtenerNotasDelProducto(producto).length;
  }
  
  eliminarNotaProduccion(producto: any, index: number): void {
    const notasDelProducto = this.obtenerNotasDelProducto(producto);
    if (index < 0 || index >= notasDelProducto.length) return;

    // Encontrar el índice real en el array completo de notas
    const notaAEliminar = notasDelProducto[index];
    const indiceRealEnPedido = this.pedido.notasPedido.notasProduccion.findIndex(nota => nota === notaAEliminar);
    
    if (indiceRealEnPedido !== -1) {
      this.pedido.notasPedido.notasProduccion.splice(indiceRealEnPedido, 1);
    }
    
    // Emitir evento de actualización
    this.notaAgregada.emit({
      pedido: this.pedido,
      accion: 'eliminar',
      producto: producto
    });
    
    // Mostrar mensaje de éxito
    this.toastrService.success('Nota de producción eliminada correctamente', 'Éxito');
  }

  // Método para limpiar datos fantasma del localStorage
  private limpiarDatosFantasma(): void {
    console.log('🧹 Limpiando datos fantasma del carrito...');
    
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      try {
        const carrito = JSON.parse(carritoGuardado);
        if (Array.isArray(carrito)) {
          let huboLimpieza = false;
          
          // Limpiar propiedades obsoletas de cada producto
          carrito.forEach(producto => {
            if (producto.notaProduccion) {
              console.log('🧹 Removiendo notaProduccion obsoleta de:', producto.producto?.crearProducto?.titulo);
              delete producto.notaProduccion;
              huboLimpieza = true;
            }
          });
          
          // Si hubo limpieza, actualizar localStorage
          if (huboLimpieza) {
            localStorage.setItem('carrito', JSON.stringify(carrito));
            console.log('✅ Datos fantasma del carrito limpiados');
          }
        }
      } catch (error) {
        console.error('Error al limpiar datos fantasma:', error);
        // Si hay error, limpiar completamente el carrito
        localStorage.removeItem('carrito');
      }
    }
  }
}
