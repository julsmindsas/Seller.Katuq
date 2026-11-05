import { Component, OnInit } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import Swal from "sweetalert2";
import { SitiosService } from "../../../sitios.service";
import { PanelSitioBase } from "../panel-sitio-base";
import {
  AsesorTienda,
  FichaProducto,
  PreguntaFicha,
  TOPES_FICHAS,
  afinesLimpios,
  clavePromesa,
  comoSeLeeAsesor,
  firmaDeAsesor,
  idDeAsesor,
  llevaRanura,
  primeraImagen,
  promesaSinConfirmar,
  tieneDetalle,
  tieneMarcador,
} from "./fichas-datos";

/** Cuántas fichas se muestran (y se piden al servidor) por tanda. */
const TANDA = 24;
/** Cuántas confirmaciones de promesas guarda el sitio (el servidor corta en 40). */
const MAX_CONFIRMADAS = 40;

/** Una vitrina en la que solo unos productos tienen «Ideal para» o datos: la página no se los muestra a ninguno. */
interface VitrinaParcial {
  titulo: string;
  con: number;
  total: number;
}

/** Lo que el panel muestra de un producto con ficha (nombre y foto, de referencia). */
interface ProductoDeFicha {
  titulo: string;
  imagen: string | null;
}

/**
 * Tienda › Fichas de producto (PLAN-V2 T08 y T10): para qué sirve cada producto y lo que pregunta la gente, sin tocar el
 * producto en el catálogo (D-134). Lo pinta el módulo `ficha` del servidor, solo con el diseño nuevo:
 *  - el nombre corto (T10), con que se lee el producto en su ficha y en sus tarjetas (el carrito y el pedido siguen con
 *    el del catálogo);
 *  - «Ideal para» y hasta 3 datos clave, en la tarjeta del producto y bajo el título de su ficha;
 *  - «Suele ir con» (T10): hasta 3 productos que la ficha ofrece con casillas desmarcadas, para sumarlos al carrito;
 *  - «Así se instala» (hasta 5 pasos) y «Preguntas que ya respondimos» (hasta 5), en la ficha;
 *  - «Pregúntale al técnico», que abre WhatsApp con la pregunta (no guarda nada).
 *
 * Guarda `contenido.tienda.fichas` y `contenido.tienda.asesores`. Para borrar una lista la deja vacía (el servidor
 * conserva una clave que el editor no manda). Lo que se está escribiendo (un paso, una pregunta, un asesor) entra a la
 * lista solo al pulsar «Agregar»: así el guardado automático no se lleva un renglón vacío a medio llenar.
 */
@Component({
  selector: "app-panel-fichas",
  templateUrl: "./fichas-panel.component.html",
  styleUrls: ["./fichas-panel.component.scss"],
})
export class FichasPanelComponent extends PanelSitioBase implements OnInit {
  readonly topes = TOPES_FICHAS;

  /** Producto cuya ficha está abierta para editar (una a la vez). */
  abierta = "";
  /** Cuántas fichas de la lista se muestran (de a 24: solo de esas se piden el nombre y la foto). */
  mostrando = TANDA;
  /** El selector de productos está abierto. */
  eligiendo = false;
  /** T10: producto cuyo «Suele ir con» se está eligiendo en el selector ("" = ninguno). */
  eligiendoAfines = "";
  /** Filtro de la lista cuando hay muchas fichas. */
  filtro = "";
  /** Nombre y foto de cada producto con ficha (de referencia; no se guardan). */
  productos: { [id: string]: ProductoDeFicha } = {};
  cargandoProductos = false;

  /** Lo que se está escribiendo en la ficha abierta antes de «Agregar». */
  nuevoPaso = "";
  nuevaPregunta: PreguntaFicha = this.preguntaVacia();
  nuevoAsesor = "";
  subiendoFoto = "";

  constructor(private service: SitiosService, private toastr: ToastrService) {
    super();
  }

  ngOnInit(): void {
    this.cargarVisibles();
  }

  // ── Lectura ─────────────────────────────────────────────────────────────────────────────────────────────────────

