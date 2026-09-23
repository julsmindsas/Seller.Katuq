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
  /** Primera página por la que entró, sin parámetros. */
  landing?: string;
}

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

/**
 * Píxel de Meta ("KATUQ PIXEL") para medir la pauta que lleva al registro.
 *
 * Solo lo usa la página pública de registro: el píxel NUNCA se carga dentro del
 * panel del comercio, donde viajaría información privada de sus ventas.
 *
 * Sin esto las campañas que apuntan a /registrarse optimizan a ciegas: Meta no
 * ve ni la visita ni el registro terminado.
 *
 * El origen de la campaña (utm_*) se guarda en `sessionStorage` porque el
 * registro es de varios pasos y un recargue perdería los parámetros de la URL.
 */
@Injectable({ providedIn: "root" })
export class MetaPixelService {
  private readonly PIXEL_ID = "2313426139127070";
  private readonly LLAVE_ORIGEN = "katuq_origen_campana";
  private readonly CAMPOS: (keyof OrigenCampana)[] = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid",
  ];
  private cargado = false;

  /** En desarrollo no se carga: las pruebas locales ensuciarían las métricas de la pauta. */
  private get habilitado(): boolean {
    return environment.production && typeof window !== "undefined";
  }

  /** Carga el píxel una sola vez y registra la visita a la página. */
  iniciar(): void {
    if (!this.habilitado || this.cargado) return;
    this.cargado = true;
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
      w.fbq("init", this.PIXEL_ID);
      w.fbq("track", "PageView");
    } catch {
      // La medición nunca puede tumbar el registro.
    }
  }

  /**
   * Registro terminado y aprobado. No se dispara para los registros que el
   * anti-abuso deja en revisión: le enseñarían a Meta a traer más de esos.
   */
  registroCompleto(): void {
    if (!this.habilitado || !window.fbq) return;
    try {
      const origen = this.obtenerOrigen();
      window.fbq("track", "CompleteRegistration", {
        content_name: "Registro Katuq",
        status: true,
        ...(origen?.utm_campaign ? { utm_campaign: origen.utm_campaign } : {}),
      });
    } catch {
      // La medición nunca puede tumbar el registro.
    }
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
}
