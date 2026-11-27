import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CompanyFeaturesService } from '../company-features.service';

/** Canales que viajan por el canal en vivo. */
export type CanalEnVivo = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok';

/** Qué cambió en el chat. */
export type MotivoEnVivo = 'entrante' | 'saliente' | 'dueno' | 'estado' | 'leido' | 'etiquetas' | 'nota';

/** Evento «chat» del canal en vivo (contrato v1). Cualquier campo puede venir en null. */
export interface EventoChatEnVivo {
  tipo: 'chat';
  v: number;
  cursor: string | null;
  motivo: MotivoEnVivo | null;
  canal: CanalEnVivo;
  linea: string | null;
  chatId: string | null;
  contactHash: string | null;
  contacto: string | null;
  textoCorto: string | null;
  hora: string | null;
  noLeidos: number | null;
  asesor: { email: string; nombre: string } | null;
  estado: string | null;
}

/**
 * - `apagado`: nadie escucha, la bandera está apagada, el servidor no tiene la ruta o rechazó la sesión.
 * - `conectando`: primer intento de esta pantalla, todavía sin respuesta.
 * - `en_vivo`: el servidor respondió «listo».
 * - `reconectando`: ya estuvo en vivo y se cayó; se reintenta.
 */
export type EstadoEnVivo = 'apagado' | 'conectando' | 'en_vivo' | 'reconectando';

/** Ruta del canal, sobre la misma base del API. */
export const RUTA_EN_VIVO = '/v1/messaging/en-vivo';

/** Con el canal en vivo conectado, las pantallas sondean solo de respaldo, como mucho cada 30 s. */
export const SONDEO_RESPALDO_MS = 30000;

const CANALES: ReadonlySet<string> = new Set(['whatsapp', 'instagram', 'facebook', 'tiktok']);
const MOTIVOS: ReadonlySet<string> = new Set(['entrante', 'saliente', 'dueno', 'estado', 'leido', 'etiquetas', 'nota']);

/** Espera creciente: 1 s, 2 s, 4 s… con tope de 30 s. */
const ESPERA_BASE_MS = 1000;
const ESPERA_TOPE_MS = 30000;
/** Sin «listo» en este tiempo después de abrir, el intento cuenta como fallido. */
const ESPERA_LISTO_MS = 10000;
/** Latido por defecto si «listo» no trae `latidoMs`. */
const LATIDO_MS = 25000;
/** Con la pestaña oculta la conexión se mantiene este rato; después se cierra hasta que vuelva a verse. */
const OCULTA_MAX_MS = 2 * 60 * 1000;
/**
 * Si el servidor nunca respondió «listo» en esta pestaña y fallan varios intentos seguidos (la ruta aún no
 * existe: 404/400 en el upgrade o cierre inmediato), se deja de intentar un buen rato. Así la consola no se
 * llena de avisos del navegador y la pantalla sigue con su sondeo de siempre.
 */
const FALLOS_SIN_RUTA = 3;
const PAUSA_SIN_RUTA_MS = 10 * 60 * 1000;

/** Cierres del contrato que no se reintentan. */
const CIERRE_SESION = 4401;
const CIERRE_EMPRESA = 4403;
const CIERRE_DEMASIADAS = 4409;

interface Sesion {
  token: string;
  empresa: string;
}

/**
 * Canal en vivo de la bandeja de Comunicaciones (WhatsApp, Instagram, Facebook y TikTok).
 *
 * Abre un WebSocket solo mientras alguien escucha (`eventos$`, `recargar$`, `conectado$` o `estado$`: cada
 * suscripción cuenta) y solo para empresas con la bandera `bandejaUnica`. El token y la empresa viajan en el
 * primer mensaje («hola»), nunca en la URL, y no se escriben en ningún registro.
 *
 * Es un aviso, no la fuente de los datos: quien escucha vuelve a pedir por HTTP lo que cambió. Si el canal
 * no está, las pantallas siguen con su sondeo de siempre.
 *
 * El socket, los temporizadores y la lectura de mensajes corren fuera de la zona de Angular; solo se entra a
 * la zona para entregar un evento o un cambio de estado.
 */
@Injectable({ providedIn: 'root' })
export class BandejaEnVivoService implements OnDestroy {
  private readonly eventosSubject = new Subject<EventoChatEnVivo>();
  private readonly recargarSubject = new Subject<void>();
  private readonly estadoSubject = new BehaviorSubject<EstadoEnVivo>('apagado');

