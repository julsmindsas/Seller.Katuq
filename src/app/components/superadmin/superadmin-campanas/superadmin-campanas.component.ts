import { Component, OnInit } from "@angular/core";
import { PromocionesService, Campana, ResultadoCampana } from "../../../shared/services/promociones.service";
import { ToastrService } from "ngx-toastr";

/**
 * Campañas de pauta — `superadmin/campanas`
 *
 * Crear el código, definir cuánto premium regala, cuántos cupos tiene y hasta
 * cuándo vive; y ver cuántos registros trajo.
 *
 * Solo Katuq: el backend exige rol Super Administrador en todos los endpoints
 * menos el de validación pública.
 */
@Component({
  selector: "app-superadmin-campanas",
  templateUrl: "./superadmin-campanas.component.html",
  styleUrls: ["./superadmin-campanas.component.scss"],
})
export class SuperadminCampanasComponent implements OnInit {
  campanas: Campana[] = [];
  cargando = true;
  guardando = false;

  mostrarFormulario = false;
  editandoId: string | null = null;

  formulario = this.formularioVacio();

  /** Resultados por campaña, cargados a demanda. */
  resultados: { [id: string]: ResultadoCampana } = {};

  constructor(
    private promociones: PromocionesService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private formularioVacio() {
    return {
      codigo: "",
      nombre: "",
      descripcion: "",
      diasPremium: 120, // 4 meses: lo que Daniel prometió en el video de COLOMBIA2026
      cupoMaximo: 0,
      vigenteHasta: "",
      activo: true,
    };
  }

  cargar(): void {
    this.cargando = true;
    this.promociones.listarCampanas().subscribe({
      next: (campanas) => {
        this.campanas = campanas;
        this.cargando = false;
      },
      error: () => {
        this.toastr.error("No pudimos cargar las campañas");
        this.cargando = false;
      },
    });
  }

  nueva(): void {
    this.formulario = this.formularioVacio();
    this.editandoId = null;
    this.mostrarFormulario = true;
  }

  editar(campana: Campana): void {
    this.formulario = {
      codigo: campana.codigo,
      nombre: campana.nombre,
      descripcion: campana.descripcion,
      diasPremium: campana.diasPremium,
      cupoMaximo: campana.cupoMaximo,
      vigenteHasta: this.aFechaInput(campana.vigenteHasta),
      activo: campana.activo,
    };
    this.editandoId = campana.id;
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  guardar(): void {
    const datos: any = {
      codigo: (this.formulario.codigo || "").toUpperCase().trim(),
      nombre: this.formulario.nombre.trim(),
      descripcion: this.formulario.descripcion.trim(),
      diasPremium: Number(this.formulario.diasPremium),
      cupoMaximo: Number(this.formulario.cupoMaximo) || 0,
      vigenteHasta: this.formulario.vigenteHasta || null,
      activo: this.formulario.activo,
    };

    if (!datos.codigo || !datos.nombre || !datos.diasPremium) {
      this.toastr.warning("Código, nombre y días de premium son obligatorios");
      return;
    }

    this.guardando = true;
    const peticion = this.editandoId
      ? this.promociones.actualizarCampana(this.editandoId, datos)
      : this.promociones.crearCampana(datos);

    peticion.subscribe({
      next: () => {
        this.toastr.success(this.editandoId ? "Campaña actualizada" : "Campaña creada");
        this.guardando = false;
        this.mostrarFormulario = false;
        this.editandoId = null;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        const detalle = error?.error?.detalles?.join(". ") || error?.error?.error;
        this.toastr.error(detalle || "No pudimos guardar la campaña");
      },
    });
  }

  cambiarEstado(campana: Campana): void {
    const nuevoEstado = !campana.activo;
    this.promociones.cambiarEstado(campana.id, nuevoEstado).subscribe({
      next: () => {
        campana.activo = nuevoEstado;
        this.toastr.success(nuevoEstado ? "Campaña activada" : "Campaña desactivada");
      },
      error: () => this.toastr.error("No pudimos cambiar el estado"),
    });
  }

  verResultado(campana: Campana): void {
    this.promociones.resultadoCampana(campana.id).subscribe({
      next: (resultado) => (this.resultados[campana.id] = resultado),
      error: () => this.toastr.error("No pudimos cargar el resultado"),
    });
  }

  /**
   * El conteo llega hasta 30 s tarde: el servidor acumula las visitas en memoria
   * y las guarda por tandas para no escribir en Firestore en cada carga de la
   * página. Se dice en pantalla para que nadie crea que el contador está roto.
   */
  porcentaje(valor: number | null): string {
    return valor === null || valor === undefined ? "—" : `${valor}%`;
  }

  enlaceDeCampana(campana: Campana): string {
    return `${window.location.origin}/promo/${campana.codigo}`;
  }

  copiarEnlace(campana: Campana): void {
    const enlace = this.enlaceDeCampana(campana);
    navigator.clipboard.writeText(enlace).then(
      () => this.toastr.success("Enlace copiado"),
      () => this.toastr.warning(`Copia el enlace a mano: ${enlace}`),
    );
  }

  /** Timestamp de Firestore o ISO → 'YYYY-MM-DD' para el input date. */
  private aFechaInput(valor: any): string {
    if (!valor) return "";
    const fecha = valor._seconds ? new Date(valor._seconds * 1000) : new Date(valor);
    return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
  }

  fechaLegible(valor: any): string {
    if (!valor) return "Sin fecha límite";
    const fecha = valor._seconds ? new Date(valor._seconds * 1000) : new Date(valor);
    return isNaN(fecha.getTime()) ? "Sin fecha límite" : fecha.toLocaleDateString("es-CO");
  }
}
