import type * as ThreeNS from 'three';
import { DEG, EscenaBase, OpcionesEscena, RoundedBox, Three, VistaCamara } from '../../shared/escena-3d/escena-base';
import type { MapaPedidosResponse } from '../../shared/services/dashboard/mapa-pedidos.service';
import { RAMPA_MAPA } from './mapa-rampa';

// ==========================================================================
// Mapa 3D de Colombia con el calor de los pedidos del comercio (D-352).
// Departamentos en relieve (Natural Earth, dominio público, simplificado),
// el calor se pinta UNA vez en una textura de canvas que cubre el mapa, y las
// ciudades con más pedidos llevan una columna. Sin movimiento de ambiente: solo
// pinta cuando algo cambia (crecer columnas, pasar el puntero, girar).
// ==========================================================================

export interface GeoColombia {
  inset: { departamento: string; dx: number; dy: number };
  departamentos: Array<{
    iso: string; dane: string; nombre: string;
    centro: [number, number]; inset?: boolean;
    poligonos: number[][][][];
  }>;
  /** DANE → [longitud, latitud, nombre] (San Andrés ya viene corrido al recuadro). */
  ciudades: Record<string, [number, number, string]>;
}

/** `d:CO-ANT` = departamento, `c:05001` = ciudad (código DANE). */
export type IdMapa = string;

const LON0 = -73.6;
const LAT0 = 4.4;
const K = 1.45; // unidades de mundo por grado
const ALTO_MAPA = 0.55;
const COLUMNAS = 8;
const FONDO = 0xe7e2f7;
const TIERRA = '#F1EEFC';

/** ¿El punto cae dentro del polígono (anillo exterior menos huecos)? Ray casting. */
function dentroDe(lon: number, lat: number, poligono: number[][][]): boolean {
  const enAnillo = (r: number[][]) => {
    let dentro = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  };
  return enAnillo(poligono[0]) && !poligono.slice(1).some(enAnillo);
}

const px = (lon: number) => (lon - LON0) * K;
const py = (lat: number) => (lat - LAT0) * K;

interface DeptoRuntime { mesh: ThreeNS.Mesh; centro: ThreeNS.Vector3; y: number; }
interface ColumnaRuntime { grupo: ThreeNS.Group; cuerpo: ThreeNS.Mesh; disco: ThreeNS.Mesh; iso: string | null; alto: number; x: number; z: number; ancla: ThreeNS.Vector3; }

export class MapaColombiaEscena extends EscenaBase<IdMapa> {
  protected readonly animaContinuo = false;
  protected readonly vista: VistaCamara = {
    az: 6 * DEG,
    pol: 36 * DEG,
    centro: { x: 0, y: 0, z: -0.4 },
    mirarY: 0,
    limAz: [-50 * DEG, 50 * DEG],
    limPol: [20 * DEG, 62 * DEG],
    limZoom: [0.8, 3.2],
    altoMundo: (util) => Math.max(23, 25 / Math.max(util, 0.6)),
    bajada: 0.02,
    fondo: FONDO,
  };

  private readonly deptos = new Map<string, DeptoRuntime>();
  private readonly columnas = new Map<string, ColumnaRuntime>();
  private grupoColumnas!: ThreeNS.Group;
  private lienzo!: HTMLCanvasElement;
  private textura!: ThreeNS.CanvasTexture;
  private limites = { minX: 0, minY: 0, w: 1, h: 1 };
  private datos: MapaPedidosResponse | null = null;
  private crecer = 1; // 0..1, columnas apareciendo
  private yo: { grupo: ThreeNS.Group; anillo: ThreeNS.Mesh; x: number; z: number; iso: string | null; ancla: ThreeNS.Vector3 } | null = null;
  private lut: Uint8ClampedArray | null = null;

  constructor(T: Three, RB: RoundedBox, opts: OpcionesEscena<IdMapa>, private readonly geo: GeoColombia) {
    super(T, RB, opts);
  }

