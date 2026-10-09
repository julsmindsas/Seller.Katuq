import type { Observable, Unsubscribable } from 'rxjs';
import type { KatuqCommerceContext } from '../../../shared/services/security/katuq-commerce-context.service';
import type {
  CifrasEnVivo,
  CifrasGlobalEnVivo,
  EstadoConexion,
  EventoEnVivo,
  FotoEnVivo,
  FotoGlobalEnVivo,
  MensajeStream,
  MotivoReconectar,
  MotivoSinAcceso,
  OpcionesCanal,
  RespuestaNoDisponible,
  SalidaCanal,
} from './en-vivo.modelos';
import { esNoDisponible } from './en-vivo.modelos';
import { rutasEnVivo } from './en-vivo-rutas';
import { esRegistro, interpretarBloque, parsearSse, BloqueSse } from './en-vivo-sse.parser';
import {
  CONEXION_ESTABLE_MS,
  esperaPlaneadaMs,
  esperaReconexionMs,
  FALLAS_PARA_SONDEO,
  GUARDIA_SIN_DATOS_MS,
  IdsVistos,
  MAX_IDS_VISTOS,
  MOTIVOS_RECONECTAR_CON_CORTE,
  PAUSA_OCULTA_MS,
  REINTENTO_VIVO_MS,
  SONDEO_MS,
  VIDA_MAXIMA_MS,
} from './en-vivo-reglas';

/** Tope de texto sin terminar en el buffer del parser: un bloque más grande es un error del servidor. */
const MAX_BUFFER_CARACTERES = 8 * 1024 * 1024;

type Temporizador = ReturnType<typeof setTimeout>;
export type RespuestaFoto = FotoEnVivo | FotoGlobalEnVivo | RespuestaNoDisponible;

/** Cómo terminó una lectura: caída (sin aviso), `reconectar` planeado o `modo: sondeo`. */
type ResultadoLectura = 'caida' | 'planeada' | 'sondeo';
type CausaCorte = 'inactividad' | 'vida';

/** Lo único que se usa de `NgZone` (la real lo cumple). Permite probar la conexión sin Angular. */
export interface ZonaMinima {
  run<T>(accion: () => T): T;
  runOutsideAngular<T>(accion: () => T): T;
}

export interface DependenciasConexion {
  opciones: OpcionesCanal;
  urlBase: string;
  zona: ZonaMinima;
  sesion: () => KatuqCommerceContext | null;
  foto: () => Observable<RespuestaFoto>;
  emitir: (salida: SalidaCanal) => void;
  terminar: () => void;
}

/**
 * Una conexión viva (la de una suscripción de `EnVivoCanalService.abrir`): toda la lógica
 * de lectura del stream, reconexión, respaldo a sondeo, vigilancia y pausa. Sin Angular
 * ni DI (la zona entra por `ZonaMinima`), para poder probarla con node y relojes falsos.
 */
export class ConexionEnVivo {
  private cerrada = false;
  private pausada = false;
  /** Se incrementa en cada conexión nueva: una lectura vieja que termine tarde no hace nada. */
  private generacion = 0;
  private controlador: AbortController | null = null;
  private ultimoDato = 0;
  private fallas = 0;
  /** El stream entregó su foto y no se ha cortado desde: si ahora se cae, hay un corte que contar. */
  private vivo = false;
  /** La próxima foto es la primera tras un corte (de ahí sale "Te pusimos al día"). */
  private trasCorte = false;
  private sondeoPorServidor = false;
  private esperaSugeridaMs: number | null = null;
  /** Por qué pidió reconectar el servidor en esta lectura (null = no pidió o no dijo). */
  private motivoReconectar: MotivoReconectar | null = null;
  private estadoActual: EstadoConexion = 'detenido';

  private temporizadorEspera: Temporizador | null = null;
  private temporizadorSondeo: ReturnType<typeof setInterval> | null = null;
  private temporizadorVivo: Temporizador | null = null;
  private temporizadorOculta: Temporizador | null = null;
  private suscripcionFoto: Unsubscribable | null = null;