  private get tienda(): any {
    return (this.contenido && (this.contenido as any).tienda) || null;
  }

  get fichas(): FichaProducto[] {
    const t = this.tienda;
    return (t && Array.isArray(t.fichas) && t.fichas) || [];
  }

  get asesores(): AsesorTienda[] {
    const t = this.tienda;
    return (t && Array.isArray(t.asesores) && t.asesores) || [];
  }

  /** T10: la palanca de venta cruzada del comercio (Tienda): apagada, «Suele ir con» no sale. */
  get ventaCruzadaApagada(): boolean {
    const t = this.tienda;
    return !!t && t.ventaCruzada === false;
  }

  get confirmadas(): string[] {
    const t = this.tienda;
    return (t && t.promesasConfirmadas) || [];
  }

  /** El nombre del sitio, el mismo que usa la página para «Un técnico de …». */
  get negocio(): string {
    return (this.nombreSitio || "").trim() || "la tienda";
  }

  get conDetalle(): number {
    return this.fichas.filter((f) => tieneDetalle(f)).length;
  }

  /** ¿Esta ficha puede sumar pasos o preguntas sin pasar el tope de 40? */
  puedeDetalle(f: FichaProducto): boolean {
    return tieneDetalle(f) || this.conDetalle < this.topes.conDetalle;
  }

  /** Las fichas que coinciden con la búsqueda (por nombre ya cargado, «Ideal para» o datos). */
  private get filtradas(): FichaProducto[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.fichas;
    return this.fichas.filter((f) =>
      [this.productos[f.productoId] ? this.productos[f.productoId].titulo : "", f.ideal || "", ...(f.datos || [])].join(" ").toLowerCase().includes(q)
    );
  }

  /** Las que se pintan: de a 24 (la abierta siempre). Solo de estas se piden el nombre y la foto. */
  get fichasVisibles(): FichaProducto[] {
    const lista = this.filtradas.slice(0, this.mostrando);
    const abierta = this.abierta && this.fichas.find((f) => f.productoId === this.abierta);
    return abierta && !lista.includes(abierta) ? [...lista, abierta] : lista;
  }

  get quedanPorMostrar(): number {
    return Math.max(0, this.filtradas.length - this.mostrando);
  }

  verMas(): void {
    this.mostrando += TANDA;
    this.cargarVisibles();
  }

  cambiarFiltro(valor: string): void {
    this.filtro = valor;
    this.mostrando = TANDA;
    this.cargarVisibles();
  }

  tituloDe(id: string): string {
    const p = this.productos[id];
    return (p && p.titulo) || (this.cargandoProductos ? "Cargando…" : "Producto sin nombre en el catálogo");
  }

  imagenDe(id: string): string | null {
    const p = this.productos[id];
    return (p && p.imagen) || null;
  }

  resumenDe(f: FichaProducto): string {
    const partes = [
      f.nombre ? `Se lee «${f.nombre}»` : "",
      f.ideal ? `Ideal para ${f.ideal}` : "Sin «Ideal para»",
      (f.pasos || []).length ? `${f.pasos!.length} paso${f.pasos!.length === 1 ? "" : "s"}` : "",
      (f.preguntas || []).length ? `${f.preguntas!.length} pregunta${f.preguntas!.length === 1 ? "" : "s"}` : "",
      (f.afines || []).length ? `suele ir con ${f.afines!.length}` : "",
    ];
    return partes.filter(Boolean).join(" · ");
  }

  nombreDeAsesor(id: string | undefined): string {
    const a = this.asesores.find((x) => x.id === id);
    return a ? a.nombre || a.especialidad || "Sin nombre" : "";
  }

  /** Lo que se lee en la página como quien responde (la misma regla del servidor). */
  comoSeLee(a: AsesorTienda): string {
    return comoSeLeeAsesor(a, this.nombreSitio);
  }

  /** Cómo se lee esta persona si no autoriza publicar su nombre y su foto. */
  sinPermiso(a: AsesorTienda): string {
    return comoSeLeeAsesor({ ...a, autorizado: false }, this.nombreSitio);
  }

