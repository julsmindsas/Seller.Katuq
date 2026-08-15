import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PromocionesService, PromocionPublica } from "../../shared/services/promociones.service";

/**
 * Landing de campaña — `/promo/:codigo`
 *
 * Es la página a la que llega la pauta. Pública por diseño: quien la abre
 * todavía no tiene cuenta.
 *
 * Si el código está vivo, muestra el beneficio y manda al registro con el código
 * guardado. Si no lo está, no deja a nadie en una pantalla muerta: explica que
 * la promoción no está disponible y ofrece el registro normal.
 */
@Component({
  selector: "app-promo-campana",
  templateUrl: "./promo-campana.component.html",
  styleUrls: ["./promo-campana.component.scss"],
})
export class PromoCampanaComponent implements OnInit {
  cargando = true;
  disponible = false;
  promocion: PromocionPublica | null = null;
  codigo = "";

  constructor(
    private ruta: ActivatedRoute,
    private router: Router,
    private promociones: PromocionesService,
  ) {}

  ngOnInit(): void {
    this.codigo = (this.ruta.snapshot.paramMap.get("codigo") || "").toUpperCase();

    if (!this.codigo) {
      this.cargando = false;
      this.disponible = false;
      return;
    }

    this.promociones.validarCodigo(this.codigo).subscribe({
      next: (respuesta) => {
        this.disponible = !!respuesta.disponible;
        this.promocion = respuesta.promocion || null;
        this.cargando = false;
      },
      error: () => {
        // Nunca se promete un beneficio que el registro no vaya a poder cumplir.
        this.disponible = false;
        this.cargando = false;
      },
    });
  }

  /** Guarda el código y arranca el registro. */
  empezar(): void {
    if (this.disponible && this.promocion) {
      this.promociones.guardarCodigoPendiente(this.promocion.codigo);
    }
    this.router.navigate(["/registrarse"]);
  }

  /** Registro normal, sin promoción. */
  irAlRegistroNormal(): void {
    this.promociones.limpiarCodigoPendiente();
    this.router.navigate(["/registrarse"]);
  }
}
