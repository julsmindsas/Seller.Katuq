import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { leerErrorInventario } from 'src/app/shared/utils/error-inventario';
import {
  CriterioConteo,
  InventarioService,
  LineaConteo,
  SesionConteo,
} from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { TipoMovimientoInventario } from '../enums/tipos-movimiento.enum';

/**
 * Conteos cíclicos: contar un pedazo chico de la bodega cada día en vez del
 * conteo general que cierra la operación un día entero.
 *
 * La pantalla respeta el guardarraíl del dominio: contar y ajustar son dos
 * pasos con dos botones. Primero se guarda lo que había —eso es la evidencia—
 * y solo después, viendo las diferencias, alguien decide ajustar.
 */
@Component({
  selector: 'app-conteos-inventario',
  templateUrl: './conteos.component.html',
  styleUrls: ['./conteos.component.scss'],
})
export class ConteosComponent implements OnInit {
  cargando = false;
  guardando = false;
  error: string | null = null;

  bodegas: Bodega[] = [];
  bodegaSeleccionada = '';

  criterio: CriterioConteo = 'valor';
  tamano = 25;

  criterios: { valor: CriterioConteo; label: string; ayuda: string }[] = [
    { valor: 'valor', label: 'Lo más valioso', ayuda: 'Donde un error cuesta más plata' },
    { valor: 'movimiento', label: 'Lo que más se mueve', ayuda: 'Donde más se toca es donde más se descuadra' },
    { valor: 'sin_contar', label: 'Lo que lleva más sin contarse', ayuda: 'Para que nada quede nunca sin mirar' },
    { valor: 'ubicacion', label: 'Por zonas', ayuda: 'Barrer la bodega en orden de recorrido' },
  ];

