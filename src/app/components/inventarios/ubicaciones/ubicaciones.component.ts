import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import {
  InventarioService,
  ProductoEnUbicacion,
  UbicacionCatalogo,
  UbicacionesBodegaResponse,
} from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';

/**
 * Mapa de la bodega: dónde vive cada producto.
 *
 * El objetivo de la pantalla es que alguien que nunca ha entrado a la bodega
 * pueda encontrar y guardar mercancía. Por eso el catálogo se puede generar en
 * bloque (nadie escribe 200 ubicaciones a mano) y lo que falta por ubicar está
 * siempre a la vista, no escondido en otra pestaña.
 */
@Component({
  selector: 'app-ubicaciones-bodega',
  templateUrl: './ubicaciones.component.html',
  styleUrls: ['./ubicaciones.component.scss'],
})
export class UbicacionesComponent implements OnInit {
  cargando = false;
  guardando = false;
  error: string | null = null;

  bodegas: Bodega[] = [];
  bodegaSeleccionada = '';

  mapa: UbicacionesBodegaResponse | null = null;

  busqueda = '';
  mostrarEditor = false;

  // Generador en bloque
  zonaNueva = 'A';
  estantesNuevos = 5;
  posicionesNuevas = 4;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = (bodegas || []).filter((b: any) => b?.idBodega);
        this.bodegaSeleccionada = this.bodegaPedidaEnLaUrl() || this.bodegas[0]?.idBodega || '';
        if (this.bodegaSeleccionada) this.consultar();
      },
      error: () => {
        this.error = 'No se pudieron cargar las bodegas.';
      },
    });
  }

  consultar(): void {
    if (!this.bodegaSeleccionada) return;
    this.cargando = true;
    this.error = null;

    this.inventarioService.consultarUbicaciones(this.bodegaSeleccionada).subscribe({
      next: (respuesta) => {
        this.mapa = respuesta;
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo cargar el mapa de la bodega.';
        this.mapa = null;
        this.cargando = false;
      },
    });
  }

  ubicacionesVisibles(): UbicacionCatalogo[] {
    if (!this.mapa) return [];
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) return this.mapa.ubicaciones;

    return this.mapa.ubicaciones.filter((u: any) => {
      if (u.codigo.toLowerCase().includes(termino)) return true;
      return (u.productos || []).some((p: ProductoEnUbicacion) =>
        (p.referencia || p.productoId).toLowerCase().includes(termino),
      );
    });
  }

  productosSinUbicar(): ProductoEnUbicacion[] {
    if (!this.mapa) return [];
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) return this.mapa.sinUbicar;
    return this.mapa.sinUbicar.filter((p) =>
      (p.referencia || p.productoId).toLowerCase().includes(termino),
    );
  }

  /**
   * Genera zona A con N estantes y M posiciones. Es la única forma razonable de
   * dar de alta una bodega real: a mano son cientos de renglones.
   */
  generarEnBloque(): void {
    if (!this.mapa) return;

    const zona = (this.zonaNueva || '').trim().toUpperCase();
    if (!zona) {
      Swal.fire('Falta la zona', 'Escriba el nombre de la zona (por ejemplo A o RECEPCION).', 'warning');
      return;
    }

    const estantes = Math.max(1, Math.min(Number(this.estantesNuevos) || 1, 99));
    const posiciones = Math.max(1, Math.min(Number(this.posicionesNuevas) || 1, 99));

    const existentes = new Set(this.mapa.ubicaciones.map((u) => u.codigo));
    const nuevas: any[] = [];

    for (let estante = 1; estante <= estantes; estante++) {
      for (let posicion = 1; posicion <= posiciones; posicion++) {
        const codigo = `${zona}-${String(estante).padStart(2, '0')}-${String(posicion).padStart(2, '0')}`;
        if (!existentes.has(codigo)) nuevas.push({ codigo, activa: true });
      }
    }

    if (nuevas.length === 0) {
      Swal.fire('Nada que agregar', 'Esas ubicaciones ya existen en el catálogo.', 'info');
      return;
    }

    this.guardarCatalogo([...this.mapa.ubicaciones, ...nuevas], `${nuevas.length} ubicaciones creadas`);
  }

  quitarUbicacion(codigo: string): void {
    if (!this.mapa) return;
    const restantes = this.mapa.ubicaciones.filter((u) => u.codigo !== codigo);
    this.guardarCatalogo(restantes, `${codigo} eliminada del catálogo`);
  }

  private guardarCatalogo(ubicaciones: any[], mensajeExito: string): void {
    this.guardando = true;

    this.inventarioService.guardarUbicaciones(this.bodegaSeleccionada, ubicaciones).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: mensajeExito, timer: 1600, showConfirmButton: false });
        this.consultar();
      },
      error: (err) => {
        this.guardando = false;
        // El backend rechaza dejar productos apuntando a un lugar que ya no
        // existe: se le ofrece al usuario mover primero o confirmar.
        if (err?.error?.error === 'LOCATIONS_IN_USE') {
          Swal.fire({
            icon: 'warning',
            title: 'Hay productos guardados ahí',
            text: err.error.message,
            showCancelButton: true,
            confirmButtonText: 'Dejarlos sin lugar',
            cancelButtonText: 'Cancelar',
          }).then((resultado) => {
            if (!resultado.isConfirmed) return;
            this.guardando = true;
            this.inventarioService
              .guardarUbicaciones(this.bodegaSeleccionada, ubicaciones, true)
              .subscribe({
                next: () => {
                  this.guardando = false;
                  this.consultar();
                },
                error: () => {
                  this.guardando = false;
                  Swal.fire('Error', 'No se pudo guardar el catálogo.', 'error');
                },
              });
          });
          return;
        }
        Swal.fire('Error', err?.error?.message || 'No se pudo guardar el catálogo.', 'error');
      },
    });
  }

  async ubicarProducto(producto: ProductoEnUbicacion): Promise<void> {
    const opciones = (this.mapa?.ubicaciones || [])
      .filter((u) => u.activa)
      .reduce((acumulado: any, u) => {
        acumulado[u.codigo] = u.descripcion ? `${u.codigo} — ${u.descripcion}` : u.codigo;
        return acumulado;
      }, {});

    if (Object.keys(opciones).length === 0) {
      Swal.fire(
        'Sin ubicaciones',
        'Primero cree el catálogo de ubicaciones de esta bodega.',
        'info',
      );
      return;
    }

    const { value: codigo } = await Swal.fire({
      title: `¿Dónde guardar ${producto.referencia || producto.productoId}?`,
      input: 'select',
      inputOptions: opciones,
      inputValue: producto.ubicacion || '',
      showCancelButton: true,
      confirmButtonText: 'Guardar aquí',
      cancelButtonText: 'Cancelar',
    });

    if (!codigo) return;
    this.asignar(producto.productoId, codigo);
  }

  quitarDeUbicacion(producto: ProductoEnUbicacion): void {
    this.asignar(producto.productoId, null);
  }

  private asignar(productoId: string, ubicacion: string | null): void {
    this.guardando = true;
    this.inventarioService
      .asignarUbicacionProducto(this.bodegaSeleccionada, productoId, ubicacion)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.consultar();
        },
        error: (err) => {
          this.guardando = false;
          Swal.fire('Error', err?.error?.message || 'No se pudo asignar la ubicación.', 'error');
        },
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
