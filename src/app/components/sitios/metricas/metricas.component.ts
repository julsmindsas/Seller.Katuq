import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ContactoSitio, FilaOrigen, MetricasKai, MetricasSitio, SitiosService } from "../sitios.service";

/**
 * Qué está pasando en una página publicada.
 *
 * Los eventos se venían guardando desde el primer día y nadie los leía: el
 * comerciante publicaba y compartía el enlace sin saber si alguien entraba.
 *
 * La gráfica es de barras hechas con divs, sin librería: son treinta valores y
 * meter una dependencia de gráficos en un módulo que se descarga en celular no
 * se paga con lo que aporta.
 */
@Component({
  selector: "app-metricas",
  templateUrl: "./metricas.component.html",
  styleUrls: ["./metricas.component.scss"],
})
export class MetricasComponent implements OnInit {
  @Input() siteId = "";
  @Input() nombre = "";

  @Output() cerrar = new EventEmitter<void>();

  cargando = true;
  error: string | null = null;
  datos: MetricasSitio | null = null;

  rangos = [
    { dias: 7, nombre: "7 días" },
    { dias: 30, nombre: "30 días" },
    { dias: 90, nombre: "90 días" },
  ];
  rango = 30;

  /** Quién dejó sus datos. No depende del rango: es la lista para trabajar. */
  contactos: ContactoSitio[] = [];
  filtroContactos: "todos" | ContactoSitio["tipo"] = "todos";

  constructor(private service: SitiosService) {}

  /** Plan gratis (D-319): el servidor solo deja ver el día. */
  get soloHoy(): boolean {
    return !!this.datos && this.datos.diasPermitidos === 1;
  }

  /** Bloque «KAI»: carga y falla aparte, para no tumbar el resto de la ventana. */
  kai: MetricasKai | null = null;
  kaiCargando = true;
  kaiError = false;

  get kaiVacio(): boolean {
    const k = this.kai;
    return !!k && !(k.pedidos || k.pagosRecuperados || k.citas || k.cotizaciones || k.ventasTiendaAsistidas);
  }

  /** ¿Esa cifra aún no se mide (nadie escribe su marca)? Entonces no es un 0 real. */
  kaiPendiente(cifra: string): boolean {
    return !!this.kai && Array.isArray(this.kai.pendientes) && this.kai.pendientes.includes(cifra);
  }

  cargarKai(): void {
    this.kaiCargando = true;
    this.kaiError = false;
    this.service.metricasKai(this.rango).subscribe({
      next: (res) => {
        this.kaiCargando = false;
        this.kai = res && res.success && res.data ? res.data : null;
        this.kaiError = !this.kai;
      },
      error: () => {
        this.kaiCargando = false;
        this.kai = null;
        this.kaiError = true;
      },
    });
  }

  ngOnInit(): void {
    this.cargarKai();
    this.cargar();
    this.cargarContactos();
  }

  cargarContactos(): void {
    if (!this.siteId) return;
    this.service.contactos(this.siteId).subscribe({
      next: (res) => (this.contactos = (res && res.success && res.data && res.data.contactos) || []),
      // Sin la lista, las métricas siguen sirviendo: no se muestra error.
      error: () => (this.contactos = []),
    });
  }

  get contactosVisibles(): ContactoSitio[] {
    return this.filtroContactos === "todos"
      ? this.contactos
      : this.contactos.filter((c) => c.tipo === this.filtroContactos);
  }

  cuantos(tipo: ContactoSitio["tipo"]): number {
    return this.contactos.filter((c) => c.tipo === tipo).length;
  }

  etiquetaContacto(c: ContactoSitio): string {
    if (c.tipo === "carrito-abandonado") {
      return c.carrito && c.carrito.estado === "comprado" ? "Compró" : "Dejó el carrito";
    }
    if (c.tipo === "boletin") return "Boletín";
    return c.tipo === "avisame-stock" ? "Avísame" : "Te escribió";
  }

  /**
   * WhatsApp con el mensaje ya escrito, según por qué dejó sus datos. Un
   * celular colombiano de 10 dígitos sale con su 57.
   */
  enlaceWhatsapp(c: ContactoSitio): string {
    let tel = (c.telefono || "").replace(/\D/g, "");
    if (/^3\d{9}$/.test(tel)) tel = `57${tel}`;
    if (tel.length < 10) return "";
    const nombre = (c.nombre || "").split(" ")[0];
    const tienda = this.nombre || (this.datos && this.datos.sitio.nombre) || "la tienda";
    const saludo = `Hola${nombre ? ` ${nombre}` : ""}, te escribo de ${tienda}.`;
    const motivo =
      c.tipo === "carrito-abandonado"
        ? " Vi que dejaste unos productos en tu carrito. ¿Te ayudo a terminar tu pedido?"
        : c.tipo === "avisame-stock"
        ? " Nos pediste que te avisáramos: ya tenemos de nuevo el producto que buscabas."
        : c.tipo === "boletin"
        ? " Gracias por suscribirte a nuestras novedades."
        : " Recibimos tu mensaje, ¿en qué te podemos ayudar?";
    return `https://wa.me/${tel}?text=${encodeURIComponent(saludo + motivo)}`;
  }

