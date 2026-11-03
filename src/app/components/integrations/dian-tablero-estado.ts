/**
 * Tablero de estado de «Configuración DIAN» (ticket 1491, D-622, fase 1).
 *
 * Funciones puras: leen la configuración guardada y calculan lo que el tablero pinta. No escriben
 * nada ni llaman al servidor.
 *
 * Los umbrales son los MISMOS de los avisos por correo y campana (D-448), que viven en
 * `functions/services/accounting/dian/alertasPreventivas.js` (UMBRALES_RANGO y UMBRALES_DIAS):
 * rango al 80, 90 y 95 % usado (y agotado); resolución y certificado a 30, 15 y 5 días (y vencidos).
 * Si se cambian allá, se cambian aquí. La cuenta de consecutivos también es la de ese archivo:
 * usados = próximo − inicio; restantes = fin − próximo + 1; el porcentaje de los umbrales es el
 * entero hacia abajo (`Math.floor`), igual que el cron.
 */

/** Rango: porcentajes usados que cambian de nivel (D-448). */
export const UMBRAL_RANGO_AVISO = 80;
export const UMBRAL_RANGO_ALERTA = 90;
export const UMBRAL_RANGO_CRITICO = 95;
/** Resolución y certificado: días que faltan que cambian de nivel (D-448). */
export const UMBRAL_DIAS_AVISO = 30;
export const UMBRAL_DIAS_ALERTA = 15;
export const UMBRAL_DIAS_CRITICO = 5;

/**
 * `ok` vigente; `aviso` por vencer o rango desde 80 %; `alerta` desde 15 días o 90 %;
 * `critico` desde 5 días o 95 %; `bloqueante` vencido o agotado; `sin-dato` falta el dato.
 */
export type NivelTablero = 'ok' | 'aviso' | 'alerta' | 'critico' | 'bloqueante' | 'sin-dato';

export type TipoAlertaTablero = 'rango' | 'resolucion' | 'certificado';

const ORDEN_GRAVEDAD: Record<NivelTablero, number> = {
  'sin-dato': 0, ok: 0, aviso: 1, alerta: 2, critico: 3, bloqueante: 4,
};

export interface AlertaTablero {
  tipo: TipoAlertaTablero;
  nivel: NivelTablero;
  /** Resolución y certificado: días que faltan (negativo = vencido). */
  dias?: number;
  /** Rango: porcentaje usado (entero hacia abajo) y consecutivos que quedan. */
  pct?: number;
  restantes?: number;
}

export interface TableroDian {
  ambiente: string;
  resolucion: {
    numero: string; prefijo: string; desde: number | null; hasta: number | null;
    vigenteDesde: string | null; vigenteHasta: string | null; dias: number | null; nivel: NivelTablero;
  };
  rango: {
    total: number | null; usados: number | null; restantes: number | null; siguiente: number | null;
    /** Para pintar la barra y el texto (redondeado: 48 de 1000 = 5 %). */
    pctMostrado: number | null; nivel: NivelTablero;
  };
  certificado: { venceEl: string | null; dias: number | null; nivel: NivelTablero };
  alertas: AlertaTablero[];
  /** La más grave de las alertas, o null si todo está en orden. */
  mayor: AlertaTablero | null;
}

/** La fecha de hoy en Colombia (UTC-5), AAAA-MM-DD. */
export function hoyColombia(ahora: number = Date.now()): string {
  return new Date(ahora - 5 * 3600000).toISOString().slice(0, 10);
}

const FECHA = /^\d{4}-\d{2}-\d{2}/;