  /** La firma con que sale una respuesta, sin la fecha («Respondió un técnico de redes y WiFi»). */
  firmaDe(id: string | undefined): string {
    return firmaDeAsesor(this.asesores.find((x) => x.id === id) || null, this.nombreSitio);
  }

  /** Los textos de la ficha con un marcador entre corchetes («[POR CONFIRMAR]»): nunca se publican. */
  marcadoresDe(f: FichaProducto): string[] {
    const textos = [
      f.nombre || "",
      f.ideal || "",
      ...(f.datos || []),
      ...(f.pasos || []),
      ...(f.preguntas || []).reduce((acc: string[], q) => acc.concat([q.pregunta || "", q.respuesta || ""]), []),
    ];
    return Array.from(new Set(textos.filter((t) => tieneMarcador(t))));
  }

  /** Quien responde con un marcador en su nombre o su especialidad: ese dato no se publica. */
  get asesoresConMarcador(): AsesorTienda[] {
    return this.asesores.filter((a) => tieneMarcador(a.nombre) || tieneMarcador(a.especialidad));
  }

  /**
   * Las vitrinas (inicio y páginas) en las que solo unos productos tienen «Ideal para» o datos: la tarjeta los muestra
   * en todos los productos de la vitrina o en ninguno, para no dejar huecos entre el nombre y el precio.
   */
  get vitrinasParciales(): VitrinaParcial[] {
    const c: any = this.contenido;
    if (!c || !this.fichas.length) return [];
    const porId = new Map(this.fichas.map((f) => [f.productoId, f] as [string, FichaProducto]));
    const bloques: any[] = [...(c.bloques || []), ...((c.paginas || []) as any[]).reduce((acc: any[], p: any) => acc.concat(p.bloques || []), [])];
    const salida: VitrinaParcial[] = [];
    for (const b of bloques) {
      if (!b || b.tipo !== "productos" || b.visible === false) continue;
      const ids: string[] = ((b.datos && b.datos.productoIds) || []).filter(Boolean);
      if (!ids.length) continue;
      const con = ids.filter((id) => llevaRanura(porId.get(id), this.confirmadas)).length;
      if (con > 0 && con < ids.length) salida.push({ titulo: String((b.datos && b.datos.titulo) || "Productos").trim() || "Productos", con, total: ids.length });
    }
    return salida;
  }

  /** Los textos de la ficha que prometen algo sin confirmar: no se publican hasta confirmarlos. */
  promesasDe(f: FichaProducto): string[] {
    const textos = [
      f.ideal || "",
      ...(f.datos || []),
      ...(f.pasos || []),
      ...(f.preguntas || []).reduce((acc: string[], q) => acc.concat([q.pregunta || "", q.respuesta || ""]), []),
    ];
    const vistas = new Set<string>();
    return textos.filter((t) => {
      if (!promesaSinConfirmar(t, this.confirmadas) || vistas.has(t)) return false;
      vistas.add(t);
      return true;
    });
  }

  idealRepetido(f: FichaProducto): boolean {
    return /^\s*ideal\s+para\b/i.test(f.ideal || "");
  }

  porProducto(_: number, f: FichaProducto): string {
    return f.productoId;
  }

  porIndice(i: number): number {
    return i;
  }

  // ── Productos ─────────────────────────────────────────────────────────────────────────────────────────────────

  get idsConFicha(): string[] {
    return this.fichas.map((f) => f.productoId);
  }

  /** Pide el nombre y la foto solo de las fichas que se ven (de a 24), no de las 200. */
  private cargarVisibles(): void {
    // T10: también los afines de la ficha abierta (hasta 3), que se muestran con su nombre y su foto.
    const abierta = this.abierta ? this.fichas.find((f) => f.productoId === this.abierta) : null;
    this.cargarProductos([...this.fichasVisibles.map((f) => f.productoId), ...((abierta && abierta.afines) || [])]);
  }

