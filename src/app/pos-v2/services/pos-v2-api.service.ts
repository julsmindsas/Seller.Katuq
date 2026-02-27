import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PosV2Terminal,
  PosV2CashRegister,
  PosV2CashMovement,
  PosV2ScanResult,
  PosV2Order,
  PosV2ShiftReport,
  PosV2ZReport,
  PosV2ReturnsResponse,
  PosV2SellerSalesReport
} from '../models/pos-v2.models';

@Injectable({ providedIn: 'root' })
export class PosV2ApiService {

  private apiUrl = environment.urlApi + '/v1/pos';

  constructor(private http: HttpClient) {}

  // --- Terminals ---

  getTerminals(): Observable<PosV2Terminal[]> {
    return this.http.get<PosV2Terminal[]>(`${this.apiUrl}/terminals`);
  }

  createTerminal(terminal: Partial<PosV2Terminal>): Observable<PosV2Terminal> {
    return this.http.post<PosV2Terminal>(`${this.apiUrl}/terminals`, terminal);
  }

  updateTerminal(id: string, terminal: Partial<PosV2Terminal>): Observable<PosV2Terminal> {
    return this.http.put<PosV2Terminal>(`${this.apiUrl}/terminals/${id}`, terminal);
  }

  deleteTerminal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/terminals/${id}`);
  }

  // --- Cash Register ---

  openCashRegister(body: { terminalId: string; initialAmount: number }): Observable<PosV2CashRegister> {
    return this.http.post<PosV2CashRegister>(`${this.apiUrl}/cash-register/open`, body);
  }

  addCashMovement(cashRegisterId: string, movement: Partial<PosV2CashMovement>): Observable<PosV2CashRegister> {
    return this.http.post<PosV2CashRegister>(`${this.apiUrl}/cash-register/movement`, { cashRegisterId, ...movement });
  }

  closeCashRegister(cashRegisterId: string, actualCashAmount?: number): Observable<PosV2CashRegister> {
    return this.http.post<PosV2CashRegister>(`${this.apiUrl}/cash-register/close`, { cashRegisterId, actualCashAmount });
  }

  getCashRegisterStatus(terminalId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cash-register/status/${terminalId}`);
  }

  // --- Products ---

  scanProduct(barcode: string): Observable<PosV2ScanResult> {
    return this.http.get<PosV2ScanResult>(`${this.apiUrl}/products/scan?barcode=${encodeURIComponent(barcode)}`);
  }

  // --- Orders ---

  createOrder(order: PosV2Order): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders/create`, order);
  }

  // --- Reports ---

  getShiftReport(terminalId: string): Observable<PosV2ShiftReport> {
    return this.http.get<PosV2ShiftReport>(`${this.apiUrl}/reports/shift/${terminalId}`);
  }

  // --- Z Report ---

  getZReport(cashRegisterId: string): Observable<PosV2ZReport> {
    return this.http.get<PosV2ZReport>(`${this.apiUrl}/reports/z-report/${cashRegisterId}`);
  }

  // --- Sales by Seller ---

  getSalesBySeller(terminalId: string, from?: string, to?: string): Observable<PosV2SellerSalesReport> {
    let params = '';
    if (from || to) {
      const parts: string[] = [];
      if (from) parts.push(`from=${encodeURIComponent(from)}`);
      if (to) parts.push(`to=${encodeURIComponent(to)}`);
      params = '?' + parts.join('&');
    }
    return this.http.get<PosV2SellerSalesReport>(`${this.apiUrl}/reports/sales-by-seller/${terminalId}${params}`);
  }

  // --- Returns ---

  createReturn(returnData: { orderId: string; items: { cartItemId: string; quantity: number }[]; reason: string; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders/return`, returnData);
  }

  getReturns(terminalId: string, from?: string, to?: string): Observable<PosV2ReturnsResponse> {
    let params = '';
    if (from || to) {
      const parts: string[] = [];
      if (from) parts.push(`from=${encodeURIComponent(from)}`);
      if (to) parts.push(`to=${encodeURIComponent(to)}`);
      params = '?' + parts.join('&');
    }
    return this.http.get<PosV2ReturnsResponse>(`${this.apiUrl}/reports/returns/${terminalId}${params}`);
  }

  /** Search for a specific order by order number or ID. */
  getOrderByNumber(orderNumber: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders/search?q=${encodeURIComponent(orderNumber)}`);
  }
}
