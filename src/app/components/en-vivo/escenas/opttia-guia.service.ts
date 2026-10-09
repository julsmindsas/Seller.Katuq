import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoFichaService } from '../ficha/ficha.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { alCambiarMovimiento, prefiereMenosMovimiento } from '../utilidades/movimiento';
import { ContextoGuia, FuentesGuia, GuiaOpttia, OrdenOrbe, OrdenSenalar } from './opttia-guia';
import { AnfitrionOrbe, OrbeOpttia } from './opttia-orbe';
import {
  ObjetivoOrbe,
  RespuestaOrbe,
  entregaDeEvento,
  lineasParaHablar,
  objetivoDeRespuesta,
  puntosDelOrbe,
  textoParaBurbuja,
} from './opttia-puntos';

/** La tarjeta (pedido o comercio) que Opttia marca en el tablero de pedidos o en el muro, que no son 3D. */
export interface MarcaOrbe {
  tipo: 'pedido' | 'comercio';
  id: string;
  texto: string;
}

/** Dónde va el recorrido guiado: "2 de 5". */
export interface RecorridoOrbe {
  paso: number;
  total: number;
}

const PERIODO_MARCAS_MS = 9000;
const DURACION_MARCA_MS = 7000;
const ESPERA_RETEMA_MS = 150;

