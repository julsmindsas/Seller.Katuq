import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { ProductoCatalogo, SitiosService } from "../sitios.service";

/** Producto ya listo para pintar en la rejilla del selector. */
interface ProductoElegible {
  id: string;
  titulo: string;
  referencia: string;
  imagen: string | null;
  precio: number;
  stock: number;
  agotado: boolean;
}

/**
 * Selector visual de productos para el bloque "Productos".
 *
 * Reemplaza el campo de ids separados por coma: el comerciante busca por
 * nombre o referencia, ve la foto y el precio, y arma el orden en que quiere
 * que aparezcan.
 *
 * Solo maneja IDS. El precio y la disponibilidad que se muestran aquí son de
 * referencia: los definitivos los resuelve el servidor al publicar, contra el
 * maestro. Por eso un producto agotado se puede elegir igual — se avisa, y
 * simplemente no se mostrará mientras siga sin stock.
 */
@Component({
  selector: "app-selector-productos",
  templateUrl: "./selector-productos.component.html",
  styleUrls: ["./selector-productos.component.scss"],
})
export class SelectorProductosComponent implements OnInit {
  /** Ids ya elegidos, en su orden. */
  @Input() seleccionados: string[] = [];

  @Output() confirmar = new EventEmitter<string[]>();
  @Output() cerrar = new EventEmitter<void>();

  termino = "";
  resultados: ProductoElegible[] = [];
  buscando = false;
  buscado = false;

  /** Los elegidos, resueltos, para poder mostrarlos con foto y en orden. */
  elegidos: ProductoElegible[] = [];
  cargandoElegidos = false;

  private teclas = new Subject<string>();

  constructor(private service: SitiosService, private toastr: ToastrService) {}

  ngOnInit(): void {
    // La búsqueda va contra un índice en memoria del backend, pero igual se
    // espera a que el usuario deje de escribir para no disparar una petición
    // por tecla.
    this.teclas.pipe(debounceTime(350), distinctUntilChanged()).subscribe((t) => this.buscar(t));

    if (this.seleccionados.length) this.cargarElegidos();
  }

  private aElegible(p: ProductoCatalogo): ProductoElegible {
    const crear = p.crearProducto || {};
    const disp = p.disponibilidad || {};
    const stock = Number(disp.cantidadDisponible || 0);
    // Un producto no inventariable (un servicio) nunca está agotado.
    const agotado = disp.inventariable === false ? false : stock <= 0;
    return {
      id: p.cd,
      titulo: crear.titulo || "Sin nombre",
      referencia: (p.identificacion || {}).referencia || "",
      imagen: this.primeraImagen(crear),
      precio: Number((p.precio || {}).precioUnitarioConIva || 0),
      stock,
      agotado,
    };
  }

  /**
   * Misma normalización que hace el backend: hay productos sincronizados de
   * Osmosis que guardan la ruta relativa de la imagen, no la URL completa.
   */
  private primeraImagen(crear: any): string | null {
    const candidatas = [...(crear.imagenesPrincipales || []), ...(crear.imagenesSecundarias || [])];
    for (const img of candidatas) {
      const ruta = typeof img === "string" ? img : img && img.urls;
      if (!ruta || typeof ruta !== "string") continue;
      const limpia = ruta.trim();
      if (!limpia) continue;
      if (/^https?:\/\//i.test(limpia) || limpia.startsWith("data:") || limpia.startsWith("//")) {
        return limpia;
      }
      return `https://images2.guiacereza.com${limpia.startsWith("/") ? "" : "/"}${limpia}`;
    }
    return null;
  }

  private cargarElegidos(): void {
    this.cargandoElegidos = true;
    this.service.productosPorIds(this.seleccionados).subscribe({
      next: (res) => {
        this.cargandoElegidos = false;
        const porId = new Map((res.products || []).map((p) => [p.cd, this.aElegible(p)]));
        // Se respeta el orden que ya tenía el bloque, no el que devuelva el backend.
        this.elegidos = this.seleccionados.map((id) => porId.get(id)).filter(Boolean) as ProductoElegible[];
      },
      error: () => {
        this.cargandoElegidos = false;
        this.toastr.error("No pudimos cargar los productos ya elegidos.");
      },
    });
  }

  alEscribir(valor: string): void {
    this.termino = valor;
    this.teclas.next(valor);
  }

  buscar(termino: string): void {
    const t = (termino || "").trim();
    if (t.length < 2) {
      this.resultados = [];
      this.buscado = false;
      return;
    }

    this.buscando = true;
    this.service.buscarProductos(t).subscribe({
      next: (res) => {
        this.buscando = false;
        this.buscado = true;
        this.resultados = (res.products || []).map((p) => this.aElegible(p));
      },
      error: () => {
        this.buscando = false;
        this.buscado = true;
        this.resultados = [];
        this.toastr.error("No pudimos buscar productos.");
      },
    });
  }

  estaElegido(id: string): boolean {
    return this.elegidos.some((p) => p.id === id);
  }

  alternar(p: ProductoElegible): void {
    if (this.estaElegido(p.id)) {
      this.elegidos = this.elegidos.filter((x) => x.id !== p.id);
      return;
    }
    // El backend recorta a 24 por bloque: mejor avisarlo aquí que perderlos al guardar.
    if (this.elegidos.length >= 24) {
      this.toastr.warning("Puedes destacar hasta 24 productos en un bloque.");
      return;
    }
    this.elegidos = [...this.elegidos, p];
  }

  quitar(i: number): void {
    const copia = [...this.elegidos];
    copia.splice(i, 1);
    this.elegidos = copia;
  }

  mover(i: number, direccion: -1 | 1): void {
    const destino = i + direccion;
    if (destino < 0 || destino >= this.elegidos.length) return;
    const copia = [...this.elegidos];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    this.elegidos = copia;
  }

  get hayAgotados(): boolean {
    return this.elegidos.some((p) => p.agotado);
  }

  precioTexto(valor: number): string {
    return (valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  }

  aceptar(): void {
    this.confirmar.emit(this.elegidos.map((p) => p.id));
  }
}
