import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";

/** Parámetros con los que llegó la persona desde un anuncio. */
export interface OrigenCampana {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Identificador de clic que Meta agrega a la URL del anuncio. */
  fbclid?: string;
  /** Identificador de clic que TikTok agrega a la URL del anuncio. */
  ttclid?: string;
  /** Primera página por la que entró, sin parámetros. */
  landing?: string;
  /**
   * Perfil de la campaña (D-327): `perfil=vendedor` en el enlace del anuncio
   * hace que el registro pregunte los pedidos por semana. Sin él, el registro
   * es el de siempre.
   */
  perfil?: string;
}

/** Lo que el servidor devuelve para los eventos del registro (D-327). */
export interface PixelRegistro {
  eventId: string;
  pedidosSemana: string | null;
  calificacion: number | null;
  vendedorActivo: boolean;
  eventIdVendedor: string;
}

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

/**
 * Píxeles de las plataformas de pauta (Meta "KATUQ PIXEL" y TikTok "KATUQ PIXEL
 * TikTok") para medir los anuncios que llevan al registro.
 *
 * Solo lo usa la página pública de registro: los píxeles NUNCA se cargan dentro
 * del panel del comercio, donde viajaría información privada de sus ventas.
 *
 * Sin esto las campañas que apuntan a /registrarse optimizan a ciegas: la
 * plataforma no ve ni la visita ni el registro terminado.
 *
 * Cada aviso va a las dos plataformas con su nombre de evento estándar. Una
 * plataforma que falle o esté bloqueada no frena a la otra ni al registro.
 *
 * El origen de la campaña (utm_*) se guarda en `sessionStorage` porque el
 * registro es de varios pasos y un recargue perdería los parámetros de la URL.
 */
