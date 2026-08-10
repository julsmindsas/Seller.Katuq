import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import {
  InventarioService,
  LineaOrdenCompra,
  OrdenCompra,
} from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { TipoMovimientoInventario } from '../enums/tipos-movimiento.enum';

interface LineaNueva {
  productoId: string;
  referencia: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
}

/**
 * Órdenes de compra: recibir contra algo, no contra nada.
 *
 * Sin orden no hay forma de saber si el proveedor mandó completo, quedó
 * debiendo o mandó de más. La pantalla mantiene separadas las dos cosas que la
 * gente confunde: anotar lo que llegó (la orden) y meterlo al inventario (la
 * entrada de stock). Aquí se hacen las dos, pero cada una por su vía.
 */
@Component({
  selector: 'app-ordenes-compra',
  templateUrl: './ordenes-compra.component.html',
  styleUrls: ['./ordenes-compra.component.scss'],
})
export class OrdenesCompraComponent implements OnInit {
  cargando = false;
  guardando = false;
  error: string | null = null;

  bodegas: Bodega[] = [];
  bodegaSeleccionada = '';
  soloPendientes = true;

  ordenes: OrdenCompra[] = [];
  orden: OrdenCompra | null = null;

  // Formulario de orden nueva
  creando = false;
  proveedorNombre = '';
  proveedorNit = '';
  observaciones = '';
  lineasNuevas: LineaNueva[] = [];

  busquedaProducto = '';
  resultados: any[] = [];
  buscando = false;

