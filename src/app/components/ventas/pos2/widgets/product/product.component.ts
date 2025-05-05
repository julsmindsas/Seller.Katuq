import { Component, OnInit } from '@angular/core';
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { InventarioService } from '../../../../../shared/services/inventarios/inventario.service';
import { ImageOptimizerDirective } from '../../../../../shared/directives/image-optimizer.directive';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent implements OnInit {

  public products: any[] = [];
  public filteredProduct: any[] = [];
  public searchQuery: string = '';
  public filter = {
    search: '',
  };

  constructor(
    public cartService: CartService,
    private maestroService: MaestroService,
    private inventarioService: InventarioService
  ) {
  }

  ngOnInit(): void {
    // this.obtenerProductos(); // Carga inicial sin bodega específica
  }

  obtenerProductos(bodegaId?: string) {
    if (bodegaId) {
      this.obtenerProductosPorBodega(bodegaId);
    } else {
      this.maestroService.getAllProductsPagination(100, 1).subscribe((r: any) => {
        if (r.products && (r.products as any[]).length > 0) {
          const productosPorEmpresa = r.products;
          let data = productosPorEmpresa;
          this.products = data.map(product => ({
            ...product,
            cantidad: 1
          }));
          this.filteredProduct = this.products;
        } else {
          this.products = [];
          this.filteredProduct = [];
        }
        console.log("🚀 Productos generales cargados:", r)
      });
    }
  }

  obtenerProductosPorBodega(bodegaId: string) {
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe((r: any) => {
      if (Array.isArray(r.productos) && r.productos.length > 0) {
        this.products = r.productos.map(itemInventario => {
          return {
            ...itemInventario,
            ...itemInventario.producto,
            disponibilidad: {
              ...itemInventario.producto.disponibilidad,
              cantidadDisponible: itemInventario.cantidad,
            },
            cantidad: 1, // Se asegura de que el producto tenga una cantidad inicial de 1
            // Se asegura de que el producto tenga una cantidad inicial de 1
          };
        });
        this.filteredProduct = this.products;
      } else {
        this.products = [];
        this.filteredProduct = [];
      }
      console.log('Productos por bodega', bodegaId, r);
    });
  }

  updateQuantity(value: number, product: any) {
    const stockDisponible = product.disponibilidad?.cantidadDisponible ?? Infinity;

    if (value === 1 && product.cantidad < stockDisponible) {
      product.cantidad += 1;
    } else if (value === -1 && product.cantidad > 1) {
      product.cantidad -= 1;
    } else if (value === 1 && product.cantidad >= stockDisponible) {
      console.warn(`No hay suficiente stock para ${product.crearProducto?.titulo}. Disponible: ${stockDisponible}`);
    }
  }

  addToCart(product: any) {
    const updatedProduct: any = {
      ...product,
      cantidad: product.cantidad
    };
    this.cartService.posAddToCart(updatedProduct);
  }

  searchStores() {
    this.filter['search'] = this.searchQuery.toLowerCase();
    this.filterDetails();
  }

  /**
   * Normaliza texto eliminando acentos y convirtiéndolo a minúsculas
   */
  private normalizeText(text: string | undefined | null): string {
    if (!text) return '';
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  filterDetails() {
    if (!this.filter.search || this.filter.search === '') {
      this.filteredProduct = [...this.products];
      return;
    }

    const searchTerms = this.normalizeText(this.filter.search).split(' ');
    
    this.filteredProduct = this.products.filter(product => {
      // Campos a buscar
      const searchFields = [
        this.normalizeText(product.crearProducto?.titulo),
        this.normalizeText(product.crearProducto?.descripcion),
        this.normalizeText(product.identificacion.referencia),
        this.normalizeText(product.identificacion.codigoBarras)
      ];
      
      // Comprueba si todos los términos de búsqueda coinciden en al menos uno de los campos
      return searchTerms.every(term => 
        searchFields.some(field => field && field.includes(term))
      );
    });
  }

}
