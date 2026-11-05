import { Component, OnChanges, SimpleChanges } from "@angular/core";
import { anclaValida } from "../../anclas-inicio";
import { PanelSitioBase } from "../panel-sitio-base";
import { bloquesDeSuPagina } from "../tarjeta-solucion/tarjeta-solucion-datos";
import { anclaFijaDe, candidatasDeAncla, puedeTenerAncla, puedeTenerSuperficie } from "./ancla-superficie-datos";

/**
 * «Ancla» y «Tono del fondo» de cualquier sección del diseño nuevo, dentro de «Estilo de esta sección».
 *
 *  - Ancla (`estilo.ancla`): el nombre con que se enlaza la sección (`#preguntas`) desde el menú, la barra, el pie o un
 *    botón. Se pinta como el `id` de la sección en vez de `seccion-N`, que cambia al mover u ocultar un bloque. Solo
 *    pasa a `estilo.ancla` lo que el servidor guardaría (minúsculas, números y guiones, que no sea `seccion-N` ni un id
 *    que la página ya usa) y que ninguna otra sección de la página use; mientras se escribe, el borrador queda aparte.
 *  - Tono del fondo (`estilo.superficie`): Claro (el de la página), Alterno u Oscuro (el color de estructura del tema).
 *    Un fondo propio de la sección (color o foto) manda sobre el tono.
 *
 * Lo escribe en la sección, igual que el panel del plano, así que no hay dos formas de decir lo mismo: el plano y el
 * formulario traen los suyos en su panel y aquí no se ofrecen. Ninguna clase lleva «p-» (trampa de CSS global).
 */
@Component({
  selector: "app-ancla-superficie",
  templateUrl: "./ancla-superficie.component.html",
  styleUrls: ["./ancla-superficie.component.scss"],
})
export class AnclaSuperficieComponent extends PanelSitioBase implements OnChanges {
  readonly uid = `asup-${Math.random().toString(36).slice(2, 8)}`;
  /** Lo que se está escribiendo en el ancla; solo pasa a `estilo.ancla` cuando sirve (o queda vacío). */
  borradorAncla: string | null = null;

  ngOnChanges(cambios: SimpleChanges): void {
    // Otra sección: el borrador de la anterior no es suyo.
    if (cambios["bloque"] && !cambios["bloque"].firstChange && cambios["bloque"].previousValue !== cambios["bloque"].currentValue) {
      const antes: any = cambios["bloque"].previousValue;
      const ahora: any = cambios["bloque"].currentValue;
      if (!antes || !ahora || antes.id !== ahora.id) this.borradorAncla = null;
    }
  }

  private get estilo(): any {
    const b: any = this.bloque;
    if (!b) return {};
    if (!b.estilo) b.estilo = { fondo: "", fondoImagen: "", fondoVelo: 0, colorTexto: "", espaciado: "normal", ancho: "normal", alineacion: "" };
    return b.estilo;
  }

  // ── Qué se ofrece ───────────────────────────────────────────────────────────────────────────────────────────────

  get conAncla(): boolean {
    return puedeTenerAncla(this.bloque);
  }

  get conSuperficie(): boolean {
    return puedeTenerSuperficie(this.bloque);
  }

  /** El bloque trae un id fijo (`#contacto`): no lleva ancla propia, se enlaza con ese. */
  get anclaFija(): string {
    return anclaFijaDe(this.bloque);
  }

  // ── Superficie ──────────────────────────────────────────────────────────────────────────────────────────────────

  get superficie(): string {
    const b: any = this.bloque;
    return (b && b.estilo && b.estilo.superficie) || "";
  }

  get conEstructura(): boolean {
    return !!(this.contenido && this.contenido.tema && (this.contenido.tema as any).colorEstructura);
  }

  /** La sección tiene un color o una foto de fondo propios: mandan sobre el tono. */
  get fondoPropio(): boolean {
    const b: any = this.bloque;
    return !!(b && b.estilo && (b.estilo.fondo || b.estilo.fondoImagen));
  }

  elegirSuperficie(valor: "" | "alterna" | "estructura"): void {
    if ((this.superficie || "") === valor) return;
    this.estilo.superficie = valor;
    this.avisar();
  }

  // ── Ancla ───────────────────────────────────────────────────────────────────────────────────────────────────────

  get ancla(): string {
    const b: any = this.bloque;
    return (b && b.estilo && b.estilo.ancla) || "";
  }

  get anclaEnCampo(): string {
    return this.borradorAncla !== null ? this.borradorAncla : this.ancla;
  }

  /** Otra sección de esta página ya usa ese ancla (el servidor vacía la segunda). */
  anclaOcupada(valor: string): boolean {
    return bloquesDeSuPagina(this.contenido, this.bloque).some((b: any) => b && b !== this.bloque && b.estilo && b.estilo.ancla === valor);
  }

  ponerAncla(valor: string): void {
    const v = String(valor || "").trim().toLowerCase();
    this.borradorAncla = v;
    if (v && this.anclaOcupada(v)) return; // se avisa abajo; no se guarda un nombre repetido
    if (!v || anclaValida(v)) {
      if ((this.ancla || "") !== v) {
        this.estilo.ancla = v;
        this.avisar();
      }
    }
  }

  /** Al salir del campo: si lo escrito ya es la guardada, el borrador sobra; si no, queda a la vista con su aviso. */
  soltarAncla(): void {
    if (this.borradorAncla === null) return;
    if (!this.borradorAncla || (anclaValida(this.borradorAncla) && !this.anclaOcupada(this.borradorAncla))) this.borradorAncla = null;
  }

  get avisoAncla(): string {
    const a = this.anclaEnCampo;
    if (!a) return "";
    if (!anclaValida(a)) {
      const guardada = this.ancla && this.ancla !== a ? ` Mientras, sigue «${this.ancla}».` : "";
      return `Ese nombre no sirve: usa minúsculas, números y guiones («preguntas-frecuentes»), sin «seccion-» ni nombres que ya usa la página. No se guarda hasta que sirva.${guardada}`;
    }
    if (this.anclaOcupada(a)) return "Otra sección de esta página ya usa ese nombre: elige otro, o la página se lo quitaría a esta.";
    return "";
  }

  /** La primera candidata libre (del título o del tipo de la sección), solo si todavía no tiene ancla. */
  get anclaSugerida(): string {
    if (this.ancla) return "";
    return candidatasDeAncla(this.bloque).find((a) => !this.anclaOcupada(a)) || "";
  }

  usarSugerida(): void {
    const a = this.anclaSugerida;
    if (!a) return;
    this.ponerAncla(a);
    this.soltarAncla();
  }

  quitarAncla(): void {
    this.ponerAncla("");
    this.soltarAncla();
  }
}