  private cargarProductos(ids: string[]): void {
    const faltan = ids.filter((id) => id && !this.productos[id]).slice(0, TANDA);
    if (!faltan.length || this.cargandoProductos) return;
    this.cargandoProductos = true;
    this.service.productosPorIds(faltan).subscribe({
      next: (res) => {
        this.cargandoProductos = false;
        for (const p of (res && res.products) || []) {
          const crear: any = p.crearProducto || {};
          this.productos[p.cd] = { titulo: crear.titulo || "Sin nombre", imagen: primeraImagen(crear) };
        }
        // Un id que ya no existe en el catálogo no se vuelve a pedir.
        for (const id of faltan) if (!this.productos[id]) this.productos[id] = { titulo: "", imagen: null };
        // Lo que quedó por cargar mientras esta tanda volvía (otra búsqueda, «Ver más»).
        this.cargarVisibles();
      },
      error: () => {
        this.cargandoProductos = false;
        this.toastr.error("No pudimos cargar los nombres de los productos con ficha.");
      },
    });
  }

  abrirSelector(): void {
    this.eligiendo = true;
  }

  /**
   * El selector devuelve los productos que quedan con ficha, en su orden. Los nuevos nacen vacíos (se llenan aquí);
   * los que se quitaron en el selector pierden su ficha, con confirmación si tenían algo escrito.
   */
  async aplicarSeleccion(ids: string[]): Promise<void> {
    this.eligiendo = false;
    const t = this.tienda;
    if (!t) return;
    const elegidos = (ids || []).slice(0, this.topes.fichas);
    const porId = new Map(this.fichas.map((f) => [f.productoId, f] as [string, FichaProducto]));
    const quitadas = this.fichas.filter((f) => !elegidos.includes(f.productoId));
    const conContenido = quitadas.filter((f) => f.ideal || (f.datos || []).length || tieneDetalle(f));
    if (conContenido.length) {
      const r = await Swal.fire({
        title: "¿Quitar estas fichas?",
        text: `${conContenido.length} producto${conContenido.length === 1 ? "" : "s"} que quitaste ya tenía${
          conContenido.length === 1 ? "" : "n"
        } texto escrito. Se borra de la ficha; el producto no cambia.`,
        showCancelButton: true,
        confirmButtonText: "Sí, quitarlas",
        cancelButtonText: "Conservarlas",
        confirmButtonColor: "#5F3FE0",
      });
      if (!r.isConfirmed) {
        // Se conservan las que tenían algo; las vacías sí salen.
        conContenido.forEach((f) => elegidos.push(f.productoId));
      }
    }
    t.fichas = elegidos.map((id) => porId.get(id) || { productoId: id });
    const nueva = elegidos.find((id) => !porId.has(id));
    if (nueva) this.abrir(nueva);
    this.cargarVisibles();
    this.avisar();
  }

  async quitarFicha(f: FichaProducto): Promise<void> {
    const t = this.tienda;
    if (!t) return;
    const r = await Swal.fire({
      title: "¿Quitar esta ficha?",
      text: "Se borra lo que escribiste para este producto. El producto no cambia en tu catálogo.",
      showCancelButton: true,
      confirmButtonText: "Sí, quitarla",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#5F3FE0",
    });
    if (!r.isConfirmed) return;
    t.fichas = this.fichas.filter((x) => x.productoId !== f.productoId);
    if (this.abierta === f.productoId) this.abierta = "";
    this.avisar();
  }

  abrir(id: string): void {
    this.abierta = this.abierta === id ? "" : id;
    this.nuevoPaso = "";
    this.nuevaPregunta = this.preguntaVacia();
    // T10: el nombre y la foto de sus afines, para mostrarlos (de a 3, ya en la tanda de 24).
    const f = this.abierta && this.fichas.find((x) => x.productoId === this.abierta);
    if (f && (f.afines || []).length) this.cargarProductos(f.afines!);
  }

  // ── T10: nombre corto y «Suele ir con» ───────────────────────────────────────────────────────────────────────────

  cambiarNombre(f: FichaProducto, valor: string): void {
    f.nombre = valor;
    this.avisar();
  }