  // ------------------------------------------------------------------ API

  ponerDatos(datos: MapaPedidosResponse): void {
    this.datos = datos;
    if (!this.scene) return;
    this.pintar();
    this.crearColumnas();
    this.crecer = this.opts.reducirMovimiento ? 1 : 0;
    this.sucio = true;
  }

  /**
   * Punto de "estás aquí" con la ubicación del navegador (no sale del equipo).
   * Devuelve el departamento donde cae, o null si está fuera de Colombia (no se dibuja).
   */
  ponerUbicacion(lon: number | null, lat: number | null): { iso: string; nombre: string } | null {
    if (this.yo) { this.scene.remove(this.yo.grupo); this.yo = null; }
    this.sucio = true;
    if (lon == null || lat == null) return null;
    const depto = this.geo.departamentos.find((d) => !d.inset && d.poligonos.some((pl) => dentroDe(lon, lat, pl)));
    if (!depto) return null;
    const T = this.T;
    const grupo = new T.Group();
    const x = px(lon), z = -py(lat);
    const punto = new T.Mesh(new T.SphereGeometry(0.2, 20, 14), new T.MeshBasicMaterial({ color: 0x5f3fe0 }));
    const borde = new T.Mesh(new T.CircleGeometry(0.3, 28), new T.MeshBasicMaterial({ color: 0xffffff }));
    borde.rotation.x = -Math.PI / 2;
    const anillo = new T.Mesh(new T.RingGeometry(0.3, 0.42, 36), new T.MeshBasicMaterial({ color: 0x5f3fe0, transparent: true, opacity: 0.6, depthWrite: false }));
    anillo.rotation.x = -Math.PI / 2;
    punto.position.y = 0.2;
    borde.position.y = 0.015;
    anillo.position.y = 0.02;
    grupo.add(borde, anillo, punto);
    grupo.position.set(x, ALTO_MAPA, z);
    this.scene.add(grupo);
    this.yo = { grupo, anillo, x, z, iso: depto.iso, ancla: new T.Vector3(x, ALTO_MAPA, z) };
    return { iso: depto.iso, nombre: depto.nombre };
  }

  // -------------------------------------------------------------- ganchos

  protected construir(): void {
    this.luces();
    this.piso();
    this.mapa();
    this.grupoColumnas = new this.T.Group();
    this.scene.add(this.grupoColumnas);
    this.pintar();
    if (this.datos) this.ponerDatos(this.datos);
  }

  protected cuadro(t: number, dt: number): boolean {
    let cambio = false;
    if (this.crecer < 1) {
      this.crecer = Math.min(1, this.crecer + dt / 1.1);
      cambio = true;
    }
    for (const [iso, d] of this.deptos) {
      const id = `d:${iso}`;
      const objetivo = this.hover === id || this.resaltada === id ? 0.55 : 0;
      const y = d.y + (objetivo - d.y) * 0.25;
      if (Math.abs(y - d.y) > 0.001) { d.y = y; d.mesh.position.y = y; cambio = true; }
    }
    const e = 1 - Math.pow(1 - this.crecer, 3);
    for (const [dane, c] of this.columnas) {
      const activa = this.hover === `c:${dane}` || this.resaltada === `c:${dane}`;
      const grosor = activa ? 1.45 : 1;
      const sx = c.cuerpo.scale.x + (grosor - c.cuerpo.scale.x) * 0.25;
      if (Math.abs(sx - c.cuerpo.scale.x) > 0.002) cambio = true;
      // La columna sube con su departamento cuando este se levanta.
      const base = ALTO_MAPA + (c.iso ? this.deptos.get(c.iso)?.y ?? 0 : 0);
      c.cuerpo.position.y = base;
      c.disco.position.y = base + 0.012;
      c.cuerpo.scale.set(sx, Math.max(0.001, c.alto * e), sx);
      c.ancla.set(c.x, base + c.alto * e + 0.35, c.z);
    }
    if (this.yo) {
      const base = ALTO_MAPA + (this.yo.iso ? this.deptos.get(this.yo.iso)?.y ?? 0 : 0);
      this.yo.grupo.position.y = base;
      this.yo.ancla.y = base; // la etiqueta va debajo del punto
      // Pulso del "estás aquí" (quieto con reducir movimiento)
      if (!this.opts.reducirMovimiento) {
        const f = (t * 0.8) % 1;
        this.yo.anillo.scale.setScalar(1 + f * 2.4);
        (this.yo.anillo.material as ThreeNS.MeshBasicMaterial).opacity = 0.6 * (1 - f);
        cambio = true;
      }
    }
    return cambio;
  }

