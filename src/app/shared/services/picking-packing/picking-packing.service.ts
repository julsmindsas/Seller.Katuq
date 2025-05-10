import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PickingOrder {
  id: string;
  orderId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  items: PickingItem[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface PickingItem {
  productId: string;
  quantity: number;
  pickedQuantity: number;
  location: string;
  status: 'pending' | 'picked' | 'missing';
}

export interface PackingOrder {
  id: string;
  pickingOrderId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  items: PackingItem[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notes?: string;
  shippingLabel?: string;
}

export interface PackingItem {
  productId: string;
  quantity: number;
  packedQuantity: number;
  status: 'pending' | 'packed' | 'missing';
}

@Injectable({
  providedIn: 'root'
})
export class PickingPackingService {
  private apiUrl = environment.urlApi + '/v1';

  constructor(private http: HttpClient) { }

  // Picking
  getPickingOrders(filters?: any): Observable<PickingOrder[]> {
    const url = `${this.apiUrl}/picking/orders`;
    return this.http.get<PickingOrder[]>(url, { params: filters });
  }

  getPickingOrder(id: string): Observable<PickingOrder> {
    const url = `${this.apiUrl}/picking/orders/${id}`;
    return this.http.get<PickingOrder>(url);
  }

  createPickingOrder(order: Partial<PickingOrder>): Observable<PickingOrder> {
    const url = `${this.apiUrl}/picking/orders`;
    return this.http.post<PickingOrder>(url, order);
  }

  updatePickingOrder(id: string, order: Partial<PickingOrder>): Observable<PickingOrder> {
    const url = `${this.apiUrl}/picking/orders/${id}`;
    return this.http.put<PickingOrder>(url, order);
  }

  updatePickingItemStatus(orderId: string, itemId: string, status: string): Observable<any> {
    const url = `${this.apiUrl}/picking/orders/${orderId}/items/${itemId}`;
    return this.http.patch(url, { status });
  }

  // Packing
  getPackingOrders(filters?: any): Observable<PackingOrder[]> {
    const url = `${this.apiUrl}/packing/orders`;
    return this.http.get<PackingOrder[]>(url, { params: filters });
  }

  getPackingOrder(id: string): Observable<PackingOrder> {
    const url = `${this.apiUrl}/packing/orders/${id}`;
    return this.http.get<PackingOrder>(url);
  }

  createPackingOrder(order: Partial<PackingOrder>): Observable<PackingOrder> {
    const url = `${this.apiUrl}/packing/orders`;
    return this.http.post<PackingOrder>(url, order);
  }

  updatePackingOrder(id: string, order: Partial<PackingOrder>): Observable<PackingOrder> {
    const url = `${this.apiUrl}/packing/orders/${id}`;
    return this.http.put<PackingOrder>(url, order);
  }

  updatePackingItemStatus(orderId: string, itemId: string, status: string): Observable<any> {
    const url = `${this.apiUrl}/packing/orders/${orderId}/items/${itemId}`;
    return this.http.patch(url, { status });
  }

  generateShippingLabel(orderId: string): Observable<any> {
    const url = `${this.apiUrl}/packing/orders/${orderId}/shipping-label`;
    return this.http.post(url, {});
  }
} 