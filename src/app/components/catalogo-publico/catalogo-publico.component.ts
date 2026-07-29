import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  CatalogoPublicoProducto,
  CatalogoPublicoService,
  CatalogoPublicoView,
} from "./catalogo-publico.service";

interface LineaCarrito {
  producto: CatalogoPublicoProducto;
  cantidad: number;
}

/**
 * Vitrina pública de un catálogo (D-141). La abre el comprador desde el link
 * del vendedor, sin login.
 *
 * El total que se muestra es una referencia para que el comprador sepa en qué
 * orden de magnitud está: la cifra que vale es la de la cotización que calcula
 * el backend. Al enviar solo viajan producto y cantidad.
 */
@Component({
  selector: "app-catalogo-publico",
  templateUrl: "./catalogo-publico.component.html",
  styleUrls: ["./catalogo-publico.component.scss"],
})
export class CatalogoPublicoComponent implements OnInit {
  cargando = true;
  error: string | null = null;
  catalogo: CatalogoPublicoView | null = null;

  carrito: LineaCarrito[] = [];
  mostrandoCarrito = false;

  // Datos de contacto
  nombre = "";
  telefono = "";
  email = "";
  mensaje = "";

  enviando = false;
  errorEnvio: string | null = null;
  referencia: string | null = null;

  private token = "";

  constructor(
    private route: ActivatedRoute,
    private service: CatalogoPublicoService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") || "";
    if (!this.token) {
      this.cargando = false;
      this.error = "Este enlace no es válido.";
      return;
    }
    this.service.getPublico(this.token).subscribe({
      next: (r) => {
        this.catalogo = r?.data || null;
        this.cargando = false;
        if (!this.catalogo?.productos?.length) {
          this.error = "Este catálogo no tiene productos disponibles por ahora.";
        }
      },
      error: (e) => {
        this.cargando = false;
        // 404 es el caso normal de un catálogo apagado o vencido, no un fallo.
        this.error =
          e?.status === 404
            ? "Este catálogo ya no está disponible."
            : "No pudimos cargar el catálogo. Intenta de nuevo en un momento.";
      },
    });
  }

  // ── Carrito ────────────────────────────────────────────────────────────────

  cantidadDe(producto: CatalogoPublicoProducto): number {
    return this.carrito.find((l) => l.producto.productoId === producto.productoId)?.cantidad || 0;
  }

  agregar(producto: CatalogoPublicoProducto): void {
    const linea = this.carrito.find((l) => l.producto.productoId === producto.productoId);
    if (linea) {
      linea.cantidad++;
    } else {
      this.carrito.push({ producto, cantidad: 1 });
    }
  }

  quitar(producto: CatalogoPublicoProducto): void {
    const i = this.carrito.findIndex((l) => l.producto.productoId === producto.productoId);
    if (i === -1) return;
    if (this.carrito[i].cantidad > 1) {
      this.carrito[i].cantidad--;
    } else {
      this.carrito.splice(i, 1);
    }
  }

  vaciar(): void {
    this.carrito = [];
    this.mostrandoCarrito = false;
  }

  get totalItems(): number {
    return this.carrito.reduce((t, l) => t + l.cantidad, 0);
  }

  /** Estimado para orientar al comprador; la cifra oficial la calcula Katuq. */
  get totalEstimado(): number {
    return this.carrito.reduce((t, l) => t + l.producto.precioConIva * l.cantidad, 0);
  }

  get puedeEnviar(): boolean {
    const tieneContacto = !!this.telefono.trim() || !!this.email.trim();
    return !this.enviando && this.carrito.length > 0 && !!this.nombre.trim() && tieneContacto;
  }

  // ── Envío ──────────────────────────────────────────────────────────────────

  enviar(): void {
    if (!this.puedeEnviar) return;
    this.enviando = true;
    this.errorEnvio = null;
    this.service
      .enviarSolicitud(this.token, {
        nombre: this.nombre.trim(),
        telefono: this.telefono.trim() || undefined,
        email: this.email.trim() || undefined,
        mensaje: this.mensaje.trim() || undefined,
        // Solo producto y cantidad: ningún precio sale del navegador.
        items: this.carrito.map((l) => ({
          productoId: l.producto.productoId,
          cantidad: l.cantidad,
        })),
      })
      .subscribe({
        next: (r) => {
          this.enviando = false;
          if (r?.success) {
            this.referencia = r.data?.referencia || "";
            this.carrito = [];
          } else {
            this.errorEnvio = r?.message || "No pudimos registrar tu solicitud.";
          }
        },
        error: (e) => {
          this.enviando = false;
          this.errorEnvio =
            e?.error?.message || "No pudimos registrar tu solicitud. Intenta de nuevo.";
        },
      });
  }
}
