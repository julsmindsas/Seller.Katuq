import type * as ThreeNS from 'three';
import { esOscuro } from './escena-tokens';
import { KitEscena, Letrero } from './kit-escena';
import { EstacionId, ESTACIONES } from './operacion.tipos';

type V3 = ThreeNS.Vector3;
interface Pos2 { x: number; z: number; }

/** Posiciones de las cuatro estaciones sobre la banda (las comparte la escena para las cajas). */
export const PADS: Record<EstacionId, Pos2> = {
  recibido: { x: -10, z: -5.2 },
  produccion: { x: -4.6, z: -5.2 },
  alistamiento: { x: 0.8, z: -5.2 },
  listo: { x: 6.2, z: -5.2 },
};
export const BELT_Z = -2.2;
export const PICK: Pos2 = { x: 8.7, z: -0.5 };
const CASAS: ReadonlyArray<number> = [-14.2, -9.6, -5.0, -0.4, 4.2, 8.8];
export const SLOTS: ReadonlyArray<Pos2> = [10.4, 11.9, 13.4, 14.9].map((x) => ({ x, z: 0.9 }));

/** Lo que el mundo necesita de la escena que lo aloja. */
export interface ContextoMundo {
  scene: ThreeNS.Scene;
  pickables: ThreeNS.Object3D[];
  calidadBaja: boolean;
  /** Token de color (slate, info, warn...) de cada estación según las etapas del servidor. */
  tonoEtapa: (id: EstacionId) => string;
  /** Lo que dice la pantalla de la tienda: un aviso pasajero o el nombre del comercio. */
  textoPantalla: () => { flash: string | null; nombre: string };
}

/**
 * El mundo estático de la operación: luces, plataforma, tienda con su pantalla, banda con su textura
 * animada, las cuatro estaciones con su utilería, el garaje, el barrio y la geometría de los
 * vehículos. Todo plano y sin gradientes; los colores salen de los tokens del tema.
 */
export class MundoOperacion {
  pantalla: Letrero | null = null;
  cinta: Letrero | null = null;
  baliza: ThreeNS.Mesh | null = null;
  casas: Array<{ x: number; z: number }> = [];
  readonly animados: Array<(t: number) => void> = [];
  readonly padsMesh = new Map<EstacionId, { borde: ThreeNS.Mesh; tapa: ThreeNS.Mesh }>();
  private luces: { hemi: ThreeNS.HemisphereLight; sol: ThreeNS.DirectionalLight } | null = null;

  constructor(private readonly k: KitEscena, private readonly ctx: ContextoMundo) {}

  /** Arma todo lo estático (los vehículos y las cajas los pone la escena). */
  construir(): void {
    this.crearLuces();
    this.crearPlataforma();
    this.crearTienda();
    this.crearBanda();
    this.crearEstaciones();
    this.crearGaraje();
    this.crearBarrio();
  }

  private crearLuces(): void {
    const k = this.k;
    const T = k.T;
    const hemi = new T.HemisphereLight(0xffffff, 0xd6cef5, 1.95);
    const sol = new T.DirectionalLight(0xffffff, 1.6);
    sol.position.set(-16, 30, 20);
    if (!this.ctx.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      const c = sol.shadow.camera;
      c.left = -28; c.right = 28; c.top = 28; c.bottom = -28; c.near = 1; c.far = 100;
      sol.shadow.bias = -0.0006;
    }
    this.ctx.scene.add(hemi, sol, sol.target);
    this.luces = { hemi, sol };
    this.aplicarLuces();
  }

  aplicarLuces(): void {
    const k = this.k;
    if (!this.luces) return;
    const o = esOscuro(k.tokens);
    this.luces.hemi.color.set(o ? '#CFC8FF' : '#FFFFFF');
    this.luces.hemi.groundColor.set(o ? '#1B1838' : '#D6CEF5');
    this.luces.hemi.intensity = o ? 1.6 : 1.95;
    this.luces.sol.intensity = o ? 1.35 : 1.6;
  }

