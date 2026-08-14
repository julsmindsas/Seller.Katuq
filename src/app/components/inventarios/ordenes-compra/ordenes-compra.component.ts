import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { colorDeAvatar, inicialDe } from '../../compras/compras-avatar';
import { leerErrorInventario } from 'src/app/shared/utils/error-inventario';
import {
  InventarioService,
  LineaOrdenCompra,
  OrdenCompra,
  Proveedor,
} from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { TipoMovimientoInventario } from '../enums/tipos-movimiento.enum';

interface LineaNueva {
  productoId: string;
  referencia: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  /** Porcentaje. Solo cuenta para lo que va a facturar el proveedor. */
  ivaPct: number;
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
  /** Del maestro. Si está vacío se puede escribir el nombre a mano, como antes. */
  proveedores: Proveedor[] = [];
  proveedorId = '';
  proveedorNombre = '';
  proveedorNit = '';
  observaciones = '';
  /** Lo que cuesta traer la mercancía. Va al costo del producto, prorrateado. */
  flete: number | null = null;
  otrosCostos: number | null = null;
  lineasNuevas: LineaNueva[] = [];

  busquedaProducto = '';
  resultados: any[] = [];
  buscando = false;

  /** Cantidades que el operario dice que llegaron, por producto. */
  recepcion: { [productoId: string]: number | null } = {};

  constructor(private inventarioService: InventarioService) {}

  /** Mismo avatar que en el resto de las listas de Katuq. */
  inicial = inicialDe;
  colorAvatar = colorDeAvatar;

  /** Estado de la orden como par semántico, no como color suelto. */
  pillDeEstado(estado: string): string {
    switch (estado) {
      case 'recibida': return 'kc-pill--ok';
      case 'parcial': return 'kc-pill--warn';
      case 'anulada': return 'kc-pill--slate';
      default: return 'kc-pill--info';
    }
  }

