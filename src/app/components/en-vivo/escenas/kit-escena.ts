import type * as ThreeNS from 'three';
import type { Three } from '../../../shared/escena-3d/escena-base';
import type { Tokens } from './escena-tokens';

type V3 = ThreeNS.Vector3;

/** Un letrero con texto dibujado en un canvas 2D (se repinta al cambiar el tema o el texto). */
export interface Letrero {
  ctx: CanvasRenderingContext2D;
  tex: ThreeNS.CanvasTexture;
  w: number;
  h: number;
  dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  pintar: () => void;
}

/**
 * Herramientas 3D que comparten el mundo y la escena de la operación: materiales por token de color
 * (se re-tiñen al cambiar el tema), geometrías compartidas (se liberan con las de la escena base),
 * mallas y letreros de canvas. Sin lógica de pedidos.
 */
export class KitEscena {
  readonly mats = new Map<string, ThreeNS.MeshLambertMaterial>();
  readonly vivos = new Set<ThreeNS.MeshBasicMaterial>();
  readonly letreros: Letrero[] = [];
  tokens: Tokens;

  constructor(
    readonly T: Three,
    readonly geoCache: Map<string, ThreeNS.BufferGeometry>,
    private readonly leerTokens: () => Tokens,
    private readonly registrarTextura: <Tx extends ThreeNS.Texture>(tex: Tx) => Tx,
  ) {
    this.tokens = leerTokens();
  }

  /** Vuelve a leer los colores y los aplica a todo lo ya creado. */
  retemar(): void {
    this.tokens = this.leerTokens();
    this.mats.forEach((m, token) => m.color.set(this.tokens[token] ?? '#ff00ff'));
    this.vivos.forEach((m) => {
      const t = m.userData['token'] as string | undefined;
      if (t) m.color.set(this.tokens[t] ?? '#ff00ff');
    });
    this.letreros.forEach((l) => l.pintar());
  }

  v(x: number, z: number, y = 0): V3 {
    return new this.T.Vector3(x, y, z);
  }

  mt(token: string): ThreeNS.MeshLambertMaterial {
    let m = this.mats.get(token);
    if (!m) {
      m = new this.T.MeshLambertMaterial({ color: this.tokens[token] ?? '#ff00ff' });
      this.mats.set(token, m);
    }
    return m;
  }

  /** Material plano y transparente para efectos (pulsos, haces, confeti). */
  basico(token: string, opacidad: number): ThreeNS.MeshBasicMaterial {
    const m = new this.T.MeshBasicMaterial({ color: this.tokens[token] ?? '#ff00ff', transparent: true, opacity: opacidad, depthWrite: false });
    m.userData['token'] = token;
    this.vivos.add(m);
    return m;
  }

  /** Caja con las esquinas redondeadas y borde biselado (idéntica a la del prototipo). */
  gRbox(w: number, h: number, d: number, r: number): ThreeNS.BufferGeometry {
    const k = `rb|${w}|${h}|${d}|${r}`;
    const hit = this.geoCache.get(k);
    if (hit) return hit;
    const T = this.T;
    const b = Math.min(r * 0.5, h * 0.25, 0.12);
    const Wd = w - 2 * b;
    const Dd = d - 2 * b;
    const R0 = Math.max(0.01, Math.min(r - b, Wd / 2 - 0.001, Dd / 2 - 0.001));
    const s = new T.Shape();
    const x0 = -Wd / 2;
    const x1 = Wd / 2;
    const y0 = -Dd / 2;
    const y1 = Dd / 2;
    s.moveTo(x0 + R0, y0);
    s.lineTo(x1 - R0, y0);
    s.quadraticCurveTo(x1, y0, x1, y0 + R0);
    s.lineTo(x1, y1 - R0);
    s.quadraticCurveTo(x1, y1, x1 - R0, y1);
    s.lineTo(x0 + R0, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - R0);
    s.lineTo(x0, y0 + R0);
    s.quadraticCurveTo(x0, y0, x0 + R0, y0);
    const g = new T.ExtrudeGeometry(s, {
      depth: Math.max(0.001, h - 2 * b), bevelEnabled: b > 0.001, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b - h / 2, 0);
    this.geoCache.set(k, g);
    return g;
  }

  gCaja(w: number, h: number, d: number): ThreeNS.BufferGeometry {
    const k = `b|${w}|${h}|${d}|0`;
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.BoxGeometry(w, h, d); this.geoCache.set(k, g); }
    return g;
  }

  gCil(rt: number, rb: number, h: number, seg = 16): ThreeNS.BufferGeometry {
    const k = `c2|${rt}|${rb}|${h}|${seg}`;
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.CylinderGeometry(rt, rb, h, seg); this.geoCache.set(k, g); }
    return g;
  }

  gEsf(r: number): ThreeNS.BufferGeometry {
    const k = `s|${r}`;
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.IcosahedronGeometry(r, 1); this.geoCache.set(k, g); }
    return g;
  }

  malla(
    geo: ThreeNS.BufferGeometry,
    mat: ThreeNS.Material | ThreeNS.Material[],
    padre: ThreeNS.Object3D,
    x = 0, y = 0, z = 0,
    sombra = true,
  ): ThreeNS.Mesh {
    const m = new this.T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = sombra;
    m.receiveShadow = true;
    padre.add(m);
    return m;
  }

  letrero(w: number, h: number, dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Letrero {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const tex = this.registrarTextura(new this.T.CanvasTexture(c));
    const l: Letrero = { ctx, tex, w, h, dibujar, pintar: () => { dibujar(ctx, w, h); tex.needsUpdate = true; } };
    l.pintar();
    this.letreros.push(l);
    return l;
  }
}
