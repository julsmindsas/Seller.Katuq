import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, timeout } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { accionOpttiaAUi, AccionOpttiaUi, accionesOpttiaAUi, ContextoAccionesOpttia } from '../servicios/en-vivo-acciones';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { esNoDisponible, RespuestaNoDisponible, RespuestaPregunta, ResumenOpttia, VistaEnVivo } from '../servicios/en-vivo.modelos';
import { EnVivoService } from '../servicios/en-vivo.service';
import { dineroCorto } from '../utilidades/formato';
import { IconoId } from '../utilidades/iconos';
import { cadaFueraDeZona, prefiereMenosMovimiento } from '../utilidades/movimiento';
import { claseTono } from '../utilidades/tonos';
import {
  escribirAnimado,
  MS_POR_PASO_RESPUESTA,
  MS_POR_PASO_RESUMEN,
} from './opttia-escritura';
import {
  AVISO_CARACTERES,
  claveDelResumen,
  enmascarar,
  iconoDeTono,
  instanteDelResumen,
  MAX_CARACTERES_PREGUNTA,
  mascaraDe,
  MAX_PREGUNTAS_POR_HORA,
  minutosParaReintentar,
  prepararPregunta,
  preguntasSugeridas,
  puntosDelResumen,
  textoActualizado,
  textoPreguntasRestantes,
  TopeDePreguntas,
  tieneObjetivoEnEscena,
  tituloDeLaTarjeta,
  vendidoConOpttia,
  VendidoConOpttia,
} from './opttia-reglas';

/** Lo que se le entrega a la escena cuando una respuesta trae acciones que tienen lugar en ella. */
export interface RespuestaParaEscena {
  /** La respuesta, ya sin montos si la persona eligió ocultarlos. */
  texto: string;
  /** Las acciones que Opttia sugirió y que la pantalla pudo resolver (pedido, mensajero, comercio, lista). */
  acciones: ReadonlyArray<AccionOpttiaUi>;
}

/** Un punto del resumen, listo para pintar. */
interface PuntoVista {
  clase: string;
  icono: IconoId;
  texto: string;
  /** El botón de su acción, si Opttia sugirió una y la pantalla la puede abrir. */
  boton: AccionOpttiaUi | null;
  visible: boolean;
}

type FaseRespuesta = 'pensando' | 'escribiendo' | 'lista' | 'tope' | 'aviso';

/** La última respuesta, lista para pintar. */
interface RespuestaVista {
  pregunta: string;
  fase: FaseRespuesta;
  /** Lo que se ve de la respuesta (se completa al escribir). */
  textoVisible: string;
  /** El texto completo, para el lector de pantalla (se anuncia una sola vez). */
  lector: string;
  botones: AccionOpttiaUi[];
  verEnEscena: boolean;
  nota: string;
}

/** Lo que cambia en el estado y le importa a esta tarjeta. */
interface Rebanada {
  vista: VistaEnVivo;
  empresa: string | null;
  soloLectura: boolean;
  opttia: ResumenOpttia | null;
  vendido: VendidoConOpttia | null;
}

const REFRESCO_MS = 5000;
const PASO_PUNTOS_MS = 260;
const TIMEOUT_PREGUNTA_MS = 25000;
const TEXTO_SIN_RESPUESTA = 'Opttia no pudo responder ahora. Intenta de nuevo en un momento.';
const TEXTO_NO_DISPONIBLE = 'Opttia no está disponible en este momento.';

function mismaRebanada(a: Rebanada, b: Rebanada): boolean {
  return (
    a.vista === b.vista &&
    a.empresa === b.empresa &&
    a.soloLectura === b.soloLectura &&
    a.opttia === b.opttia &&
    (a.vendido?.pedidos ?? -1) === (b.vendido?.pedidos ?? -1) &&
    (a.vendido?.ventas ?? -1) === (b.vendido?.ventas ?? -1)
  );
}

