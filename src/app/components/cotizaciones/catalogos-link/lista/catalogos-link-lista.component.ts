import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { CatalogosLinkService } from "../catalogos-link.service";
import { CatalogoLink, EstadoCatalogo } from "../catalogo-link.modelos";
import { ETIQUETA_ESTADO, estadoCatalogo } from "../catalogo-link.reglas";
import { mensajeDeError } from "../catalogo-link.errores";

interface FilaCatalogo {
  catalogo: CatalogoLink;
  estado: EstadoCatalogo;
  productos: number;
}

/** Lista de catálogos por link de la empresa (D-416). */
@Component({
  selector: "app-catalogos-link-lista",
  templateUrl: "./catalogos-link-lista.component.html",
  styleUrls: ["./catalogos-link-lista.component.scss"],
})
export class CatalogosLinkListaComponent implements OnInit {
  filas: FilaCatalogo[] = [];
  cargando = false;
  error = "";

  readonly etiqueta = ETIQUETA_ESTADO;

  constructor(private service: CatalogosLinkService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = "";
    this.service.listar().subscribe({
      next: (res) => {
        this.cargando = false;
        this.filas = (res.data || []).map((c) => ({
          catalogo: c,
          estado: estadoCatalogo(c),
          productos: (c.productoIds || []).length,
        }));
      },
      error: (err) => {
        this.cargando = false;
        this.error = mensajeDeError(err, "No pudimos traer tus catálogos. Intenta de nuevo en un momento.");
      },
    });
  }

  nuevo(): void {
    this.router.navigate(["/cotizaciones/catalogos/nuevo"]);
  }

  abrir(fila: FilaCatalogo): void {
    this.router.navigate(["/cotizaciones/catalogos", fila.catalogo.id]);
  }
}