  private readonly vistos = new IdsVistos(MAX_IDS_VISTOS);
  private readonly pausarSiOculta: boolean;

  constructor(private readonly deps: DependenciasConexion) {
    this.pausarSiOculta = deps.opciones.pausarSiOculta !== false;
  }

  iniciar(): void {
    this.cambiarEstado('conectando');
    this.fuera(() => {
      if (this.pausarSiOculta && typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
        this.alCambiarVisibilidad();
      }
      if (typeof window !== 'undefined') window.addEventListener('online', this.alVolverLaRed);
      void this.conectar();
    });
  }

  /** Cierra el lector, suelta los temporizadores y los escuchas. Se puede llamar más de una vez. */
  detener(): void {
    if (this.cerrada) return;
    this.cerrada = true;
    this.generacion += 1;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    if (typeof window !== 'undefined') window.removeEventListener('online', this.alVolverLaRed);
    this.cortarActual();
    this.limpiarEspera();
    this.limpiarVivo();
    this.limpiarOculta();
    this.detenerSondeo();
  }

  // ── Conexión ──────────────────────────────────────────────────────────────

  private async conectar(): Promise<void> {
    if (this.cerrada || this.pausada) return;
    this.limpiarEspera();
    this.cortarActual();

    const generacion = ++this.generacion;
    const controlador = new AbortController();
    this.controlador = controlador;
    const vigente = (): boolean => generacion === this.generacion && !this.cerrada && !this.pausada;

    const sesion = this.deps.sesion();
    if (!sesion) {
      this.sinAcceso('sesion');
      return;
    }

    this.sondeoPorServidor = false;
    this.esperaSugeridaMs = null;
    this.motivoReconectar = null;
    const inicio = Date.now();
    this.ultimoDato = inicio;
    const corte: { causa: CausaCorte | null } = { causa: null };
    const detenerGuardia = this.iniciarGuardia(inicio, (causa) => {
      corte.causa = causa;
      controlador.abort();
    });

    let resultado: ResultadoLectura = 'caida';
    try {
      const respuesta = await fetch(this.url(), {
        method: 'GET',
        headers: this.cabeceras(sesion),
        signal: controlador.signal,
        cache: 'no-store',
      });
      if (!vigente()) return;

      if (respuesta.status === 401) {
        this.sinAcceso('sesion');
        return;
      }
      if (respuesta.status === 403) {
        this.sinAcceso('prohibido');
        return;
      }
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

      // Sin el menú, el servidor responde 200 JSON `{disponible:false}` en lugar de abrir el stream.
      if ((respuesta.headers.get('content-type') || '').indexOf('application/json') !== -1) {
        resultado = await this.resolverJson(respuesta, vigente);
      } else {
        if (!respuesta.body) throw new Error('Respuesta sin cuerpo');
        resultado = await this.leer(respuesta.body.getReader(), vigente);
      }
    } catch {
      if (!vigente()) return;
      resultado = corte.causa === 'vida' ? 'planeada' : 'caida';
    } finally {
      detenerGuardia();
      if (this.controlador === controlador) this.controlador = null;
      // Si el lector ya se cerró no hace nada; si no, suelta el socket.
      controlador.abort();
    }

    if (!vigente()) return;
    if (resultado === 'planeada') {
      // Con `error` o `apagado` el servidor se reinició y pudo perder eventos: la foto nueva se cuenta como corte.
      if (this.motivoReconectar !== null && MOTIVOS_RECONECTAR_CON_CORTE.indexOf(this.motivoReconectar) !== -1) {
        this.marcarCorte();
      }
      this.programarReconexion(this.esperaSugeridaMs ?? esperaPlaneadaMs());
    } else if (resultado === 'sondeo') {
      this.pasarASondeoPorServidor();
    } else {
      this.registrarCaida(Date.now() - inicio);
    }
  }