  /** El nombre corto es más largo que el del catálogo: no acorta nada. */
  nombreMasLargo(f: FichaProducto): boolean {
    const catalogo = (this.productos[f.productoId] && this.productos[f.productoId].titulo) || "";
    return !!catalogo && !!(f.nombre || "").trim() && (f.nombre || "").trim().length >= catalogo.trim().length;
  }

  elegirAfines(f: FichaProducto): void {
    this.eligiendoAfines = f.productoId;
  }

  get idsAfinesEligiendo(): string[] {
    const f = this.fichas.find((x) => x.productoId === this.eligiendoAfines);
    return (f && f.afines) || [];
  }

  /** El selector devuelve los afines en su orden: sin el propio producto, sin repetir y hasta 3. */
  aplicarAfines(ids: string[]): void {
    const f = this.fichas.find((x) => x.productoId === this.eligiendoAfines);
    this.eligiendoAfines = "";
    if (!f) return;
    const propio = (ids || []).includes(f.productoId);
    f.afines = afinesLimpios(ids, f.productoId);
    if (propio) this.toastr.info("Un producto no puede ir consigo mismo: lo quitamos de «Suele ir con».");
    this.cargarProductos(f.afines);
    this.avisar();
  }

  quitarAfin(f: FichaProducto, id: string): void {
    f.afines = (f.afines || []).filter((x) => x !== id);
    this.avisar();
  }

  moverAfin(f: FichaProducto, k: number, dir: -1 | 1): void {
    const lista = (f.afines || []).slice();
    const destino = k + dir;
    if (destino < 0 || destino >= lista.length) return;
    [lista[k], lista[destino]] = [lista[destino], lista[k]];
    f.afines = lista;
    this.avisar();
  }

  /** Cómo se lee un afín en la ficha: su nombre corto si tiene ficha con nombre; si no, el del catálogo. */
  nombreDeAfin(id: string): string {
    const f = this.fichas.find((x) => x.productoId === id);
    return (f && (f.nombre || "").trim()) || this.tituloDe(id);
  }

  // ── Edición de una ficha ──────────────────────────────────────────────────────────────────────────────────────

  cambiarIdeal(f: FichaProducto, valor: string): void {
    f.ideal = valor;
    this.avisar();
  }

  datoDe(f: FichaProducto, k: number): string {
    return (f.datos || [])[k] || "";
  }

  cambiarDato(f: FichaProducto, k: number, valor: string): void {
    const datos = [0, 1, 2].map((i) => (i === k ? valor : this.datoDe(f, i)));
    f.datos = datos;
    this.avisar();
  }

  cambiarPaso(f: FichaProducto, k: number, valor: string): void {
    const pasos = (f.pasos || []).slice();
    pasos[k] = valor;
    f.pasos = pasos;
    this.avisar();
  }

  agregarPaso(f: FichaProducto): void {
    const texto = this.nuevoPaso.trim();
    if (!texto || (f.pasos || []).length >= this.topes.pasos || !this.puedeDetalle(f)) return;
    f.pasos = [...(f.pasos || []), texto.slice(0, this.topes.paso)];
    this.nuevoPaso = "";
    this.avisar();
  }

  moverPaso(f: FichaProducto, k: number, dir: -1 | 1): void {
    const pasos = (f.pasos || []).slice();
    const destino = k + dir;
    if (destino < 0 || destino >= pasos.length) return;
    [pasos[k], pasos[destino]] = [pasos[destino], pasos[k]];
    f.pasos = pasos;
    this.avisar();
  }

  quitarPaso(f: FichaProducto, k: number): void {
    f.pasos = (f.pasos || []).filter((_, i) => i !== k);
    this.avisar();
  }

  cambiarPregunta(q: PreguntaFicha, campo: keyof PreguntaFicha, valor: string): void {
    q[campo] = valor;
    this.avisar();
  }