/**
 * Tarjeta de Opttia del tablero "En vivo" (D-386, tarea 4.10): el resumen que escribe Opttia con
 * escritura animada, un campo para preguntarle sobre lo que se ve (con preguntas sugeridas
 * distintas para toda Katuq y para un comercio) y lo vendido hoy con Opttia. Sirve a las dos
 * vistas: lee todo de `EnVivoEstadoService` y no recibe datos por `@Input`.
 *
 * - **Resumen:** el último que llegó (mensaje `opttia` o `foto.opttia`). Si Opttia no responde o
 *   tarda, la tarjeta queda con el último resumen y la hora en que se escribió ("Actualizado
 *   hace 25 min"), sin error técnico. Mientras no hay ninguno: "Opttia está mirando los datos…".
 * - **Preguntas:** `POST /opttia/pregunta` con el texto que escribe la persona (nunca datos de
 *   clientes). Tope de 20 por hora: al pasarlo, la tarjeta dice en cuántos minutos puede volver a
 *   preguntar (no es un error). La respuesta trae acciones (abrir lista, pedido, mensajero o
 *   comercio): se resuelven con `accionesOpttiaAUi` y se abren por `EnVivoInteraccionService`.
 * - **Escena:** `recorrido` (botón "Recorrido en la escena"), `respondida` (llegó una respuesta con
 *   algo que está en la escena: Opttia puede volar hasta allí) y `verEnEscena` (botón de la respuesta).
 * - **Ocultar:** con "ocultar clientes y montos" los montos de lo que escribe Opttia pasan a
 *   "$•••" y, en toda Katuq, los nombres de comercios a "un comercio".
 * - **Movimiento:** con "reducir movimiento" todo sale completo y sin animación.
 *
 * Solo lectura: no cambia pedidos ni nada en el servidor.
 */