  private crearPlataforma(): void {
    const k = this.k;
    const sc = this.ctx.scene;
    const plat = k.malla(k.gRbox(34.4, 0.9, 19.8, 1.1), [k.mt('scene-plat'), k.mt('scene-plat-side')], sc, 0, -0.45, 0.2, false);
    plat.receiveShadow = true;
    k.malla(k.gRbox(9.0, 0.06, 10.6, 0.6), k.mt('scene-yard'), sc, 12.5, 0.03, -3.7, false);
    k.malla(k.gCaja(34.4, 0.05, 2.6), k.mt('scene-road'), sc, 0, 0.025, 3.4, false);
    k.malla(k.gCaja(1.5, 0.05, 3.4), k.mt('scene-road'), sc, PICK.x, 0.026, 0.6, false);
    for (let x = -16; x <= 16; x += 1.9) k.malla(k.gCaja(0.9, 0.02, 0.12), k.mt('scene-mark'), sc, x, 0.06, 3.4, false);
    k.malla(k.gCaja(34.4, 0.1, 1.1), k.mt('scene-walk'), sc, 0, 0.05, 5.4, false);
    SLOTS.forEach((s) => {
      k.malla(k.gCaja(0.06, 0.02, 1.7), k.mt('scene-mark'), sc, s.x - 0.72, 0.07, s.z, false);
      k.malla(k.gCaja(0.06, 0.02, 1.7), k.mt('scene-mark'), sc, s.x + 0.72, 0.07, s.z, false);
    });
  }

  private crearTienda(): void {
    const k = this.k;
    const T = k.T;
    const tienda = new T.Group();
    tienda.position.set(-15, 0, -4.8);
    this.ctx.scene.add(tienda);
    k.malla(k.gRbox(3.4, 3.2, 4.6, 0.2), k.mt('scene-wall'), tienda, 0, 1.6, 0);
    k.malla(k.gRbox(3.8, 0.32, 5.0, 0.12), k.mt('accent'), tienda, 0, 3.36, 0);
    k.malla(k.gCaja(0.1, 1.9, 1.4), k.mt('scene-glass'), tienda, 1.72, 1.05, 0.9, false);
    k.malla(k.gCaja(0.1, 2.1, 1.0), k.mt('scene-wheel'), tienda, 1.72, 1.05, -0.9, false);
    for (let i = 0; i < 5; i++) {
      k.malla(k.gCaja(0.5, 0.12, 0.42), k.mt(i % 2 ? 'scene-wall' : 'accent'), tienda, 2.05, 2.5, -1.9 + i * 0.95 * 0.85 + 0.2, false);
    }
    this.pantalla = k.letrero(512, 256, (ctx, w, h) => {
      const flash = this.ctx.textoPantalla().flash;
      ctx.fillStyle = flash ? k.tokens['accent'] : esOscuro(k.tokens) ? '#1d1a3a' : '#211F3A';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = flash ? '#FFFFFF' : k.tokens['accent-2'] || '#7C5CFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(h * 0.2)}px Georama, "Segoe UI", sans-serif`;
      ctx.fillText(flash ? '¡NUEVO PEDIDO!' : 'TIENDA EN LÍNEA', w / 2, h * 0.32);
      ctx.fillStyle = '#FFFFFF';
      const txt = flash || this.ctx.textoPantalla().nombre;
      let fs = Math.round(h * 0.3);
      ctx.font = `900 ${fs}px Georama, "Segoe UI", sans-serif`;
      while (ctx.measureText(txt).width > w * 0.9 && fs > 24) { fs -= 2; ctx.font = `900 ${fs}px Georama, "Segoe UI", sans-serif`; }
      ctx.fillText(txt, w / 2, h * 0.68);
    });
    const pant = new T.Mesh(new T.PlaneGeometry(2.7, 1.35), new T.MeshBasicMaterial({ map: this.pantalla.tex }));
    pant.position.set(0, 2.05, 2.31);
    tienda.add(pant);
  }

