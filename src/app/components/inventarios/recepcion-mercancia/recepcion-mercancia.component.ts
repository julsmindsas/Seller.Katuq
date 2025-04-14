import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BodegaService } from 'src/app/shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';
import { MovimientoInventario } from '../model/movimientoinventario';

interface Producto {
  id: string;
  nombre: string;
  idProducto: string;
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
  productos: Producto[] = [];
  busquedaInput: string = '';
  cargando: boolean = false;
  producto: Producto | null = null;

  constructor(
    private bodegaService: BodegaService,
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
    this.bodegaService.getBodegas().subscribe(bodegas => {
      this.bodegas = bodegas;
      this.cargando = false;
    });
  }

  // Buscar y agregar producto a la tabla
  buscarProducto() {
    const busqueda = this.busquedaInput.trim();
    if (!busqueda) return;
    
    // Simular búsqueda de producto en base de datos
    // En un caso real, esto debería ser una llamada al servicio
    const productoEncontrado = {
      id: Math.random().toString(36).substring(2, 9),
      idProducto: `PROD-${Math.floor(Math.random() * 10000)}`,
      nombre: `Producto ${busqueda}`,
      cantidad: 1
    };

    // Verificar si el producto ya existe en la tabla
    const productoExistente = this.productos.find(p => p.idProducto === productoEncontrado.idProducto);
    
    if (productoExistente) {
      // Si ya existe, incrementar la cantidad
      productoExistente.cantidad += 1;
      this.toastr.info('Cantidad de producto actualizada', 'Producto actualizado');
    } else {
      // Si no existe, agregarlo a la tabla
      this.productos.push(productoEncontrado);
      this.toastr.success('Producto agregado correctamente', 'Éxito');
    }

    // Limpiar el campo de búsqueda
    this.busquedaInput = '';
  }

  // Incrementar cantidad de producto
  incrementarCantidad(producto: Producto) {
    producto.cantidad += 1;
  }

  // Decrementar cantidad de producto
  decrementarCantidad(producto: Producto) {
    if (producto.cantidad > 1) {
      producto.cantidad -= 1;
    } else {
      // Si la cantidad es 1 y se intenta decrementar, eliminar el producto
      this.eliminarProducto(producto);
    }
  }

  // Eliminar producto de la tabla
  eliminarProducto(producto: Producto) {
    const index = this.productos.findIndex(p => p.id === producto.id);
    if (index !== -1) {
      this.productos.splice(index, 1);
      this.toastr.warning('Producto eliminado de la lista', 'Removido');
    }
  }

  // Guardar los datos de recepción de mercancía
  guardarRecepcion() {
    if (this.productoForm.invalid || this.productos.length === 0) {
      this.toastr.error('Por favor selecciona una bodega y añade al menos un producto', 'Error');
      return;
    }

    const bodegaSeleccionada = this.productoForm.get('bodegaSeleccionada')?.value;
    
    // Crear movimientos de inventario para cada producto
    const movimientos: MovimientoInventario[] = this.productos.map(producto => {
      return {
        productId: producto.id,
        productRef: producto.idProducto,
        cantidadCambio: producto.cantidad,
        clienteDocumento: '',
        tipoMovimiento: 'in',
        origenMovimiento: 'Recepción Manual',
        fecha: new Date().toISOString(),
        ordenId: `REC-${Math.floor(Math.random() * 1000000)}`,
        usuario: 'Usuario Actual',
        company: 'Empresa Actual',
        canal: 'Interno',
        ubicacion: bodegaSeleccionada
      };
    });

    // Aquí iría la llamada al servicio para guardar los movimientos
    console.log('Guardando recepción de mercancía:', movimientos);
    this.toastr.success('Recepción de mercancía guardada con éxito', 'Guardado');
    
    // Reiniciar formulario y lista de productos
    this.productoForm.reset();
    this.productos = [];
  }

  // Manejar evento keydown para agregar producto al presionar Enter
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.buscarProducto();
      event.preventDefault();
    }
  }
}