import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PickingPackingService, PackingOrder, PackingItem } from '../../../shared/services/picking-packing/picking-packing.service';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';

type PackingItemStatus = 'pending' | 'packed' | 'missing';
type PackingOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

@Component({
  selector: 'app-packing-detail',
  templateUrl: './packing-detail.component.html',
  styleUrls: ['./packing-detail.component.scss']
})
export class PackingDetailComponent implements OnInit {
  order: PackingOrder | null = null;
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
    this.pickingPackingService.getPackingOrder(orderId)
      .subscribe({
        next: (order) => {
          this.order = order;
          this.loadProductDetails(order.items);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading packing order:', error);
          this.error = 'Error al cargar la orden de packing';
          this.loading = false;
        }
      });
  }

  loadProductDetails(items: PackingItem[]): void {
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

  updateItemStatus(item: PackingItem, status: PackingItemStatus): void {
    if (!this.order) return;

    this.pickingPackingService.updatePackingItemStatus(this.order.id, item.productId, status)
      .subscribe({
        next: () => {
          item.status = status;
          if (status === 'packed') {
            item.packedQuantity = item.quantity;
          }
        },
        error: (error) => {
          console.error('Error updating item status:', error);
        }
      });
  }

  updateOrderStatus(status: PackingOrderStatus): void {
    if (!this.order) return;

    this.pickingPackingService.updatePackingOrder(this.order.id, { status })
      .subscribe({
        next: (updatedOrder) => {
          this.order = updatedOrder;
        },
        error: (error) => {
          console.error('Error updating order status:', error);
        }
      });
  }

  generateShippingLabel(): void {
    if (!this.order) return;

    this.pickingPackingService.generateShippingLabel(this.order.id)
      .subscribe({
        next: (response) => {
          // Aquí podrías manejar la respuesta del servidor, por ejemplo, descargar la etiqueta
          console.log('Shipping label generated:', response);
        },
        error: (error) => {
          console.error('Error generating shipping label:', error);
        }
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'packed':
        return 'badge-success';
      case 'missing':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  goBack(): void {
    this.router.navigate(['/picking-packing/packing']);
  }
} 