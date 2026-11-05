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
  hoyColombia,
  idDeAsesor,
  primeraImagen,
  promesaSinConfirmar,
  tieneDetalle,
} from "./fichas-datos";

/** Lo que el panel muestra de un producto con ficha (nombre y foto, de referencia). */
interface ProductoDeFicha {
  titulo: string;
  imagen: string | null;
}

/**
 * Tienda › Fichas de producto (PLAN-V2 T08): para qué sirve cada producto y lo que pregunta la gente, sin tocar el
 * producto en el catálogo (D-134). Lo pinta el módulo `ficha` del servidor, solo con el diseño nuevo:
 *  - «Ideal para» y hasta 3 datos clave, en la tarjeta del producto y bajo el título de su ficha;
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
  /** El selector de productos está abierto. */
  eligiendo = false;
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
    this.cargarProductos(this.fichas.map((f) => f.productoId));
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

  get confirmadas(): string[] {
    const t = this.tienda;
    return (t && t.promesasConfirmadas) || [];
  }

  /** En la página va el nombre comercial de la empresa (del maestro); el editor no lo tiene a mano. */
  readonly negocio = "tu negocio";

  get conDetalle(): number {
    return this.fichas.filter((f) => tieneDetalle(f)).length;
  }

  /** ¿Esta ficha puede sumar pasos o preguntas sin pasar el tope de 40? */
  puedeDetalle(f: FichaProducto): boolean {
    return tieneDetalle(f) || this.conDetalle < this.topes.conDetalle;
  }

  get fichasVisibles(): FichaProducto[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.fichas;
    return this.fichas.filter((f) => (this.tituloDe(f.productoId) + " " + (f.ideal || "")).toLowerCase().includes(q));
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
      f.ideal ? `Ideal para ${f.ideal}` : "Sin «Ideal para»",
      (f.pasos || []).length ? `${f.pasos!.length} paso${f.pasos!.length === 1 ? "" : "s"}` : "",
      (f.preguntas || []).length ? `${f.preguntas!.length} pregunta${f.preguntas!.length === 1 ? "" : "s"}` : "",
    ];
    return partes.filter(Boolean).join(" · ");
  }

  nombreDeAsesor(id: string | undefined): string {
    const a = this.asesores.find((x) => x.id === id);
    return a ? a.nombre || a.especialidad || "Sin nombre" : "";
  }

  /** Lo que se lee en la página como quien responde. */
  comoSeLee(a: AsesorTienda): string {
    return a.autorizado && a.nombre ? a.nombre : `Un técnico de ${this.negocio}`;
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

  private cargarProductos(ids: string[]): void {
    const faltan = ids.filter((id) => id && !this.productos[id]);
    if (!faltan.length) return;
    this.cargandoProductos = true;
    this.service.productosPorIds(faltan).subscribe({
      next: (res) => {
        this.cargandoProductos = false;
        for (const p of (res && res.products) || []) {
          const crear: any = p.crearProducto || {};
          this.productos[p.cd] = { titulo: crear.titulo || "Sin nombre", imagen: primeraImagen(crear) };
        }
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
    this.cargarProductos(elegidos);
    const nueva = elegidos.find((id) => !porId.has(id));
    if (nueva) this.abrir(nueva);
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

  /** Confirmar una promesa la deja publicar, igual que «Confirma lo que promete tu sitio» al publicar. */
  confirmarPromesa(texto: string): void {
    const t = this.tienda;
    if (!t) return;
    t.promesasConfirmadas = [...(t.promesasConfirmadas || []), texto].slice(-40);
    this.avisar();
  }

  private preguntaVacia(): PreguntaFicha {
    return { pregunta: "", respuesta: "", asesor: "", fecha: hoyColombia() };
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