  agregarPregunta(f: FichaProducto): void {
    const q = this.nuevaPregunta;
    const pregunta = String(q.pregunta || "").trim();
    const respuesta = String(q.respuesta || "").trim();
    if (!pregunta || !respuesta || (f.preguntas || []).length >= this.topes.preguntas || !this.puedeDetalle(f)) return;
    const nueva: PreguntaFicha = { pregunta: pregunta.slice(0, this.topes.pregunta), respuesta: respuesta.slice(0, this.topes.respuesta) };
    if (q.asesor) nueva.asesor = q.asesor;
    if (q.fecha) nueva.fecha = q.fecha;
    f.preguntas = [...(f.preguntas || []), nueva];
    this.nuevaPregunta = this.preguntaVacia();
    this.avisar();
  }

  quitarPregunta(f: FichaProducto, k: number): void {
    f.preguntas = (f.preguntas || []).filter((_, i) => i !== k);
    this.avisar();
  }

  /**
   * Confirmar una promesa la deja publicar, igual que «Confirma lo que promete tu sitio» al publicar. No repite una que
   * ya está, y al llegar a 40 avisa en vez de borrar en silencio las más viejas (que pueden ser las de otras páginas).
   */
  confirmarPromesa(texto: string): void {
    const t = this.tienda;
    if (!t) return;
    const actuales: string[] = (t.promesasConfirmadas || []).slice();
    if (actuales.some((c) => clavePromesa(c) === clavePromesa(texto))) return;
    if (actuales.length >= MAX_CONFIRMADAS) {
      this.toastr.warning(
        `Ya confirmaste ${MAX_CONFIRMADAS} frases, el máximo. Cambia esta frase por una que no prometa condiciones, o quita otra de la lista de promesas confirmadas.`
      );
      return;
    }
    t.promesasConfirmadas = [...actuales, texto];
    this.avisar();
  }

  /** La fecha nace vacía: la página solo muestra la fecha que el comercio puso (no la de hoy por defecto). */
  private preguntaVacia(): PreguntaFicha {
    return { pregunta: "", respuesta: "", asesor: "", fecha: "" };
  }

  // ── Quién responde ────────────────────────────────────────────────────────────────────────────────────────────

  agregarAsesor(): void {
    const t = this.tienda;
    const nombre = this.nuevoAsesor.trim();
    if (!t || !nombre || this.asesores.length >= this.topes.asesores) return;
    const id = idDeAsesor(nombre, this.asesores.map((a) => a.id));
    t.asesores = [...this.asesores, { id, nombre: nombre.slice(0, this.topes.nombre) }];
    this.nuevoAsesor = "";
    this.avisar();
  }

  cambiarAsesor(a: AsesorTienda, campo: "nombre" | "especialidad", valor: string): void {
    a[campo] = valor;
    this.avisar();
  }

  alternarAutorizado(a: AsesorTienda): void {
    a.autorizado = !a.autorizado;
    this.avisar();
  }

  async quitarAsesor(a: AsesorTienda): Promise<void> {
    const t = this.tienda;
    if (!t) return;
    const usadas = this.fichas.reduce((n, f) => n + (f.preguntas || []).filter((q) => q.asesor === a.id).length, 0);
    if (usadas) {
      const r = await Swal.fire({
        title: "¿Quitar a quien respondió?",
        text: `Firmó ${usadas} respuesta${usadas === 1 ? "" : "s"}. Seguirán publicadas como «Un técnico de ${this.negocio}».`,
        showCancelButton: true,
        confirmButtonText: "Sí, quitar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#5F3FE0",
      });
      if (!r.isConfirmed) return;
    }
    t.asesores = this.asesores.filter((x) => x.id !== a.id);
    this.fichas.forEach((f) => (f.preguntas || []).forEach((q) => {
      if (q.asesor === a.id) q.asesor = "";
    }));
    this.avisar();
  }

  subirFoto(evento: Event, a: AsesorTienda): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input && input.files && input.files[0];
    if (!archivo) return;
    this.subiendoFoto = a.id;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendoFoto = "";
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la foto.");
          return;
        }
        a.foto = res.url;
        this.avisar();
      },
      error: () => {
        this.subiendoFoto = "";
        input.value = "";
        this.toastr.error("No pudimos subir la foto.");
      },
    });
  }

  quitarFoto(a: AsesorTienda): void {
    a.foto = "";
    this.avisar();
  }
}
