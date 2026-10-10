import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { SecurityService } from './security/security.service';

/**
 * Banderas de función por comercio (contrato común de las funciones nuevas).
 * Mismos nombres que `FEATURE_FLAG_NAMES` del backend
 * (functions/services/companyFeatureFlags.js): si se suma una, va en los dos.
 */
export const COMPANY_FEATURE_FLAGS = [
  'productFromPhoto',
  'productImportPhotos',
  'buyNowCod',
  'whatsappCartRecovery',
  'whatsappOrderConfirmation',
  'enviameCodGuide',
  'singleStepStore',
  'landingPrompt',
  'product3d',
  'pickingAlistamiento',
] as const;

export type CompanyFeatureFlag = typeof COMPANY_FEATURE_FLAGS[number];

/**
 * ¿Tiene la empresa activa prendida una función nueva?
 *
 * Toda función nueva nace APAGADA para los comercios que ya operan y se prende
 * por comercio (campo `featureFlags` del documento de la empresa). Ausente, o
 * con cualquier valor distinto del booleano `true`, la bandera está apagada.
 *
 * De dónde sale: `currentCompany` en localStorage, la empresa completa que el
 * login guarda con `SecurityService.setCompanyInformationLogged`. El mapeo de
 * `SecurityService.companyInformation$` solo copia tres campos y NO trae
 * `featureFlags`, así que acá se usa únicamente como aviso de "cambió la
 * empresa" para refrescar `isEnabled$`.
 *
 * Cuándo se actualiza: al iniciar sesión. Una bandera que se cambia en el
 * servidor mientras alguien tiene la sesión abierta le llega en su próximo
 * inicio de sesión; el servidor, en cambio, la aplica de inmediato y responde
 * 403 (`FEATURE_DISABLED`) si la función sigue apagada.
 *
 * Esto solo decide qué se MUESTRA. Quien manda es el servidor (`requireFeature`).
 *
 * Uso:
 *   constructor(public features: CompanyFeaturesService) {}
 *   <button *ngIf="features.isEnabled('productFromPhoto')">…</button>
 *   <button *ngIf="features.isEnabled$('buyNowCod') | async">…</button>
 */
@Injectable({ providedIn: 'root' })
export class CompanyFeaturesService {
  // Último par de textos de localStorage ya interpretado. Solo evita repetir el
  // JSON.parse de la empresa completa en cada ciclo de detección de cambios (un
  // `*ngIf` dentro de un `*ngFor` lo llamaría cientos de veces). No guarda datos
  // aparte: en cada llamada se vuelve a leer el storage y, si cambió, se
  // reinterpreta, así que nunca sirve una bandera vieja.
  private textoEmpresa: string | null | undefined;
  private textoSesion: string | null | undefined;
  private banderas: Record<string, boolean> = {};

  constructor(private readonly securityService: SecurityService) {}

  /** `true` solo si la bandera está en el documento de la empresa y vale exactamente `true`. */
  isEnabled(flag: CompanyFeatureFlag): boolean {
    return this.leerBanderas()[flag] === true;
  }

  /** Igual que `isEnabled`, pero se vuelve a evaluar cuando cambia la empresa de la sesión. */
  isEnabled$(flag: CompanyFeatureFlag): Observable<boolean> {
    return this.securityService.companyInformation$.pipe(
      map(() => this.isEnabled(flag)),
      distinctUntilChanged()
    );
  }

  private leerBanderas(): Record<string, boolean> {
    let textoEmpresa: string | null;
    let textoSesion: string | null;
    try {
      textoEmpresa = localStorage.getItem('currentCompany');
      textoSesion = localStorage.getItem('user');
    } catch {
      // Almacenamiento bloqueado (ventana privada, permisos): sin datos, todo apagado.
      return {};
    }

    if (textoEmpresa !== this.textoEmpresa || textoSesion !== this.textoSesion) {
      this.textoEmpresa = textoEmpresa;
      this.textoSesion = textoSesion;
      this.banderas = this.interpretar(textoEmpresa, textoSesion);
    }
    return this.banderas;
  }

  private interpretar(textoEmpresa: string | null, textoSesion: string | null): Record<string, boolean> {
    const empresa = this.leerObjeto(textoEmpresa);
    if (!empresa) return {};

    // Solo se confía en las banderas si la empresa guardada es la de la sesión.
    // La llave de tenant autoritativa es `user.company` (la del JWT); si la
    // empresa guardada es otra, o no hay sesión, son restos de un inicio de
    // sesión anterior (por ejemplo, mientras carga la empresa recién elegida) y
    // no se le prestan sus banderas a otra empresa.
    const sesion = this.leerObjeto(textoSesion);
    const empresaDeLaSesion = this.normalizar(sesion ? sesion['company'] : undefined);
    const empresaGuardada = this.normalizar(empresa['nomComercial']);
    if (!empresaDeLaSesion || empresaDeLaSesion !== empresaGuardada) return {};

    const banderas = empresa['featureFlags'];
    if (!banderas || typeof banderas !== 'object' || Array.isArray(banderas)) return {};
    return banderas as Record<string, boolean>;
  }

  private leerObjeto(texto: string | null): Record<string, unknown> | null {
    if (!texto) return null;
    try {
      const valor = JSON.parse(texto);
      return valor && typeof valor === 'object' && !Array.isArray(valor)
        ? (valor as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private normalizar(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  }
}