  /** Cantidades que el operario dice que llegaron, por producto. */
  recepcion: { [productoId: string]: number | null } = {};

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = (bodegas || []).filter((b: any) => b?.idBodega);
        this.bodegaSeleccionada = this.bodegas[0]?.idBodega || '';
        this.cargar();
      },
      error: () => {
        this.error = 'No se pudieron cargar las bodegas.';
      },
    });
  }

  cargar(): void {
    this.cargando = true;
    this.inventarioService
      .listarOrdenesCompra({ bodega: this.bodegaSeleccionada || undefined, pendientes: this.soloPendientes })
      .subscribe({
        next: (respuesta) => {
          this.ordenes = respuesta.ordenes || [];
          this.cargando = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'No se pudieron cargar las órdenes.';
          this.cargando = false;
        },
      });
  }

  // ---------- crear ----------

  buscarProducto(): void {
    const termino = this.busquedaProducto.trim();
    if (termino.length < 2) {
      this.resultados = [];
      return;
    }
    this.buscando = true;
    this.inventarioService.buscarProductosQuick(termino, 15).subscribe({
      next: (respuesta: any) => {
        this.resultados = respuesta?.productos || respuesta || [];
        this.buscando = false;
      },
      error: () => {
        this.resultados = [];
        this.buscando = false;
      },
    });
  }

  agregarLinea(producto: any): void {
    const productoId = producto.id || producto.cd || producto.productoId;
    if (!productoId) return;

    if (this.lineasNuevas.some((l) => l.productoId === productoId)) {
      Swal.fire('Ya está', 'Ese producto ya está en la orden.', 'info');
      return;
    }

    this.lineasNuevas.push({
      productoId,
      referencia: producto.referencia || producto.identificacion?.referencia || '',
      descripcion: producto.titulo || producto.nombre || producto.identificacion?.titulo || '',
      cantidad: 1,
      costoUnitario: Number(producto.costoUnitario || producto.precio?.costoUnitario || 0),
    });

    this.busquedaProducto = '';
    this.resultados = [];
  }

  quitarLinea(productoId: string): void {
    this.lineasNuevas = this.lineasNuevas.filter((l) => l.productoId !== productoId);
  }

  get totalNuevo(): number {
    return this.lineasNuevas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0), 0);
  }

  crearOrden(): void {
    if (!this.proveedorNombre.trim()) {
      Swal.fire('Falta el proveedor', 'Escriba a quién se le compró.', 'warning');
      return;
    }
    if (this.lineasNuevas.length === 0) {
      Swal.fire('Orden vacía', 'Agregue al menos un producto.', 'warning');
      return;
    }

    this.guardando = true;
    this.inventarioService
      .crearOrdenCompra({
        proveedor: { nombre: this.proveedorNombre.trim(), nit: this.proveedorNit.trim() || undefined },
        bodega: this.bodegaSeleccionada,
        lineas: this.lineasNuevas.map((l) => ({
          productoId: l.productoId,
          referencia: l.referencia || undefined,
          descripcion: l.descripcion || undefined,
          cantidad: Number(l.cantidad),
          costoUnitario: Number(l.costoUnitario) || 0,
        })),
        observaciones: this.observaciones.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.cancelarCreacion();
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Orden creada', timer: 1600, showConfirmButton: false });
        },
        error: (err) => {
          this.guardando = false;
          Swal.fire('Error', err?.error?.message || 'No se pudo crear la orden.', 'error');
        },
      });
  }

  cancelarCreacion(): void {
    this.creando = false;
    this.proveedorNombre = '';
    this.proveedorNit = '';
    this.observaciones = '';
    this.lineasNuevas = [];
    this.busquedaProducto = '';
    this.resultados = [];
  }

  // ---------- recibir ----------

  abrirOrden(id: string): void {
    this.cargando = true;
    this.inventarioService.obtenerOrdenCompra(id).subscribe({
      next: (orden) => {
        this.orden = orden;
        this.recepcion = {};
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo abrir la orden.';
        this.cargando = false;
      },
    });
  }

  cerrarDetalle(): void {
    this.orden = null;
    this.recepcion = {};
    this.cargar();
  }

  pendienteDe(linea: LineaOrdenCompra): number {
    return Math.max(Number(linea.cantidad) - Number(linea.recibido), 0);
  }

  /** Marca de un golpe todo lo que falta: lo normal es que llegue completo. */
  llenarPendientes(): void {
    if (!this.orden) return;
    for (const linea of this.orden.lineas) {
      const pendiente = this.pendienteDe(linea);
      if (pendiente > 0) this.recepcion[linea.productoId] = pendiente;
    }
  }

  get hayAlgoQueRecibir(): boolean {
    return Object.values(this.recepcion).some((v) => Number(v) > 0);
  }

  /**
   * Dos pasos, en el orden correcto: primero entra el stock por el camino de
   * recepción de siempre (que deja su movimiento en el libro), y solo si eso
   * salió bien se anota contra la orden. Al revés, la orden diría que llegó
   * mercancía que nunca entró.
   */
  async recibir(): Promise<void> {
    if (!this.orden) return;

    const recibidas = Object.entries(this.recepcion)
      .map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) || 0 }))
      .filter((r) => r.cantidad > 0);

    if (recibidas.length === 0) {
      Swal.fire('Nada que recibir', 'Escriba cuántas unidades llegaron.', 'info');
      return;
    }

    const confirmacion = await Swal.fire({
      title: `¿Ingresar ${recibidas.length} productos?`,
      text: 'Entra al inventario de la bodega y queda anotado contra esta orden.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, recibir',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.guardando = true;

    try {
      await this.inventarioService
        .ingresarProductos(
          this.orden.idBodega,
          recibidas.map((r) => ({
            productoId: r.productoId,
            cantidad: r.cantidad,
            ordenCompraId: this.orden!.id,
          })),
          TipoMovimientoInventario.INGRESO_COMPRA,
          `Recepción orden de compra ${this.orden.id}`,
        )
        .toPromise();
    } catch (err: any) {
      this.guardando = false;
      Swal.fire('No entró el inventario', err?.error?.message || 'No se pudo registrar la entrada.', 'error');
      return;
    }

    this.inventarioService.registrarRecepcionOrden(this.orden.id, recibidas).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: 'Mercancía recibida', timer: 1800, showConfirmButton: false });
        this.abrirOrden(this.orden!.id);
      },
      error: (err) => {
        this.guardando = false;
        // El stock ya entró: decirlo es más útil que un error a secas.
        Swal.fire({
          icon: 'warning',
          title: 'El inventario entró, la orden no se anotó',
          text:
            (err?.error?.message || 'Falló al anotar contra la orden.') +
            ' Revise la orden antes de volver a recibir, para no ingresar dos veces.',
        });
      },
    });
  }

  anular(): void {
    if (!this.orden) return;
    Swal.fire({
      title: '¿Anular esta orden?',
      text: 'Queda registrada como anulada. El inventario ya recibido no se toca.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Volver',
    }).then((resultado) => {
      if (!resultado.isConfirmed || !this.orden) return;
      this.inventarioService.anularOrdenCompra(this.orden.id).subscribe({
        next: () => this.cerrarDetalle(),
        error: (err) => Swal.fire('Error', err?.error?.message || 'No se pudo anular.', 'error'),
      });
    });
  }

  nombreBodega(idBodega: string): string {
    const bodega = this.bodegas.find((b: any) => b.idBodega === idBodega);
    return (bodega as any)?.nombre || idBodega;
  }
}
