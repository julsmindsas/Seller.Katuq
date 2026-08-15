import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "./base.service";
import { environment } from "../../../environments/environment";

/** Lo que se le muestra a quien llega por el enlace de una campaña. */
export interface PromocionPublica {
  codigo: string;
  nombre: string;
  descripcion: string;
  diasPremium: number;
  /** Duración en texto legible: 90 días llegan como "3 meses". */
  duracionTexto: string;
}

export interface ValidacionPromocion {
  disponible: boolean;
  promocion?: PromocionPublica;
  mensaje?: string;
}

/** Campaña con sus datos internos — solo para la pantalla de superadmin. */
export interface Campana {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  diasPremium: number;
  duracionTexto: string;
  cupoMaximo: number;
  usosConsumidos: number;
  /** -1 significa sin tope. */
  cupoRestante: number;
  vigenteHasta: any;
  activo: boolean;
  disponible: boolean;
  fechaCreacion?: any;
  visitas: number;
  visitantes: number;
  clics: number;
}

export interface ResultadoCampana {
  campanaId: string;
  codigo: string;
  registradas: number;
  sigueEnPremium: number;
  degradadas: number;
  /** El embudo: sin esto no se sabe si la pauta rinde, solo cuántos entraron. */
  visitas: number;
  visitantes: number;
  clics: number;
  /** Porcentajes, o null cuando todavía no hay de dónde calcularlos. */
  conversionVisitaRegistro: number | null;
  conversionClicRegistro: number | null;
  porDia: { [fecha: string]: { v: number; u: number; c: number } };
}

/**
 * Campañas promocionales de registro.
 *
 * La validación del código es pública (quien llega por pauta no tiene sesión);
 * todo lo demás exige Super Administrador en el backend.
 *
 * El código se guarda en `localStorage` porque el registro es de varios pasos y
 * un recargue perdería el parámetro de la URL.
 */
@Injectable({ providedIn: "root" })
export class PromocionesService extends BaseService {
  private readonly LLAVE_CODIGO = "katuq_codigo_promocional";

  constructor(http: HttpClient) {
    super(http);
  }

  validarCodigo(codigo: string): Observable<ValidacionPromocion> {
    return this.get<ValidacionPromocion>(`/v1/promociones/validar/${encodeURIComponent(codigo)}`);
  }

  /**
   * Avisa que alguien abrió el enlace o pulsó el botón de registro.
   *
   * Es telemetría y no debe estorbar: se dispara sin esperar respuesta y los
   * errores se tragan. `nuevo` marca la primera visita del día de este navegador
   * — aproximado a propósito, no se rastrea a nadie.
   */
  contarVisita(codigo: string, tipo: 'visita' | 'clic'): void {
    const llave = `katuq_promo_visto_${codigo}`;
    const hoy = new Date().toISOString().slice(0, 10);
    let nuevo = false;

    if (tipo === 'visita') {
      try {
        nuevo = localStorage.getItem(llave) !== hoy;
        if (nuevo) localStorage.setItem(llave, hoy);
      } catch (e) {
        // Navegación privada: se cuenta como visita, no como visitante.
      }
    }

    const url = `${environment.urlApi}/v1/promociones/visita/${encodeURIComponent(codigo)}`;
    const cuerpo = JSON.stringify({ tipo, nuevo });

    // `keepalive` hace que el navegador termine de entregar la petición aunque la
    // página ya se haya ido, que es justo lo que pasa con el clic: se pulsa el
    // botón y acto seguido se navega al registro. Sin eso la petición se cancela
    // a medio camino y el clic no se cuenta.
    //
    // NO se usa navigator.sendBeacon: con cuerpo JSON hacia otro dominio el
    // navegador exige un preflight que sendBeacon no hace, así que la descarta
    // en silencio — y aun así devuelve true, con lo que ni siquiera se nota.
    // Verificado contra producción: con sendBeacon no llegaba ni una visita.
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      // Telemetría: si no se puede medir, se sigue igual.
    }
  }

  listarCampanas(): Observable<Campana[]> {
    return this.get<Campana[]>("/v1/promociones");
  }

  resultadoCampana(id: string): Observable<ResultadoCampana> {
    return this.get<ResultadoCampana>(`/v1/promociones/${id}/resultado`);
  }

  crearCampana(campana: Partial<Campana>): Observable<any> {
    return this.post<any>("/v1/promociones", campana);
  }

  actualizarCampana(id: string, campana: Partial<Campana>): Observable<any> {
    return this.put<any>(`/v1/promociones/${id}`, campana);
  }

  cambiarEstado(id: string, activo: boolean): Observable<any> {
    return this.put<any>(`/v1/promociones/${id}/estado`, { activo });
  }

  guardarCodigoPendiente(codigo: string): void {
    try {
      localStorage.setItem(this.LLAVE_CODIGO, codigo);
    } catch (e) {
      // Navegación privada o almacenamiento lleno: el registro sigue sin el
      // código y la persona simplemente entra en freemium.
    }
  }

  obtenerCodigoPendiente(): string | null {
    try {
      return localStorage.getItem(this.LLAVE_CODIGO);
    } catch (e) {
      return null;
    }
  }

  limpiarCodigoPendiente(): void {
    try {
      localStorage.removeItem(this.LLAVE_CODIGO);
    } catch (e) {
      // Nada que hacer: no vale la pena romper el registro por esto.
    }
  }
}