@Component({
  selector: 'app-en-vivo-opttia',
  templateUrl: './en-vivo-opttia.component.html',
  styleUrls: ['./en-vivo-opttia.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoOpttiaComponent implements OnInit, OnDestroy {
  /** false: no hay escena en esta pantalla, así que no se ofrece el recorrido ni "Verlo en la escena". */
  @Input() conEscena = true;
  /** La persona tocó "Recorrido en la escena". */
  @Output() recorrido = new EventEmitter<void>();
  /** La persona tocó "Verlo en la escena" en una respuesta. */
  @Output() verEnEscena = new EventEmitter<RespuestaParaEscena>();
  /** Llegó una respuesta con algo que está en la escena (para que Opttia vuele hasta allí sin que la persona toque nada). */
  @Output() respondida = new EventEmitter<RespuestaParaEscena>();

  readonly maxCaracteres = MAX_CARACTERES_PREGUNTA;
  readonly avisoCaracteres = AVISO_CARACTERES;
  readonly maxPreguntasPorHora = MAX_PREGUNTAS_POR_HORA;

  // ── Vista ──
  vista: VistaEnVivo = 'comercio';
  soloLectura = false;
  ocultar = false;
  titulo = tituloDeLaTarjeta('comercio', false);
  sugeridas: ReadonlyArray<string> = preguntasSugeridas('comercio', false);

  // ── Resumen ──
  hayResumen = false;
  titularVisible = '';
  puntos: PuntoVista[] = [];
  lectorResumen = '';
  escribiendoResumen = false;

  // ── Vendido con Opttia ──
  vendido: VendidoConOpttia | null = null;

  // ── Preguntas ──
  largo = 0;
  enviando = false;
  respuesta: RespuestaVista | null = null;
  /** El tope de 20 preguntas por hora: cuándo vuelve a poder preguntar. */
  private readonly tope = new TopeDePreguntas();
  textoBloqueo = '';

  private ahoraMs = Date.now();
  private ultimoResumen: ResumenOpttia | null = null;
  private llaveVista = '';
  private crudaRespuesta: { texto: string; acciones: AccionOpttiaUi[] } | null = null;

  private readonly suscripciones = new Subscription();
  private peticion: Subscription | null = null;
  private pararReloj: (() => void) | null = null;
  private cancelarTitular: (() => void) | null = null;
  private cancelarRespuesta: (() => void) | null = null;
  private readonly temporizadores = new Set<number>();
  private destruido = false;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly servicio: EnVivoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.suscripciones.add(
      this.estado.preferencias$
        .pipe(
          map((p) => p.ocultar),
          distinctUntilChanged()
        )
        .subscribe((ocultar) => this.alCambiarOcultar(ocultar))
    );

    this.suscripciones.add(
      this.estado.estado$
        .pipe(
          map(
            (e): Rebanada => ({
              vista: e.vista,
              empresa: e.empresa,
              soloLectura: e.soloLectura,
              opttia: e.opttia,
              vendido: vendidoConOpttia(e),
            })
          ),
          distinctUntilChanged(mismaRebanada)
        )
        .subscribe((r) => this.alCambiarEstado(r))
    );

    this.pararReloj = cadaFueraDeZona(this.zona, REFRESCO_MS, () => this.alLatir());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripciones.unsubscribe();
    this.peticion?.unsubscribe();
    this.pararReloj?.();
    this.cancelarTitular?.();
    this.cancelarRespuesta?.();
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  // ── Textos que se calculan al pintar ──────────────────────────────────────

  /** El chip de la cabecera: "Escribiendo…" o "Actualizado hace N s". */
  get cuando(): string {
    if (this.escribiendoResumen) return 'Escribiendo…';
    return textoActualizado(instanteDelResumen(this.ultimoResumen), this.ahoraMs);
  }

  /** "3 pedidos" o "3 pedidos · $450 mil" (sin el monto si se ocultan). */
  get textoVendido(): string {
    const v = this.vendido;
    if (!v) return '';
    const pedidos = `${v.pedidos} ${v.pedidos === 1 ? 'pedido' : 'pedidos'}`;
    return this.ocultar ? pedidos : `${pedidos} · ${dineroCorto(v.ventas)}`;
  }

  get bloqueada(): boolean {
    return this.tope.activo;
  }

  // ── Estado de la pantalla ─────────────────────────────────────────────────

  private alCambiarEstado(r: Rebanada): void {
    const llave = `${r.vista}|${r.empresa ?? ''}`;
    const cambioVista = llave !== this.llaveVista;
    this.vista = r.vista;
    this.soloLectura = r.soloLectura;
    this.vendido = r.vendido;
    this.titulo = tituloDeLaTarjeta(r.vista, r.soloLectura);
    this.sugeridas = preguntasSugeridas(r.vista, r.soloLectura);

    if (cambioVista) {
      // Otra vista u otro comercio: lo que había era de otro lado.
      this.llaveVista = llave;
      this.ultimoResumen = null;
      this.limpiarRespuesta();
      this.peticion?.unsubscribe();
      this.peticion = null;
      this.enviando = false;
    }

    // Si Opttia aún no escribió uno nuevo (o el servidor manda null tras reconectar), se queda el último.
    if (r.opttia && claveDelResumen(r.opttia) !== claveDelResumen(this.ultimoResumen)) {
      this.ultimoResumen = r.opttia;
      this.pintarResumen(true);
    } else if (cambioVista) {
      this.pintarResumen(false);
    }
    this.cambios.markForCheck();
  }

  private alCambiarOcultar(ocultar: boolean): void {
    const cambio = ocultar !== this.ocultar;
    this.ocultar = ocultar;
    if (!cambio) return;
    // Lo que ya está escrito pudo traer montos o nombres: se repinta enmascarado (o no) y sin animación.
    this.pintarResumen(false);
    this.repintarRespuesta();
    this.cambios.markForCheck();
  }

  /** Cada 5 s: la hora de "Actualizado hace…" y la cuenta de cuándo puede volver a preguntar. */
  private alLatir(): void {
    this.ahoraMs = Date.now();
    if (this.tope.activo) {
      if (this.tope.liberarSiPaso(this.ahoraMs)) {
        this.textoBloqueo = '';
        if (this.respuesta?.fase === 'tope') this.respuesta = null;
      } else {
        this.textoBloqueo = this.tope.texto(this.ahoraMs);
      }
    }
    this.pintar();
  }

  // ── Resumen ───────────────────────────────────────────────────────────────

  private contextoAcciones(): ContextoAccionesOpttia {
    const e = this.estado.estado;
    return { pedidos: e.pedidos, flota: e.flota, comercios: e.cifrasGlobal?.comercios ?? [], empresa: e.empresa };
  }

  /** Pinta el resumen guardado; `animar` lo escribe poco a poco (solo si no pidió menos movimiento). */
  private pintarResumen(animar: boolean): void {
    this.cancelarTitular?.();
    this.cancelarTitular = null;
    this.limpiarTemporizadores();

    const resumen = this.ultimoResumen;
    if (!resumen) {
      this.hayResumen = false;
      this.titularVisible = '';
      this.puntos = [];
      this.lectorResumen = '';
      this.escribiendoResumen = false;
      return;
    }

    const mascara = mascaraDe(this.estado.estado, this.ocultar);
    const contexto = this.contextoAcciones();
    const titular = enmascarar(resumen.titular, mascara);
    const instantaneo = !animar || prefiereMenosMovimiento();

    this.hayResumen = true;
    this.puntos = puntosDelResumen(resumen).map((p) => {
      const boton = accionOpttiaAUi(p.accion, contexto);
      return {
        clase: claseTono(p.tono),
        icono: iconoDeTono(p.tono),
        texto: enmascarar(p.texto, mascara),
        boton: boton ? { etiqueta: enmascarar(boton.etiqueta, mascara), accion: boton.accion } : null,
        visible: instantaneo,
      };
    });
    this.lectorResumen = [titular, ...this.puntos.map((p) => p.texto)].join(' ');

    if (instantaneo) {
      this.titularVisible = titular;
      this.escribiendoResumen = false;
      return;
    }

    this.escribiendoResumen = true;
    this.titularVisible = '';
    this.zona.runOutsideAngular(() => {
      this.cancelarTitular = escribirAnimado(
        titular,
        { ms: MS_POR_PASO_RESUMEN, reducir: false },
        (visible) => {
          this.titularVisible = visible;
          this.pintar();
        },
        () => this.revelarPuntos()
      );
    });
  }

  /** Después del titular, los puntos van apareciendo uno a uno. */
  private revelarPuntos(): void {
    const puntos = this.puntos;
    if (puntos.length === 0) {
      this.escribiendoResumen = false;
      this.pintar();
      return;
    }
    puntos.forEach((punto, i) => {
      const id = window.setTimeout(() => {
        this.temporizadores.delete(id);
        punto.visible = true;
        if (i === puntos.length - 1) this.escribiendoResumen = false;
        this.pintar();
      }, i * PASO_PUNTOS_MS);
      this.temporizadores.add(id);
    });
  }

  // ── Preguntas ─────────────────────────────────────────────────────────────

  alEscribir(entrada: HTMLInputElement): void {
    this.largo = entrada.value.length;
  }

  alEnviar(evento: Event, entrada: HTMLInputElement): void {
    evento.preventDefault();
    const pregunta = prepararPregunta(entrada.value);
    if (!pregunta) return;
    if (this.enviar(pregunta)) {
      entrada.value = '';
      this.largo = 0;
    }
  }

  alElegirSugerida(pregunta: string): void {
    this.enviar(pregunta);
  }

  porTexto(_: number, texto: string): string {
    return texto;
  }

  porIndice(indice: number): number {
    return indice;
  }

  /** Devuelve false si no se pudo enviar (ya hay una pregunta en curso o llegó al tope). */
  private enviar(pregunta: string): boolean {
    if (this.enviando || this.bloqueada) return false;

    this.enviando = true;
    this.cancelarRespuesta?.();
    this.cancelarRespuesta = null;
    this.crudaRespuesta = null;
    this.respuesta = { pregunta, fase: 'pensando', textoVisible: '', lector: 'Opttia está pensando…', botones: [], verEnEscena: false, nota: '' };
    this.cambios.markForCheck();

    const e = this.estado.estado;
    // `empresa` solo cuenta cuando Katuq mira el tablero de un comercio ajeno (solo lectura); con la sesión propia va vacío.
    const empresa = e.vista === 'comercio' && e.soloLectura ? e.empresa ?? undefined : undefined;
    this.peticion?.unsubscribe();
    this.peticion = this.servicio
      .preguntar(pregunta, empresa, e.vista)
      .pipe(timeout(TIMEOUT_PREGUNTA_MS))
      .subscribe({
        next: (r) => this.alResponder(pregunta, r),
        error: () => this.alFallar(pregunta),
      });
    return true;
  }

  private alResponder(pregunta: string, r: RespuestaPregunta | RespuestaNoDisponible): void {
    this.enviando = false;
    if (esNoDisponible(r)) {
      this.alAvisar(pregunta, TEXTO_NO_DISPONIBLE);
      return;
    }

    // Tope de 20 por hora: no se llamó a Opttia; la pantalla dice cuándo puede volver (no es un error).
    const minutos = minutosParaReintentar(r);
    if (minutos !== null) {
      this.tope.bloquear(minutos, Date.now());
      this.textoBloqueo = this.tope.texto(Date.now());
      this.respuesta = {
        pregunta,
        fase: 'tope',
        textoVisible: '',
        lector: `Llegaste al tope de ${MAX_PREGUNTAS_POR_HORA} preguntas por hora. ${this.textoBloqueo}.`,
        botones: [],
        verEnEscena: false,
        nota: '',
      };
      this.cambios.markForCheck();
      return;
    }

    const texto = typeof r.texto === 'string' && r.texto.trim() ? r.texto.trim() : TEXTO_SIN_RESPUESTA;
    const acciones = accionesOpttiaAUi(Array.isArray(r.acciones) ? r.acciones : [], this.contextoAcciones());
    this.crudaRespuesta = { texto, acciones };
    this.pintarRespuesta(pregunta, true, textoPreguntasRestantes(r.restantes));
  }

  private alFallar(pregunta: string): void {
    this.enviando = false;
    this.alAvisar(pregunta, TEXTO_SIN_RESPUESTA);
  }

  /** Un aviso amable en el lugar de la respuesta (Opttia no respondió o no está disponible). */
  private alAvisar(pregunta: string, texto: string): void {
    this.crudaRespuesta = null;
    this.respuesta = { pregunta, fase: 'aviso', textoVisible: texto, lector: texto, botones: [], verEnEscena: false, nota: '' };
    this.cambios.markForCheck();
  }

  /** Pinta la respuesta guardada: `animar` la escribe poco a poco; si no, sale completa. */
  private pintarRespuesta(pregunta: string, animar: boolean, nota: string): void {
    this.cancelarRespuesta?.();
    this.cancelarRespuesta = null;
    const cruda = this.crudaRespuesta;
    if (!cruda) return;

    const mascara = mascaraDe(this.estado.estado, this.ocultar);
    const texto = enmascarar(cruda.texto, mascara);
    const botones = cruda.acciones.map((a) => ({ etiqueta: enmascarar(a.etiqueta, mascara), accion: a.accion }));
    const paraEscena = tieneObjetivoEnEscena(cruda.acciones);
    const instantanea = !animar || prefiereMenosMovimiento();

    this.respuesta = {
      pregunta,
      fase: instantanea ? 'lista' : 'escribiendo',
      textoVisible: instantanea ? texto : '',
      lector: texto,
      botones,
      verEnEscena: paraEscena,
      nota,
    };
    this.cambios.markForCheck();

    const alTerminar = (): void => {
      if (this.respuesta) this.respuesta = { ...this.respuesta, fase: 'lista', textoVisible: texto };
      this.pintar();
      // Opttia vuela hasta lo que señala la respuesta (la persona no tiene que tocar nada).
      if (animar && paraEscena) this.respondida.emit({ texto, acciones: cruda.acciones });
    };

    if (instantanea) {
      if (animar && paraEscena) this.respondida.emit({ texto, acciones: cruda.acciones });
      return;
    }
    this.zona.runOutsideAngular(() => {
      this.cancelarRespuesta = escribirAnimado(
        texto,
        { ms: MS_POR_PASO_RESPUESTA, reducir: false },
        (visible) => {
          if (this.respuesta) this.respuesta = { ...this.respuesta, textoVisible: visible };
          this.pintar();
        },
        () => this.zona.run(alTerminar)
      );
    });
  }

  /** "Ocultar" cambió: la respuesta que está a la vista se repinta sin animación. */
  private repintarRespuesta(): void {
    const actual = this.respuesta;
    if (!actual || !this.crudaRespuesta) return;
    this.pintarRespuesta(actual.pregunta, false, actual.nota);
  }

  private limpiarRespuesta(): void {
    this.cancelarRespuesta?.();
    this.cancelarRespuesta = null;
    this.crudaRespuesta = null;
    this.respuesta = null;
  }

  // ── Acciones de la tarjeta ────────────────────────────────────────────────

  /** Abre lo que Opttia sugirió (lista, pedido, mensajero o comercio) por el puente de la pantalla. */
  alAbrir(boton: AccionOpttiaUi): void {
    this.interaccion.emitir(boton.accion);
  }

  /** "Vendido con Opttia hoy": abre la lista de los pedidos de Opttia. */
  alVerVendidos(): void {
    this.interaccion.emitir({ tipo: 'abrir-lista', clave: 'ia' });
  }

  alVerEnEscena(): void {
    const cruda = this.crudaRespuesta;
    const actual = this.respuesta;
    if (!cruda || !actual) return;
    this.verEnEscena.emit({ texto: enmascarar(cruda.texto, mascaraDe(this.estado.estado, this.ocultar)), acciones: cruda.acciones });
  }

  alRecorrido(): void {
    this.recorrido.emit();
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private limpiarTemporizadores(): void {
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  /** Repinta solo esta tarjeta (los temporizadores corren fuera de la zona). */
  private pintar(): void {
    if (!this.destruido) this.cambios.detectChanges();
  }
}
