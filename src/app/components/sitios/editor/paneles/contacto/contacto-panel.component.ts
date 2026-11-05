import { Component } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { SitiosService } from "../../../sitios.service";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { PanelSitioBase } from "../panel-sitio-base";
import { NOMBRES_ICONO } from "../barras/barras-datos";
import {
  ANCHO_MINIMO_IMAGEN,
  CANALES_CONTACTO,
  CanalContacto,
  ModoContacto,
  NecesidadContacto,
  PuntoConfianza,
  TOPES_CONTACTO,
  canalesOcultosDe,
  conNecesidades,
  conPuntos,
  esNumeroDeRelleno,
  marcasDe,
  modoDe,
  necesidadesDe,
  numeroParaLeer,
  puntosDe,
  textoHorarioAtencion,
} from "./contacto-datos";

/**
 * «Contacto y cotización» del diseño nuevo (módulo `contacto` del servidor): el formulario de contacto o cotización con
 * una columna de confianza a la izquierda y una tarjeta con el formulario a la derecha. Extiende el bloque `formulario`:
 * sale debajo de sus campos de siempre (título, descripción, qué se pide, texto del botón y destino), solo con el diseño
 * nuevo encendido.
 *
 * Escribe en `bloque.datos`: `antetitulo`, `puntos[≤4]{icono, texto}`, `necesidades[≤6]{texto, detalle, icono}` (antes
 * `intereses`, que el servidor sigue leyendo), `respuesta`, `pedirEmpresa`, `canalesOcultos`, y los del cotizador por pasos:
 * `modo` («guiado»), `imagen`, `marcas[≤8]` y `pasos` (2 = sin paso de resumen); y en `bloque.estilo.superficie` el fondo de
 * la sección (Claro, Oscuro o Alterno). Nada se inventa: sin puntos no sale ninguno, sin marcas ni imagen tampoco, y un canal
 * sin dato (WhatsApp, correo, horario) no sale.
 */
@Component({
  selector: "app-panel-contacto",
  templateUrl: "./contacto-panel.component.html",
  styleUrls: ["./contacto-panel.component.scss"],
})
export class ContactoPanelComponent extends PanelSitioBase {
  readonly topes = TOPES_CONTACTO;
  readonly anchoMinimo = ANCHO_MINIMO_IMAGEN;
  readonly canales = CANALES_CONTACTO;
  readonly iconos = ICONOS_SITIO.map((id) => ({ id, nombre: NOMBRES_ICONO[id] || id }));
  readonly trazos = TRAZOS_ICONO_SITIO;
  /** Para enlazar cada etiqueta con su campo (varios paneles pueden estar abiertos). */
  readonly uid = `cto-${Math.random().toString(36).slice(2, 8)}`;
  /** Subiendo la imagen del cotizador, y el aviso si se queda corta. */
  subiendo = false;
  avisoImagen = "";

  constructor(private service: SitiosService, private toastr: ToastrService) {
    super();
  }

  get datos(): any {
    return (this.bloque && this.bloque.datos) || {};
  }

  private get estilo(): any {
    const b: any = this.bloque;
    if (!b) return {};
    if (!b.estilo) b.estilo = { fondo: "", fondoImagen: "", fondoVelo: 0, colorTexto: "", espaciado: "normal", ancho: "normal", alineacion: "" };
    return b.estilo;
  }

  private get tienda(): any {
    return (this.contenido && (this.contenido.tienda as any)) || {};
  }

  // ── Antetítulo y línea de respuesta ──────────────────────────────────────────────────────────────────────────

  get antetitulo(): string {
    return String(this.datos.antetitulo || "");
  }

  cambiarAntetitulo(valor: string): void {
    this.datos.antetitulo = valor;
    this.avisar();
  }

  get respuesta(): string {
    return String(this.datos.respuesta || "");
  }

  cambiarRespuesta(valor: string): void {
    this.datos.respuesta = valor;
    this.avisar();
  }

