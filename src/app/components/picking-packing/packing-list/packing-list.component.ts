import { Component, OnInit } from '@angular/core';
import { PickingPackingService, PackingOrder } from '../../../shared/services/picking-packing/picking-packing.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-packing-list',
  templateUrl: './packing-list.component.html',
  styleUrls: ['./packing-list.component.scss']
})
export class PackingListComponent implements OnInit {
  packingOrders: PackingOrder[] = [];
  loading = false;
  filters = {
    status: '',
    dateFrom: null,
    dateTo: null
  };

  constructor(
    private pickingPackingService: PickingPackingService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPackingOrders();
  }

  loadPackingOrders(): void {
    this.loading = true;
    this.pickingPackingService.getPackingOrders(this.filters)
      .subscribe({
        next: (orders) => {
          this.packingOrders = orders;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading packing orders:', error);
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadPackingOrders();
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/picking-packing/packing', orderId]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'in_progress':
        return 'badge-info';
      case 'completed':
        return 'badge-success';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }
} 