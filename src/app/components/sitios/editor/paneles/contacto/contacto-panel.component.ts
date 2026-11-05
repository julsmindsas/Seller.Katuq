import { Component } from "@angular/core";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { PanelSitioBase } from "../panel-sitio-base";
import { NOMBRES_ICONO } from "../barras/barras-datos";
import {
  CANALES_CONTACTO,
  CanalContacto,
  PuntoConfianza,
  TOPES_CONTACTO,
  canalesOcultosDe,
  conPuntos,
  esNumeroDeRelleno,
  interesesDe,
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
 * Escribe en `bloque.datos`: `antetitulo`, `puntos[≤4]{icono, texto}`, `intereses[≤6]`, `respuesta`, `pedirEmpresa` y
 * `canalesOcultos`; y en `bloque.estilo.superficie` el fondo de la sección (Claro, Oscuro o Alterno). Nada se inventa: sin
 * puntos no sale ninguno, y un canal sin dato (WhatsApp, correo, horario) no sale.
 */
@Component({
  selector: "app-panel-contacto",
  templateUrl: "./contacto-panel.component.html",
  styleUrls: ["./contacto-panel.component.scss"],
})
export class ContactoPanelComponent extends PanelSitioBase {
  readonly topes = TOPES_CONTACTO;
  readonly canales = CANALES_CONTACTO;
  readonly iconos = ICONOS_SITIO.map((id) => ({ id, nombre: NOMBRES_ICONO[id] || id }));
  readonly trazos = TRAZOS_ICONO_SITIO;
  /** Para enlazar cada etiqueta con su campo (varios paneles pueden estar abiertos). */
  readonly uid = `cto-${Math.random().toString(36).slice(2, 8)}`;

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

  // ── ¿Qué necesitas? ───────────────────────────────────────────────────────────────────────────────────────────

  get intereses(): string[] {
    const fuente = this.datos.intereses;
    if (!this.cacheIntereses || this.cacheIntereses.fuente !== fuente) this.cacheIntereses = { fuente, lista: interesesDe(this.datos) };
    return this.cacheIntereses.lista;
  }
  private cacheIntereses: { fuente: any; lista: string[] } | null = null;

  cambiarInteres(k: number, valor: string): void {
    const lista = interesesDe(this.datos);
    if (lista[k] === undefined) return;
    lista[k] = valor;
    this.datos.intereses = lista;
    this.avisar();
  }

  agregarInteres(): void {
    const lista = interesesDe(this.datos);
    if (lista.length >= TOPES_CONTACTO.intereses) return;
    this.datos.intereses = [...lista, ""];
    this.avisar();
  }

  quitarInteres(k: number): void {
    const lista = interesesDe(this.datos);
    lista.splice(k, 1);
    this.datos.intereses = lista;
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
