import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PickingPackingService } from '../../../shared/services/picking-packig/picking-packing.service';
import { PickingResponse, Producto, PickingRequest, PickingCompletarRequest } from '../models/picking.model';
import { Order } from '../models/order.model';

@Component({
  selector: 'app-picking-detail',
  templateUrl: './picking-detail.component.html',
  styleUrls: ['./picking-detail.component.scss']
})
export class PickingDetailComponent implements OnInit {
  pickingId: string = '';
  ordenId: string = '';
  isNuevo: boolean = false;
  isFromOrder: boolean = false;
  picking: PickingResponse | null = null;
  order: Order | null = null;
  pickingForm: FormGroup;
  loading: boolean = false;
  submitting: boolean = false;
  
  // Para nuevo picking
  productosDisponibles: Producto[] = [];
  productosSeleccionados: Producto[] = [];
  bodegasDisponibles: any[] = [];
  ordenesPendientes: any[] = [];
  productoSeleccionadoId: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private pickingService: PickingPackingService
  ) {
    this.pickingForm = this.fb.group({
      ordenId: ['', Validators.required],
      bodegaId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      this.isFromOrder = segments.some(segment => segment.path === 'orden');
      
      this.route.params.subscribe(params => {
        this.pickingId = params['id'];
        
        if (this.pickingId === 'nuevo') {
          this.isNuevo = true;
          this.cargarDatosIniciales();
        } else if (this.isFromOrder) {
          this.ordenId = this.pickingId; // En este caso, pickingId contiene el ordenId
          this.cargarBodegasYDetallePedido();
        } else {
          this.cargarDetallePicking();
        }
      });
    });
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    
    // Cargar bodegas disponibles
    this.pickingService.getBodegasDisponibles().subscribe(bodegas => {
      this.bodegasDisponibles = bodegas;
      
      // Cargar productos disponibles
      this.pickingService.getProductosDisponibles().subscribe(productos => {
        this.productosDisponibles = productos;
        
        // Cargar órdenes pendientes
        this.pickingService.getOrdenesPendientes().subscribe(ordenes => {
          this.ordenesPendientes = ordenes;
          this.loading = false;
        });
      });
    });
  }

  cargarBodegasYDetallePedido(): void {
    this.loading = true;
    // Primero cargamos las bodegas
    this.pickingService.getBodegasDisponibles().subscribe({
      next: (bodegas) => {
        this.bodegasDisponibles = bodegas;
        // Después cargamos el detalle del pedido
        this.cargarDetallePedido();
      },
      error: (error) => {
        console.error('Error al cargar bodegas:', error);
        this.loading = false;
      }
    });
  }

  cargarDetallePicking(): void {
    this.loading = true;
    this.pickingService.getEstadoPicking(this.pickingId).subscribe({
      next: (data) => {
        this.picking = data;
        this.ordenId = data.ordenId;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar picking:', error);
        this.loading = false;
      }
    });
  }

  cargarDetallePedido(): void {
    this.pickingService.getOrderByNroPedido(this.ordenId).subscribe({
      next: (data) => {
        this.order = data;
        
        // Pre-llenar el formulario de picking
        this.pickingForm.patchValue({
          ordenId: this.order._id
        });
        
        // Convertir productos del pedido a productos para picking
        if (this.order && this.order.productos) {
          this.productosSeleccionados = this.order.productos.map(p => ({
            productoId: p.productoId,
            nombre: p.nombre,
            sku: p.sku,
            cantidad: p.cantidad,
            ubicacion: 'Por determinar' // Valor por defecto, se actualizará cuando obtengamos datos reales
          }));
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar pedido:', error);
        this.loading = false;
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    });
  }

  iniciarPicking(): void {
    if (this.pickingForm.invalid || this.productosSeleccionados.length === 0) {
      this.pickingForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const data: PickingRequest = {
      ordenId: this.pickingForm.get('ordenId')?.value,
      bodegaId: this.pickingForm.get('bodegaId')?.value,
      productos: this.productosSeleccionados
    };

    this.pickingService.iniciarPicking(data).subscribe({
      next: (response) => {
        this.submitting = false;
        this.router.navigate(['/picking-packing/picking', response._id]);
      },
      error: (error) => {
        console.error('Error al iniciar picking:', error);
        this.submitting = false;
      }
    });
  }

  iniciarPickingDesdeOrden(): void {
    if (!this.order || !this.order._id || this.pickingForm.get('bodegaId')?.invalid) {
      this.pickingForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const data: PickingRequest = {
      ordenId: this.order._id,
      bodegaId: this.pickingForm.get('bodegaId')?.value,
      productos: this.productosSeleccionados
    };

    this.pickingService.iniciarPicking(data).subscribe({
      next: (response) => {
        this.submitting = false;
        this.router.navigate(['/picking-packing/picking', response._id]);
      },
      error: (error) => {
        console.error('Error al iniciar picking:', error);
        this.submitting = false;
      }
    });
  }

  completarPicking(): void {
    if (!this.picking || !this.picking._id) return;
    
    this.submitting = true;
    const data: PickingCompletarRequest = {
      pickingId: this.picking._id,
      productos: this.picking.productos.map(p => ({
        ...p,
        recolectado: true,
        cantidadRecolectada: p.cantidad // Por defecto se recolecta toda la cantidad solicitada
      }))
    };

    this.pickingService.completarPicking(data).subscribe({
      next: () => {
        this.submitting = false;
        this.cargarDetallePicking();
      },
      error: (error) => {
        console.error('Error al completar picking:', error);
        this.submitting = false;
      }
    });
  }

  agregarProducto(producto: Producto): void {
    if (!this.productosSeleccionados.some(p => p.productoId === producto.productoId)) {
      this.productosSeleccionados.push({...producto});
    }
  }

  eliminarProducto(index: number): void {
    this.productosSeleccionados.splice(index, 1);
  }

  seleccionarProducto(): void {
    if (!this.productoSeleccionadoId) return;
    
    const productoSeleccionado = this.productosDisponibles.find(
      p => p.productoId === this.productoSeleccionadoId
    );
    
    if (productoSeleccionado) {
      this.agregarProducto(productoSeleccionado);
      this.productoSeleccionadoId = ''; // Limpiar selección después de agregar
    }
  }

  volverALista(): void {
    this.router.navigate(['/picking-packing/picking']);
  }
} 