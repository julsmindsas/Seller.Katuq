import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { KitDeMarca, SitiosService } from "../sitios.service";

/** Paletas de arranque, por si el logo no da colores utilizables. */
const PALETAS_BASE = [
  { nombre: "Violeta", colorPrimario: "#6a4dfb", colorSecundario: "#ffffff", colorTexto: "#211d33" },
  { nombre: "Rosa", colorPrimario: "#e8478f", colorSecundario: "#fff8fb", colorTexto: "#2b1a24" },
  { nombre: "Verde", colorPrimario: "#1f9d68", colorSecundario: "#f7fbf8", colorTexto: "#12261c" },
  { nombre: "Negro", colorPrimario: "#211d33", colorSecundario: "#faf9f7", colorTexto: "#211d33" },
];

const SECTORES = [
  { id: "moda", nombre: "Moda y ropa" },
  { id: "belleza", nombre: "Belleza y cuidado" },
  { id: "alimentos", nombre: "Alimentos" },
  { id: "restaurantes", nombre: "Restaurante" },
  { id: "regalos", nombre: "Regalos y detalles" },
  { id: "hogar", nombre: "Hogar y decoración" },
  { id: "tecnologia", nombre: "Tecnología" },
  { id: "servicios", nombre: "Servicios" },
  { id: "general", nombre: "Otro" },
];

const TONOS = [
  { id: "cercano", nombre: "Cercano", pista: "Como le hablas a un vecino" },
  { id: "profesional", nombre: "Profesional", pista: "Serio y directo" },
  { id: "divertido", nombre: "Divertido", pista: "Suelto y con chispa" },
  { id: "elegante", nombre: "Elegante", pista: "Cuidado y sobrio" },
  { id: "directo", nombre: "Directo", pista: "Al grano, sin adornos" },
];

/**
 * Kit de marca del comercio: logo, colores, letra, tono y sector.
 *
 * Vive a nivel de EMPRESA, no de sitio: se llena una vez y lo heredan todas las
 * páginas que cree. Por eso el logo del encabezado no se guarda en el bloque —
 * cambiarlo aquí lo cambia en todo lo publicado.
 *
 * Se usa como modal desde la lista de páginas y desde el asistente de creación,
 * para que nadie tenga que interrumpir lo que está haciendo para ir a
 * configurar su marca.
 */
@Component({
  selector: "app-marca",
  templateUrl: "./marca.component.html",
  styleUrls: ["./marca.component.scss"],
})
export class MarcaComponent implements OnInit {
  /** Texto del botón de cierre; el asistente lo usa como "Continuar". */
  @Input() textoGuardar = "Guardar mi marca";

  @Output() guardado = new EventEmitter<KitDeMarca>();
  @Output() cerrar = new EventEmitter<void>();

  cargando = true;
  guardando = false;
  subiendo = false;

  kit: KitDeMarca = {
    logo: "",
    colorPrimario: "",
    colorSecundario: "",
    colorTexto: "",
    tipografia: "sistema",
    tono: "cercano",
    sector: "",
    eslogan: "",
  };

  /** Colores sacados del logo. Vacío hasta que haya un logo legible. */
  sugeridos: string[] = [];

  paletasBase = PALETAS_BASE;
  sectores = SECTORES;
  tonos = TONOS;

  constructor(private service: SitiosService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.service.kitDeMarca().subscribe({
      next: (res) => {
        this.cargando = false;
        if (res && res.data) {
          this.kit = { ...this.kit, ...res.data };
          if (this.kit.logo) this.extraerColores(this.kit.logo);
        }
      },
      error: () => {
        this.cargando = false;
        this.toastr.error("No pudimos cargar tu marca.");
      },
    });
  }

  get nombreComercial(): string {
    return this.kit.nombreComercial || "tu negocio";
  }

  // ── Logo ───────────────────────────────────────────────────────────────────

  subirLogo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;

