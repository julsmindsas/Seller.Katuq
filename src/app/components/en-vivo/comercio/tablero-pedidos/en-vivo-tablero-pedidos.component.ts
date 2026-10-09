import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { EtapaId, EtapaInfo, PedidoEnVivo } from '../../servicios/en-vivo.modelos';
import { cadaFueraDeZona, prefiereMenosMovimiento } from '../../utilidades/movimiento';
import { mapaDeEtapas } from '../../utilidades/tonos';
import { EnVivoOrbeService, MarcaOrbe } from '../../escenas/opttia-guia.service';
import { ocultarDe$ } from '../comercio-fuentes';
import { FLIP_CURVA, FLIP_DURACION_MS, planearFlip, PosicionTarjeta } from '../utilidades/flip';
import { armarColumnas, ColumnaTablero, TarjetaTablero, totalEnTablero } from '../utilidades/tablero';

/** Lo que pinta el tablero. */
interface VistaTablero {
  /** Ya llegó la foto; antes no hay pedidos que mostrar. */
  cargado: boolean;
  columnas: ColumnaTablero[];
  /** Pedidos en las seis columnas. */
  total: number;
  /** D-349: el vendedor ve solo los suyos. */
  soloPropias: boolean;
}

/** Lo que el tablero lee del estado. */
interface EntradaTablero {
  cargado: boolean;
  pedidos: ReadonlyArray<PedidoEnVivo>;
  etapas: ReadonlyArray<EtapaInfo>;
  dia: string | null;
  empresa: string | null;
  soloPropias: boolean;
}

const ACTUALIZAR_MS = 30000;
const DURACION_NUEVA_MS = 1800;
const DURACION_MOVIDA_MS = 1400;

