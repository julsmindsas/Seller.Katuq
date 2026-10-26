import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { HistorialProductoService } from '../../../shared/services/productos/historial-producto.service';
import {
  EventoHistorialProducto,
  FiltroHistorialProducto,
  OrdenHistorialProducto,
  PaginaHistorialProducto,
  ResumenHistorialProducto,
} from '../../../shared/models/historial-producto.model';
import { agruparPorDia, fechaHoraColombia, GrupoDia } from './historial-producto.util';

/**
 * Historial del producto (D-548, F1): quién cambió qué, cuándo y desde dónde, con el valor de antes.
 *
 * Lo usan la pestaña «Historial» de la ficha (todo) y el diálogo de Listas de precios (solo precios o
 * solo costo). Pide páginas de 50 con «Ver más»; el cursor lo da el servidor. Si el servidor responde
 * la vista de antes (`vista: 'legado'`: bandera apagada o falla), dice que el detalle no está
 * disponible por ahora y no rompe la pantalla.
 *
 * OnPush (excepción acotada del Artículo IX, como D-054 y D-541: Angular 14 no tiene signals).
 */
@Component({
  selector: 'app-historial-producto',
  templateUrl: './historial-producto.component.html',
  styleUrls: ['./historial-producto.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialProductoComponent implements OnChanges, OnDestroy {
  /** Id del documento del producto (`producto.cd`). */
  @Input() productoId = '';
  /** `precios` o `costo` para ver solo esos cambios; sin valor, todo. */
  @Input() tipo: FiltroHistorialProducto | null = null;
  /** Sin la tarjeta de resumen (el diálogo de Listas de precios ya dice qué producto es). */
  @Input() sinResumen = false;

  readonly PAGINA = 50;

  eventos: EventoHistorialProducto[] = [];
  grupos: GrupoDia[] = [];
  resumen: ResumenHistorialProducto | null = null;
  orden: OrdenHistorialProducto = 'desc';
  siguiente: string | null = null;

  cargando = false;
  cargandoMas = false;
  error = false;
  /** Falló «Ver más»: la lista que ya se ve se conserva. */
  errorMas = false;
  /** El servidor contestó la vista de antes: el detalle no está disponible por ahora. */
  noDisponible = false;

  private sub: Subscription | null = null;

  constructor(private readonly servicio: HistorialProductoService, private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['productoId'] || cambios['tipo']) this.cargar(true);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get hayMas(): boolean {
    return !!this.siguiente;
  }

  get vacio(): boolean {
    return !this.cargando && !this.error && !this.noDisponible && this.eventos.length === 0;
  }

  get textoVacio(): string {
    if (this.tipo === 'precios') return 'Este producto aún no tiene cambios de precio registrados.';
    // Neutro a propósito: quien no puede ver costos recibe la lista vacía y no debe leer que «no hay cambios».
    if (this.tipo === 'costo') return 'No hay cambios de costo para mostrar en esta vista.';
    return 'Este producto aún no tiene cambios registrados.';
  }

  get textoOrden(): string {
    return this.orden === 'desc' ? 'Más antiguos primero' : 'Más recientes primero';
  }

  get ultimoCambioTexto(): string {
    const u = this.resumen?.ultimoCambio;
    if (!u) return '';
    const fecha = fechaHoraColombia(u.fecha);
    return u.titulo ? `${u.titulo} · ${fecha}` : fecha;
  }

  get cuentaTexto(): string {
    const n = this.resumen?.totalCambios;
    if (n === null || n === undefined) return '';
    return n === 1 ? '1 cambio registrado' : `${n} cambios registrados`;
  }

  reintentar(): void {
    this.cargar(true);
  }

  cambiarOrden(): void {
    this.orden = this.orden === 'desc' ? 'asc' : 'desc';
    this.cargar(true);
  }

  verMas(): void {
    if (!this.siguiente || this.cargandoMas) return;
    this.cargar(false);
  }

  trackGrupo(_: number, g: GrupoDia): string {
    return g.clave;
  }

  trackEvento(_: number, e: EventoHistorialProducto): string {
    return e.id;
  }

  /** Empieza de nuevo (`desdeCero`) o pide la página que sigue con el cursor del servidor. */
  private cargar(desdeCero: boolean): void {
    this.sub?.unsubscribe();
    if (!this.productoId) {
      this.limpiar();
      this.cdr.markForCheck();
      return;
    }
    if (desdeCero) {
      this.limpiar();
      this.cargando = true;
    } else {
      this.cargandoMas = true;
    }
    this.error = false;
    this.errorMas = false;
    this.cdr.markForCheck();

    this.sub = this.servicio
      .pagina(this.productoId, { orden: this.orden, tipo: this.tipo, limite: this.PAGINA, cursor: desdeCero ? null : this.siguiente })
      .subscribe({
        next: (r) => this.recibir(r, desdeCero),
        error: () => {
          this.cargando = false;
          this.cargandoMas = false;
          // Si ya había eventos, se conservan y solo falla «Ver más».
          if (desdeCero) this.error = true;
          else this.errorMas = true;
          this.cdr.markForCheck();
        },
      });
  }

  private recibir(r: PaginaHistorialProducto, desdeCero: boolean): void {
    this.cargando = false;
    this.cargandoMas = false;
    if (!r || r.vista !== 'eventos') {
      this.limpiar();
      this.noDisponible = true;
      this.cdr.markForCheck();
      return;
    }
    const nuevos = Array.isArray(r.eventos) ? r.eventos : [];
    // Sin dobles aunque el servidor repita un elemento entre páginas.
    const vistos = new Set(desdeCero ? [] : this.eventos.map((e) => e.id));
    const sinRepetir = nuevos.filter((e) => !vistos.has(e.id));
    this.eventos = desdeCero ? sinRepetir : [...this.eventos, ...sinRepetir];
    this.siguiente = r.siguiente || null;
    if (r.resumen) this.resumen = r.resumen;
    this.grupos = agruparPorDia(this.eventos);
    this.cdr.markForCheck();
  }

  private limpiar(): void {
    this.eventos = [];
    this.grupos = [];
    this.resumen = null;
    this.siguiente = null;
    this.cargando = false;
    this.cargandoMas = false;
    this.error = false;
    this.errorMas = false;
    this.noDisponible = false;
  }
}
