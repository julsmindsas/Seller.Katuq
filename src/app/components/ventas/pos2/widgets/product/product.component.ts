// import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
// import { FormsModule } from '@angular/forms';

// import { FeatherIconComponent } from "../../../../../shared/components/ui/feather-icon/feather-icon.component";
import { products } from '../../../../../../assets/data/pos';
import { OrderDetailsProduct } from '../../../../../shared/models/pos/order';
import { CartService } from '../../../../../shared/services/cart.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss']
})

export class ProductComponent implements OnInit {

  public products = products;
  public filteredProduct: OrderDetailsProduct[] = products;
  public searchQuery: string = '';
  public filter = {
    search: '',
  };

  constructor(public cartService: CartService) { }

  ngOnInit(): void {

  }

  updateQuantity(value: number, product: OrderDetailsProduct) {
    if (value === 1 && product.quantity < product.total_quantity) {
      product.quantity += 1;
    } else if (value === -1 && product.quantity > 1) {
      product.quantity -= 1;
    }
  }

  addToCart(product: OrderDetailsProduct) {
    const updatedProduct: OrderDetailsProduct = {
      ...product,
      quantity: product.quantity
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