  /** Eventos «chat», ya validados. */
  readonly eventos$: Observable<EventoChatEnVivo> = this.contado(this.eventosSubject.asObservable());
  /** Hay que recargar la lista por HTTP: el servidor lo pidió o se reconectó sin poder ponerse al día. */
  readonly recargar$: Observable<void> = this.contado(this.recargarSubject.asObservable());
  /** El servidor respondió «listo» y la conexión sigue abierta. */
  readonly conectado$: Observable<boolean> = this.contado(
    this.estadoSubject.pipe(
      map((e) => e === 'en_vivo'),
      distinctUntilChanged(),
    ),
  );
  /** Para el indicador de la pantalla. */
  readonly estado$: Observable<EstadoEnVivo> = this.contado(
    this.estadoSubject.asObservable().pipe(distinctUntilChanged()),
  );

  private suscriptores = 0;
  private ws: WebSocket | null = null;
  /** Último cursor recibido; se manda en «desde» al reconectar. */
  private cursor: string | null = null;
  /** Ya hubo «listo» en esta activación (sirve para saber si es reconexión). */
  private estuvoListo = false;
  /** Ya hubo «listo» alguna vez en esta pestaña: el servidor tiene la ruta. */
  private rutaConfirmada = false;
  /** El intento actual recibió «listo». */
  private listoEnIntento = false;
  /** «desde» que se mandó en el intento actual. */
  private desdeEnviado: string | null = null;
  private intentos = 0;
  private fallosSinListo = 0;
  private pausaHasta = 0;
  private latidoMs = LATIDO_MS;
  private ultimoMensaje = 0;

  private temporizadorReintento: ReturnType<typeof setTimeout> | null = null;
  private temporizadorListo: ReturnType<typeof setTimeout> | null = null;
  private temporizadorOculta: ReturnType<typeof setTimeout> | null = null;
  private temporizadorLatido: ReturnType<typeof setInterval> | null = null;
  /** La pestaña estuvo oculta más de un rato y se cerró la conexión; vuelve al verse. */
  private dormido = false;

  /** Rechazos que no se reintentan: la sesión (token) o la empresa con la que se rechazó. */
  private tokenRechazado: string | null = null;
  private empresaRechazada: string | null = null;
  /** 4409: en esta pestaña no se vuelve a intentar. */
  private bloqueadoEnPestana = false;

  private readonly alCambiarVisibilidad = (): void => this.cambioDeVisibilidad();
  private readonly alVolverLaRed = (): void => this.reintentarYa();
  private readonly alCambiarAlmacen = (e: StorageEvent): void => this.cambioDeAlmacen(e);

  constructor(
    private readonly zone: NgZone,
    private readonly features: CompanyFeaturesService,
  ) {}

  ngOnDestroy(): void {
    this.desactivar();
  }

  // ─── Conteo de suscriptores ───

  private contado<T>(fuente: Observable<T>): Observable<T> {
    return new Observable<T>((sub) => {
      const s = fuente.subscribe(sub);
      this.retener();
      return () => {
        s.unsubscribe();
        this.soltar();
      };
    });
  }

  private retener(): void {
    this.suscriptores += 1;
    if (this.suscriptores === 1) this.activar();
  }

  private soltar(): void {
    this.suscriptores = Math.max(0, this.suscriptores - 1);
    if (this.suscriptores === 0) this.desactivar();
  }

  private activar(): void {
    this.estuvoListo = false;
    this.cursor = null;
    this.intentos = 0;
    this.dormido = false;
    if (typeof window !== 'undefined') {
      this.zone.runOutsideAngular(() => {
        document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
        window.addEventListener('online', this.alVolverLaRed);
        window.addEventListener('storage', this.alCambiarAlmacen);
      });
    }
    this.conectar();
  }