    this.subiendo = true;
    this.service.subirImagen(archivo, "Marca").subscribe({
      next: (res) => {
        this.subiendo = false;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir el logo.");
          return;
        }
        this.kit.logo = res.url;
        this.extraerColores(res.url);
      },
      error: (e) => {
        this.subiendo = false;
        input.value = "";
        this.toastr.error((e && e.error && e.error.error) || "No pudimos subir el logo.");
      },
    });
  }

  quitarLogo(): void {
    this.kit.logo = "";
    this.sugeridos = [];
  }

  /**
   * Saca los colores dominantes del logo con un canvas, en el navegador.
   *
   * El comerciante llega con su logo, no con códigos hexadecimales: pedirle que
   * escriba "#6a4dfb" es pedirle algo que no sabe. Se agrupan los píxeles en
   * cubos gruesos para que variaciones del mismo tono cuenten como uno, y se
   * descartan los casi blancos, los casi negros y los grises, que son fondo y
   * contorno, no color de marca.
   *
   * Si la imagen no deja leerse (otro origen sin CORS), simplemente no hay
   * sugerencias y quedan las paletas de siempre.
   */
  private extraerColores(url: string): void {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const lado = 64; // suficiente para el color, barato de procesar
        const lienzo = document.createElement("canvas");
        lienzo.width = lado;
        lienzo.height = lado;
        const ctx = lienzo.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, lado, lado);

        const datos = ctx.getImageData(0, 0, lado, lado).data;
        const cubos = new Map<string, { n: number; r: number; g: number; b: number }>();

        for (let i = 0; i < datos.length; i += 4) {
          const r = datos[i];
          const g = datos[i + 1];
          const b = datos[i + 2];
          const alfa = datos[i + 3];
          if (alfa < 200) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max > 240 && min > 240) continue; // casi blanco
          if (max < 25) continue; // casi negro
          if (max - min < 18) continue; // gris: no dice nada de la marca

          const clave = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const previo = cubos.get(clave) || { n: 0, r: 0, g: 0, b: 0 };
          cubos.set(clave, { n: previo.n + 1, r: previo.r + r, g: previo.g + g, b: previo.b + b });
        }

        this.sugeridos = [...cubos.values()]
          .sort((a, b) => b.n - a.n)
          .slice(0, 5)
          .map((c) => this.aHex(c.r / c.n, c.g / c.n, c.b / c.n));
      } catch (e) {
        // Lienzo "sucio" por origen cruzado: no es un error del usuario.
        this.sugeridos = [];
      }
    };
    img.onerror = () => {
      this.sugeridos = [];
    };
    img.src = url;
  }

  private aHex(r: number, g: number, b: number): string {
    const dos = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${dos(r)}${dos(g)}${dos(b)}`;
  }

  // ── Paleta ─────────────────────────────────────────────────────────────────

  usarColorPrincipal(hex: string): void {
    this.kit.colorPrimario = hex;
    // El texto se decide solo: sobre un primario oscuro, texto oscuro no se lee.
    if (!this.kit.colorTexto) this.kit.colorTexto = "#211d33";
    if (!this.kit.colorSecundario) this.kit.colorSecundario = "#ffffff";
  }

  aplicarPaletaBase(p: (typeof PALETAS_BASE)[0]): void {
    this.kit.colorPrimario = p.colorPrimario;
    this.kit.colorSecundario = p.colorSecundario;
    this.kit.colorTexto = p.colorTexto;
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  guardar(): void {
    if (this.guardando) return;
    this.guardando = true;

    this.service.guardarKitDeMarca(this.kit).subscribe({
      next: (res) => {
        this.guardando = false;
        if (!res || !res.success) {
          this.toastr.error((res && res.message) || "No pudimos guardar tu marca.");
          return;
        }
        // Se devuelve lo que respondió el servidor, ya normalizado: si algún
        // campo se descartó, quien nos escucha ve el valor real, no el que
        // mandamos.
        const guardado = { ...this.kit, ...(res.data || {}) };
        this.kit = guardado;
        this.toastr.success("Tu marca quedó guardada");
        this.guardado.emit(guardado);
      },
      error: (e) => {
        this.guardando = false;
        this.toastr.error((e && e.error && e.error.error) || "No pudimos guardar tu marca.");
      },
    });
  }
}
