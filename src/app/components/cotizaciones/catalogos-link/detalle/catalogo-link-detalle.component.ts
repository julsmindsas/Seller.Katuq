import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { ToastrService } from "ngx-toastr";
import Swal from "sweetalert2";
import { CatalogosLinkService } from "../catalogos-link.service";
import { SitiosService } from "../../../sitios/sitios.service";
import { CatalogoLink, EstadoCatalogo, MAX_PRODUCTOS_CATALOGO, ProductoVitrina } from "../catalogo-link.modelos";
import {
  ETIQUETA_ESTADO,
  armarLink,
  cambiosCatalogo,
  catalogoVencido,
  diaLocal,
  estadoCatalogo,
  finDelDia,
} from "../catalogo-link.reglas";
import { mensajeDeError } from "../catalogo-link.errores";
import { imagenDeProducto, urlImagenAbsoluta, IMAGEN_PRODUCTO_POR_DEFECTO } from "../../../../shared/utils/imagen-producto";

/**
 * Crear y administrar un catálogo por link (D-416). Misma pantalla para `nuevo` y para uno
 * existente: los datos y los productos se editan en el mismo formulario; el link y el
 * interruptor de prendido solo existen una vez creado.
 *
 * Solo escribe en el catálogo (`/v1/catalogos`): productos, precios e inventario se leen.
 */
@Component({
  selector: "app-catalogo-link-detalle",
  templateUrl: "./catalogo-link-detalle.component.html",
  styleUrls: ["./catalogo-link-detalle.component.scss"],
})
export class CatalogoLinkDetalleComponent implements OnInit, OnDestroy {
  esNuevo = false;
  catalogo: CatalogoLink | null = null;

  cargando = false;
  error = "";
  guardando = false;
  generandoLink = false;
  cambiandoEstado = false;

  // Formulario
  nombre = "";
  descripcion = "";
  vence = "";
  productoIds: string[] = [];
  /** Productos para pintar, en el orden de `productoIds`. */
  productos: ProductoVitrina[] = [];
  resolviendoProductos = false;
  eligiendo = false;

  readonly maximo = MAX_PRODUCTOS_CATALOGO;
  readonly etiqueta = ETIQUETA_ESTADO;
  readonly hoy = diaLocal(new Date().toISOString());
  readonly imagenPorDefecto = IMAGEN_PRODUCTO_POR_DEFECTO;

