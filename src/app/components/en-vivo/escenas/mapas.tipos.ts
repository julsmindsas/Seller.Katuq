import type * as ThreeNS from 'three';
import type { GeoColombia } from '../../../shared/escena-3d/mapa-colombia.scene';
import { DEG, Three, VistaCamara } from '../../../shared/escena-3d/escena-base';
import type { Tokens } from './escena-tokens';

/** Lo que se tocó en una escena de mapa o de ciudad: una ciudad (mapa del comercio) o un comercio (Katuq). */
export interface ToqueMapa {
  tipo: 'ciudad' | 'comercio';
  /** ciudad = código DANE; comercio = su empresa. */
  id: string;
}

/** Opciones comunes de las escenas del mapa del comercio, del país de Katuq y de la ciudad de Katuq. */
export interface OpcionesEscenaMapa {
  canvas: HTMLCanvasElement;
  /** Contenedor de las etiquetas HTML (`position: absolute; inset: 0; pointer-events: none`). */
  etiquetas: HTMLElement;
  reducirMovimiento: boolean;
  calidadBaja: boolean;
  /** Lee los tokens de color vigentes (tema claro u oscuro del modo pantalla). */
  tokens: () => Tokens;
  /** El mapa de Colombia (assets/geo/colombia.json): nombres de ciudad y posiciones. */
  geo: GeoColombia;
  onClick: (toque: ToqueMapa) => void;
  onHover?: (toque: ToqueMapa | null) => void;
  /** Tocaron un lugar vacío. */
  onVacio?: () => void;
}

export type { ComercioDibujo } from './pais.utilidades';

/**
 * Cámara de las dos escenas de mapa (comercio y Katuq): más inclinada que la de la bienvenida, para
 * que Colombia llene el recuadro y se vea en 3D. El encuadre fino lo hace `ajustarAContenido`.
 */
export function vistaPais(fondo: number): VistaCamara {
  return {
    az: 6 * DEG,
    pol: 48 * DEG,
    centro: { x: 0.7, y: 0, z: 0.3 },
    mirarY: 0,
    limAz: [-50 * DEG, 50 * DEG],
    limPol: [20 * DEG, 64 * DEG],
    limZoom: [0.8, 3.2],
    altoMundo: (util) => Math.max(18.5, 20.5 / Math.max(util, 0.6)),
    bajada: 0.02,
    fondo,
  };
}

/** Márgenes base del encuadre (título arriba, herramientas y franja de etapas abajo). */
export function margenesBase(ancho: number): { t: number; b: number; l: number; r: number } {
  return ancho < 520 ? { t: 66, b: 100, l: 8, r: 50 } : { t: 76, b: 116, l: 18, r: 62 };
}

/** Color de un token (`#rrggbb` u otro color CSS) como número, con un respaldo si no se entiende. */
export function hexDe(T: Three, valor: string | undefined, respaldo = 0xff00ff): number {
  try {
    return valor ? new T.Color(valor).getHex() : respaldo;
  } catch {
    return respaldo;
  }
}

/** Luces del mapa según el tema: en el modo pantalla (oscuro) bajan un poco y toman un tono violeta (igual que la operación). */
export function aplicarLucesDeTema(hemi: ThreeNS.HemisphereLight, sol: ThreeNS.DirectionalLight, oscuro: boolean): void {
  hemi.color.set(oscuro ? '#CFC8FF' : '#FFFFFF');
  hemi.groundColor.set(oscuro ? '#1B1838' : '#D6CEF5');
  hemi.intensity = oscuro ? 1.6 : 1.9;
  sol.intensity = oscuro ? 1.35 : 1.6;
}