  fechaCorta(iso: string): string {
    const t = Date.parse(iso || "");
    if (!Number.isFinite(t)) return "";
    return new Date(t).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
  }

  cargar(): void {
    if (!this.siteId) {
      this.cargando = false;
      this.error = "No sabemos de qué sitio.";
      return;
    }
    this.cargando = true;
    this.error = null;

    this.service.metricas(this.siteId, this.rango).subscribe({
      next: (res) => {
        this.cargando = false;
        if (!res || !res.success || !res.data) {
          this.error = "No pudimos leer las métricas.";
          return;
        }
        this.datos = res.data;
      },
      error: () => {
        this.cargando = false;
        this.error = "No pudimos leer las métricas.";
      },
    });
  }

  cambiarRango(dias: number): void {
    if (this.rango === dias) return;
    this.rango = dias;
    this.cargarKai();
    this.cargar();
  }

  /** Alto de cada barra, en porcentaje del día más movido. */
  altura(dia: { vista: number }): number {
    const max = this.maxVistas;
    if (!max) return 0;
    // Un mínimo visible: un día con una sola visita no debe verse como cero.
    return Math.max(3, Math.round((dia.vista / max) * 100));
  }

  /** Nombres con cara humana para el vocabulario cerrado de fuentes. */
  etiquetaFuente(fuente: string): string {
    const nombres: { [f: string]: string } = {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      google: "Google",
      youtube: "YouTube",
      email: "Correo",
      directo: "Directo (link o favorito)",
      "campaña": "Tus campañas",
      "otro-sitio": "Otros sitios web",
      "sin dato": "Sin dato (de antes de medir)",
    };
    return nombres[fuente] || fuente;
  }

  /** Ancho de la barra de una fuente, relativo a la más grande. */
  anchoFuente(vistas: number): number {
    const lista = (this.datos && this.datos.fuentes) || [];
    const max = lista.length ? lista[0].vistas : 0;
    return max > 0 ? Math.max(4, Math.round((vistas / max) * 100)) : 0;
  }

  get maxVistas(): number {
    if (!this.datos) return 0;
    return this.datos.serie.reduce((m, d) => Math.max(m, d.vista), 0);
  }

  get hayTrafico(): boolean {
    return !!this.datos && this.datos.totales.vista > 0;
  }

  /** Etiqueta corta para el eje: "12 ago". */
  etiquetaDia(dia: string): string {
    const [, mes, d] = dia.split("-");
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${Number(d)} ${meses[Number(mes) - 1] || ""}`;
  }

  /** Solo se etiquetan algunos días, o el eje queda ilegible. */
  mostrarEtiqueta(i: number): boolean {
    if (!this.datos) return false;
    const cada = this.datos.serie.length > 45 ? 15 : this.datos.serie.length > 14 ? 7 : 2;
    return i % cada === 0 || i === this.datos.serie.length - 1;
  }

  /** Ticket 1239: fuentes con visitas o pedidos en el período. */
  get filasOrigen(): FilaOrigen[] {
    return ((this.datos && this.datos.porFuente) || []).filter((f) => f.vistas > 0 || f.pedidos > 0);
  }

  /** Ticket 1239: hay al menos un pedido con fuente en el período. */
  get hayVentasConFuente(): boolean {
    return this.filasOrigen.some((f) => f.pedidos > 0);
  }

  /** Ticket 1239: pedidos y ventas de una campaña, si los hay. */
  ventasDeCampana(campana: string): FilaOrigen | null {
    return ((this.datos && this.datos.porCampana) || []).find((c) => c.utm_campaign === campana && c.pedidos > 0) || null;
  }

  porcentaje(valor: number | null): string {
    return valor === null ? "—" : `${valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
  }

  /** Ticket 1239: la tabla para abrir en Excel (CSV con BOM, separado por punto y coma). */
  descargarOrigenes(): void {
    const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const filas = [["Fuente", "Ventas", "Pedidos", "Visitas", "Conversión %", "Ticket promedio"]].concat(
      this.filasOrigen.map((f) => [
        this.etiquetaFuente(f.fuente || ""), String(f.ventas), String(f.pedidos), String(f.vistas),
        f.conversion === null ? "" : String(f.conversion).replace(".", ","), f.ticketPromedio === null ? "" : String(f.ticketPromedio),
      ])
    );
    const csv = "﻿" + filas.map((r) => r.map(celda).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-por-fuente-${(this.datos && this.datos.sitio.slug) || "pagina"}-${this.rango}-dias.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  dinero(valor: number): string {
    return (valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  }
}
