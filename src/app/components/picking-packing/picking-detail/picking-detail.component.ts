import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { PickingPackingService } from '../../../shared/services/picking-packig/picking-packing.service';
import { PickingResponse, Producto, PickingRequest, PickingCompletarRequest } from '../models/picking.model';
import { Order } from '../models/order.model';
import {
  AccionPicking,
  avisoDeErrorPicking,
  bodegaSugerida,
  destinoDelDetalle,
  lineasDePicking,
  mensajeAHtml,
  puedeAlistarse,
  textoDeConfirmarCompletar,
  textoDeEstadoAlistamiento,
  textoDeEstadoPedido
} from '../picking-mensajes';

@Component({
  selector: 'app-picking-detail',
  templateUrl: './picking-detail.component.html',
  styleUrls: ['./picking-detail.component.scss']
})
export class PickingDetailComponent implements OnInit {
  /** Número del pedido: es lo que viaja en la URL (picking/orden/:id). El alistamiento se consulta por pedido. */
  nroPedido: string = '';
  isNuevo: boolean = false;
  picking: PickingResponse | null = null;
  order: Order | null = null;
  pickingForm: FormGroup;
  loading: boolean = false;
  submitting: boolean = false;

  // Para elegir el pedido a alistar (ruta "nuevo")
  ordenesPendientes: any[] = [];
  nroPedidoElegido: string = '';

  // Productos del pedido que se van a alistar (salen del carrito del pedido) y bodegas activas
  productosSeleccionados: Producto[] = [];
  lineasOmitidas: number = 0;
  bodegasDisponibles: any[] = [];

