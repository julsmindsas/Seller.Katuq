import type * as ThreeNS from 'three';
import { DEG, EscenaBase, VistaCamara } from '../../../../shared/escena-3d/escena-base';

// ==========================================================================
// Recorrido 3D de un pedido en el panel de detalle de "Todos los pedidos".
// Cuatro estaciones en fila: producción → empaque → despacho → casa del cliente.
// Las cajas del pedido aparecen en la etapa real (la misma que la línea de
// progreso), con el camión andando si va despachado. Solo presentación: lee lo
// que el panel ya muestra y no escribe nada.
// ==========================================================================

export type EtiquetaRecorrido = 'actual' | 'destino';

export interface EstadoRecorrido {
  /** 0..4 hitos completos (Producido, Empacado, Despachado, Entregado); -1 = rechazado. */
  completados: number;
  /** Cajas a dibujar (1..4) según las unidades del pedido. */
  cajas: number;
  urgente: boolean;
}

const C = {
  fondo: 0xe7e2f7,
  piso: 0xf8f7fd,
  via: 0xd9d2f0,
  acento: 0x5f3fe0,
  acento2: 0x7c5cff,
  lila: 0xd9cffb,
  lilaMedio: 0xa996ff,
  blanco: 0xffffff,
  vidrio: 0xcfc6f6,
  tinta: 0x2b2550,
  carton: 0xe4bf8e,
  carton2: 0xd7ad78,
  cinta: 0x5f3fe0,
  madera: 0xc9a27a,
  exito: 0x1e874b,
  exitoSuave: 0xbfe8d1,
  alerta: 0xd9820a,
  error: 0xd64545,
};

const ESTACION_X = [-6.3, -2.1, 2.1, 6.3];
const ALTO_PISO = 0.18;

export class PedidoRecorridoEscena extends EscenaBase<EtiquetaRecorrido> {
  protected readonly animaContinuo = true;
  protected readonly vista: VistaCamara = {
    az: 24 * DEG,
    pol: 60 * DEG,
    centro: { x: 0, y: 0, z: 0.2 },
    mirarY: 0.9,
    limAz: [-20 * DEG, 70 * DEG],
    limPol: [45 * DEG, 68 * DEG],
    limZoom: [0.9, 1.6],
    altoMundo: (util) => Math.max(6, 17 / Math.max(util, 0.6)),
    bajada: 0.12,
    fondo: C.fondo,
  };

  private estado: EstadoRecorrido = { completados: 0, cajas: 1, urgente: false };
  private discos: ThreeNS.Mesh[] = [];
  private tramos: ThreeNS.Mesh[] = [];
  private anilloActual!: ThreeNS.Mesh;
  private paquete!: ThreeNS.Group;
  private cajasMesh: ThreeNS.Mesh[] = [];
  private camion!: ThreeNS.Group;
  private sello!: ThreeNS.Group;
  private equis!: ThreeNS.Group;
  private aviso!: ThreeNS.Mesh;
  private readonly anclaActual = { v: null as ThreeNS.Vector3 | null };
  private readonly anclaDestino = { v: null as ThreeNS.Vector3 | null };

  actualizar(estado: EstadoRecorrido): void {
    this.estado = estado;
    if (!this.scene) return;
    this.aplicar();
    this.sucio = true;
  }

  // -------------------------------------------------------------- ganchos