  ngOnInit(): void {
    // El maestro es opcional para no bloquear a quien todavía no lo llenó: si
    // está vacío, la orden se crea escribiendo el nombre como se hacía antes.
    this.inventarioService.listarProveedores().subscribe({
      next: (r) => { this.proveedores = r.proveedores || []; },
      error: () => { this.proveedores = []; },
    });

    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = (bodegas || []).filter((b: any) => b?.idBodega);
        this.bodegaSeleccionada = this.bodegaPedidaEnLaUrl() || this.bodegas[0]?.idBodega || '';
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
      // Arranca en cero: poner 19% por defecto haría que la orden diga que el
      // proveedor va a cobrar un IVA que quizá no cobra.
      ivaPct: 0,
    });

    this.busquedaProducto = '';
    this.resultados = [];
  }

  quitarLinea(productoId: string): void {
    this.lineasNuevas = this.lineasNuevas.filter((l) => l.productoId !== productoId);
  }

  get subtotalNuevo(): number {
    return this.lineasNuevas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0), 0);
  }

  get ivaNuevo(): number {
    return this.lineasNuevas.reduce(
      (s, l) => s + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0) * ((Number(l.ivaPct) || 0) / 100),
      0,
    );
  }

  get adicionalesNuevos(): number {
    return (Number(this.flete) || 0) + (Number(this.otrosCostos) || 0);
  }

  /** Lo que va a facturar el proveedor: mercancía + IVA + lo que costó traerla. */
  get totalNuevo(): number {
    return this.subtotalNuevo + this.ivaNuevo + this.adicionalesNuevos;
  }

  /** Al escoger del maestro, el nombre y el NIT se llenan solos. */
  alEscogerProveedor(): void {
    const proveedor = this.proveedores.find((p) => p.id === this.proveedorId);
    if (!proveedor) return;
    this.proveedorNombre = proveedor.nombre;
    this.proveedorNit = proveedor.nit || '';
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
        proveedorId: this.proveedorId || undefined,
        flete: Number(this.flete) || 0,
        otrosCostos: Number(this.otrosCostos) || 0,
        bodega: this.bodegaSeleccionada,
        lineas: this.lineasNuevas.map((l) => ({
          productoId: l.productoId,
          referencia: l.referencia || undefined,
          descripcion: l.descripcion || undefined,
          cantidad: Number(l.cantidad),
          costoUnitario: Number(l.costoUnitario) || 0,
          ivaPct: Number(l.ivaPct) || 0,
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

  /** Lo que el proveedor mandó de más. Se ve, igual que facturar de más. */
  excedenteDe(linea: LineaOrdenCompra): number {
    return Math.max((Number(linea.recibido) || 0) - (Number(linea.cantidad) || 0), 0);
  }

  /**
   * Devuelve mercancía al proveedor: primero sale del inventario, después se
   * anota contra la orden — el mismo orden que en la recepción, y por la misma
   * razón: si falla lo segundo, el stock ya quedó bien y se dice.
   */
  async devolverAlProveedor(): Promise<void> {
    if (!this.orden) return;

    const conRecibido = this.orden.lineas.filter(
      (l) => (Number(l.recibido) || 0) - (Number(l.devuelto) || 0) > 0,
    );
    if (conRecibido.length === 0) {
      Swal.fire('Nada que devolver', 'De esta orden no ha llegado mercancía.', 'info');
      return;
    }

    const opciones = conRecibido
      .map((l) => {
        const disponible = (Number(l.recibido) || 0) - (Number(l.devuelto) || 0);
        return `<div style="display:flex;gap:8px;align-items:center;margin:6px 0">
          <span style="flex:1;text-align:left">${l.referencia || l.productoId}
            <small style="color:#6E6A8A"> (llegaron ${disponible})</small></span>
          <input id="dev-${l.productoId}" type="number" min="0" max="${disponible}"
                 class="swal2-input" style="width:90px;margin:0" placeholder="0">
        </div>`;
      })
      .join('');

    const { value: datos } = await Swal.fire({
      title: 'Devolver al proveedor',
      html: opciones + '<input id="dev-motivo" class="swal2-input" placeholder="Motivo (averiado, no conforme…)">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Devolver',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const devueltas = conRecibido
          .map((l) => ({
            productoId: l.productoId,
            cantidad: Number((document.getElementById(`dev-${l.productoId}`) as HTMLInputElement)?.value) || 0,
          }))
          .filter((d) => d.cantidad > 0);

        if (devueltas.length === 0) {
          Swal.showValidationMessage('Escriba cuántas unidades devuelve');
          return false;
        }
        return {
          devueltas,
          motivo: (document.getElementById('dev-motivo') as HTMLInputElement)?.value?.trim() || '',
        };
      },
    });

    if (!datos) return;

    this.guardando = true;

    try {
      await this.inventarioService
        .ingresarProductos(
          this.orden.idBodega,
          datos.devueltas,
          TipoMovimientoInventario.SALIDA_DEVOLUCION_PROVEEDOR,
          `Devolución al proveedor · orden ${this.orden.id}${datos.motivo ? ' · ' + datos.motivo : ''}`,
        )
        .toPromise();
    } catch (err: any) {
      this.guardando = false;
      const leido = leerErrorInventario(err);
      Swal.fire({
        icon: 'error',
        title: 'No salió del inventario',
        html: leido.motivo ? `<p>${leido.motivo}</p>` : 'No se pudo registrar la salida.',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }

    this.inventarioService.registrarDevolucionOrden(this.orden.id, datos.devueltas, datos.motivo).subscribe({
      next: () => {
        this.guardando = false;
        this.abrirOrden(this.orden!.id);
        Swal.fire({ icon: 'success', title: 'Devolución registrada', timer: 1600, showConfirmButton: false });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire({
          icon: 'warning',
          title: 'Salió del inventario, la orden no se anotó',
          text:
            (err?.error?.message || 'Falló al anotar contra la orden.') +
            ' Revise la orden antes de volver a devolver, para no sacar dos veces.',
        });
      },
    });
  }

  /** A quién y a cómo se le ha comprado este producto. */
  verPrecios(linea: LineaOrdenCompra): void {
    this.inventarioService.preciosDeProducto(linea.productoId).subscribe({
      next: (datos) => {
        if (datos.proveedores.length === 0) {
          Swal.fire('Sin historia', 'Este producto no se le ha comprado a nadie todavía.', 'info');
          return;
        }

        const filas = datos.proveedores
          .map(
            (p, i) => `<tr>
              <td style="text-align:left;padding:6px 8px">${i === 0 && datos.resumen.comparable ? '⭐ ' : ''}${p.proveedor}</td>
              <td style="text-align:right;padding:6px 8px">$${p.ultimoCosto.toLocaleString('es-CO')}</td>
              <td style="text-align:right;padding:6px 8px;color:#6E6A8A">${p.compras}</td>
            </tr>`,
          )
          .join('');

        Swal.fire({
          title: linea.referencia || 'Precios de compra',
          html:
            `<table style="width:100%;font-size:13px"><thead><tr>
               <th style="text-align:left;padding:6px 8px">Proveedor</th>
               <th style="text-align:right;padding:6px 8px">Último precio</th>
               <th style="text-align:right;padding:6px 8px">Compras</th>
             </tr></thead><tbody>${filas}</tbody></table>` +
            (datos.resumen.comparable
              ? `<p style="margin-top:12px;font-size:13px">Comprarle a ${datos.resumen.masCaro?.proveedor} en vez de a
                 ${datos.resumen.masBarato?.proveedor} cuesta
                 <strong>$${datos.resumen.diferencia.toLocaleString('es-CO')} más por unidad</strong>
                 (${Math.round(datos.resumen.diferenciaPct)}%).</p>`
              : '<p style="margin-top:12px;font-size:13px;color:#6E6A8A">Un solo proveedor: no hay con qué comparar.</p>'),
          width: 560,
          confirmButtonColor: '#5F3FE0',
        });
      },
      error: (err) => Swal.fire('Error', err?.error?.message || 'No se pudieron consultar los precios.', 'error'),
    });
  }

  /**
   * Manda la orden al proveedor por WhatsApp. Hoy se dicta por teléfono: el
   * texto lleva lo que se pide, para que no haya que repetirlo.
   */
  enviarPorWhatsapp(): void {
    if (!this.orden) return;

    const proveedor = this.proveedores.find((p) => p.id === this.orden?.proveedorId);
    const lineas = this.orden.lineas
      .map((l) => `• ${l.cantidad} x ${l.referencia || l.productoId}${l.descripcion ? ' — ' + l.descripcion : ''}`)
      .join('\n');

    const texto =
      `Orden de compra\n${this.orden.proveedor?.nombre || ''}\n\n${lineas}\n\n` +
      `Total: ${(this.orden.total || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}\n` +
      `Entregar en: ${this.nombreBodega(this.orden.idBodega)}`;

    // Sin teléfono, wa.me abre el selector de contacto en vez de fallar.
    const telefono = String(proveedor?.telefono || '').replace(/\D/g, '');
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, '_blank');
  }

  /** Anota un pago al proveedor. No mueve inventario ni cambia la factura. */
  async registrarPago(): Promise<void> {
    if (!this.orden) return;

    const porPagar = this.orden.cuenta?.porPagar || 0;
    const { value: datos } = await Swal.fire({
      title: 'Pago al proveedor',
      html:
        `<input id="p-val" type="number" class="swal2-input" placeholder="Valor pagado" value="${porPagar > 0 ? porPagar : ''}">` +
        '<input id="p-med" class="swal2-input" placeholder="Medio (transferencia, efectivo…)">' +
        '<input id="p-fac" class="swal2-input" placeholder="Factura (opcional — vacío = anticipo)">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Anotar pago',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const valor = Number((document.getElementById('p-val') as HTMLInputElement)?.value);
        if (!valor || valor <= 0) { Swal.showValidationMessage('El valor debe ser mayor que cero'); return false; }
        return {
          valor,
          medio: (document.getElementById('p-med') as HTMLInputElement)?.value?.trim() || null,
          factura: (document.getElementById('p-fac') as HTMLInputElement)?.value?.trim() || null,
          fecha: new Date().toISOString().slice(0, 10),
        };
      },
    });

    if (!datos) return;

    this.guardando = true;
    this.inventarioService.registrarPagoOrden(this.orden.id, datos).subscribe({
      next: () => {
        this.guardando = false;
        this.abrirOrden(this.orden!.id);
        Swal.fire({ icon: 'success', title: 'Pago anotado', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo anotar', err?.error?.message || 'Revise el valor.', 'error');
      },
    });
  }

  /** Anota la factura del proveedor. No mueve inventario ni paga nada. */
  async registrarFactura(): Promise<void> {
    if (!this.orden) return;

    const { value: datos } = await Swal.fire({
      title: 'Factura del proveedor',
      html:
        '<input id="f-num" class="swal2-input" placeholder="Número de factura">' +
        '<input id="f-val" type="number" class="swal2-input" placeholder="Valor facturado">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Anotar factura',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const numero = (document.getElementById('f-num') as HTMLInputElement)?.value?.trim();
        const valor = Number((document.getElementById('f-val') as HTMLInputElement)?.value);
        if (!numero) { Swal.showValidationMessage('La factura necesita su número'); return false; }
        if (!valor || valor <= 0) { Swal.showValidationMessage('El valor debe ser mayor que cero'); return false; }
        return { numero, valor };
      },
    });

    if (!datos) return;

    this.guardando = true;
    this.inventarioService.registrarFacturaOrden(this.orden.id, datos).subscribe({
      next: () => {
        this.guardando = false;
        this.abrirOrden(this.orden!.id);
        Swal.fire({ icon: 'success', title: 'Factura anotada', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo anotar', err?.error?.message || 'Revise el número y el valor.', 'error');
      },
    });
  }

  cancelarCreacion(): void {
    this.creando = false;
    this.proveedorId = '';
    this.proveedorNombre = '';
    this.proveedorNit = '';
    this.observaciones = '';
    this.flete = null;
    this.otrosCostos = null;
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
      const leido = leerErrorInventario(err);
      Swal.fire({
        icon: leido.esNoInventariable ? 'warning' : 'error',
        title: leido.esNoInventariable ? 'Un producto no lleva inventario' : 'No entró el inventario',
        html: leido.motivo
          ? `<p>${leido.motivo}</p>` + (leido.sugerencia ? `<p class="text-muted mb-0">${leido.sugerencia}</p>` : '')
          : 'No se pudo registrar la entrada.',
        confirmButtonColor: '#5F3FE0',
      });
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


  /**
   * Bodega pedida en la dirección (?bodega=BOD-001). Sirve para llegar desde
   * la lista de bodegas ya enfocado en una, sin volver a escogerla.
   */
  private bodegaPedidaEnLaUrl(): string {
    const pedida = new URLSearchParams(window.location.search).get('bodega') || '';
    return this.bodegas.some((b: any) => b.idBodega === pedida) ? pedida : '';
  }

  nombreBodega(idBodega: string): string {
    const bodega = this.bodegas.find((b: any) => b.idBodega === idBodega);
    return (bodega as any)?.nombre || idBodega;
  }

}