  protected *anclas(): Iterable<[IdMapa, ThreeNS.Vector3]> {
    if (this.yo) yield ['yo', this.yo.ancla];
    for (const [dane, c] of this.columnas) yield [`c:${dane}`, c.ancla];
    for (const id of [this.hover, this.resaltada]) {
      if (!id || !id.startsWith('d:')) continue;
      const d = this.deptos.get(id.slice(2));
      if (d) { d.centro.y = ALTO_MAPA + d.y + 0.2; yield [id, d.centro]; }
    }
  }

  // -------------------------------------------------------------- mundo

  private luces(): void {
    const T = this.T;
    this.scene.add(new T.HemisphereLight(0xffffff, 0xd6cef5, 1.9));
    const sol = new T.DirectionalLight(0xffffff, 1.6);
    sol.position.set(-12, 30, 16);
    this.scene.add(sol, sol.target);
    if (!this.opts.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      const s = sol.shadow.camera as ThreeNS.OrthographicCamera;
      s.left = -22; s.right = 22; s.top = 22; s.bottom = -22; s.near = 1; s.far = 80;
      sol.shadow.bias = -0.0008;
      sol.shadow.normalBias = 0.02;
      sol.shadow.radius = 5;
    }
  }

  private piso(): void {
    const T = this.T;
    const g = new T.PlaneGeometry(240, 240);
    g.rotateX(-Math.PI / 2);
    this.scene.add(new T.Mesh(g, new T.MeshBasicMaterial({ color: FONDO })));
    if (!this.opts.calidadBaja) {
      const sombras = new T.Mesh(g, new T.ShadowMaterial({ color: 0x2b2160, opacity: 0.14 }));
      sombras.position.y = 0.01;
      sombras.receiveShadow = true;
      this.scene.add(sombras);
    }
  }