  private destruir = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: CatalogosLinkService,
    private sitios: SitiosService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destruir)).subscribe((params) => {
      const id = params.get("id") || "";
      this.esNuevo = id === "nuevo";
      if (this.esNuevo) {
        this.catalogo = null;
        this.llenarFormulario(null);
      } else {
        this.cargar(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destruir.next();
    this.destruir.complete();
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  cargar(id = this.catalogo?.id || this.route.snapshot.paramMap.get("id") || ""): void {
    this.cargando = true;
    this.error = "";
    this.service.obtener(id).subscribe({
      next: (res) => {
        this.cargando = false;
        this.catalogo = res.data;
        this.llenarFormulario(res.data);
      },
      error: (err) => {
        this.cargando = false;
        this.error =
          err?.status === 404
            ? "Este catálogo no existe o es de otra empresa. Vuelve a la lista y ábrelo desde ahí."
            : mensajeDeError(err, "No pudimos abrir el catálogo. Intenta de nuevo en un momento.");
      },
    });
  }

  private llenarFormulario(cat: CatalogoLink | null): void {
    this.nombre = cat?.nombre || "";
    this.descripcion = cat?.descripcion || "";
    this.vence = diaLocal(cat?.fechaVencimiento);
    this.productoIds = [...(cat?.productoIds || [])];
    this.productos = this.ordenar(cat?.productos || [], this.productoIds);
  }

  /** El backend devuelve los productos en el orden en que los lee; se respeta el del catálogo. */
  private ordenar(productos: ProductoVitrina[], ids: string[]): ProductoVitrina[] {
    const porId = new Map(productos.map((p) => [p.productoId, p]));
    return ids.map((id) => porId.get(id)).filter(Boolean) as ProductoVitrina[];
  }

  // ── Estado y link ──────────────────────────────────────────────────────────

  get estado(): EstadoCatalogo | null {
    return this.catalogo ? estadoCatalogo(this.catalogo) : null;
  }

  get link(): string {
    return armarLink(this.catalogo?.publicToken, window.location.origin);
  }

  generarLink(): void {
    if (!this.catalogo) return;
    this.generandoLink = true;
    this.service.generarLink(this.catalogo.id).subscribe({
      next: (res) => {
        this.generandoLink = false;
        if (this.catalogo && res.data?.token) this.catalogo = { ...this.catalogo, publicToken: res.data.token };
      },
      error: (err) => {
        this.generandoLink = false;
        this.toastr.error(mensajeDeError(err, "No pudimos generar el link. Intenta de nuevo."));
      },
    });
  }

  copiarLink(): void {
    const link = this.link;
    if (!link) return;
    const avisar = () => this.toastr.success("Link copiado. Pégalo donde quieras compartirlo.");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(avisar, () => this.copiarConRespaldo(link, avisar));
    } else {
      this.copiarConRespaldo(link, avisar);
    }
  }

  private copiarConRespaldo(texto: string, avisar: () => void): void {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(campo);
    if (ok) avisar();
    else this.toastr.warning("No pudimos copiar solos. Selecciona el link y cópialo a mano.");
  }

  get linkWhatsapp(): string {
    const texto = `${this.catalogo?.nombre || "Mi catálogo"}: ${this.link}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  /** Apagar se confirma porque el link deja de abrir para todos los que lo tengan. */
  async alternarActivo(): Promise<void> {
    if (!this.catalogo || this.cambiandoEstado) return;
    const activo = !this.catalogo.activo;

    if (!activo) {
      const r = await Swal.fire({
        title: "¿Apagar este catálogo?",
        text: "El link deja de abrir para todos los que lo tengan. Puedes volver a prenderlo cuando quieras.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, apagar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#5F3FE0",
        reverseButtons: true,
      });
      if (!r.isConfirmed) return;
    }

    this.cambiandoEstado = true;
    this.service.editar(this.catalogo.id, { activo }).subscribe({
      next: () => {
        this.cambiandoEstado = false;
        if (!this.catalogo) return;
        this.catalogo = { ...this.catalogo, activo };
        if (activo && catalogoVencido(this.catalogo)) {
          this.toastr.warning("Quedó prendido, pero ya venció: cambia la fecha de vencimiento para que el link vuelva a abrir.");
        } else {
          this.toastr.success(activo ? "Catálogo prendido: el link ya abre." : "Catálogo apagado: el link ya no abre.");
        }
      },
      error: (err) => {
        this.cambiandoEstado = false;
        this.toastr.error(mensajeDeError(err, "No pudimos cambiar el estado. Intenta de nuevo."));
      },
    });
  }

  // ── Productos ──────────────────────────────────────────────────────────────

  get ocultos(): number {
    return this.productos.filter((p) => !p.disponible).length;
  }

  productosElegidos(ids: string[]): void {
    this.eligiendo = false;
    if (ids.length > this.maximo) {
      this.toastr.warning(`Un catálogo admite hasta ${this.maximo} productos.`);
      ids = ids.slice(0, this.maximo);
    }
    this.productoIds = ids;
    this.resolverProductos(ids);
  }

  quitarProducto(id: string): void {
    this.productoIds = this.productoIds.filter((x) => x !== id);
    this.productos = this.productos.filter((p) => p.productoId !== id);
  }

  /** Para pintar la selección antes de guardar; al guardar se relee del backend. */
  private resolverProductos(ids: string[]): void {
    const conocidos = new Map(this.productos.map((p) => [p.productoId, p]));
    const faltan = ids.filter((id) => !conocidos.has(id));
    if (!faltan.length) {
      this.productos = this.ordenar([...conocidos.values()], ids);
      return;
    }
    this.resolviendoProductos = true;
    this.sitios.productosPorIds(faltan).subscribe({
      next: (res) => {
        this.resolviendoProductos = false;
        (res.products || []).forEach((p: any) => conocidos.set(p.cd, this.aVitrina(p)));
        this.productos = this.ordenar([...conocidos.values()], ids);
      },
      error: () => {
        this.resolviendoProductos = false;
        this.productos = this.ordenar([...conocidos.values()], ids);
        this.toastr.warning("Quedaron elegidos, pero no pudimos mostrar su foto y precio. Se verán al guardar.");
      },
    });
  }

  /** Misma regla de disponibilidad que la vitrina (`utils/vitrinaProducto.js`). */
  private aVitrina(p: any): ProductoVitrina {
    const disp = p.disponibilidad || {};
    return {
      productoId: p.cd,
      titulo: p.crearProducto?.titulo || "Sin nombre",
      referencia: p.identificacion?.referencia || "",
      imagen: imagenDeProducto(p, ""),
      precioConIva: Number(p.precio?.precioUnitarioConIva || 0),
      disponible: disp.inventariable === false ? true : Number(disp.cantidadDisponible || 0) > 0,
    };
  }

  imagen(p: ProductoVitrina): string {
    return urlImagenAbsoluta(p.imagen) || this.imagenPorDefecto;
  }

  precio(valor: number | undefined): string {
    return (valor || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  get faltante(): string {
    if (!this.nombre.trim()) return "Ponle un nombre al catálogo.";
    if (!this.productoIds.length) return "Elige al menos un producto.";
    if (this.productoIds.length > this.maximo) return `Un catálogo admite hasta ${this.maximo} productos.`;
    return "";
  }

  private get cambios() {
    if (!this.catalogo) return {};
    return cambiosCatalogo(this.catalogo, {
      nombre: this.nombre,
      descripcion: this.descripcion,
      fechaVencimiento: finDelDia(this.vence),
      productoIds: this.productoIds,
    });
  }

  get hayCambios(): boolean {
    return this.esNuevo || Object.keys(this.cambios).length > 0;
  }

  get puedeGuardar(): boolean {
    return !this.guardando && !this.faltante && this.hayCambios;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.guardando = true;

    if (this.esNuevo) {
      this.service
        .crear({
          nombre: this.nombre.trim(),
          descripcion: this.descripcion.trim(),
          fechaVencimiento: finDelDia(this.vence),
          productoIds: this.productoIds,
        })
        .subscribe({
          next: (res) => {
            this.guardando = false;
            this.toastr.success("Catálogo creado. Genera el link para compartirlo.");
            this.router.navigate(["/cotizaciones/catalogos", res.data.id], { replaceUrl: true });
          },
          error: (err) => {
            this.guardando = false;
            this.toastr.error(mensajeDeError(err, "No pudimos crear el catálogo. Intenta de nuevo."));
          },
        });
      return;
    }

    const id = this.catalogo!.id;
    this.service.editar(id, this.cambios).subscribe({
      next: () => {
        this.guardando = false;
        this.toastr.success("Cambios guardados. El link sigue siendo el mismo.");
        this.cargar(id);
      },
      error: (err) => {
        this.guardando = false;
        this.toastr.error(mensajeDeError(err, "No pudimos guardar los cambios. Intenta de nuevo."));
      },
    });
  }

  descartar(): void {
    this.llenarFormulario(this.catalogo);
  }

  volver(): void {
    this.router.navigate(["/cotizaciones/catalogos"]);
  }
}