  // Textos para la plantilla
  textoEstadoPedido = textoDeEstadoPedido;
  textoEstadoAlistamiento = textoDeEstadoAlistamiento;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private pickingService: PickingPackingService,
    private toastr: ToastrService
  ) {
    this.pickingForm = this.fb.group({
      ordenId: ['', Validators.required],
      bodegaId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // "picking/nuevo" es una ruta propia SIN :id, así que se reconoce por su ruta y no por el parámetro
      const destino = destinoDelDetalle(this.route.snapshot.routeConfig?.path, params['id']);
      this.picking = null;
      this.order = null;

      if (destino.eligePedido) {
        this.isNuevo = true;
        this.cargarDatosIniciales();
      } else {
        // picking/orden/:id y picking/:id traen el NÚMERO DEL PEDIDO: el servidor no consulta por id de picking
        this.isNuevo = false;
        this.nroPedido = destino.nroPedido;
        this.cargarBodegasYDetallePedido();
      }
    });
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    this.pickingService.getOrdenesPendientes().subscribe({
      next: (ordenes) => {
        this.ordenesPendientes = ordenes;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.avisarError('consultar', error);
      }
    });
  }

  irAlPedidoElegido(): void {
    if (!this.nroPedidoElegido) return;
    this.router.navigate(['/picking-packing/picking/orden', this.nroPedidoElegido]);
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
        this.loading = false;
        this.avisarError('consultar', error);
      }
    });
  }

  cargarDetallePedido(): void {
    this.pickingService.getOrderByNroPedido(this.nroPedido).subscribe({
      next: (data) => {
        this.order = data;

        // Los productos a alistar salen del carrito del pedido
        const { lineas, omitidas } = lineasDePicking(data);
        this.productosSeleccionados = lineas;
        this.lineasOmitidas = omitidas;

        // Pre-llenar el formulario: el pedido y, si sigue activa, la bodega con la que se vendió
        this.pickingForm.patchValue({
          ordenId: data._id,
          bodegaId: bodegaSugerida(this.bodegasDisponibles, data.bodegaId)
        });

        // Por último, ¿ya se empezó a alistar este pedido?
        this.cargarDetallePicking();
      },
      error: (error) => {
        this.loading = false;
        this.avisarError('consultar', error);
      }
    });
  }

  /** Lee el alistamiento DEL PEDIDO. Si todavía no se inició, `picking` queda en null. */
  cargarDetallePicking(): void {
    if (!this.order || !this.order._id) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.pickingService.getEstadoPicking(this.order._id).subscribe({
      next: (data) => {
        this.picking = data;
        if (data) {
          this.completarNombres(data);
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.avisarError('consultar', error);
      }
    });
  }

  /** Al completar, el servidor reescribe las líneas sin nombre ni referencia: se recuperan del pedido. */
  private completarNombres(picking: PickingResponse): void {
    const porId: { [productoId: string]: Producto } = {};
    this.productosSeleccionados.forEach(p => { porId[p.productoId] = p; });
    picking.productos.forEach(p => {
      const linea = porId[p.productoId];
      if (linea) {
        p.nombre = p.nombre || linea.nombre;
        p.sku = p.sku || linea.sku;
      }
    });
  }

  /** El pedido está en un estado en el que se puede alistar y tiene productos para alistar. */
  puedeIniciar(): boolean {
    return !!this.order && puedeAlistarse(String(this.order.estadoProceso)) && this.productosSeleccionados.length > 0;
  }

  iniciarPickingDesdeOrden(): void {
    if (!this.order || !this.order._id || this.pickingForm.get('bodegaId')?.invalid || !this.puedeIniciar()) {
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
      next: () => {
        this.submitting = false;
        this.toastr.success('Pedido ' + this.nroPedido, 'Alistamiento iniciado');
        this.cargarDetallePicking();
      },
      error: (error) => {
        this.submitting = false;
        this.avisarError('iniciar', error);
      }
    });
  }

  completarPicking(): void {
    if (!this.picking || !this.picking._id) return;

    const picking = this.picking;
    // Completar descuenta inventario: se le dice al usuario antes de hacerlo
    Swal.fire({
      title: '¿Completar el alistamiento?',
      text: textoDeConfirmarCompletar({
        nroPedido: this.nroPedido,
        productos: picking.productos.length,
        unidades: picking.productos.reduce((total, p) => total + (Number(p.cantidad) || 0), 0),
        bodega: this.nombreBodega(picking.bodegaId)
      }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, completar',
      cancelButtonText: 'Todavía no',
      confirmButtonColor: '#5F3FE0',
      focusCancel: true
    }).then(resultado => {
      if (resultado.isConfirmed) {
        this.enviarCompletar(picking);
      }
    });
  }

  private enviarCompletar(picking: PickingResponse): void {
    this.submitting = true;
    const data: PickingCompletarRequest = {
      pickingId: picking._id,
      productos: picking.productos.map(p => ({
        ...p,
        recolectado: true,
        cantidadRecolectada: p.cantidad // Por defecto se recolecta toda la cantidad solicitada
      }))
    };

    this.pickingService.completarPicking(data).subscribe({
      next: () => {
        this.submitting = false;
        this.toastr.success('Pedido ' + this.nroPedido, 'Alistamiento completado');
        this.cargarDetallePicking();
      },
      error: (error) => {
        this.submitting = false;
        this.avisarError('completar', error);
      }
    });
  }

  /** Nombre de la bodega a partir de su código de negocio (BOD-001). */
  nombreBodega(idBodega?: string): string {
    const bodega = this.bodegasDisponibles.find(b => b.idBodega === idBodega);
    return bodega ? bodega.nombre : '';
  }

  /** Muestra el error al comercio con palabras claras. Si el interceptor ya avisó, no repite. */
  private avisarError(accion: AccionPicking, error: any): void {
    const nombresPorId: { [productoId: string]: string } = {};
    this.productosSeleccionados.forEach(p => { nombresPorId[p.productoId] = p.nombre; });

    const aviso = avisoDeErrorPicking(error, accion, {
      nroPedido: this.nroPedido,
      nombresPorId,
      nombreBodega: this.nombreBodega(this.pickingForm.get('bodegaId')?.value)
    });
    if (!aviso) {
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: aviso.titulo,
      html: '<div style="text-align:left">' + mensajeAHtml(aviso.mensaje) + '</div>',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#5F3FE0'
    });
  }

  volverALista(): void {
    this.router.navigate(['/picking-packing/picking']);
  }
}