  /** Lee el stream hasta que se acabe, el servidor pida reconectar o mande a sondeo. */
  private async leer(lector: ReadableStreamDefaultReader<Uint8Array>, vigente: () => boolean): Promise<ResultadoLectura> {
    const decodificador = new TextDecoder('utf-8');
    let pendiente = '';
    try {
      for (;;) {
        const { done, value } = await lector.read();
        if (done) return 'caida';
        if (!vigente()) return 'caida';
        this.ultimoDato = Date.now();

        pendiente += decodificador.decode(value, { stream: true });
        const analisis = parsearSse(pendiente);
        pendiente = analisis.resto;
        if (pendiente.length > MAX_BUFFER_CARACTERES) throw new Error('Bloque SSE demasiado grande');

        for (const bloque of analisis.bloques) {
          const accion = this.procesarBloque(bloque);
          if (!vigente()) return 'caida';
          if (accion !== 'seguir') return accion;
        }
      }
    } finally {
      lector.cancel().catch(() => undefined);
    }
  }

  private async resolverJson(respuesta: Response, vigente: () => boolean): Promise<ResultadoLectura> {
    let cuerpo: unknown = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      return 'caida';
    }
    if (!vigente()) return 'caida';
    if (esRegistro(cuerpo) && cuerpo['disponible'] === false) {
      this.sinAcceso('rol');
      return 'caida';
    }
    // Un JSON con la foto en lugar del stream: el servidor no abre canal para esta pantalla.
    if (esRegistro(cuerpo) && (cuerpo['modo'] === 'sondeo' || 'cifras' in cuerpo)) return 'sondeo';
    return 'caida';
  }

  private procesarBloque(bloque: BloqueSse): 'seguir' | ResultadoLectura {
    const mensaje: MensajeStream | null = interpretarBloque(bloque);
    if (!mensaje) return 'seguir';

    switch (mensaje.tipo) {
      case 'foto':
        this.recibirFoto(mensaje.datos, 'stream');
        return 'seguir';
      case 'evento': {
        const evento: EventoEnVivo = mensaje.datos;
        // Repetido (p. ej. ya venía en la foto tras reconectar): se descarta.
        if (this.vistos.registrarSiNuevo(evento.id)) this.emitir({ tipo: 'evento', evento });
        return 'seguir';
      }
      case 'cifras':
        this.emitir({ tipo: 'cifras', cifras: mensaje.datos as CifrasEnVivo | CifrasGlobalEnVivo });
        return 'seguir';
      case 'radar':
        this.emitir({ tipo: 'radar', radar: mensaje.datos });
        return 'seguir';
      case 'opttia':
        this.emitir({ tipo: 'opttia', resumen: mensaje.datos });
        return 'seguir';
      case 'modo':
        return mensaje.datos.modo === 'sondeo' ? 'sondeo' : 'seguir';
      case 'reconectar':
        if (typeof mensaje.datos.esperaMs === 'number' && mensaje.datos.esperaMs >= 0) {
          this.esperaSugeridaMs = Math.min(mensaje.datos.esperaMs, 30000);
        }
        this.motivoReconectar = mensaje.datos.motivo ?? null;
        return 'planeada';
      default:
        return 'seguir';
    }
  }

  private recibirFoto(foto: RespuestaFoto, fuente: 'stream' | 'sondeo'): void {
    if (esNoDisponible(foto)) {
      this.sinAcceso('rol');
      return;
    }
    const completa: FotoEnVivo | FotoGlobalEnVivo = foto;
    const trasCorte = this.trasCorte;
    this.trasCorte = false;
    if (fuente === 'stream') this.vivo = true;

    // Los eventos de la foto cuentan como vistos: si el stream los repite, se descartan.
    for (const evento of completa.eventos || []) {
      if (evento && typeof evento.id === 'string') this.vistos.registrarSiNuevo(evento.id);
    }
    this.emitir({ tipo: 'foto', foto: completa, trasCorte, fuente });

    if (fuente === 'stream') {
      if (!this.sondeoPorServidor) {
        this.detenerSondeo();
        this.cambiarEstado('en-vivo');
      }
    } else if (this.temporizadorSondeo !== null) {
      this.cambiarEstado('sondeo');
    }
  }

  // ── Caídas, espera y respaldo ─────────────────────────────────────────────

  /** Solo el paso de "en vivo" a "cortado" arma el aviso: los reintentos fallidos que siguen no lo repiten. */
  private marcarCorte(): void {
    if (this.vivo) {
      this.trasCorte = true;
      this.vivo = false;
    }
    if (this.estadoActual !== 'sondeo') this.cambiarEstado('reconectando');
  }

  private registrarCaida(duracionMs: number): void {
    this.marcarCorte();
    // Una conexión estable no cuenta como racha de fallas: la escalera vuelve a empezar.
    this.fallas = duracionMs >= CONEXION_ESTABLE_MS ? 1 : this.fallas + 1;
    if (this.fallas >= FALLAS_PARA_SONDEO && this.hayRed()) this.iniciarSondeo();
    this.programarReconexion(esperaReconexionMs(this.fallas - 1));
  }

  private programarReconexion(ms: number): void {
    this.limpiarEspera();
    this.temporizadorEspera = this.fuera(() =>
      setTimeout(() => {
        this.temporizadorEspera = null;
        void this.conectar();
      }, ms)
    );
  }

  private pasarASondeoPorServidor(): void {
    this.sondeoPorServidor = true;
    this.iniciarSondeo();
    // Cada tanto se prueba el stream otra vez: si el servidor ya tiene cupo, vuelve el vivo.
    this.limpiarVivo();
    this.temporizadorVivo = this.fuera(() =>
      setTimeout(() => {
        this.temporizadorVivo = null;
        void this.conectar();
      }, REINTENTO_VIVO_MS)
    );
  }

  private iniciarSondeo(): void {
    this.cambiarEstado('sondeo');
    if (this.temporizadorSondeo !== null) return;
    this.sondearAhora();
    this.temporizadorSondeo = this.fuera(() => setInterval(() => this.sondearAhora(), SONDEO_MS));
  }

  private detenerSondeo(): void {
    if (this.temporizadorSondeo !== null) {
      clearInterval(this.temporizadorSondeo);
      this.temporizadorSondeo = null;
    }
    if (this.suscripcionFoto) {
      this.suscripcionFoto.unsubscribe();
      this.suscripcionFoto = null;
    }
  }

  /** La foto va por HttpClient (BaseService): dentro de la zona, para que el interceptor y el loader se comporten. */
  private sondearAhora(): void {
    if (this.cerrada || this.pausada) return;
    if (this.suscripcionFoto) this.suscripcionFoto.unsubscribe();
    this.deps.zona.run(() => {
      this.suscripcionFoto = this.deps.foto().subscribe({
        next: (foto) => this.recibirFoto(foto, 'sondeo'),
        error: (error: unknown) => this.alFallarSondeo(error),
      });
    });
  }

  private alFallarSondeo(error: unknown): void {
    const estado = esRegistro(error) && typeof error['status'] === 'number' ? (error['status'] as number) : 0;
    if (estado === 401) this.sinAcceso('sesion');
    else if (estado === 403) this.sinAcceso('prohibido');
    else if (!this.hayRed()) this.cambiarEstado('reconectando');
    // Cualquier otra falla: se espera al siguiente sondeo (30 s), sin ruido en pantalla.
  }

  // ── Vigilancia, pestaña oculta y red ──────────────────────────────────────

  /** Sin bytes por 60 s o más de 31 min de vida: corta la conexión. Devuelve la función que apaga la vigilancia. */
  private iniciarGuardia(inicio: number, cortar: (causa: CausaCorte) => void): () => void {
    const id = this.fuera(() =>
      setInterval(() => {
        const ahora = Date.now();
        if (ahora - this.ultimoDato > GUARDIA_SIN_DATOS_MS) cortar('inactividad');
        else if (ahora - inicio > VIDA_MAXIMA_MS) cortar('vida');
      }, 5000)
    );
    return () => clearInterval(id);
  }

  private readonly alCambiarVisibilidad = (): void => {
    if (this.cerrada) return;
    if (document.visibilityState === 'hidden') {
      if (this.temporizadorOculta === null && !this.pausada) {
        this.temporizadorOculta = this.fuera(() =>
          setTimeout(() => {
            this.temporizadorOculta = null;
            this.pausar();
          }, PAUSA_OCULTA_MS)
        );
      }
    } else {
      this.limpiarOculta();
      if (this.pausada) this.reanudar();
    }
  };

  private readonly alVolverLaRed = (): void => {
    if (this.cerrada || this.pausada) return;
    if (this.temporizadorEspera !== null) void this.conectar();
    else if (this.temporizadorSondeo !== null) this.sondearAhora();
  };

  private pausar(): void {
    if (this.cerrada || this.pausada) return;
    this.pausada = true;
    this.generacion += 1;
    this.cortarActual();
    this.limpiarEspera();
    this.limpiarVivo();
    this.detenerSondeo();
    this.cambiarEstado('pausado');
  }

  private reanudar(): void {
    if (this.cerrada || !this.pausada) return;
    this.pausada = false;
    // Lo ocurrido mientras estaba pausado llega con la foto: ahí sale "Te pusimos al día".
    this.trasCorte = true;
    this.vivo = false;
    this.fallas = 0;
    this.cambiarEstado('reconectando');
    void this.conectar();
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private sinAcceso(motivo: MotivoSinAcceso): void {
    if (this.cerrada) return;
    this.estadoActual = 'sin-acceso';
    this.deps.emitir({ tipo: 'estado', estado: 'sin-acceso', motivo });
    this.detener();
    this.deps.terminar();
  }

  private cambiarEstado(estado: EstadoConexion): void {
    if (estado === this.estadoActual || this.cerrada) return;
    this.estadoActual = estado;
    this.deps.emitir({ tipo: 'estado', estado });
  }

  private emitir(salida: SalidaCanal): void {
    if (!this.cerrada) this.deps.emitir(salida);
  }

  private url(): string {
    const { opciones, urlBase } = this.deps;
    const ruta = opciones.vista === 'katuq' ? rutasEnVivo.streamGlobal() : rutasEnVivo.stream(opciones.empresa);
    return `${urlBase}${ruta}`;
  }

  /** Mismos encabezados que `OpttiaChatService.buildHeaders` (lo que el interceptor no pone en `fetch`). */
  private cabeceras(sesion: KatuqCommerceContext): Record<string, string> {
    const cabeceras: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${sesion.token}`,
      // Siempre la empresa de la sesión, nunca el comercio que mira Katuq (ese va en `?empresa=`).
      company: sesion.companyId,
    };
    if (sesion.userNit) cabeceras['user'] = sesion.userNit;
    if (sesion.usageCode) cabeceras['usage-code'] = sesion.usageCode;
    if (sesion.email) cabeceras['email'] = sesion.email;
    return cabeceras;
  }

  private hayRed(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  private cortarActual(): void {
    if (this.controlador) {
      this.controlador.abort();
      this.controlador = null;
    }
  }

  private limpiarEspera(): void {
    if (this.temporizadorEspera !== null) {
      clearTimeout(this.temporizadorEspera);
      this.temporizadorEspera = null;
    }
  }

  private limpiarVivo(): void {
    if (this.temporizadorVivo !== null) {
      clearTimeout(this.temporizadorVivo);
      this.temporizadorVivo = null;
    }
  }

  private limpiarOculta(): void {
    if (this.temporizadorOculta !== null) {
      clearTimeout(this.temporizadorOculta);
      this.temporizadorOculta = null;
    }
  }

  /** Temporizadores internos fuera de la zona: no deben disparar detección de cambios por sí solos. */
  private fuera<T>(accion: () => T): T {
    return this.deps.zona.runOutsideAngular(accion);
  }
}