  // ── Puntos de confianza ───────────────────────────────────────────────────────────────────────────────────────

  /** Los puntos para la plantilla, armados una vez por versión de los datos. */
  get puntos(): PuntoConfianza[] {
    const fuente = this.datos.puntos;
    if (!this.cachePuntos || this.cachePuntos.fuente !== fuente) this.cachePuntos = { fuente, lista: puntosDe(this.datos) };
    return this.cachePuntos.lista;
  }
  private cachePuntos: { fuente: any; lista: PuntoConfianza[] } | null = null;

  cambiarPunto(k: number, campo: "texto" | "icono", valor: string): void {
    const lista = puntosDe(this.datos);
    if (!lista[k]) return;
    lista[k] = { ...lista[k], [campo]: valor };
    conPuntos(this.datos, lista);
    this.avisar();
  }

  agregarPunto(): void {
    const lista = puntosDe(this.datos);
    if (lista.length >= TOPES_CONTACTO.puntos) return;
    conPuntos(this.datos, [...lista, { icono: "", texto: "" }]);
    this.avisar();
  }

  quitarPunto(k: number): void {
    const lista = puntosDe(this.datos);
    lista.splice(k, 1);
    conPuntos(this.datos, lista);
    this.avisar();
  }

  moverPunto(k: number, paso: -1 | 1): void {
    const lista = puntosDe(this.datos);
    const j = k + paso;
    if (j < 0 || j >= lista.length) return;
    [lista[k], lista[j]] = [lista[j], lista[k]];
    conPuntos(this.datos, lista);
    this.avisar();
  }

  // ── Cómo se ve ────────────────────────────────────────────────────────────────────────────────────────────────

  get modo(): ModoContacto {
    return modoDe(this.datos);
  }

  get esGuiado(): boolean {
    return this.modo === "guiado";
  }

  elegirModo(modo: ModoContacto): void {
    if (modo === "guiado") this.datos.modo = "guiado";
    else delete this.datos.modo;
    this.avisar();
  }

  /** Con el resumen (por defecto), el cotizador tiene 3 pasos; sin él, el resumen sale al final, en el éxito. */
  get conResumen(): boolean {
    return this.datos.pasos !== 2;
  }

  alternarResumen(): void {
    if (this.conResumen) this.datos.pasos = 2;
    else delete this.datos.pasos;
    this.avisar();
  }

  // ── ¿Qué necesitas? ───────────────────────────────────────────────────────────────────────────────────────────

  get necesidades(): NecesidadContacto[] {
    const fuente = this.datos.necesidades && this.datos.necesidades.length ? this.datos.necesidades : this.datos.intereses;
    if (!this.cacheNecesidades || this.cacheNecesidades.fuente !== fuente) this.cacheNecesidades = { fuente, lista: necesidadesDe(this.datos) };
    return this.cacheNecesidades.lista;
  }
  private cacheNecesidades: { fuente: any; lista: NecesidadContacto[] } | null = null;

  cambiarNecesidad(k: number, campo: "texto" | "detalle" | "icono", valor: string): void {
    const lista = necesidadesDe(this.datos);
    if (!lista[k]) return;
    lista[k] = { ...lista[k], [campo]: valor };
    conNecesidades(this.datos, lista);
    this.avisar();
  }

  agregarNecesidad(): void {
    const lista = necesidadesDe(this.datos);
    if (lista.length >= TOPES_CONTACTO.intereses) return;
    conNecesidades(this.datos, [...lista, { texto: "", detalle: "", icono: "" }]);
    this.avisar();
  }

  quitarNecesidad(k: number): void {
    const lista = necesidadesDe(this.datos);
    lista.splice(k, 1);
    conNecesidades(this.datos, lista);
    this.avisar();
  }

  // ── Imagen del lado izquierdo (cotizador por pasos) ───────────────────────────────────────────────────────────

  get imagen(): string {
    return String(this.datos.imagen || "");
  }

  subirImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    this.subiendo = true;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = false;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        this.datos.imagen = res.url;
        this.avisoImagen = this.avisoDeTamano(Number(res.ancho), Number(res.alto));
        this.avisar();
      },
      error: () => {
        this.subiendo = false;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  /** Qué decir si la imagen se queda corta para la columna. "" si sirve o si el servidor no mandó las medidas. */
  avisoDeTamano(ancho: number, alto: number): string {
    if (!(ancho > 0) || !(alto > 0)) return "";
    if (ancho >= ANCHO_MINIMO_IMAGEN) return "";
    return `Esta imagen mide ${ancho}×${alto} px. La columna llega a unos 560 px de ancho: usa una de al menos ${ANCHO_MINIMO_IMAGEN} px para que no se vea borrosa.`;
  }

  quitarImagen(): void {
    delete this.datos.imagen;
    this.avisoImagen = "";
    this.avisar();
  }

  // ── Marcas en texto (cotizador por pasos) ─────────────────────────────────────────────────────────────────────

  get marcas(): string[] {
    const fuente = this.datos.marcas;
    if (!this.cacheMarcas || this.cacheMarcas.fuente !== fuente) this.cacheMarcas = { fuente, lista: marcasDe(this.datos) };
    return this.cacheMarcas.lista;
  }
  private cacheMarcas: { fuente: any; lista: string[] } | null = null;

  cambiarMarca(k: number, valor: string): void {
    const lista = marcasDe(this.datos);
    if (lista[k] === undefined) return;
    lista[k] = valor;
    this.datos.marcas = lista;
    this.avisar();
  }

  agregarMarca(): void {
    const lista = marcasDe(this.datos);
    if (lista.length >= TOPES_CONTACTO.marcas) return;
    this.datos.marcas = [...lista, ""];
    this.avisar();
  }

  quitarMarca(k: number): void {
    const lista = marcasDe(this.datos);
    lista.splice(k, 1);
    this.datos.marcas = lista;
    this.avisar();
  }

  // ── Qué se pide y qué canales salen ───────────────────────────────────────────────────────────────────────────

  get pideEmpresa(): boolean {
    return this.datos.pedirEmpresa === true;
  }

  alternarEmpresa(): void {
    this.datos.pedirEmpresa = !this.pideEmpresa;
    this.avisar();
  }

  canalVisible(c: CanalContacto): boolean {
    return !canalesOcultosDe(this.datos).includes(c);
  }

  alternarCanal(c: CanalContacto): void {
    const ocultos = canalesOcultosDe(this.datos);
    this.datos.canalesOcultos = ocultos.includes(c) ? ocultos.filter((x) => x !== c) : [...ocultos, c];
    this.avisar();
  }

  /** El WhatsApp que hoy tiene el sitio en un bloque de WhatsApp (el celular de la empresa, que también sirve, no se ve aquí). */
  get whatsappDelSitio(): string {
    const bloques: any[] = (this.contenido && (this.contenido.bloques as any[])) || [];
    const b = bloques.find((x) => x && x.tipo === "whatsapp" && x.visible !== false && x.datos && x.datos.telefono);
    const tel = b ? String(b.datos.telefono) : "";
    return tel && !esNumeroDeRelleno(tel) ? numeroParaLeer(tel) : "";
  }

  /** El horario de Tienda › Atención, si está activo. */
  get horarioDelSitio(): string {
    const a = this.tienda.atencion;
    return a && a.horario && a.horario.activo ? textoHorarioAtencion(a.horario) : "";
  }

  // ── Fondo de la sección ───────────────────────────────────────────────────────────────────────────────────────

  get superficie(): string {
    const b: any = this.bloque;
    return (b && b.estilo && b.estilo.superficie) || "";
  }

  get conEstructura(): boolean {
    return !!(this.contenido && this.contenido.tema && (this.contenido.tema as any).colorEstructura);
  }

  elegirSuperficie(valor: "" | "alterna" | "estructura"): void {
    this.estilo.superficie = valor;
    this.avisar();
  }

  porIndice(k: number): number {
    return k;
  }
}