/**
 * Vista "Pedidos": el tablero por etapas (recibidos, producción, alistamiento, listos, en camino y
 * entregados hoy) con una tarjeta por pedido. Lee los pedidos de la foto del `EnVivoEstadoService`
 * y los UBICA por etapa; no calcula nada más que cuánto lleva cada uno en su etapa con sus horas.
 *
 * - Cada tarjeta viaja a su columna nueva cuando el pedido cambia de etapa (animación FLIP, sin ella
 *   con `prefers-reduced-motion`); los pedidos nuevos entran resaltados.
 * - Hasta 40 tarjetas por columna ("y N más") y las 14 últimas entregadas.
 * - Una tarjeta pasa a "tarde" al superar el tiempo normal de su etapa (30 / 90 / 45 / 45 / 80 min),
 *   salvo la transportadora en camino. La marca "Opttia" sale en los pedidos armados por el bot.
 * - "Ocultar clientes y montos" cambia el cliente por "Cliente" y quita el monto.
 *
 * Tocar una tarjeta avisa por `EnVivoInteraccionService` (`abrir-pedido`); la ficha la abre quien
 * escuche. Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-tablero-pedidos',
  templateUrl: './en-vivo-tablero-pedidos.component.html',
  styleUrls: ['./en-vivo-tablero-pedidos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoTableroPedidosComponent implements OnInit, OnDestroy {
  @ViewChild('tablero', { static: true }) tablero!: ElementRef<HTMLElement>;

  vista: VistaTablero = { cargado: false, columnas: [], total: 0, soloPropias: false };

  private entrada: EntradaTablero | null = null;
  private ocultar = false;
  private ahoraMs = Date.now();
  /** Pedidos ya vistos y la columna en que estaban: de ahí salen los nuevos y los que se movieron. */
  private vistos = new Set<string>();
  private columnaPrevia = new Map<string, EtapaId>();
  private nuevas = new Set<string>();
  private movidas = new Set<string>();
  private haPintado = false;
  private readonly temporizadores = new Set<number>();
  private readonly suscripcion = new Subscription();
  private pararReloj: (() => void) | null = null;
  private soltarMarcas: (() => void) | null = null;
  /** La tarjeta que Opttia señala ahora (sobrevive al repintado: la plantilla la lee en cada pintado). */
  marca: MarcaOrbe | null = null;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef,
    private readonly orbe: EnVivoOrbeService
  ) {}

  ngOnInit(): void {
    this.suscripcion.add(
      combineLatest([
        this.estado.estado$.pipe(
          map(
            (e): EntradaTablero => ({
              cargado: e.cargado,
              pedidos: e.pedidos,
              etapas: e.etapas,
              dia: e.cifras?.dia ?? null,
              empresa: e.empresa,
              soloPropias: e.soloPropias,
            })
          ),
          distinctUntilChanged(
            (a, b) =>
              a.cargado === b.cargado &&
              a.pedidos === b.pedidos &&
              a.etapas === b.etapas &&
              a.dia === b.dia &&
              a.empresa === b.empresa &&
              a.soloPropias === b.soloPropias
          )
        ),
        ocultarDe$(this.estado.preferencias$),
      ]).subscribe(([entrada, ocultar]) => {
        this.entrada = entrada;
        this.ocultar = ocultar;
        this.ahoraMs = Date.now();
        this.pintar();
      })
    );

    // Opttia marca aquí la tarjeta de lo que señala (el tablero no es 3D).
    this.soltarMarcas = this.orbe.usarMarcas('pedido');
    this.suscripcion.add(
      this.orbe.marca$.subscribe((m) => {
        this.marca = m && m.tipo === 'pedido' ? m : null;
        this.cambios.markForCheck();
      })
    );

    // "Lo que lleva en la etapa" y la marca "tarde" suben solos, sin esperar un evento.
    this.pararReloj = cadaFueraDeZona(this.zona, ACTUALIZAR_MS, () => {
      this.ahoraMs = Date.now();
      this.pintar();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
    this.pararReloj?.();
    this.pararReloj = null;
    this.soltarMarcas?.();
    this.soltarMarcas = null;
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  abrir(tarjeta: TarjetaTablero): void {
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: tarjeta.id, empresa: this.entrada?.empresa ?? null });
  }

  /** "Opttia: …" si esta es la tarjeta que Opttia señala; null si no. */
  textoOpttia(id: string): string | null {
    return this.marca && this.marca.id === id ? `Opttia: ${this.marca.texto}` : null;
  }

  porColumna(_: number, columna: ColumnaTablero): EtapaId {
    return columna.id;
  }

  porTarjeta(_: number, tarjeta: TarjetaTablero): string {
    return tarjeta.id;
  }

  // ── Pintado ───────────────────────────────────────────────────────────────

  private pintar(): void {
    const entrada = this.entrada;
    if (!entrada) return;
    if (!entrada.cargado) {
      this.reiniciar();
      return;
    }

    const columnas = armarColumnas(entrada.pedidos, {
      ahoraMs: this.ahoraMs,
      dia: entrada.dia,
      etapas: mapaDeEtapas(entrada.etapas),
      ocultar: this.ocultar,
    });

    this.marcarNuevasYMovidas(entrada.pedidos);
    for (const columna of columnas) {
      for (const tarjeta of columna.tarjetas) {
        tarjeta.nuevo = this.nuevas.has(tarjeta.id);
        tarjeta.movida = this.movidas.has(tarjeta.id);
      }
    }

    // FLIP: se mide ANTES de repintar, se repinta de inmediato y se anima desde donde estaban.
    const reducir = prefiereMenosMovimiento();
    const antes = this.haPintado && !reducir ? this.medir() : null;
    this.vista = { cargado: true, columnas, total: totalEnTablero(columnas), soloPropias: entrada.soloPropias };
    if (this.haPintado) {
      this.cambios.detectChanges();
      if (antes) this.animar(antes, reducir);
    } else {
      this.cambios.markForCheck();
    }
    this.haPintado = true;
  }

  /** Cambió la empresa o se reinició el canal: el tablero vuelve a "cargando" y olvida lo que vio. */
  private reiniciar(): void {
    this.vistos.clear();
    this.columnaPrevia.clear();
    this.nuevas.clear();
    this.movidas.clear();
    this.haPintado = false;
    this.vista = { cargado: false, columnas: [], total: 0, soloPropias: false };
    this.cambios.markForCheck();
  }

  /**
   * Los pedidos que llegaron después del primer pintado entran resaltados un momento, y los que
   * cambiaron de columna se marcan igual. Lo que ya estaba al abrir la pantalla no se resalta.
   */
  private marcarNuevasYMovidas(pedidos: ReadonlyArray<PedidoEnVivo>): void {
    const nuevas: string[] = [];
    const movidas: string[] = [];
    const columnaAhora = new Map<string, EtapaId>();
    for (const pedido of pedidos) {
      columnaAhora.set(pedido.id, pedido.etapa);
      if (!this.haPintado) continue;
      if (!this.vistos.has(pedido.id)) {
        nuevas.push(pedido.id);
      } else {
        const previa = this.columnaPrevia.get(pedido.id);
        if (previa !== undefined && previa !== pedido.etapa) movidas.push(pedido.id);
      }
    }
    for (const pedido of pedidos) this.vistos.add(pedido.id);
    this.columnaPrevia = columnaAhora;

    this.programarQuitar(this.nuevas, nuevas, DURACION_NUEVA_MS);
    this.programarQuitar(this.movidas, movidas, DURACION_MOVIDA_MS);
  }

  private programarQuitar(conjunto: Set<string>, ids: string[], ms: number): void {
    if (ids.length === 0) return;
    ids.forEach((id) => conjunto.add(id));
    const temporizador = window.setTimeout(() => {
      this.temporizadores.delete(temporizador);
      ids.forEach((id) => conjunto.delete(id));
      for (const columna of this.vista.columnas) {
        for (const tarjeta of columna.tarjetas) {
          if (ids.indexOf(tarjeta.id) === -1) continue;
          tarjeta.nuevo = this.nuevas.has(tarjeta.id);
          tarjeta.movida = this.movidas.has(tarjeta.id);
        }
      }
      // `detectChanges` (y no `markForCheck`): el temporizador puede haberse creado fuera de la zona.
      this.cambios.detectChanges();
    }, ms);
    this.temporizadores.add(temporizador);
  }

  // ── FLIP ──────────────────────────────────────────────────────────────────

  private tarjetasEnPantalla(): HTMLElement[] {
    return Array.from(this.tablero.nativeElement.querySelectorAll<HTMLElement>('.kcard[data-id]'));
  }

  private medir(): Map<string, PosicionTarjeta> {
    const posiciones = new Map<string, PosicionTarjeta>();
    for (const elemento of this.tarjetasEnPantalla()) {
      const id = elemento.getAttribute('data-id');
      if (!id) continue;
      const caja = elemento.getBoundingClientRect();
      posiciones.set(id, { x: caja.left, y: caja.top });
    }
    return posiciones;
  }

  private animar(antes: ReadonlyMap<string, PosicionTarjeta>, reducirMovimiento: boolean): void {
    const movimientos = planearFlip(antes, this.medir(), { reducirMovimiento });
    if (movimientos.length === 0) return;
    const porId = new Map(movimientos.map((m) => [m.id, m] as const));
    for (const elemento of this.tarjetasEnPantalla()) {
      const movimiento = porId.get(elemento.getAttribute('data-id') ?? '');
      if (!movimiento || typeof elemento.animate !== 'function') continue;
      elemento.animate(
        [{ transform: `translate(${movimiento.dx}px, ${movimiento.dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: FLIP_DURACION_MS, easing: FLIP_CURVA }
      );
    }
  }
}