  protected construir(): void {
    const T = this.T;
    this.scene.add(new T.HemisphereLight(0xffffff, 0xd6cef5, 1.8));
    const sol = new T.DirectionalLight(0xffffff, 1.6);
    sol.position.set(-6, 14, 9);
    this.scene.add(sol, sol.target);
    if (!this.opts.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(1024, 1024);
      const s = sol.shadow.camera as ThreeNS.OrthographicCamera;
      s.left = -10; s.right = 10; s.top = 6; s.bottom = -6; s.near = 1; s.far = 40;
      sol.shadow.bias = -0.0008;
      sol.shadow.normalBias = 0.02;
      sol.shadow.radius = 4;
    }

    const geoPiso = new T.PlaneGeometry(120, 120);
    geoPiso.rotateX(-Math.PI / 2);
    this.scene.add(new T.Mesh(geoPiso, new T.MeshBasicMaterial({ color: C.fondo })));
    if (!this.opts.calidadBaja) {
      const sombras = new T.Mesh(geoPiso, new T.ShadowMaterial({ color: 0x2b2160, opacity: 0.12 }));
      sombras.position.y = 0.01;
      sombras.receiveShadow = true;
      this.scene.add(sombras);
    }

    // Plataforma y camino
    this.caja(this.scene, 16.4, ALTO_PISO, 4.2, C.piso, 0, 0, 0, 0.12, false);
    for (let i = 0; i < 3; i++) {
      const largo = ESTACION_X[i + 1] - ESTACION_X[i] - 1.7;
      const t = this.caja(this.scene, largo, 0.04, 0.34, C.via, (ESTACION_X[i] + ESTACION_X[i + 1]) / 2, ALTO_PISO, 1.25, 0.08, false);
      t.material = new T.MeshLambertMaterial({ color: C.via });
      this.tramos.push(t);
    }
    // Discos de estación (se tiñen según el avance)
    for (const x of ESTACION_X) {
      const d = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 0.05, 40), new T.MeshLambertMaterial({ color: C.lila }));
      d.position.set(x, ALTO_PISO + 0.025, 0);
      d.receiveShadow = true;
      this.scene.add(d);
      this.discos.push(d);
    }
    this.anilloActual = new T.Mesh(
      new T.RingGeometry(1.05, 1.25, 48),
      new T.MeshBasicMaterial({ color: C.acento, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    this.anilloActual.rotation.x = -Math.PI / 2;
    this.anilloActual.position.y = ALTO_PISO + 0.06;
    this.scene.add(this.anilloActual);

    this.fabrica(ESTACION_X[0]);
    this.mesa(ESTACION_X[1]);
    this.muelle(ESTACION_X[2]);
    this.casa(ESTACION_X[3]);
    this.crearPaquete();
    this.crearCamion();
    this.crearSellos();
    this.aplicar();
  }

  protected cuadro(t: number, dt: number): boolean {
    void dt;
    const c = this.estado.completados;
    const pulso = (Math.sin(t * 3) + 1) / 2;
    (this.anilloActual.material as ThreeNS.MeshBasicMaterial).opacity = 0.35 + pulso * 0.45;
    this.anilloActual.scale.setScalar(1 + pulso * 0.06);
    if (this.aviso.visible) {
      (this.aviso.material as ThreeNS.MeshBasicMaterial).opacity = 0.35 + pulso * 0.5;
    }
    // Despachado: el camión va de la estación de despacho hacia la casa, en bucle suave.
    if (c === 3) {
      const f = this.opts.reducirMovimiento ? 0.55 : (t * 0.22) % 1;
      const x0 = ESTACION_X[2] + 0.6, x1 = ESTACION_X[3] - 1.6;
      this.camion.position.x = x0 + (x1 - x0) * (0.5 - Math.cos(f * Math.PI) / 2);
      this.camion.position.y = ALTO_PISO + Math.abs(Math.sin(t * 9)) * 0.02;
    }
    // Las cajas flotan un poco cuando están "en proceso"
    if (c >= 0 && c < 3) this.paquete.position.y = this.yPaquete() + Math.sin(t * 2.2) * 0.06;
    this.sello.rotation.y = t * 1.2;
    this.equis.rotation.y = t * 1.2;
    return true;
  }

  protected *anclas(): Iterable<[EtiquetaRecorrido, ThreeNS.Vector3]> {
    const T = this.T;
    const a = this.anclaActual.v ?? (this.anclaActual.v = new T.Vector3());
    const d = this.anclaDestino.v ?? (this.anclaDestino.v = new T.Vector3());
    const c = this.estado.completados;
    if (c === 3) a.set(this.camion.position.x, ALTO_PISO + 2.3, 1.25);
    else if (c === 4) a.set(ESTACION_X[3], ALTO_PISO + 3.4, 0);
    else if (c < 0) a.set(ESTACION_X[0], ALTO_PISO + 3.2, 0);
    else a.set(this.paquete.position.x, this.paquete.position.y + 1.5 + 0.7 * Math.ceil(this.estado.cajas / 2), this.paquete.position.z);
    yield ['actual', a];
    if (c !== 4) {
      d.set(ESTACION_X[3], ALTO_PISO + 3.0, 0);
      yield ['destino', d];
    }
  }

  // ------------------------------------------------------------- estado

  /** Posición del paquete según el avance. */
  private xPaquete(): number {
    const c = this.estado.completados;
    if (c <= 0) return ESTACION_X[0] + 1.05;
    if (c === 1) return ESTACION_X[0] + 1.3;
    if (c === 2) return ESTACION_X[1];
    return ESTACION_X[3] + 1.0; // entregado: en la puerta
  }

  private yPaquete(): number {
    return this.estado.completados === 2 ? ALTO_PISO + 0.95 : ALTO_PISO;
  }

  private aplicar(): void {
    const c = this.estado.completados;
    const actual = c < 0 ? 0 : Math.min(c, 3);
    this.discos.forEach((d, i) => {
      const m = d.material as ThreeNS.MeshLambertMaterial;
      const hecho = c >= 0 && (i < c || c === 4);
      m.color.setHex(c < 0 && i === 0 ? 0xf6c9c9 : hecho ? C.exitoSuave : i === actual ? 0xe2d9ff : C.lila);
    });
    this.tramos.forEach((tr, i) => {
      (tr.material as ThreeNS.MeshLambertMaterial).color.setHex(c >= 0 && i < c - 1 ? 0x7fcf9f : i === c - 1 && c === 3 ? C.acento2 : C.via);
    });
    // Anillo sobre la estación en curso (no si ya se entregó)
    this.anilloActual.visible = c !== 4;
    (this.anilloActual.material as ThreeNS.MeshBasicMaterial).color.setHex(c < 0 ? C.error : C.acento);
    this.anilloActual.position.x = ESTACION_X[actual === 3 ? 2 : actual];

    // Paquete: cajas según unidades; escondido mientras va en el camión
    const n = Math.max(1, Math.min(4, this.estado.cajas));
    this.cajasMesh.forEach((m, i) => (m.visible = i < n));
    this.paquete.visible = c !== 3;
    this.paquete.position.set(this.xPaquete(), this.yPaquete(), c === 4 ? 0.9 : 0.15);
    // En producción (0) las cajas se ven a medio hacer: más claras
    this.cajasMesh.forEach((m) => {
      (m.material as ThreeNS.MeshLambertMaterial).color.setHex(c === 0 ? 0xf0dcc0 : C.carton);
    });

    // Camión: en el muelle hasta despachar; andando si va despachado; junto a la casa si se entregó
    this.camion.visible = c >= 2 && c !== -1;
    if (c === 2) this.camion.position.set(ESTACION_X[2], ALTO_PISO, 0.2);
    if (c === 4) this.camion.position.set(ESTACION_X[3] - 1.7, ALTO_PISO, 1.3);
    this.camion.rotation.y = c === 2 ? 0 : Math.PI / 2;
    if (c !== 3) this.camion.position.y = ALTO_PISO;

    this.sello.visible = c === 4;
    this.equis.visible = c < 0;
    this.aviso.visible = this.estado.urgente && c >= 0 && c < 4;
    this.aviso.position.set(c === 3 ? ESTACION_X[3] : this.xPaquete(), ALTO_PISO + 0.05, c === 3 ? 0 : 0.15);
  }

  // -------------------------------------------------------------- modelos

  private fabrica(x: number): void {
    const g = new this.T.Group();
    this.caja(g, 2.2, 1.5, 1.6, C.acento, x - 0.35, ALTO_PISO, -0.25, 0.1);
    this.caja(g, 2.4, 0.16, 1.8, C.acento2, x - 0.35, ALTO_PISO + 1.5, -0.25, 0.05);
    this.cilindro(g, 0.18, 1.0, C.lilaMedio, x + 0.45, ALTO_PISO + 2.1, -0.6, 12);
    this.caja(g, 0.8, 0.9, 0.06, C.lila, x - 0.35, ALTO_PISO, 0.56, 0, false);
    this.scene.add(g);
  }

  private mesa(x: number): void {
    const g = new this.T.Group();
    this.caja(g, 1.9, 0.12, 1.2, C.madera, x, ALTO_PISO + 0.8, 0.15, 0.04);
    for (const [dx, dz] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.65], [0.8, 0.65]]) {
      this.caja(g, 0.1, 0.8, 0.1, C.tinta, x + dx, ALTO_PISO, 0.15 + dz, 0, false);
    }
    // Rollo de cinta y caja vacía a un lado
    this.cilindro(g, 0.16, 0.12, C.cinta, x - 0.6, ALTO_PISO + 0.98, -0.15, 14);
    this.scene.add(g);
  }

  private muelle(x: number): void {
    const g = new this.T.Group();
    this.caja(g, 2.0, 1.3, 0.5, C.acento, x, ALTO_PISO, -0.95, 0.08);
    this.caja(g, 1.4, 1.0, 0.08, C.lila, x, ALTO_PISO, -0.67, 0, false);
    this.caja(g, 2.2, 0.12, 0.8, C.blanco, x, ALTO_PISO + 1.3, -0.75, 0.04);
    this.scene.add(g);
  }

  private casa(x: number): void {
    const T = this.T;
    const g = new T.Group();
    this.caja(g, 1.9, 1.3, 1.7, C.blanco, x, ALTO_PISO, -0.1, 0.08);
    const techo = new T.CylinderGeometry(1.3, 1.3, 2.2, 3, 1, false, Math.PI / 2);
    techo.rotateZ(Math.PI / 2);
    techo.scale(1, 0.62, 1);
    const t = new T.Mesh(techo, this.mat(C.acento2));
    t.position.set(x, ALTO_PISO + 1.3 + 0.4, -0.1);
    t.rotation.y = Math.PI / 2;
    t.castShadow = true;
    g.add(t);
    this.caja(g, 0.5, 0.85, 0.05, C.acento, x + 0.4, ALTO_PISO, 0.77, 0, false);
    this.caja(g, 0.5, 0.45, 0.05, C.vidrio, x - 0.45, ALTO_PISO + 0.5, 0.77, 0, false);
    this.scene.add(g);
  }

  private crearPaquete(): void {
    const T = this.T;
    this.paquete = new T.Group();
    const pos: Array<[number, number, number]> = [[-0.36, 0, -0.3], [0.36, 0, 0.3], [0.36, 0, -0.36], [-0.06, 0.68, 0]];
    pos.forEach(([x, y, z], i) => {
      const m = new T.Mesh(this.geoCaja(0.68, 0.64, 0.68, 0.05), new T.MeshLambertMaterial({ color: i % 2 ? C.carton2 : C.carton }));
      m.position.set(x, y + 0.32, z);
      m.castShadow = true;
      const cinta = new T.Mesh(this.geoCaja(0.1, 0.65, 0.69), this.mat(C.cinta));
      m.add(cinta);
      this.paquete.add(m);
      this.cajasMesh.push(m);
    });
    this.scene.add(this.paquete);
  }

  private crearCamion(): void {
    const g = new this.T.Group();
    // Mirando a +z (cabina adelante); se gira a +x cuando sale hacia la casa
    this.caja(g, 0.95, 1.05, 1.6, C.blanco, 0, 0.22, -0.35, 0.08);
    this.caja(g, 0.9, 0.82, 0.7, C.acento, 0, 0.22, 0.8, 0.12);
    this.caja(g, 0.78, 0.3, 0.04, C.vidrio, 0, 0.66, 1.16, 0, false);
    this.caja(g, 0.97, 0.1, 1.62, C.acento, 0, 0.62, -0.35, 0, false);
    for (const [wx, wz] of [[-0.48, 0.75], [0.48, 0.75], [-0.48, -0.75], [0.48, -0.75]]) {
      const w = this.cilindro(g, 0.2, 0.16, C.tinta, wx, 0.2, wz, 12);
      w.rotation.z = Math.PI / 2;
    }
    this.camion = g;
    this.scene.add(g);
  }

  private crearSellos(): void {
    const T = this.T;
    // Entregado: insignia verde con chulo sobre la casa
    this.sello = new T.Group();
    const disco = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.12, 28), new T.MeshLambertMaterial({ color: C.exito }));
    disco.rotation.x = Math.PI / 2;
    this.sello.add(disco);
    const a = this.caja(this.sello, 0.1, 0.32, 0.06, C.blanco, -0.08, -0.2, 0.08, 0, false);
    a.rotation.z = Math.PI / 4; a.position.set(-0.1, -0.06, 0.08);
    const b = this.caja(this.sello, 0.1, 0.5, 0.06, C.blanco, 0.1, -0.2, 0.08, 0, false);
    b.rotation.z = -Math.PI / 5; b.position.set(0.08, 0.02, 0.08);
    this.sello.position.set(ESTACION_X[3], ALTO_PISO + 2.75, -0.1);
    this.scene.add(this.sello);

    // Rechazado: equis roja sobre producción
    this.equis = new T.Group();
    const fondo = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.12, 28), new T.MeshLambertMaterial({ color: C.error }));
    fondo.rotation.x = Math.PI / 2;
    this.equis.add(fondo);
    for (const r of [Math.PI / 4, -Math.PI / 4]) {
      const l = this.caja(this.equis, 0.1, 0.5, 0.06, C.blanco, 0, -0.25, 0.08, 0, false);
      l.rotation.z = r; l.position.set(0, 0, 0.08);
    }
    this.equis.position.set(ESTACION_X[0] - 0.35, ALTO_PISO + 2.5, -0.25);
    this.scene.add(this.equis);

    // Urgente: anillo naranja que respira alrededor del paquete
    this.aviso = new T.Mesh(
      new T.RingGeometry(0.75, 0.92, 40),
      new T.MeshBasicMaterial({ color: C.alerta, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    this.aviso.rotation.x = -Math.PI / 2;
    this.scene.add(this.aviso);
  }
}