  private desactivar(): void {
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
      window.removeEventListener('online', this.alVolverLaRed);
      window.removeEventListener('storage', this.alCambiarAlmacen);
    }
    this.limpiarTemporizador('temporizadorOculta');
    this.limpiarTemporizador('temporizadorReintento');
    this.cerrarSocket();
    this.cursor = null;
    this.estuvoListo = false;
    this.dormido = false;
    this.ponerEstado('apagado');
  }

  // ─── Conexión ───

  /** ¿Se puede intentar ahora? Sin bandera, sin sesión, con un rechazo vigente o en pausa: no. */
  private sesionParaConectar(): Sesion | null {
    if (this.suscriptores === 0 || this.bloqueadoEnPestana) return null;
    if (typeof WebSocket === 'undefined') return null;
    if (!this.features.isEnabled('bandejaUnica')) return null;
    const sesion = leerSesion();
    if (!sesion) return null;
    if (this.tokenRechazado && this.tokenRechazado === sesion.token) return null;
    if (this.empresaRechazada && this.empresaRechazada === sesion.empresa) return null;
    return sesion;
  }

  private conectar(): void {
    this.limpiarTemporizador('temporizadorReintento');
    if (this.ws) return;
    if (this.dormido) return;
    const sesion = this.sesionParaConectar();
    if (!sesion) {
      this.ponerEstado('apagado');
      return;
    }
    if (Date.now() < this.pausaHasta) {
      this.ponerEstado('apagado');
      this.programarReintento(this.pausaHasta - Date.now());
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      // Sin red no se intenta: el evento «online» lo despierta.
      this.ponerEstado(this.estuvoListo ? 'reconectando' : 'apagado');
      return;
    }
    if (!this.estuvoListo) this.ponerEstado('conectando');

    this.zone.runOutsideAngular(() => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(urlEnVivo());
      } catch {
        this.alFallar(null);
        return;
      }
      this.ws = ws;
      this.listoEnIntento = false;
      this.desdeEnviado = null;
      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.ultimoMensaje = Date.now();
        const hola: Record<string, unknown> = {
          tipo: 'hola',
          v: 1,
          token: sesion.token,
          empresa: sesion.empresa,
        };
        if (this.cursor) {
          hola['desde'] = this.cursor;
          this.desdeEnviado = this.cursor;
        }
        try {
          ws.send(JSON.stringify(hola));
        } catch {
          this.alFallar(null);
          return;
        }
        this.temporizadorListo = setTimeout(() => {
          if (this.ws === ws && !this.listoEnIntento) this.alFallar(null);
        }, ESPERA_LISTO_MS);
      };
      ws.onmessage = (m) => {
        if (this.ws !== ws) return;
        this.ultimoMensaje = Date.now();
        this.alRecibir(m.data);
      };
      ws.onclose = (c) => {
        if (this.ws !== ws) return;
        this.alFallar(c.code);
      };
      // El navegador ya reporta el fallo; el cierre llega después con su código.
      ws.onerror = () => undefined;
    });
  }

  private alRecibir(dato: unknown): void {
    if (typeof dato !== 'string') return;
    let msg: any;
    try {
      msg = JSON.parse(dato);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;
    const tipo = msg.tipo;
    if (typeof msg.cursor === 'string' && msg.cursor) this.cursor = msg.cursor;

    if (tipo === 'listo') {
      const reconexion = this.estuvoListo;
      this.listoEnIntento = true;
      this.estuvoListo = true;
      this.rutaConfirmada = true;
      this.intentos = 0;
      this.fallosSinListo = 0;
      this.pausaHasta = 0;
      this.tokenRechazado = null;
      this.empresaRechazada = null;
      this.limpiarTemporizador('temporizadorListo');
      const latido = Number(msg.latidoMs);
      this.latidoMs = Number.isFinite(latido) && latido >= 5000 ? latido : LATIDO_MS;
      this.arrancarLatido();
      this.ponerEstado('en_vivo');
      // Reconexión sin cursor que mandar: lo que pasó mientras tanto no llega, hay que recargar.
      if (reconexion && !this.desdeEnviado) this.zone.run(() => this.recargarSubject.next());
      return;
    }
    if (tipo === 'recargar') {
      this.zone.run(() => this.recargarSubject.next());
      return;
    }
    if (tipo === 'chat') {
      const evento = normalizarEvento(msg);
      if (evento) this.zone.run(() => this.eventosSubject.next(evento));
      return;
    }
    // «al_dia» y «pong» solo cuentan como vida de la conexión (y el cursor, arriba).
  }

  /** Cierre o fallo del intento actual: decide si se reintenta, cuándo, o si se deja de intentar. */
  private alFallar(codigo: number | null): void {
    const habiaListo = this.listoEnIntento;
    this.cerrarSocket();

    if (codigo === CIERRE_SESION) {
      // La sesión la maneja el resto de la app; con este mismo token no se vuelve a intentar.
      this.tokenRechazado = leerSesion()?.token ?? null;
      this.ponerEstado('apagado');
      return;
    }
    if (codigo === CIERRE_EMPRESA) {
      this.empresaRechazada = leerSesion()?.empresa ?? null;
      this.ponerEstado('apagado');
      return;
    }
    if (codigo === CIERRE_DEMASIADAS) {
      this.bloqueadoEnPestana = true;
      this.ponerEstado('apagado');
      return;
    }
    if (this.suscriptores === 0 || this.dormido) {
      this.ponerEstado('apagado');
      return;
    }

    if (!habiaListo) this.fallosSinListo += 1;
    if (!this.rutaConfirmada && this.fallosSinListo >= FALLOS_SIN_RUTA) {
      // El servidor aún no tiene la ruta: se deja quieto un rato; las pantallas siguen con su sondeo.
      this.pausaHasta = Date.now() + PAUSA_SIN_RUTA_MS;
      this.fallosSinListo = FALLOS_SIN_RUTA - 1;
      this.ponerEstado('apagado');
      this.programarReintento(PAUSA_SIN_RUTA_MS);
      return;
    }

    this.ponerEstado(this.rutaConfirmada ? 'reconectando' : 'conectando');
    const base = Math.min(ESPERA_TOPE_MS, ESPERA_BASE_MS * Math.pow(2, this.intentos));
    this.intentos += 1;
    const conAzar = Math.min(ESPERA_TOPE_MS, Math.round(base * (0.75 + Math.random() * 0.5)));
    this.programarReintento(conAzar);
  }

  private programarReintento(ms: number): void {
    this.limpiarTemporizador('temporizadorReintento');
    this.zone.runOutsideAngular(() => {
      this.temporizadorReintento = setTimeout(() => {
        this.temporizadorReintento = null;
        this.conectar();
      }, Math.max(0, ms));
    });
  }

  /** Volvió la red: si se estaba esperando para reintentar, se intenta ya. */
  private reintentarYa(): void {
    if (this.ws || this.suscriptores === 0 || this.dormido) return;
    if (Date.now() < this.pausaHasta) return;
    this.intentos = 0;
    this.conectar();
  }

  /**
   * Latido de la aplicación: si no llegó nada en un latido (`latidoMs`) se manda «ping»; si 15 s después
   * sigue sin llegar nada, la conexión se da por muerta y se reconecta. El navegador no deja ver los latidos
   * del protocolo que manda el servidor, por eso el cliente pregunta por su cuenta.
   */
  private arrancarLatido(): void {
    this.limpiarTemporizador('temporizadorLatido');
    this.zone.runOutsideAngular(() => {
      this.temporizadorLatido = setInterval(() => {
        const ws = this.ws;
        if (!ws) return;
        const quieto = Date.now() - this.ultimoMensaje;
        if (quieto > this.latidoMs + 15000) {
          this.alFallar(null);
          return;
        }
        if (quieto >= this.latidoMs && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ tipo: 'ping' }));
          } catch {
            this.alFallar(null);
          }
        }
      }, Math.max(2500, Math.floor(this.latidoMs / 2)));
    });
  }

  private cerrarSocket(): void {
    this.limpiarTemporizador('temporizadorListo');
    this.limpiarTemporizador('temporizadorLatido');
    const ws = this.ws;
    this.ws = null;
    this.listoEnIntento = false;
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    try {
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) ws.close(1000);
    } catch {
      /* ya estaba cerrado */
    }
  }

  // ─── Pestaña oculta, red y cierre de sesión ───

  private cambioDeVisibilidad(): void {
    if (this.suscriptores === 0) return;
    if (document.hidden) {
      this.limpiarTemporizador('temporizadorOculta');
      this.temporizadorOculta = setTimeout(() => {
        this.temporizadorOculta = null;
        if (!document.hidden || this.suscriptores === 0) return;
        // Oculta más de un rato: se cierra hasta que vuelva a verse. El cursor se guarda para ponerse al día.
        this.dormido = true;
        this.limpiarTemporizador('temporizadorReintento');
        this.cerrarSocket();
        this.ponerEstado('apagado');
      }, OCULTA_MAX_MS);
      return;
    }
    this.limpiarTemporizador('temporizadorOculta');
    if (this.dormido) {
      this.dormido = false;
      this.intentos = 0;
      this.conectar();
    } else if (!this.ws && !this.temporizadorReintento) {
      this.conectar();
    }
  }

  /** Otra pestaña cerró sesión o cambió de usuario: se cierra el canal; el resto lo maneja la app. */
  private cambioDeAlmacen(e: StorageEvent): void {
    if (e.key !== null && e.key !== 'user') return;
    const sesion = leerSesion();
    if (!sesion) {
      this.limpiarTemporizador('temporizadorReintento');
      this.cerrarSocket();
      this.ponerEstado('apagado');
      return;
    }
    // Otra sesión en el mismo navegador: se vuelve a saludar con la nueva.
    if (this.ws) {
      this.cerrarSocket();
      this.cursor = null;
      this.estuvoListo = false;
      this.intentos = 0;
      this.conectar();
    }
  }

  // ─── Utilidades ───

  private ponerEstado(estado: EstadoEnVivo): void {
    if (this.estadoSubject.value === estado) return;
    this.zone.run(() => this.estadoSubject.next(estado));
  }

  private limpiarTemporizador(
    nombre: 'temporizadorReintento' | 'temporizadorListo' | 'temporizadorOculta' | 'temporizadorLatido',
  ): void {
    const t = this[nombre];
    if (t === null) return;
    if (nombre === 'temporizadorLatido') clearInterval(t as ReturnType<typeof setInterval>);
    else clearTimeout(t as ReturnType<typeof setTimeout>);
    this[nombre] = null;
  }
}