  sesiones: SesionConteo[] = [];
  sesion: SesionConteo | null = null;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = (bodegas || []).filter((b: any) => b?.idBodega);
        this.bodegaSeleccionada = this.bodegaPedidaEnLaUrl() || this.bodegas[0]?.idBodega || '';
        this.cargarSesiones();
      },
      error: () => {
        this.error = 'No se pudieron cargar las bodegas.';
      },
    });
  }

  cargarSesiones(): void {
    this.cargando = true;
    this.inventarioService.listarConteos(this.bodegaSeleccionada || undefined).subscribe({
      next: (respuesta) => {
        this.sesiones = respuesta.sesiones || [];
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudieron cargar los conteos.';
        this.cargando = false;
      },
    });
  }

  armarConteo(): void {
    if (!this.bodegaSeleccionada) {
      Swal.fire('Falta la bodega', 'Escoja en qué bodega va a contar.', 'warning');
      return;
    }

    this.guardando = true;
    this.inventarioService.crearConteo(this.bodegaSeleccionada, this.criterio, this.tamano).subscribe({
      next: (sesion) => {
        this.guardando = false;
        this.sesion = sesion;
        this.cargarSesiones();
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', err?.error?.message || 'No se pudo armar el conteo.', 'error');
      },
    });
  }

  abrirSesion(id: string): void {
    this.cargando = true;
    this.inventarioService.obtenerConteo(id).subscribe({
      next: (sesion) => {
        this.sesion = sesion;
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo abrir el conteo.';
        this.cargando = false;
      },
    });
  }

  cerrarDetalle(): void {
    this.sesion = null;
    this.cargarSesiones();
  }

  /** Diferencia en vivo mientras el operario escribe, sin ir al servidor. */
  diferenciaEnVivo(linea: LineaConteo): number | null {
    if (linea.contado === null || linea.contado === undefined || (linea.contado as any) === '') return null;
    return Number(linea.contado) - Number(linea.esperado);
  }

  claseLinea(linea: LineaConteo): string {
    const diferencia = this.diferenciaEnVivo(linea);
    if (diferencia === null) return '';
    if (diferencia === 0) return 'exacta';
    return diferencia > 0 ? 'sobra' : 'falta';
  }

  guardarConteo(): void {
    if (!this.sesion) return;

    const lineas = (this.sesion.lineas || []).map((l) => ({
      productoId: l.productoId,
      contado:
        l.contado === null || l.contado === undefined || (l.contado as any) === ''
          ? null
          : Number(l.contado),
    }));

    this.guardando = true;
    this.inventarioService.registrarConteo(this.sesion.id, lineas).subscribe({
      next: () => {
        this.guardando = false;
        this.abrirSesion(this.sesion!.id);
        Swal.fire({
          icon: 'success',
          title: 'Conteo guardado',
          text: 'Queda la constancia de lo que había. El inventario no se tocó.',
          timer: 2200,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', err?.error?.message || 'No se pudo guardar el conteo.', 'error');
      },
    });
  }

  /**
   * Aplica las diferencias por el camino de ajustes de siempre: un movimiento
   * por producto, con su motivo y su observación apuntando al conteo.
   */
  async aplicarDiferencias(): Promise<void> {
    if (!this.sesion) return;

    const ajustes = this.sesion.ajustesPropuestos || [];
    if (ajustes.length === 0) {
      Swal.fire('Nada que ajustar', 'El conteo no encontró diferencias.', 'info');
      return;
    }

    const confirmacion = await Swal.fire({
      title: `¿Ajustar ${ajustes.length} productos?`,
      html:
        `<p class="text-start">Se va a mover el inventario para que quede como se contó. ` +
        `Cada cambio queda registrado como un movimiento con su motivo.</p>` +
        `<p class="text-start text-muted small">Faltantes: ${this.sesion.resumen.unidadesFaltan} unidades · ` +
        `Sobrantes: ${this.sesion.resumen.unidadesSobran} unidades</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ajustar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmacion.isConfirmed) return;

    this.guardando = true;
    let aplicados = 0;
    const fallidos: string[] = [];
    const motivosFallo = new Set<string>();

    for (const ajuste of ajustes) {
      const esIngreso = ajuste.diferencia > 0;
      const tipo = esIngreso
        ? TipoMovimientoInventario.INGRESO_INVENTARIO_FISICO
        : TipoMovimientoInventario.SALIDA_INVENTARIO_FISICO;

      try {
        await this.inventarioService
          .ingresarProductos(
            this.sesion.idBodega,
            [{ productoId: ajuste.productoId, cantidad: Math.abs(ajuste.diferencia) }],
            tipo,
            `Conteo cíclico ${this.sesion.id}`,
          )
          .toPromise();
        aplicados++;
      } catch (error) {
        // Se conserva el PORQUÉ, no solo cuál falló: un listado de referencias
        // sin motivo obliga a adivinar qué pasó con cada una.
        const leido = leerErrorInventario(error);
        fallidos.push(ajuste.referencia || ajuste.productoId);
        if (leido.motivo) motivosFallo.add(leido.motivo);
      }
    }

    // El conteo se cierra como aplicado solo si de verdad se aplicó todo: un
    // cierre en falso convertiría la evidencia en mentira.
    if (fallidos.length === 0) {
      this.inventarioService.cerrarConteo(this.sesion.id, true).subscribe({
        next: () => {
          this.guardando = false;
          Swal.fire('Listo', `${aplicados} productos ajustados.`, 'success');
          this.cerrarDetalle();
        },
        error: () => {
          this.guardando = false;
          this.cerrarDetalle();
        },
      });
      return;
    }

    this.guardando = false;
    Swal.fire({
      icon: 'warning',
      title: 'Quedó a medias',
      html:
        `<p>Se ajustaron ${aplicados} de ${ajustes.length}.</p>` +
        `<p class="text-muted small">No se pudo con: ${fallidos.join(', ')}.</p>` +
        (motivosFallo.size
          ? `<p class="text-muted small mb-0"><strong>Motivo:</strong> ${[...motivosFallo].join(' · ')}</p>`
          : '') +
        `<p class="text-muted small mb-0">El conteo sigue abierto para que no se pierda lo contado.</p>`,
    });
  }

  cancelarConteo(): void {
    if (!this.sesion) return;

    Swal.fire({
      title: '¿Descartar este conteo?',
      text: 'Queda la constancia de que se descartó. El inventario no se toca.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, descartar',
      cancelButtonText: 'Volver',
    }).then((resultado) => {
      if (!resultado.isConfirmed || !this.sesion) return;
      this.inventarioService.cerrarConteo(this.sesion.id, false).subscribe({
        next: () => this.cerrarDetalle(),
        error: (err) => Swal.fire('Error', err?.error?.message || 'No se pudo cerrar.', 'error'),
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

  textoExactitud(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return 'Sin contar';
    return `${Math.round(valor * 100)}%`;
  }

  etiquetaCriterio(criterio: string): string {
    return this.criterios.find((c) => c.valor === criterio)?.label || criterio;
  }

}
