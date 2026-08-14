import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MetricasSitio, SitiosService } from "../sitios.service";

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

  constructor(private service: SitiosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (!this.siteId) {
      this.cargando = false;
      this.error = "No sabemos de qué página.";
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
    this.cargar();
  }

  /** Alto de cada barra, en porcentaje del día más movido. */
  altura(dia: { vista: number }): number {
    const max = this.maxVistas;
    if (!max) return 0;
    // Un mínimo visible: un día con una sola visita no debe verse como cero.
    return Math.max(3, Math.round((dia.vista / max) * 100));
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

  dinero(valor: number): string {
    return (valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  }
}
