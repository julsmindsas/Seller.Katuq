import { Component, OnInit } from '@angular/core';
// import { products } from '../../../../../../assets/data/pos';
// import { OrderDetailsProduct } from '../../../../../shared/models/pos/order';
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss']
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
    private maestroService: MaestroService
  ) {

    this.obtenerProductos();

  }

  ngOnInit(): void {

  }

  obtenerProductos() {

    debugger;

    this.maestroService.getAllProductsPagination(100, 1).subscribe((r: any) => {
      if ((r.products as any[]).length > 0) {
        const productosPorEmpresa = r.products;
        let data = productosPorEmpresa;
        this.products = data.map(product => ({
          ...product,
          cantidad: 1
        }));
        
        this.filteredProduct = this.products;
      }
      console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.obtenerProductos ~ r", r)
    });
  }
  updateQuantity(value: number, product: any) {
    if (value === 1 && product.cantidad < product.disponibilidad.cantidadDisponible) {
      product.cantidad += 1;
    } else if (value === -1 && product.cantidad > 1) {
      product.cantidad -= 1;
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
        ? product.product_name.toLowerCase().includes(this.filter.search)
        : true;

      return matchesSearch;
    });
  }

}