/** `environment.urlApi` con https→wss (http→ws) y la ruta del canal. */
export function urlEnVivo(base: string = environment.urlApi): string {
  const limpia = String(base || '').replace(/\/+$/, '');
  return limpia.replace(/^http(s?):\/\//i, (_m, s) => (s ? 'wss://' : 'ws://')) + RUTA_EN_VIVO;
}

/** Token y empresa de la sesión: los mismos que el interceptor pone en `Authorization` y `company`. */
function leerSesion(): Sesion | null {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    const token = u && typeof u.token === 'string' ? u.token : '';
    const empresa = u && u.company != null ? String(u.company) : '';
    return token && empresa ? { token, empresa } : null;
  } catch {
    return null;
  }
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

/** Valida un evento «chat»; sin canal conocido o sin forma de ubicar el chat, se descarta. */
export function normalizarEvento(msg: any): EventoChatEnVivo | null {
  if (!msg || msg.tipo !== 'chat') return null;
  const canal = String(msg.canal || '');
  if (!CANALES.has(canal)) return null;
  const chatId = texto(msg.chatId);
  const contactHash = texto(msg.contactHash);
  if (!chatId && !contactHash) return null;
  const motivo = MOTIVOS.has(String(msg.motivo)) ? (msg.motivo as MotivoEnVivo) : null;
  const noLeidos = typeof msg.noLeidos === 'number' && Number.isFinite(msg.noLeidos) ? Math.max(0, Math.floor(msg.noLeidos)) : null;
  const a = msg.asesor;
  const asesor = a && typeof a === 'object' && typeof a.email === 'string' && a.email
    ? { email: a.email, nombre: typeof a.nombre === 'string' ? a.nombre : '' }
    : null;
  return {
    tipo: 'chat',
    v: Number(msg.v) || 1,
    cursor: texto(msg.cursor),
    motivo,
    canal: canal as CanalEnVivo,
    linea: texto(msg.linea),
    chatId,
    contactHash,
    contacto: texto(msg.contacto),
    textoCorto: typeof msg.textoCorto === 'string' ? msg.textoCorto : null,
    hora: texto(msg.hora),
    noLeidos,
    asesor,
    estado: texto(msg.estado),
  };
}

/**
 * ¿El evento cambia los mensajes que se ven dentro del chat? Entrante, saliente y estado de un mensaje (o un
 * motivo que este cliente no conoce). Dueño, etiquetas, leído y notas se ven en la lista o en la barra.
 */
export function eventoTocaMensajes(e: EventoChatEnVivo): boolean {
  return e.motivo === null || e.motivo === 'entrante' || e.motivo === 'saliente' || e.motivo === 'estado';
}

/** Lo mínimo para saber si un evento es de un chat abierto. */
export interface ChatAbiertoEnVivo {
  canal: CanalEnVivo;
  /** WhatsApp: phoneHash; redes: identidadHash. */
  hash: string | null;
  /** Solo WhatsApp: línea del chat (null = número compartido). */
  lineId?: string | null;
  /** Id del hilo de atención, si lo hay. */
  threadId?: string | null;
}

/**
 * ¿El evento es de este chat? Primero por id del hilo; si no, por canal y contacto. En WhatsApp la línea
 * solo descarta cuando las dos están y son distintas (el número compartido puede venir sin línea).
 */
export function eventoEsDelChat(e: EventoChatEnVivo, chat: ChatAbiertoEnVivo | null): boolean {
  if (!chat || e.canal !== chat.canal) return false;
  if (e.chatId && chat.threadId && e.chatId === chat.threadId) return true;
  if (!e.contactHash || !chat.hash || e.contactHash !== chat.hash) return false;
  if (chat.canal !== 'whatsapp') return true;
  const lineaEvento = e.linea && !e.linea.startsWith('red_') ? e.linea : null;
  const lineaChat = chat.lineId || null;
  return !lineaEvento || !lineaChat || lineaEvento === lineaChat;
}