/** Días de `desde` a `hasta` (AAAA-MM-DD), como `diasEntre` del cron; null si alguna no es fecha. */
export function diasEntre(desde: string, hasta: any): number | null {
  const h = typeof hasta === 'string' ? hasta : hasta instanceof Date ? hasta.toISOString() : '';
  if (!FECHA.test(desde) || !FECHA.test(h)) return null;
  const a = Date.parse(`${h.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((a - b) / 86400000);
}

/** Nivel de una fecha de vencimiento según los días que faltan. */
export function nivelPorDias(dias: number | null): NivelTablero {
  if (dias == null || !Number.isFinite(dias)) return 'sin-dato';
  if (dias < 0) return 'bloqueante';
  if (dias <= UMBRAL_DIAS_CRITICO) return 'critico';
  if (dias <= UMBRAL_DIAS_ALERTA) return 'alerta';
  if (dias <= UMBRAL_DIAS_AVISO) return 'aviso';
  return 'ok';
}

/** Nivel del rango según lo usado. `agotado` = ya no queda ningún consecutivo. */
export function nivelPorRango(pctEntero: number, agotado: boolean): NivelTablero {
  if (agotado) return 'bloqueante';
  if (pctEntero >= UMBRAL_RANGO_CRITICO) return 'critico';
  if (pctEntero >= UMBRAL_RANGO_ALERTA) return 'alerta';
  if (pctEntero >= UMBRAL_RANGO_AVISO) return 'aviso';
  return 'ok';
}

const entero = (v: any): number | null => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * ¿Debe mostrarse el tablero en vez del asistente? Solo con la bandera, el comercio activo
 * (`enabled`) y el ambiente de producción.
 */
export function mostrarTablero(banderaEncendida: boolean, integration: any): boolean {
  if (!banderaEncendida || !integration) return false;
  return integration.enabled === true && integration.config?.environment === 'produccion';
}

/**
 * Calcula el tablero desde la configuración guardada (`integration.config`).
 * Cuando un dato no existe o no es válido el nivel es `sin-dato`: nunca una cifra supuesta ni verde.
 */
export function calcularTablero(config: any, hoy: string): TableroDian {
  const c = config || {};
  const n = c.numbering || {};

  const desde = entero(n.from);
  const hasta = entero(n.to);
  const siguiente = entero(n.current);
  const rangoValido = desde !== null && hasta !== null && siguiente !== null && hasta >= desde;

  let rango: TableroDian['rango'] = {
    total: null, usados: null, restantes: null, siguiente, pctMostrado: null, nivel: 'sin-dato',
  };
  if (rangoValido) {
    const total = (hasta as number) - (desde as number) + 1;
    // Igual que el cron: nunca menos de 0 ni más que el total.
    const usados = Math.max(0, Math.min(total, (siguiente as number) - (desde as number)));
    const restantes = total - usados;
    const pctEntero = Math.floor((usados / total) * 100);
    rango = {
      total, usados, restantes, siguiente,
      pctMostrado: Math.round((usados / total) * 100),
      nivel: nivelPorRango(pctEntero, usados >= total),
    };
  }

  const vigenteHasta = typeof n.validTo === 'string' && FECHA.test(n.validTo) ? n.validTo.slice(0, 10) : null;
  const vigenteDesde = typeof n.validFrom === 'string' && FECHA.test(n.validFrom) ? n.validFrom.slice(0, 10) : null;
  const diasResolucion = vigenteHasta ? diasEntre(hoy, vigenteHasta) : null;

  const venceCert = c.certificateExpiresAt ? String(c.certificateExpiresAt) : '';
  const venceEl = FECHA.test(venceCert) ? venceCert.slice(0, 10) : null;
  const diasCertificado = venceEl ? diasEntre(hoy, venceEl) : null;

  const resolucion = {
    numero: String(n.resolutionNumber || ''),
    prefijo: String(n.prefix || ''),
    desde, hasta, vigenteDesde, vigenteHasta,
    dias: diasResolucion,
    nivel: nivelPorDias(diasResolucion),
  };
  const certificado = { venceEl, dias: diasCertificado, nivel: nivelPorDias(diasCertificado) };

  const alertas: AlertaTablero[] = [];
  if (ORDEN_GRAVEDAD[rango.nivel] > 0) {
    alertas.push({
      tipo: 'rango', nivel: rango.nivel,
      pct: Math.floor(((rango.usados as number) / (rango.total as number)) * 100),
      restantes: rango.restantes as number,
    });
  }
  if (ORDEN_GRAVEDAD[resolucion.nivel] > 0) {
    alertas.push({ tipo: 'resolucion', nivel: resolucion.nivel, dias: diasResolucion as number });
  }
  if (ORDEN_GRAVEDAD[certificado.nivel] > 0) {
    alertas.push({ tipo: 'certificado', nivel: certificado.nivel, dias: diasCertificado as number });
  }
  alertas.sort((a, b) => ORDEN_GRAVEDAD[b.nivel] - ORDEN_GRAVEDAD[a.nivel]);

  return {
    ambiente: String(c.environment || ''),
    resolucion, rango, certificado, alertas,
    mayor: alertas.length ? alertas[0] : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Textos del tablero y de la franja de Facturación (D-622). Funciones puras: devuelven CLAVES de
// traducción (completas, sin armarlas en ejecución, para que el chequeo de traducciones las
// encuentre) y sus parámetros. Las usan «Configuración DIAN» y la franja de Facturación
// electrónica, para que las dos digan lo mismo sin duplicar la lógica.
// ---------------------------------------------------------------------------------------------

export interface ClaveTexto { clave: string; params?: Record<string, any> }

/** Ícono PrimeIcons del nivel: el estado nunca se distingue solo por color. */
export function iconoNivelTablero(nivel: NivelTablero): string {
  return ({
    ok: 'pi-check-circle', aviso: 'pi-info-circle', alerta: 'pi-exclamation-triangle',
    critico: 'pi-exclamation-circle', bloqueante: 'pi-ban', 'sin-dato': 'pi-question-circle',
  } as Record<string, string>)[nivel] || 'pi-question-circle';
}

/** Clave de la etiqueta del nivel («Alerta», «Crítico», «Bloquea la facturación»…). */
export function claveNivelTablero(nivel: NivelTablero): string {
  const claves: Record<string, string> = {
    ok: 'integrations.integrations.tableroNivel_ok',
    aviso: 'integrations.integrations.tableroNivel_aviso',
    alerta: 'integrations.integrations.tableroNivel_alerta',
    critico: 'integrations.integrations.tableroNivel_critico',
    bloqueante: 'integrations.integrations.tableroNivel_bloqueante',
    'sin-dato': 'integrations.integrations.tableroNivel_sin_dato',
  };
  return claves[nivel] || claves['sin-dato'];
}

/** Cuánto falta (o cuánto hace que venció): «Vence en 14 días», «Venció hace 3 días». */
export function claveDiasTablero(dias: number | null): ClaveTexto {
  if (dias === null || dias === undefined) return { clave: 'integrations.integrations.tableroSinDato' };
  if (dias < 0) {
    return dias === -1
      ? { clave: 'integrations.integrations.tableroVencioHace1' }
      : { clave: 'integrations.integrations.tableroVencioHaceN', params: { dias: -dias } };
  }
  if (dias === 0) return { clave: 'integrations.integrations.tableroVenceHoy' };
  return dias === 1
    ? { clave: 'integrations.integrations.tableroVenceEn1' }
    : { clave: 'integrations.integrations.tableroVenceEnN', params: { dias } };
}

/** El mensaje completo de una alerta del tablero, con lo que el comercio debe hacer. */
export function claveAlertaTablero(a: AlertaTablero): ClaveTexto {
  if (a.tipo === 'rango') {
    return {
      clave: a.nivel === 'bloqueante' ? 'integrations.integrations.tableroAlertaRangoAgotado' : 'integrations.integrations.tableroAlertaRango',
      params: { pct: a.pct, restantes: a.restantes },
    };
  }
  // Concuerdan en género: «ResolucionVencida» (femenino) y «CertificadoVencido» (masculino).
  const dias = a.dias as number;
  const clave = a.tipo === 'resolucion'
    ? (dias < 0 ? 'integrations.integrations.tableroAlertaResolucionVencida' : 'integrations.integrations.tableroAlertaResolucion')
    : (dias < 0 ? 'integrations.integrations.tableroAlertaCertificadoVencido' : 'integrations.integrations.tableroAlertaCertificado');
  return { clave, params: { dias: Math.abs(dias) } };
}
