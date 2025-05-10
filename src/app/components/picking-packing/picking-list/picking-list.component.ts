import { Component, OnInit } from '@angular/core';
import { PickingPackingService, PickingOrder } from '../../../shared/services/picking-packing/picking-packing.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-picking-list',
  templateUrl: './picking-list.component.html',
  styleUrls: ['./picking-list.component.scss']
})
export class PickingListComponent implements OnInit {
  pickingOrders: PickingOrder[] = [];
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
    this.loadPickingOrders();
  }

  loadPickingOrders(): void {
    this.loading = true;
    this.pickingPackingService.getPickingOrders(this.filters)
      .subscribe({
        next: (orders) => {
          this.pickingOrders = orders;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading picking orders:', error);
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadPickingOrders();
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/picking-packing/picking', orderId]);
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