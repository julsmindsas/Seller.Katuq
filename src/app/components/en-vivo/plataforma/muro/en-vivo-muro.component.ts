import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoOrbeService, MarcaOrbe } from '../../escenas/opttia-guia.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import {
  avisarAperturaDeComercio,
  cifrasGlobal$,
  eventos$,
  instanteVisible$,
  ocultar$,
  radarCongelado$,
} from '../utilidades/fuentes';
import { empresaDeEvento } from '../utilidades/momento';
import { MURO_VACIO, reducirMuro, SPARK_ALTO, SPARK_ANCHO, TarjetaMuro, VistaMuro } from '../utilidades/muro';
import { AperturaComercio } from '../utilidades/nombres';

/** Cada cuánto se refrescan los "hace N min" y el estado "Vendiendo" aunque no llegue nada. */
const REFRESCO_MS = 30000;
/** Cuánto dura una tarjeta iluminada. */
const DURACION_ILUMINADA_MS = 1100;

type Iluminada = 'flash' | 'ia';

interface VistaMuroPantalla extends VistaMuro {
  /** false durante "Repetir el día": las cifras no ruedan. */
  animar: boolean;
}

/**
 * El muro de comercios: una tarjeta por comercio con sus ventas y pedidos de hoy, las barras por
 * hora de hoy contra la línea punteada de ayer, su último evento y su hora, sus pedidos en
 * preparación, listos, en ruta y entregados, y su estado (Vendiendo, Hace N min, Revisar o
 * Atención). Cada evento que llega ILUMINA la tarjeta de su comercio (con un tono propio si el
 * pedido lo armó Opttia) y su cifra rueda hasta el valor nuevo. Tocar una tarjeta abre el tablero.
 *
 * Lee `cifrasGlobal.comercios`, `estado.eventos` y `estado.nuevos$` del `EnVivoEstadoService`, y las
 * alertas del radar para marcar con un borde y un anillo a los comercios que piden atención (durante
 * "Repetir el día", congeladas). Las tarjetas conservan su lugar (no se reordenan como la carrera).
 * Con "ocultar comercios y montos": "Comercio en <ciudad>" y conteos en lugar de dinero.
 *
 * Los pedidos por etapa son los de la ventana de ayer y hoy (como los manda el servidor).
 * Avisa por `acciones$` (`abrir-comercio`) y por `@Output() abrirComercio`; escuchar UNO basta.
 */
@Component({
  selector: 'app-en-vivo-katuq-muro',
  templateUrl: './en-vivo-muro.component.html',
  styleUrls: ['./en-vivo-muro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoMuroComponent implements OnInit, OnDestroy {
  @Output() abrirComercio = new EventEmitter<AperturaComercio>();

  readonly vm$: Observable<VistaMuroPantalla>;
  readonly sparkAncho = SPARK_ANCHO;
  readonly sparkAlto = SPARK_ALTO;

  private readonly iluminadas = new Map<string, Iluminada>();
  private readonly temporizadores = new Map<string, number>();
  private readonly suscripciones = new Subscription();
  private soltarMarcas: (() => void) | null = null;
  /** La tarjeta que Opttia señala ahora (sobrevive al repintado: la plantilla la lee en cada pintado). */
  marca: MarcaOrbe | null = null;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    zona: NgZone,
    private readonly cambios: ChangeDetectorRef,
    private readonly orbe: EnVivoOrbeService
  ) {
    this.vm$ = combineLatest([
      cifrasGlobal$(estado),
      eventos$(estado),
      radarCongelado$(estado, interaccion),
      ocultar$(estado),
      instanteVisible$(zona, interaccion, REFRESCO_MS),
      interaccion.repeticion$.pipe(map((r) => r.activa)),
    ]).pipe(
      scan(
        (previo: VistaMuroPantalla, [cifras, eventos, radar, ocultar, ahoraMs, repitiendo]): VistaMuroPantalla => ({
          ...reducirMuro(previo, cifras?.comercios ?? [], { eventos, radar, ocultar, ahoraMs }),
          animar: !repitiendo,
        }),
        { ...MURO_VACIO, animar: true }
      )
    );
  }

  ngOnInit(): void {
    // Opttia marca aquí la tarjeta del comercio que señala (el muro no es 3D).
    this.soltarMarcas = this.orbe.usarMarcas('comercio');
    this.suscripciones.add(
      this.orbe.marca$.subscribe((m) => {
        this.marca = m && m.tipo === 'comercio' ? m : null;
        this.cambios.markForCheck();
      })
    );
    // Cada evento que llega en vivo (nunca los de la foto) ilumina la tarjeta de su comercio.
    this.suscripciones.add(
      this.estado.nuevos$.subscribe((evento) => {
        const empresa = empresaDeEvento(evento);
        if (empresa) this.iluminar(empresa, evento.tipo === 'pedido_nuevo' && evento.ia === true ? 'ia' : 'flash');
      })
    );
  }

  ngOnDestroy(): void {
    this.soltarMarcas?.();
    this.soltarMarcas = null;
    this.suscripciones.unsubscribe();
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  abrir(tarjeta: TarjetaMuro): void {
    avisarAperturaDeComercio(this.interaccion, this.abrirComercio, { empresa: tarjeta.empresa, nombre: tarjeta.nombreReal });
  }

  /** `flash` o `ia` mientras la tarjeta está iluminada; undefined si no. */
  iluminada(empresa: string): Iluminada | undefined {
    return this.iluminadas.get(empresa);
  }

  /** "Opttia: …" si esta es la tarjeta que Opttia señala; null si no. */
  textoOpttia(empresa: string): string | null {
    return this.marca && this.marca.id === empresa ? `Opttia: ${this.marca.texto}` : null;
  }

  porEmpresa(_: number, tarjeta: TarjetaMuro): string {
    return tarjeta.empresa;
  }

  porPosicion(indice: number): number {
    return indice;
  }

  private iluminar(empresa: string, modo: Iluminada): void {
    window.clearTimeout(this.temporizadores.get(empresa));
    // Un pedido de Opttia no lo pisa el evento siguiente del mismo instante.
    this.iluminadas.set(empresa, modo === 'flash' && this.iluminadas.get(empresa) === 'ia' ? 'ia' : modo);
    this.cambios.markForCheck();
    this.temporizadores.set(
      empresa,
      window.setTimeout(() => {
        this.temporizadores.delete(empresa);
        this.iluminadas.delete(empresa);
        this.cambios.markForCheck();
      }, DURACION_ILUMINADA_MS)
    );
  }
}
