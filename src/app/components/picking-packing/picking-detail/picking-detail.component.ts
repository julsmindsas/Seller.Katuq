import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PickingPackingService, PickingOrder, PickingItem } from '../../../shared/services/picking-packing/picking-packing.service';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';

type PickingItemStatus = 'pending' | 'picked' | 'missing';
type PickingOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

@Component({
  selector: 'app-picking-detail',
  templateUrl: './picking-detail.component.html',
  styleUrls: ['./picking-detail.component.scss']
})
export class PickingDetailComponent implements OnInit {
  order: PickingOrder | null = null;
  loading = false;
  error = '';
  productDetails: Map<string, any> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pickingPackingService: PickingPackingService,
    private inventarioService: InventarioService
  ) { }

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrder(orderId);
    }
  }

  loadOrder(orderId: string): void {
    this.loading = true;
    this.pickingPackingService.getPickingOrder(orderId)
      .subscribe({
        next: (order) => {
          this.order = order;
          this.loadProductDetails(order.items);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading picking order:', error);
          this.error = 'Error al cargar la orden de picking';
          this.loading = false;
        }
      });
  }

  loadProductDetails(items: PickingItem[]): void {
    items.forEach(item => {
      this.inventarioService.getProductos()
        .subscribe({
          next: (products) => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              this.productDetails.set(item.productId, product);
            }
          },
          error: (error) => {
            console.error('Error loading product details:', error);
          }
        });
    });
  }

  updateItemStatus(item: PickingItem, status: PickingItemStatus): void {
    if (!this.order) return;

    this.pickingPackingService.updatePickingItemStatus(this.order.id, item.productId, status)
      .subscribe({
        next: () => {
          item.status = status;
          if (status === 'picked') {
            item.pickedQuantity = item.quantity;
          }
        },
        error: (error) => {
          console.error('Error updating item status:', error);
        }
      });
  }

  updateOrderStatus(status: PickingOrderStatus): void {
    if (!this.order) return;

    this.pickingPackingService.updatePickingOrder(this.order.id, { status })
      .subscribe({
        next: (updatedOrder) => {
          this.order = updatedOrder;
        },
        error: (error) => {
          console.error('Error updating order status:', error);
        }
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'picked':
        return 'badge-success';
      case 'missing':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  goBack(): void {
    this.router.navigate(['/picking-packing/picking']);
  }
} 