  private mapa(): void {
    const T = this.T;
    // Límites en coordenadas de forma (x = lon, y = lat) para mapear la textura.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const d of this.geo.departamentos) for (const pl of d.poligonos) for (const [lon, lat] of pl[0]) {
      const x = px(lon), y = py(lat);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    this.limites = { minX, minY, w: maxX - minX, h: maxY - minY };

    this.lienzo = document.createElement('canvas');
    this.lienzo.width = 1024;
    this.lienzo.height = Math.round(1024 * this.limites.h / this.limites.w);
    this.textura = this.registrarTextura(new T.CanvasTexture(this.lienzo));
    this.textura.wrapS = this.textura.wrapT = T.ClampToEdgeWrapping;
    // Las tapas del relieve traen UV = coordenadas de forma: llevarlas a 0..1.
    this.textura.repeat.set(1 / this.limites.w, 1 / this.limites.h);
    this.textura.offset.set(-minX / this.limites.w, -minY / this.limites.h);

    const tapa = new T.MeshLambertMaterial({ map: this.textura });
    const costado = new T.MeshLambertMaterial({ color: 0xcfc5f3 });

    for (const d of this.geo.departamentos) {
      const formas = d.poligonos.map((pl) => {
        const forma = new T.Shape(pl[0].map(([lon, lat]) => new T.Vector2(px(lon), py(lat))));
        forma.holes = pl.slice(1).map((r) => new T.Path(r.map(([lon, lat]) => new T.Vector2(px(lon), py(lat)))));
        return forma;
      });
      const geo = new T.ExtrudeGeometry(formas, { depth: ALTO_MAPA, bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2); // la forma queda acostada: norte hacia el fondo (-z)
      const mesh = new T.Mesh(geo, [tapa, costado]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const grupo = this.grupoSeleccionable(`d:${d.iso}`);
      grupo.add(mesh);
      this.deptos.set(d.iso, { mesh, centro: new T.Vector3(px(d.centro[0]), ALTO_MAPA, -py(d.centro[1])), y: 0 });
    }

    // Recuadro del archipiélago (fuera de escala)
    const sa = this.geo.departamentos.find((d) => d.iso === this.geo.inset.departamento);
    if (sa) {
      const xs: number[] = [], zs: number[] = [];
      sa.poligonos.forEach((pl) => pl[0].forEach(([lon, lat]) => { xs.push(px(lon)); zs.push(-py(lat)); }));
      const pad = 0.55;
      const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, z0 = Math.min(...zs) - pad, z1 = Math.max(...zs) + pad;
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => new T.Vector3(x, 0.03, z));
      const linea = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), new T.LineDashedMaterial({ color: 0xa996ff, dashSize: 0.25, gapSize: 0.18 }));
      linea.computeLineDistances();
      this.scene.add(linea);
    }
  }

  // ------------------------------------------------------------ calor

  private aCanvas(lon: number, lat: number): [number, number] {
    const { minX, minY, w, h } = this.limites;
    return [((px(lon) - minX) / w) * this.lienzo.width, (1 - (py(lat) - minY) / h) * this.lienzo.height];
  }

  private trazarPais(ctx: CanvasRenderingContext2D, soloIso?: string): void {
    ctx.beginPath();
    for (const d of this.geo.departamentos) {
      if (soloIso && d.iso !== soloIso) continue;
      for (const pl of d.poligonos) for (const anillo of pl) {
        anillo.forEach(([lon, lat], i) => {
          const [x, y] = this.aCanvas(lon, lat);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
    }
  }

  /** Tabla de 256 colores de la rampa (índice = intensidad acumulada). */
  private tablaColores(): Uint8ClampedArray {
    if (this.lut) return this.lut;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 1;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    RAMPA_MAPA.forEach((col, i) => g.addColorStop(i / (RAMPA_MAPA.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 1);
    this.lut = ctx.getImageData(0, 0, 256, 1).data;
    return this.lut;
  }

  /** Pinta tierra, bordes y el calor de los pedidos en la textura del mapa. */
  private pintar(): void {
    const ctx = this.lienzo.getContext('2d')!;
    const W = this.lienzo.width, H = this.lienzo.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = TIERRA;
    this.trazarPais(ctx);
    ctx.fill('evenodd');

    const datos = this.datos;
    if (datos && (datos.conCiudad + datos.soloDepartamento) > 0) {
      const escalaPx = W / this.limites.w * K; // px por grado
      // Puntos de calor: ciudades con coordenada; lo demás cae en el centro de su departamento.
      const puntos: Array<{ lon: number; lat: number; n: number; ancho: number }> = [];
      const centros = new Map(this.geo.departamentos.map((d) => [d.dane, d.centro] as const));
      for (const c of datos.ciudades) {
        const g = this.geo.ciudades[c.dane];
        if (g) puntos.push({ lon: g[0], lat: g[1], n: c.pedidos, ancho: 1 });
        else {
          const ce = centros.get(c.dane.slice(0, 2));
          if (ce) puntos.push({ lon: ce[0], lat: ce[1], n: c.pedidos, ancho: 1.4 });
        }
      }
      for (const d of datos.departamentos) {
        const ce = centros.get(d.dane);
        if (ce && d.sinCiudad > 0) puntos.push({ lon: ce[0], lat: ce[1], n: d.sinCiudad, ancho: 1.8 });
      }
      const max = Math.max(1, ...puntos.map((p) => p.n));

      const capa = document.createElement('canvas');
      capa.width = W; capa.height = H;
      const cx = capa.getContext('2d')!;
      for (const p of puntos) {
        const k = Math.sqrt(p.n / max);
        const r = (0.55 + 1.7 * k) * p.ancho * escalaPx;
        const [x, y] = this.aCanvas(p.lon, p.lat);
        const g = cx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${0.38 + 0.62 * k})`);
        g.addColorStop(0.45, `rgba(0,0,0,${(0.38 + 0.62 * k) * 0.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        cx.fillStyle = g;
        cx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Colorear: la opacidad acumulada elige el color de la rampa.
      const img = cx.getImageData(0, 0, W, H);
      const px8 = img.data;
      const lut = this.tablaColores();
      for (let i = 3; i < px8.length; i += 4) {
        const a = px8[i];
        if (!a) continue;
        const j = a * 4;
        px8[i - 3] = lut[j]; px8[i - 2] = lut[j + 1]; px8[i - 1] = lut[j + 2];
        px8[i] = Math.min(255, 40 + a * 1.1);
      }
      cx.putImageData(img, 0, 0);
      ctx.save();
      this.trazarPais(ctx);
      ctx.clip('evenodd');
      ctx.drawImage(capa, 0, 0);
      ctx.restore();
    }

    // Bordes de departamento encima del calor
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    this.trazarPais(ctx);
    ctx.stroke();
    this.textura.needsUpdate = true;
    this.sucio = true;
  }

  private crearColumnas(): void {
    const T = this.T;
    for (const c of this.columnas.values()) this.grupoColumnas.remove(c.grupo);
    this.columnas.clear();
    this.pickables.splice(0, this.pickables.length, ...this.pickables.filter((o) => !String(o.userData['zona']).startsWith('c:')));
    const datos = this.datos;
    if (!datos) return;
    const conCoord = datos.ciudades.filter((c) => this.geo.ciudades[c.dane]).slice(0, COLUMNAS);
    const max = Math.max(1, ...conCoord.map((c) => c.pedidos));
    let geo = this.geoCache.get('columna');
    if (!geo) {
      geo = new T.CylinderGeometry(0.2, 0.2, 1, 20);
      geo.translate(0, 0.5, 0);
      this.geoCache.set('columna', geo);
    }
    let base = this.geoCache.get('columna-base');
    if (!base) {
      base = new T.CircleGeometry(0.36, 28);
      base.rotateX(-Math.PI / 2);
      this.geoCache.set('columna-base', base);
    }
    const lut = this.tablaColores();
    for (const c of conCoord) {
      const [lon, lat] = this.geo.ciudades[c.dane];
      const k = Math.sqrt(c.pedidos / max);
      const idx = Math.round(110 + k * 145) * 4; // columnas siempre en la mitad oscura de la rampa
      const color = (lut[idx] << 16) | (lut[idx + 1] << 8) | lut[idx + 2];
      const x = px(lon), z = -py(lat);
      const grupo = this.grupoSeleccionable(`c:${c.dane}`, this.grupoColumnas);
      const cuerpo = new T.Mesh(geo, this.mat(color));
      cuerpo.position.set(x, ALTO_MAPA, z);
      cuerpo.castShadow = false; // sombras largas de columnas ensucian el calor
      const disco = new T.Mesh(base, this.mat(0xffffff));
      disco.position.set(x, ALTO_MAPA + 0.012, z);
      grupo.add(cuerpo, disco);
      const alto = 0.5 + 5 * k;
      this.columnas.set(c.dane, { grupo, cuerpo, disco, iso: c.iso, alto, x, z, ancla: new T.Vector3(x, ALTO_MAPA + alto + 0.35, z) });
    }
  }
}
