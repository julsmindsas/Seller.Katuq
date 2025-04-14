import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { ToastrService } from 'ngx-toastr';
import { MovimientoInventario } from '../model/movimientoinventario';
import { Producto } from '../../../shared/models/productos/Producto';

interface ProductoRecepcion {
  id: string;
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-recepcion-mercancia',
  templateUrl: './recepcion-mercancia.component.html',
  styleUrls: ['./recepcion-mercancia.component.scss']
})
export class RecepcionMercanciaComponent implements OnInit {
  bodegas: any[] = [];
  productoForm: FormGroup;
  productos: ProductoRecepcion[] = [];
  busquedaInput: string = '';
  cargando: boolean = false;
  buscandoProducto: boolean = false;
  guardandoRecepcion: boolean = false;
  producto: ProductoRecepcion | null = null;
  
  // Variables para paginación
  pageSize = 10;
  currentPage = 1;

  constructor(
    private bodegaService: BodegaService,
    private maestroService: MaestroService,
    private inventarioService: InventarioService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.productoForm = this.fb.group({
      bodegaSeleccionada: ['', Validators.required],
      busquedaProducto: ['']
    });
  }

  ngOnInit(): void {
    this.cargarBodegas();
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar bodegas:', error);
        this.toastr.error('Error al cargar las bodegas', 'Error');
        this.cargando = false;
      }
    });
  }

  // Buscar y agregar producto a la tabla
  buscarProducto() {
    const busqueda = this.busquedaInput.trim();
    if (!busqueda || busqueda.length < 3) {
      this.toastr.warning('Ingresa al menos 3 caracteres para buscar', 'Advertencia');
      return;
    }
    
    this.buscandoProducto = true;
    
    // Usar el servicio de maestros para buscar productos
    this.maestroService.getProductsBySearch(busqueda, this.pageSize, this.currentPage).subscribe({
      next: (response: any) => {
        if (response.products && response.products.length > 0) {
          const productoEncontrado = response.products[0]; // Tomamos el primer resultado
          
          // Verificar si el producto ya existe en la tabla
          const productoExistente = this.productos.find(p => 
            p.producto.identificacion?.referencia === productoEncontrado.identificacion?.referencia
          );
          
          if (productoExistente) {
            // Si ya existe, incrementar la cantidad
            productoExistente.cantidad += 1;
            this.toastr.info('Cantidad de producto actualizada', 'Producto actualizado');
          } else {
            // Si no existe, agregarlo a la tabla
            const nuevoProducto: ProductoRecepcion = {
              id: productoEncontrado.cd || Math.random().toString(36).substring(2, 9),
              producto: productoEncontrado,
              cantidad: 1
            };
            
            this.productos.push(nuevoProducto);
            this.toastr.success('Producto agregado correctamente', 'Éxito');
          }
          
          // Limpiar el campo de búsqueda
          this.busquedaInput = '';
        } else {
          this.toastr.error('No se encontraron productos con ese criterio', 'Producto no encontrado');
        }
        this.buscandoProducto = false;
      },
      error: (error) => {
        console.error('Error al buscar producto:', error);
        this.toastr.error('Error al buscar el producto', 'Error');
        this.buscandoProducto = false;
      }
    });
  }

  // Incrementar cantidad de producto
  incrementarCantidad(producto: ProductoRecepcion) {
    producto.cantidad += 1;
  }

  // Decrementar cantidad de producto
  decrementarCantidad(producto: ProductoRecepcion) {
    if (producto.cantidad > 1) {
      producto.cantidad -= 1;
    } else {
      // Si la cantidad es 1 y se intenta decrementar, eliminar el producto
      this.eliminarProducto(producto);
    }
  }

  // Eliminar producto de la tabla
  eliminarProducto(producto: ProductoRecepcion) {
    const index = this.productos.findIndex(p => p.id === producto.id);
    if (index !== -1) {
      this.productos.splice(index, 1);
      this.toastr.warning('Producto eliminado de la lista', 'Removido');
    }
  }

  // Calcular el total de items
  calcularTotalItems(): number {
    return this.productos.reduce((sum, item) => sum + item.cantidad, 0);
  }

  // Guardar los datos de recepción de mercancía
  guardarRecepcion() {
    if (this.productoForm.invalid || this.productos.length === 0) {
      this.toastr.error('Por favor selecciona una bodega y añade al menos un producto', 'Error');
      return;
    }

    this.guardandoRecepcion = true;
    const bodegaSeleccionada = this.productoForm.get('bodegaSeleccionada')?.value;
    
    // Obtener información del usuario actual
    const usuarioActual = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const empresaActual = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    
    // Crear movimientos de inventario para cada producto
    const movimientos: MovimientoInventario[] = this.productos.map(item => {
      return {
        productId: item.producto.cd || item.id,
        productRef: item.producto.identificacion?.referencia || '',
        cantidadCambio: item.cantidad,
        clienteDocumento: '',
        tipoMovimiento: 'in',
        origenMovimiento: 'Recepción Manual',
        fecha: new Date().toISOString(),
        ordenId: `REC-${Math.floor(Math.random() * 1000000)}`,
        usuario: usuarioActual.name || 'Usuario Actual',
        company: empresaActual.nit || 'Empresa Actual',
        canal: 'Interno',
        ubicacion: bodegaSeleccionada
      };
    });

    // Llamar al servicio para guardar los movimientos
    this.inventarioService.registrarMovimientoInventario(movimientos).subscribe({
      next: (response) => {
        this.toastr.success('Recepción de mercancía guardada con éxito', 'Guardado');
        
        // Reiniciar formulario y lista de productos
        this.productoForm.reset();
        this.productos = [];
        this.guardandoRecepcion = false;
      },
      error: (error) => {
        console.error('Error al guardar recepción:', error);
        this.toastr.error('Error al guardar la recepción de mercancía', 'Error');
        this.guardandoRecepcion = false;
      }
    });
  }

  // Manejar evento keydown para agregar producto al presionar Enter
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.buscarProducto();
      event.preventDefault();
    }
  }
}