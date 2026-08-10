import { Component, OnInit } from '@angular/core';
import {
  DisponibilidadBodega,
  DisponibilidadResponse,
  FilaDisponibilidad,
  IndicadorProducto,
  IndicadoresBodega,
  IndicadoresInventarioResponse,
  InventarioService,
} from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';

type Foco = 'todos' | 'agotandose' | 'quietos' | 'sinCosto';
type Vista = 'indicadores' | 'disponibilidad';

/**
 * Indicadores de bodega: para cuántos días alcanza lo que hay, qué tan rápido
 * rota, qué plata está quieta y cuánto vale a costo.
 *
 * La pantalla no calcula nada: el backend deriva todo del libro de movimientos
 * y marca su propia confianza. Aquí solo se muestra — incluida la letra chica,
 * porque un número sin su advertencia se lee como exacto.
 */
@Component({
  selector: 'app-indicadores-inventario',
  templateUrl: './indicadores.component.html',
  styleUrls: ['./indicadores.component.scss'],
})
export class IndicadoresComponent implements OnInit {
  cargando = false;
  error: string | null = null;

  bodegas: Bodega[] = [];
  bodegaSeleccionada = '';
  dias = 30;

  opcionesVentana = [
    { label: 'Últimos 7 días', value: 7 },
    { label: 'Últimos 30 días', value: 30 },
    { label: 'Últimos 90 días', value: 90 },
    { label: 'Último año', value: 365 },
  ];

  informe: IndicadoresInformeVista | null = null;

  vista: Vista = 'indicadores';
  disponibilidad: DisponibilidadResponse | null = null;
  cargandoDisponibilidad = false;
  errorDisponibilidad: string | null = null;
  soloComprometidos = true;

  foco: Foco = 'todos';
  busqueda = '';

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = (bodegas || []).filter((b: any) => b?.idBodega);
        // Arrancar por una bodega concreta: el informe de todas recorre el
        // catálogo entero y se demora. El usuario elige ampliar.
        this.bodegaSeleccionada = this.bodegaPedidaEnLaUrl() || this.bodegas[0]?.idBodega || '';
        this.consultar();
      },
      error: () => {
        this.bodegas = [];
        this.consultar();
      },
    });
  }

  /** Cambió la bodega o la ventana: lo que esté a la vista se recalcula. */
  alCambiarFiltro(): void {
    this.disponibilidad = null;
    if (this.vista === 'disponibilidad') this.consultarDisponibilidad();
    else this.consultar();
  }

  consultar(): void {
    this.cargando = true;
    this.error = null;

    this.inventarioService
      .consultarIndicadoresInventario({
        bodega: this.bodegaSeleccionada || undefined,
        dias: this.dias,
      })
      .subscribe({
        next: (respuesta) => {
          this.informe = this.aVista(respuesta);
          this.cargando = false;
        },
        error: (err) => {
          this.error =
            err?.error?.message || 'No se pudieron cargar los indicadores. Intente de nuevo.';
          this.informe = null;
          this.cargando = false;
        },
      });
  }

  cambiarVista(vista: Vista): void {
    this.vista = vista;
    if (vista === 'disponibilidad' && !this.disponibilidad) this.consultarDisponibilidad();
  }

  consultarDisponibilidad(): void {
    this.cargandoDisponibilidad = true;
    this.errorDisponibilidad = null;

    this.inventarioService
      .consultarDisponibilidad({ bodega: this.bodegaSeleccionada || undefined })
      .subscribe({
        next: (respuesta) => {
          this.disponibilidad = respuesta;
          this.cargandoDisponibilidad = false;
        },
        error: (err) => {
          this.errorDisponibilidad =
            err?.error?.message || 'No se pudo calcular la disponibilidad. Intente de nuevo.';
          this.disponibilidad = null;
          this.cargandoDisponibilidad = false;
        },
      });
  }

  /**
   * Por defecto solo se muestran los productos con algo apartado: son los
   * únicos donde disponible y físico difieren, que es de lo que trata esta
   * vista. El resto se puede ver quitando el filtro.
   */
  filasDisponibilidad(bodega: DisponibilidadBodega): FilaDisponibilidad[] {
    const termino = this.busqueda.trim().toLowerCase();

    return bodega.filas.filter((fila) => {
      if (this.soloComprometidos && fila.comprometido === 0 && !fila.sobrecomprometido) return false;
      if (!termino) return true;
      return (
        (fila.referencia || '').toLowerCase().includes(termino) ||
        fila.productoId.toLowerCase().includes(termino)
      );
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

  /** null = sin demanda en la ventana. No es cero: cero sería "se agota hoy". */
  textoCobertura(dias: number | null, topeada = false): string {
    if (dias === null) return 'Sin demanda';
    if (topeada) return 'Más de 999 d';
    if (dias < 1) return 'Se agota ya';
    return `${Math.round(dias)} d`;
  }

  textoRotacion(veces: number | null): string {
    if (veces === null) return '—';
    return `${veces.toFixed(1)}× al año`;
  }

  claseCobertura(fila: IndicadorProducto): string {
    if (fila.coberturaDias === null) return 'quieto';
    if (fila.coberturaDias < 7) return 'critico';
    if (fila.coberturaDias < 15) return 'atencion';
    return 'sano';
  }

  filasVisibles(bodega: IndicadoresBodega): IndicadorProducto[] {
    const termino = this.busqueda.trim().toLowerCase();

    return bodega.filas.filter((fila) => {
      if (this.foco === 'agotandose' && (fila.coberturaDias === null || fila.coberturaDias >= 15)) {
        return false;
      }
      if (this.foco === 'quietos' && !fila.inmovilizado) return false;
      if (this.foco === 'sinCosto' && !fila.sinCosto) return false;

      if (!termino) return true;
      return (
        (fila.referencia || '').toLowerCase().includes(termino) ||
        (fila.nombre || '').toLowerCase().includes(termino)
      );
    });
  }

  cambiarFoco(foco: Foco): void {
    this.foco = this.foco === foco ? 'todos' : foco;
  }

  private aVista(respuesta: IndicadoresInventarioResponse): IndicadoresInformeVista {
    const bodegas = respuesta.bodegas || [];
    const total = bodegas.reduce(
      (acumulado, bodega) => {
        acumulado.skus += bodega.resumen.skus;
        acumulado.unidades += bodega.resumen.unidades;
        acumulado.valorCosto += bodega.resumen.valorCosto;
        acumulado.inmovilizados += bodega.resumen.inmovilizados;
        acumulado.valorInmovilizado += bodega.resumen.valorInmovilizado;
        acumulado.coberturaBaja += bodega.resumen.coberturaBaja;
        acumulado.skusSinCosto += bodega.resumen.skusSinCosto;
        return acumulado;
      },
      {
        skus: 0,
        unidades: 0,
        valorCosto: 0,
        inmovilizados: 0,
        valorInmovilizado: 0,
        coberturaBaja: 0,
        skusSinCosto: 0,
      },
    );

    return { ...respuesta, total };
  }
}

export interface IndicadoresInformeVista extends IndicadoresInventarioResponse {
  total: {
    skus: number;
    unidades: number;
    valorCosto: number;
    inmovilizados: number;
    valorInmovilizado: number;
    coberturaBaja: number;
    skusSinCosto: number;
  };

}
