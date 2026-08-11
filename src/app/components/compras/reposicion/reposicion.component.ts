import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import {
  FilaReposicion,
  InventarioService,
  Proveedor,
  SugerenciaReposicion,
} from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';

/**
 * Qué comprar: la pregunta que va antes de crear una orden.
 *
 * La pantalla muestra primero lo que se agota antes de que llegue el pedido, y
 * dice explícitamente qué NO alcanzó a proyectar. Una lista corta puede
 * significar "no hay nada que comprar" o "esta empresa no registra sus
 * salidas", y confundirlas lleva a decisiones opuestas.
 */
@Component({
  selector: 'app-reposicion',
  templateUrl: './reposicion.component.html',
  styleUrls: ['./reposicion.component.scss'],
})
export class ReposicionComponent implements OnInit {
  cargando = false;
  creando = false;
  error: string | null = null;

  bodegas: Bodega[] = [];
  proveedores: Proveedor[] = [];
  bodegaSeleccionada = '';
  coberturaObjetivo = 30;
  ventanaDias = 90;

  sugerencia: SugerenciaReposicion | null = null;
  /** Cantidad a pedir por producto: arranca en lo sugerido y se puede corregir. */
  cantidades: Record<string, number> = {};
  seleccion: Record<string, boolean> = {};
  /** Para los productos que nunca se le compraron a nadie. */
  proveedorPorFila: Record<string, string> = {};

  soloUrgentes = false;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas || [];
        this.consultar();
      },
      error: () => this.consultar(),
    });

    this.inventarioService.listarProveedores().subscribe({
      next: (r) => { this.proveedores = r.proveedores || []; },
      error: () => { this.proveedores = []; },
    });
  }

  clave(fila: FilaReposicion): string {
    return `${fila.productoId}_${fila.idBodega}`;
  }

  consultar(): void {
    this.cargando = true;
    this.error = null;

    this.inventarioService
      .sugerenciaReposicion({
        bodega: this.bodegaSeleccionada || undefined,
        dias: this.ventanaDias,
        cobertura: this.coberturaObjetivo,
      })
      .subscribe({
        next: (sugerencia) => {
          this.sugerencia = sugerencia;
          this.cantidades = {};
          this.seleccion = {};
          this.proveedorPorFila = {};
          for (const fila of sugerencia.filas || []) {
            const k = this.clave(fila);
            this.cantidades[k] = fila.sugerido;
            // Lo urgente viene marcado: es lo que alguien atendería primero.
            this.seleccion[k] = fila.urgente;
            if (fila.proveedorId) this.proveedorPorFila[k] = fila.proveedorId;
          }
          this.cargando = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'No se pudo calcular la sugerencia.';
          this.cargando = false;
        },
      });
  }

  get filas(): FilaReposicion[] {
    const todas = this.sugerencia?.filas || [];
    return this.soloUrgentes ? todas.filter((f) => f.urgente) : todas;
  }

  get seleccionadas(): FilaReposicion[] {
    return (this.sugerencia?.filas || []).filter((f) => this.seleccion[this.clave(f)]);
  }

  get valorSeleccionado(): number {
    return this.seleccionadas.reduce(
      (s, f) => s + (this.cantidades[this.clave(f)] || 0) * f.costoUnitario,
      0,
    );
  }

  marcarTodas(marcar: boolean): void {
    for (const fila of this.filas) this.seleccion[this.clave(fila)] = marcar;
  }

  nombreBodega(idBodega: string): string {
    const bodega = this.bodegas.find((b) => b.idBodega === idBodega);
    return bodega?.nombre || idBodega;
  }

  nombreProveedor(id: string): string {
    return this.proveedores.find((p) => p.id === id)?.nombre || 'Sin proveedor';
  }

  textoCobertura(fila: FilaReposicion): string {
    if (fila.coberturaDias === null) return 'sin demanda';
    const dias = Math.round(fila.coberturaDias);
    return dias === 0 ? 'agotado' : `${dias} días`;
  }

  /**
   * Convierte lo seleccionado en órdenes, una por proveedor y bodega: una orden
   * entra a una sola bodega, y un proveedor no factura lo de otro.
   */
  async crearOrdenes(): Promise<void> {
    const filas = this.seleccionadas;
    if (filas.length === 0) {
      Swal.fire('Nada seleccionado', 'Marque lo que va a comprar.', 'info');
      return;
    }

    const sinProveedor = filas.filter((f) => !this.proveedorPorFila[this.clave(f)]);
    if (sinProveedor.length > 0) {
      Swal.fire(
        'Falta el proveedor',
        `${sinProveedor.length} producto(s) no tienen a quién pedírselos. Escoja proveedor en cada fila o desmárquelos.`,
        'warning',
      );
      return;
    }

    const grupos = new Map<string, FilaReposicion[]>();
    for (const fila of filas) {
      const llave = `${this.proveedorPorFila[this.clave(fila)]}||${fila.idBodega}`;
      grupos.set(llave, [...(grupos.get(llave) || []), fila]);
    }

    const confirmacion = await Swal.fire({
      title: `¿Crear ${grupos.size} orden(es) de compra?`,
      html:
        `${filas.length} productos por ${this.valorSeleccionado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}.` +
        '<br><span class="text-muted">No mueve inventario: la mercancía entra cuando se reciba.</span>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.creando = true;
    const creadas: string[] = [];
    const fallidas: string[] = [];

    for (const [llave, delGrupo] of grupos.entries()) {
      const [proveedorId, idBodega] = llave.split('||');
      try {
        await this.inventarioService
          .crearOrdenCompra({
            proveedor: { nombre: this.nombreProveedor(proveedorId) },
            proveedorId,
            bodega: idBodega,
            lineas: delGrupo.map((f) => ({
              productoId: f.productoId,
              referencia: f.referencia || undefined,
              descripcion: f.nombre || undefined,
              cantidad: this.cantidades[this.clave(f)] || f.sugerido,
              costoUnitario: f.costoUnitario,
            })),
            observaciones: `Reposición sugerida · cobertura ${this.coberturaObjetivo} días`,
          })
          .toPromise();
        creadas.push(`${this.nombreProveedor(proveedorId)} (${this.nombreBodega(idBodega)})`);
      } catch (err: any) {
        fallidas.push(`${this.nombreProveedor(proveedorId)}: ${err?.error?.message || 'error'}`);
      }
    }

    this.creando = false;

    // Decir exactamente qué se creó: si una falla, las otras ya existen y
    // reportar un fracaso total llevaría a crearlas dos veces.
    if (fallidas.length === 0) {
      await Swal.fire({
        icon: 'success',
        title: `${creadas.length} orden(es) creada(s)`,
        html: creadas.map((c) => `<div>${c}</div>`).join(''),
      });
    } else {
      await Swal.fire({
        icon: creadas.length > 0 ? 'warning' : 'error',
        title: creadas.length > 0 ? 'Se crearon algunas' : 'No se crearon',
        html:
          (creadas.length ? `<p><strong>Creadas:</strong><br>${creadas.join('<br>')}</p>` : '') +
          `<p><strong>Fallaron:</strong><br>${fallidas.join('<br>')}</p>`,
      });
    }

    this.consultar();
  }
}