  private crearBanda(): void {
    const k = this.k;
    const T = k.T;
    const sc = this.ctx.scene;
    k.malla(k.gRbox(20.6, 0.42, 1.7, 0.18), k.mt('scene-belt-2'), sc, -2.3, 0.21, BELT_Z);
    this.cinta = k.letrero(256, 32, (ctx, w, h) => {
      ctx.fillStyle = k.tokens['scene-belt'];
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = k.tokens['scene-belt-2'];
      for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 14, h);
    });
    this.cinta.tex.wrapS = T.RepeatWrapping;
    this.cinta.tex.repeat.set(10, 1);
    const m = new T.Mesh(new T.PlaneGeometry(20.2, 1.3), new T.MeshLambertMaterial({ map: this.cinta.tex }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(-2.3, 0.43, BELT_Z);
    m.receiveShadow = true;
    sc.add(m);
  }

  private crearEstaciones(): void {
    const k = this.k;
    const T = k.T;
    const sc = this.ctx.scene;
    ESTACIONES.forEach((id) => {
      const p = PADS[id];
      const g = new T.Group();
      g.userData['zona'] = 'e:' + id;
      sc.add(g);
      this.ctx.pickables.push(g);
      const borde = k.malla(k.gRbox(4.5, 0.1, 3.5, 0.5), k.mt(this.ctx.tonoEtapa(id)), g, p.x, 0.05, p.z, false);
      const tapa = k.malla(k.gRbox(4.2, 0.14, 3.2, 0.42), k.mt(this.ctx.tonoEtapa(id) + '-soft'), g, p.x, 0.08, p.z, false);
      this.padsMesh.set(id, { borde, tapa });
    });
    // utilería de cada estación
    const z = -8.2;
    // recibido: bandeja con tablet
    let x = PADS.recibido.x;
    k.malla(k.gRbox(2.8, 0.9, 1.2, 0.12), k.mt('scene-wall'), sc, x, 0.45, z);
    k.malla(k.gCaja(1.5, 1.0, 0.1), k.mt('scene-wheel'), sc, x, 1.45, z - 0.2);
    k.malla(k.gCaja(1.36, 0.86, 0.02), k.mt('slate-soft'), sc, x, 1.45, z - 0.14, false);
    // producción: máquina con engranaje
    x = PADS.produccion.x;
    k.malla(k.gRbox(2.6, 1.9, 1.6, 0.2), k.mt('scene-wall'), sc, x, 0.95, z);
    k.malla(k.gCaja(2.62, 0.22, 1.62), k.mt('warn'), sc, x, 1.75, z, false);
    k.malla(k.gCil(0.22, 0.26, 1.0), k.mt('scene-trim'), sc, x + 0.8, 2.4, z - 0.3);
    const engranaje = new T.Group();
    engranaje.position.set(x - 0.3, 1.0, z + 0.82);
    sc.add(engranaje);
    const disco = k.malla(k.gCil(0.42, 0.42, 0.12, 20), k.mt('warn'), engranaje, 0, 0, 0);
    disco.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const d = k.malla(k.gCaja(0.16, 0.16, 0.12), k.mt('warn'), engranaje, Math.cos((i * Math.PI) / 4) * 0.5, Math.sin((i * Math.PI) / 4) * 0.5, 0);
      d.rotation.z = (i * Math.PI) / 4;
    }
    this.animados.push((t) => { engranaje.rotation.z = -t * 1.6; });
    // alistamiento: mesa con cinta y cajas planas
    x = PADS.alistamiento.x;
    k.malla(k.gRbox(2.9, 0.16, 1.4, 0.08), k.mt('scene-wall'), sc, x, 0.9, z);
    ([[-1.3, -0.55], [1.3, -0.55], [-1.3, 0.55], [1.3, 0.55]] as Array<[number, number]>).forEach(([dx, dz]) =>
      k.malla(k.gCaja(0.12, 0.84, 0.12), k.mt('scene-trim'), sc, x + dx, 0.42, z + dz));
    const rolloGeo = k.geoCache.get('torus|0.2') ?? new T.TorusGeometry(0.2, 0.08, 10, 20);
    k.geoCache.set('torus|0.2', rolloGeo);
    const rollo = k.malla(rolloGeo, k.mt('pack'), sc, x - 0.7, 1.12, z);
    rollo.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) k.malla(k.gCaja(0.9, 0.06, 0.7), k.mt('box'), sc, x + 0.6, 1.02 + i * 0.07, z);
    // listo: estantería
    x = PADS.listo.x;
    [-1.3, 1.3].forEach((dx) => k.malla(k.gCaja(0.12, 2.4, 0.9), k.mt('scene-trim'), sc, x + dx, 1.2, z));
    [0.5, 1.3, 2.1].forEach((y) => k.malla(k.gCaja(2.7, 0.08, 0.9), k.mt('scene-wall'), sc, x, y, z));
    ([[-0.7, 0.5], [0.2, 0.5], [0.8, 1.3], [-0.5, 1.3], [0.4, 2.1]] as Array<[number, number]>).forEach(([dx, y]) =>
      k.malla(k.gRbox(0.6, 0.5, 0.6, 0.08), k.mt('box'), sc, x + dx, y + 0.29, z));
  }

  private crearGaraje(): void {
    const k = this.k;
    const T = k.T;
    const garaje = new T.Group();
    garaje.position.set(13.2, 0, -6.3);
    this.ctx.scene.add(garaje);
    k.malla(k.gRbox(6.4, 3.8, 4.2, 0.2), k.mt('scene-wall'), garaje, 0, 1.9, 0);
    k.malla(k.gRbox(6.8, 0.34, 4.6, 0.12), k.mt('accent'), garaje, 0, 3.97, 0);
    const puerta = k.letrero(256, 192, (ctx, w, h) => {
      ctx.fillStyle = k.tokens['scene-trim'];
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = k.tokens['scene-plat-side'];
      for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 3);
    });
    const pm = new T.Mesh(new T.PlaneGeometry(3.4, 2.6), new T.MeshLambertMaterial({ map: puerta.tex }));
    pm.position.set(-0.6, 1.3, 2.11);
    garaje.add(pm);
    const aviso = k.letrero(512, 96, (ctx, w, h) => {
      ctx.fillStyle = k.tokens['accent'];
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(h * 0.52)}px Georama, "Segoe UI", sans-serif`;
      ctx.fillText('DESPACHOS', w / 2, h * 0.54);
    });
    const am = new T.Mesh(new T.PlaneGeometry(3.2, 0.6), new T.MeshBasicMaterial({ map: aviso.tex }));
    am.position.set(-0.6, 3.1, 2.12);
    garaje.add(am);
    this.baliza = k.malla(k.gEsf(0.22), k.basico('warn', 1), garaje, 2.6, 4.32, 1.6, false);
    this.baliza.visible = false;
  }

  private crearBarrio(): void {
    const k = this.k;
    const T = k.T;
    const sc = this.ctx.scene;
    const TONOS = ['accent', 'info', 'ok', 'warn', 'pack', 'slate'];
    const forma = new T.Shape();
    forma.moveTo(-1.38, 0); forma.lineTo(1.38, 0); forma.lineTo(0, 1.05); forma.lineTo(-1.38, 0);
    const techo = new T.ExtrudeGeometry(forma, { depth: 2.3, bevelEnabled: false });
    techo.translate(0, 0, -1.15);
    k.geoCache.set('techo', techo);
    this.casas = CASAS.map((x, i) => {
      const g = new T.Group();
      g.position.set(x, 0, 8.1);
      sc.add(g);
      const t = TONOS[i % TONOS.length];
      k.malla(k.gRbox(2.4, 1.55, 2.0, 0.12), k.mt(t + '-soft'), g, 0, 0.78, 0);
      k.malla(techo, k.mt(t), g, 0, 1.55, 0);
      k.malla(k.gCaja(0.5, 0.9, 0.06), k.mt('scene-wheel'), g, -0.45, 0.45, -1.02, false);
      k.malla(k.gCaja(0.6, 0.45, 0.06), k.mt('scene-glass'), g, 0.5, 0.95, -1.02, false);
      return { x, z: 8.1 };
    });
    ([[-11.9, 9.2], [-7.3, 9.4], [-2.7, 9.2], [1.9, 9.4], [6.5, 9.2], [11.6, 7.9], [13.6, 8.9], [15.6, 7.6], [-16.3, 8.6]] as Array<[number, number]>).forEach(([x, z], i) => {
      const s = 0.8 + (i % 3) * 0.18;
      k.malla(k.gCil(0.12, 0.14, 0.6), k.mt('scene-trunk'), sc, x, 0.3, z);
      const f = k.malla(k.gEsf(0.62), k.mt('scene-tree'), sc, x, 0.95 * s + 0.3, z);
      f.scale.setScalar(s);
    });
  }

  crearMoto(chaqueta: string): ThreeNS.Group {
    const k = this.k;
    const g = new k.T.Group();
    k.malla(k.gRbox(1.3, 0.42, 0.5, 0.15), k.mt('accent'), g, 0.05, 0.55, 0);
    k.malla(k.gRbox(0.62, 0.12, 0.44, 0.06), k.mt('scene-wheel'), g, -0.15, 0.82, 0);
    [-0.52, 0.52].forEach((x) => {
      const w = k.malla(k.gCil(0.3, 0.3, 0.16, 18), k.mt('scene-wheel'), g, x, 0.3, 0);
      w.rotation.x = Math.PI / 2;
    });
    k.malla(k.gCaja(0.08, 0.5, 0.62), k.mt('scene-wheel'), g, 0.58, 0.95, 0);
    k.malla(k.gRbox(0.4, 0.58, 0.44, 0.14), k.mt(chaqueta), g, -0.05, 1.16, 0);
    k.malla(k.gEsf(0.21), k.mt(chaqueta), g, 0.02, 1.64, 0);
    k.malla(k.gCaja(0.6, 0.06, 0.58), k.mt('scene-wheel'), g, -0.64, 0.86, 0);
    const carga = new k.T.Group();
    carga.position.set(-0.64, 0.89, 0);
    g.add(carga);
    g.userData['carga'] = carga;
    return g;
  }

  crearCamion(): ThreeNS.Group {
    const k = this.k;
    const g = new k.T.Group();
    k.malla(k.gRbox(1.2, 1.25, 1.5, 0.18), k.mt('info'), g, 1.25, 0.95, 0);
    k.malla(k.gCaja(0.06, 0.5, 1.2), k.mt('scene-glass'), g, 1.86, 1.2, 0, false);
    k.malla(k.gRbox(2.5, 1.6, 1.55, 0.12), k.mt('scene-wall'), g, -0.45, 1.13, 0);
    k.malla(k.gCaja(2.52, 0.2, 1.57), k.mt('info'), g, -0.45, 0.6, 0, false);
    ([[1.25, 0.72], [1.25, -0.72], [-1.15, 0.72], [-1.15, -0.72]] as Array<[number, number]>).forEach(([x, z]) => {
      const w = k.malla(k.gCil(0.3, 0.3, 0.2, 18), k.mt('scene-wheel'), g, x, 0.3, z);
      w.rotation.x = Math.PI / 2;
    });
    const carga = new k.T.Group();
    carga.position.set(-1.75, 0.9, 0);
    g.add(carga);
    g.userData['carga'] = carga;
    return g;
  }

}