@Injectable({ providedIn: "root" })
export class PixelesPautaService {
  private readonly META_PIXEL_ID = "2313426139127070";
  private readonly TIKTOK_PIXEL_ID = "DAQ20GBC77UFPT802PLG";
  private readonly LLAVE_ORIGEN = "katuq_origen_campana";
  private readonly CAMPOS: (keyof OrigenCampana)[] = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "perfil",
  ];
  private cargado = false;
  private inicioContado = false;

  /** En desarrollo no se carga: las pruebas locales ensuciarían las métricas de la pauta. */
  private get habilitado(): boolean {
    return environment.production && typeof window !== "undefined";
  }

  /** Carga los píxeles una sola vez y registra la visita a la página. */
  iniciar(): void {
    if (!this.habilitado || this.cargado) return;
    this.cargado = true;
    this.iniciarMeta();
    this.iniciarTiktok();
  }

  /**
   * La persona escribió el nombre de su empresa y siguió: ya está registrándose.
   * Pasa muchas más veces que el registro completo, y con poco presupuesto es
   * el éxito del que la plataforma alcanza a aprender. Se cuenta una vez por visita.
   */
  inicioRegistro(pedidosSemana?: string | null, calificacion?: number | null): void {
    if (!this.habilitado || this.inicioContado) return;
    this.inicioContado = true;
    // Con respuesta a los pedidos por semana (solo en la campaña de vendedores, D-327).
    const datos = pedidosSemana ? { pedidos_semana: pedidosSemana, lead_score: calificacion } : {};
    this.enMeta((fbq) => fbq("track", "Lead", { content_name: "Inicio registro Katuq", ...datos }));
    this.enTiktok((ttq) => ttq.track("SubmitForm", { content_name: "Inicio registro Katuq", ...datos }));
  }

  /**
   * Registro terminado y aprobado. No se dispara para los registros que el
   * anti-abuso deja en revisión: le enseñarían a la plataforma a traer más de esos.
   */
  registroCompleto(pixel?: PixelRegistro | null): void {
    if (!this.habilitado) return;
    const origen = this.obtenerOrigen();
    const campana = origen?.utm_campaign ? { utm_campaign: origen.utm_campaign } : {};
    // D-327: solo si respondió los pedidos por semana. Sin respuesta, igual que antes.
    const calificado = pixel?.pedidosSemana
      ? { pedidos_semana: pixel.pedidosSemana, calificacion: pixel.calificacion, lead_score: pixel.calificacion, value: pixel.calificacion, currency: "COP" }
      : {};
    // El event_id permite que Meta deduplique cuando se encienda la API de
    // conversiones. Solo en las campañas con perfil: sin él, el evento es
    // idéntico al de siempre (pedido de Daniel).
    const conPerfil = !!origen?.perfil;
    const meta = conPerfil && pixel?.eventId ? { eventID: pixel.eventId } : undefined;
    this.enMeta((fbq) =>
      fbq("track", "CompleteRegistration", { content_name: "Registro Katuq", status: true, ...campana, ...calificado }, meta),
    );
    this.enTiktok((ttq) =>
      ttq.track("CompleteRegistration", { content_name: "Registro Katuq", ...campana, ...calificado }, meta ? { event_id: pixel?.eventId } : undefined),
    );
    if (pixel?.vendedorActivo) this.vendedorActivo(pixel, campana);
  }

  /**
   * Quien ya recibe 10 o más pedidos a la semana (D-327). Evento propio: para
   * optimizar la campaña, marketing le asigna una categoría estándar y arma la
   * conversión personalizada en Events Manager.
   */
  private vendedorActivo(pixel: PixelRegistro, campana: object): void {
    const datos = { pedidos_semana: pixel.pedidosSemana, calificacion: pixel.calificacion, lead_score: pixel.calificacion, ...campana };
    this.enMeta((fbq) => fbq("trackCustom", "VendedorActivo", datos, { eventID: pixel.eventIdVendedor }));
    this.enTiktok((ttq) => ttq.track("VendedorActivo", datos, { event_id: pixel.eventIdVendedor }));
  }

  /**
   * Lee los utm_* de la URL actual y los guarda. Si la URL no trae ninguno se
   * conserva lo que ya estaba: la persona pudo recargar a mitad del registro.
   */
  capturarOrigen(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const origen: OrigenCampana = {};
      for (const campo of this.CAMPOS) {
        const valor = params.get(campo);
        // Recortado: es texto que llega de afuera y termina guardado con el registro.
        if (valor) origen[campo] = valor.trim().slice(0, 150);
      }
      if (Object.keys(origen).length === 0) return;
      origen.landing = window.location.pathname.slice(0, 150);
      sessionStorage.setItem(this.LLAVE_ORIGEN, JSON.stringify(origen));
    } catch {
      // sessionStorage bloqueado (modo privado estricto): se registra sin origen.
    }
  }

  obtenerOrigen(): OrigenCampana | null {
    try {
      const guardado = sessionStorage.getItem(this.LLAVE_ORIGEN);
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  }

  limpiarOrigen(): void {
    try {
      sessionStorage.removeItem(this.LLAVE_ORIGEN);
    } catch {
      // nada que limpiar
    }
  }

  private iniciarMeta(): void {
    try {
      // Snippet oficial de Meta, sin cambios de comportamiento.
      const w: any = window;
      if (!w.fbq) {
        const n: any = (w.fbq = function (...args: any[]) {
          n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
        });
        if (!w._fbq) w._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(script);
      }
      w.fbq("init", this.META_PIXEL_ID);
      w.fbq("track", "PageView");
    } catch {
      // La medición nunca puede tumbar el registro.
    }
  }

  private iniciarTiktok(): void {
    try {
      // Snippet oficial de TikTok (código base del píxel), sin cambios de comportamiento.
      const w: any = window;
      const nombre = "ttq";
      w.TiktokAnalyticsObject = nombre;
      const ttq: any = (w[nombre] = w[nombre] || []);
      ttq.methods = [
        "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias",
        "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
      ];
      ttq.setAndDefer = function (t: any, e: string) {
        t[e] = function (...args: any[]) {
          t.push([e].concat(args));
        };
      };
      for (const metodo of ttq.methods) ttq.setAndDefer(ttq, metodo);
      ttq.instance = function (t: string) {
        const e = ttq._i[t] || [];
        for (const metodo of ttq.methods) ttq.setAndDefer(e, metodo);
        return e;
      };
      ttq.load = function (e: string, n?: any) {
        const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = r + "?sdkid=" + e + "&lib=" + nombre;
        document.head.appendChild(script);
      };
      ttq.load(this.TIKTOK_PIXEL_ID);
      ttq.page();
    } catch {
      // La medición nunca puede tumbar el registro.
    }
  }

  private enMeta(accion: (fbq: any) => void): void {
    try {
      if (window.fbq) accion(window.fbq);
    } catch {
      // La medición nunca puede tumbar el registro.
    }
  }

  private enTiktok(accion: (ttq: any) => void): void {
    try {
      if (window.ttq) accion(window.ttq);
    } catch {
      // La medición nunca puede tumbar el registro.
    }
  }
}