/**
 * El orbe de Opttia en las escenas (D-386, 5.14). Singleton que une tres cosas:
 *
 * - las escenas 3D, que se anotan con `registrar(anfitrion)` al montarse y se quitan al destruirse: a
 *   cada una se le cuelga un `OrbeOpttia`;
 * - el cerebro `GuiaOpttia` (puro), que cada cuadro de la escena decide qué señalar (cada 16 s lo
 *   siguiente de su lista), conduce el recorrido guiado y atiende las visitas por pedidos "Con
 *   Opttia" y por respuestas de la tarjeta de Opttia;
 * - el tablero de pedidos y el muro de Katuq (sin 3D), que piden `usarMarcas(tipo)` y reciben por
 *   `marca$` la tarjeta que Opttia señala.
 *
 * Los textos salen del radar y del último resumen que ya llegaron (sin llamar al modelo) y respetan
 * "ocultar". El recorrido lo cortan: arrastrar la cámara, abrir una ficha, "Repetir el día", tocar
 * el orbe otra vez y quitar la escena. En modo pantalla hace uno solo cada 4 minutos. Solo lectura.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoOrbeService implements OnDestroy {
  private readonly guia = new GuiaOpttia();
  private readonly anfitriones = new Map<AnfitrionOrbe, OrbeOpttia>();
  /** Escenas anotadas: con Opttia apagado (D-386) no llevan orbe y lo recuperan si se prende. */
  private readonly registrados = new Set<AnfitrionOrbe>();
  private opttiaActivo = true;
  private readonly marcaSubject = new BehaviorSubject<MarcaOrbe | null>(null);
  private readonly recorridoSubject = new BehaviorSubject<RecorridoOrbe | null>(null);
  private readonly hayOrbeSubject = new BehaviorSubject<boolean>(false);

  /** La tarjeta que Opttia marca ahora (tablero y muro); null = ninguna. */
  readonly marca$: Observable<MarcaOrbe | null> = this.marcaSubject.asObservable();
  /** El recorrido en curso; null = no hay. */
  readonly recorrido$: Observable<RecorridoOrbe | null> = this.recorridoSubject.asObservable();
  /** Hay un orbe en una escena 3D a la vista. */
  readonly hayOrbe$: Observable<boolean> = this.hayOrbeSubject.asObservable();

  /** "Reducir movimiento" vigente (se lee una vez y se actualiza al cambiar). */
  reducirMovimiento = prefiereMenosMovimiento();

  private usos = 0;
  private suscripciones: Subscription | null = null;
  private soltarMovimiento: (() => void) | null = null;
  private readonly marcasEn = { pedido: 0, comercio: 0 };
  private temporizadorMarcas = 0;
  private temporizadorMarcaFin = 0;
  private temporizadorRetema = 0;
  private indiceMarcas = 0;
  private readonly fuentesGuia: FuentesGuia = {
    puntos: () => this.puntos(),
    lineas: () => lineasParaHablar(this.estado.estado, this.estado.preferencias.ocultar),
  };

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly ficha: EnVivoFichaService,
    private readonly zona: NgZone
  ) {}

  ngOnDestroy(): void {
    this.apagar();
  }

  // ---------------------------------------------------------- escenas 3D

  /** Una escena 3D se anota: se le cuelga un orbe. Devuelve cómo quitarlo (al destruir la escena). */
  registrar(anfitrion: AnfitrionOrbe): () => void {
    this.encender();
    this.registrados.add(anfitrion);
    if (this.opttiaActivo) this.montarOrbe(anfitrion);
    let vigente = true;
    return () => {
      if (!vigente) return;
      vigente = false;
      this.registrados.delete(anfitrion);
      this.desmontarOrbe(anfitrion);
      this.apagarSiSobra();
    };
  }

  private montarOrbe(anfitrion: AnfitrionOrbe): void {
    if (this.anfitriones.has(anfitrion)) return;
    const orbe = new OrbeOpttia(anfitrion, {
      alFrame: (ahoraMs) => this.alFrame(anfitrion, ahoraMs),
      alTocarOrbe: () => this.zona.run(() => this.alternarRecorrido()),
      alArrastrarCamara: () => this.zona.run(() => this.cortar()),
    });
    orbe.iniciar();
    this.anfitriones.set(anfitrion, orbe);
    this.guia.empezar(performance.now());
    this.publicarHayOrbe();
  }

  private desmontarOrbe(anfitrion: AnfitrionOrbe): void {
    const propio = this.anfitriones.get(anfitrion);
    if (!propio) return;
    const eraElActivo = this.activo() === anfitrion;
    propio.destruir();
    this.anfitriones.delete(anfitrion);
    if (eraElActivo) this.ejecutar(this.guia.cortar());
    this.publicarHayOrbe();
  }

  /** ¿Hay una escena 3D con orbe? */
  get hayOrbe(): boolean {
    return this.anfitriones.size > 0;
  }

  /** El anfitrión que manda: la primera escena que está corriendo. */
  private activo(): AnfitrionOrbe | null {
    for (const h of this.anfitriones.keys()) if (h.visible()) return h;
    return null;
  }

  // ----------------------------------------------------- tarjetas sin 3D

  /**
   * El tablero de pedidos (`pedido`) o el muro (`comercio`) piden que Opttia marque su tarjeta: cada
   * 9 s, si no hay escena 3D, pasa al siguiente punto de su lista y lo marca 7 s por `marca$`.
   * Devuelve cómo dejar de pedirlo.
   */
  usarMarcas(tipo: 'pedido' | 'comercio'): () => void {
    this.encender();
    this.marcasEn[tipo]++;
    if (!this.temporizadorMarcas) {
      this.zona.runOutsideAngular(() => {
        this.temporizadorMarcas = window.setInterval(() => this.turnoMarcas(), PERIODO_MARCAS_MS);
      });
    }
    let activo = true;
    return () => {
      if (!activo) return;
      activo = false;
      this.marcasEn[tipo] = Math.max(0, this.marcasEn[tipo] - 1);
      if (this.marcasEn.pedido + this.marcasEn.comercio === 0) {
        window.clearInterval(this.temporizadorMarcas);
        this.temporizadorMarcas = 0;
        this.limpiarMarca();
      }
      this.apagarSiSobra();
    };
  }

  private turnoMarcas(): void {
    if (!this.opttiaActivo || this.anfitriones.size > 0 || this.interaccion.repitiendo || this.ficha.abierta || (typeof document !== 'undefined' && document.hidden)) return;
    const puntos = this.puntos();
    for (let k = 0; k < puntos.length; k++) {
      const p = puntos[this.indiceMarcas++ % puntos.length];
      if (this.marcarTarjeta(p.obj, p.texto, DURACION_MARCA_MS)) return;
    }
  }

  /** Marca la tarjeta del objetivo si hay una pantalla que la pinte y el objetivo está en lo que se ve. */
  private marcarTarjeta(obj: ObjetivoOrbe | null, texto: string, ms: number): boolean {
    if (!obj || this.anfitriones.size > 0) return false;
    const e = this.estado.estado;
    let marca: MarcaOrbe | null = null;
    if (obj.tipo === 'pedido' && this.marcasEn.pedido > 0 && e.pedidos.some((p) => p.id === obj.id)) {
      marca = { tipo: 'pedido', id: obj.id, texto: this.resumido(texto) };
    } else if (obj.tipo === 'comercio' && this.marcasEn.comercio > 0 && (e.cifrasGlobal?.comercios ?? []).some((c) => c.empresa === obj.id)) {
      marca = { tipo: 'comercio', id: obj.id, texto: this.resumido(texto) };
    }
    if (!marca) return false;
    const m = marca;
    this.zona.run(() => this.marcaSubject.next(m));
    window.clearTimeout(this.temporizadorMarcaFin);
    this.zona.runOutsideAngular(() => {
      this.temporizadorMarcaFin = window.setTimeout(() => this.zona.run(() => this.marcaSubject.next(null)), ms);
    });
    return true;
  }

  private limpiarMarca(): void {
    window.clearTimeout(this.temporizadorMarcaFin);
    if (this.marcaSubject.value) this.zona.run(() => this.marcaSubject.next(null));
  }

  private resumido(texto: string): string {
    return texto.length > 70 ? `${texto.slice(0, 68)}…` : texto;
  }

  // ----------------------------------------------------- lo que pide la pantalla

  /** El botón "Recorrido con Opttia", el orbe o la tarjeta de Opttia: empieza el recorrido (o lo corta). */
  alternarRecorrido(): void {
    const h = this.activo();
    if (!h) return;
    if (!this.guia.enRecorrido && this.ficha.abierta) this.ficha.cerrar();
    this.ejecutar(this.guia.alternarRecorrido(performance.now(), this.contexto(), this.fuentes()));
  }

  /** Corta el recorrido y la señal (arrastrar la cámara, abrir una ficha, repetir el día). */
  cortar(): void {
    this.ejecutar(this.guia.cortar());
  }

  /** Una respuesta de Opttia con lugar en la escena (o una tarjeta): el orbe vuela a lo que menciona. */
  irA(respuesta: RespuestaOrbe): boolean {
    const obj = objetivoDeRespuesta(respuesta);
    if (!obj) return false;
    this.ejecutar(this.guia.respuesta(performance.now(), obj, textoParaBurbuja(respuesta.texto)));
    return true;
  }

  // -------------------------------------------------------------- el cuadro

  private alFrame(h: AnfitrionOrbe, ahoraMs: number): void {
    if (this.activo() !== h) return;
    const ordenes = this.guia.paso(ahoraMs, this.contexto(), this.fuentes());
    if (ordenes.length) this.ejecutar(ordenes);
  }

  private contexto(): ContextoGuia {
    return {
      vista: this.estado.estado.vista,
      hayEscena: this.anfitriones.size > 0,
      ficha: this.ficha.abierta,
      repitiendo: this.interaccion.repitiendo,
      pantalla: this.interaccion.modoPantalla,
    };
  }

  private puntos() {
    return puntosDelOrbe(this.estado.estado, this.estado.preferencias.ocultar, Date.now());
  }

  private fuentes(): FuentesGuia {
    return this.fuentesGuia;
  }

  // -------------------------------------------------------------- ejecutar

  private ejecutar(ordenes: ReadonlyArray<OrdenOrbe>): void {
    for (const o of ordenes) {
      if (o.tipo === 'soltar') this.soltar();
      else this.senalar(o);
    }
    this.publicarRecorrido();
  }

  private senalar(o: OrdenSenalar): void {
    if (this.anfitriones.size === 0) {
      this.marcarTarjeta(o.obj, o.texto, o.ms);
      return;
    }
    const h = this.activo();
    const orbe = h ? this.anfitriones.get(h) : undefined;
    if (!h || !orbe) return;
    let lugar = o.obj ? h.lugarDe(o.obj) : null;
    if (!lugar && o.alterno) lugar = h.lugarDe(o.alterno);
    orbe.senalar(o.obj, lugar, o.texto, o.ms, { camara: o.camara, titulo: o.titulo, tono: o.tono });
    if (o.destello && lugar) orbe.destello(lugar);
  }

  private soltar(): void {
    if (this.anfitriones.size === 0) {
      this.limpiarMarca();
      return;
    }
    this.anfitriones.forEach((orbe) => orbe.soltar());
  }

  private publicarRecorrido(): void {
    const a = this.guia.avance;
    const previo = this.recorridoSubject.value;
    if (!a) {
      if (previo) this.zona.run(() => this.recorridoSubject.next(null));
      return;
    }
    if (!previo || previo.paso !== a.paso || previo.total !== a.total) {
      this.zona.run(() => this.recorridoSubject.next({ paso: a.paso, total: a.total }));
    }
  }

  private publicarHayOrbe(): void {
    const hay = this.anfitriones.size > 0;
    if (this.hayOrbeSubject.value !== hay) this.zona.run(() => this.hayOrbeSubject.next(hay));
  }

  // ------------------------------------------------- suscripciones globales

  private encender(): void {
    this.usos++;
    if (this.suscripciones) return;
    const s = new Subscription();
    this.suscripciones = s;
    this.soltarMovimiento = alCambiarMovimiento((menos) => { this.reducirMovimiento = menos; });
    this.reducirMovimiento = prefiereMenosMovimiento();

    // Llega un pedido armado por Opttia: el orbe va a donde llega.
    s.add(
      this.estado.nuevos$.subscribe((ev) => {
        if (this.interaccion.repitiendo) return;
        const entrega = entregaDeEvento(ev, this.estado.estado.vista, this.estado.preferencias.ocultar);
        if (!entrega) return;
        this.ejecutar(this.guia.entrega(performance.now(), entrega, this.contexto()));
      })
    );
    // Interruptor de Opttia (D-386): apagado quita los orbes (y el botón de recorrido, que depende de ellos).
    s.add(
      this.estado.estado$
        .pipe(map((e) => e.opttiaActivo !== false), distinctUntilChanged())
        .subscribe((activo) => {
          this.opttiaActivo = activo;
          if (activo) this.registrados.forEach((h) => this.montarOrbe(h));
          else {
            [...this.anfitriones.keys()].forEach((h) => this.desmontarOrbe(h));
            this.limpiarMarca();
          }
        })
    );
    // Abrir una ficha o repetir el día corta el recorrido.
    s.add(this.ficha.abierta$.subscribe((abierta) => { if (abierta) this.cortar(); }));
    s.add(
      this.interaccion.repeticion$
        .pipe(map((r) => r.activa), distinctUntilChanged())
        .subscribe((activa) => { if (activa) this.cortar(); })
    );
    // "Ocultar": lo que decía puede traer montos o nombres, se descarta al instante.
    s.add(
      this.estado.preferencias$
        .pipe(map((p) => p.ocultar), distinctUntilChanged())
        .subscribe(() => this.cortar())
    );
    // Cambió el tema del modo pantalla: el orbe vuelve a leer sus colores.
    s.add(
      this.interaccion.acciones$.subscribe((a) => {
        if (a.tipo !== 'modo-pantalla') return;
        window.clearTimeout(this.temporizadorRetema);
        this.zona.runOutsideAngular(() => {
          this.temporizadorRetema = window.setTimeout(() => this.anfitriones.forEach((orbe) => orbe.retemar()), ESPERA_RETEMA_MS);
        });
      })
    );
  }

  private apagarSiSobra(): void {
    this.usos = Math.max(0, this.usos - 1);
    if (this.usos === 0) this.apagar();
  }

  private apagar(): void {
    this.suscripciones?.unsubscribe();
    this.suscripciones = null;
    this.soltarMovimiento?.();
    this.soltarMovimiento = null;
    window.clearInterval(this.temporizadorMarcas);
    window.clearTimeout(this.temporizadorMarcaFin);
    window.clearTimeout(this.temporizadorRetema);
    this.temporizadorMarcas = 0;
    this.anfitriones.forEach((orbe) => orbe.destruir());
    this.anfitriones.clear();
    this.guia.cortar();
    this.limpiarMarca();
    this.publicarRecorrido();
    this.publicarHayOrbe();
  }
}
