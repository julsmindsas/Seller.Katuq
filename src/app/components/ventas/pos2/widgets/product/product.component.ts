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
        this.products = r.productos.map(itemInventario => ({
          id: itemInventario.productoId,
          ...itemInventario.producto,
          cantidad: 1
        }));
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

  filterDetails() {
    this.filteredProduct = this.products.filter(product => {
      const matchesSearch = this.filter.search
        ? product.crearProducto?.titulo.toLowerCase().includes(this.filter.search)
        : true;

      return matchesSearch;
    });
  }

}
