export interface PosV2Terminal {
  id?: string;
  company: string;
  name: string;
  branch: string;
  status: 'active' | 'inactive';
  deviceId?: string;
  createdAt?: string;
}

export interface PosV2CashMovement {
  type: 'in' | 'out';
  amount: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface PosV2ClosingReport {
  expectedCash: number;
  actualCash: number;
  difference: number;
  totalSales: number;
  totalOrders: number;
  salesByMethod: { [method: string]: number };
}

export interface PosV2CashRegister {
  id?: string;
  company: string;
  terminalId: string;
  openedBy: string;
  openedAt: string;
  initialAmount: number;
  movements: PosV2CashMovement[];
  closedAt?: string;
  closingReport?: PosV2ClosingReport;
  status: 'open' | 'closed';
}

export interface PosV2CartItem {
  cartItemId: string;
  product: any;
  quantity: number;
  unitPrice: number;
  unitPriceWithTax: number;
  taxRate: number;
  subtotal: number;
  total: number;
}

export interface PosV2ScanResult {
  found: boolean;
  product?: any;
  message?: string;
}

export interface PosV2PaymentInfo {
  method: 'cash' | 'card' | 'ewallet' | 'transfer';
  amount: number;
  change?: number;
  reference?: string;
  tipAmount?: number;
}

export interface PosV2OrderTotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface PosV2Order {
  items: PosV2CartItem[];
  customer?: any;
  payment: PosV2PaymentInfo;
  terminal: PosV2Terminal;
  cashRegister: PosV2CashRegister;
  totals: PosV2OrderTotals;
  typeOrder: 'POS';
  tipAmount?: number;
  discountDetails?: PosV2DiscountDetail[];
  seller?: PosV2SellerInfo;
  nroPedido?: string;
  fechaCreacion?: string;
  returnInfo?: PosV2ReturnInfo;
}

export interface PosV2SalesByMethodEntry {
  count: number;
  total: number;
}

export interface PosV2ShiftReport {
  terminalId: string;
  from: string;
  to: string;
  totalSales: number;
  totalOrders: number;
  salesByPaymentMethod: { [method: string]: PosV2SalesByMethodEntry };
  orders?: any[];
  cashMovements?: PosV2CashMovement[];
  totalDiscounts?: number;
  totalTips?: number;
  totalReturns?: number;
  returnsCount?: number;
}

export interface PosV2SellerInfo {
  id: string;
  name: string;
  email?: string;
}

export interface PosV2DiscountDetail {
  type: 'percentage' | 'fixed';
  value: number;
  appliedAmount: number;
  itemId?: string;
  reason?: string;
}

export type PosV2ReturnReason = 'defective' | 'exchange' | 'regret' | 'price_error' | 'other';

export interface PosV2ReturnItem {
  cartItemId: string;
  productName: string;
  productRef: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PosV2ReturnInfoItem {
  cartItemId: string;
  quantity: number;
}

export interface PosV2ReturnInfo {
  isReturned: boolean;
  returnedAt?: string;
  returnedBy?: string;
  reason?: PosV2ReturnReason;
  notes?: string;
  totalRefunded?: number;
  items?: PosV2ReturnInfoItem[];
}

export interface PosV2Return {
  id?: string;
  orderId: string;
  orderNumber: string;
  items: PosV2ReturnItem[];
  reason: PosV2ReturnReason;
  notes?: string;
  totalRefunded: number;
  processedBy: string;
  processedAt: string;
  terminalId: string;
  cashRegisterId?: string;
}

/** An order that has returnInfo.isReturned === true, as returned by getReturns endpoint. */
export interface PosV2ReturnOrder {
  _id: string;
  nroPedido?: string;
  formaDePago?: string;
  totalPedididoConDescuento?: number;
  returnInfo: PosV2ReturnInfo;
  asesorAsignado?: { nombre?: string; email?: string };
  fechaCreacion?: string;
  carrito?: any[];
}

/** Wrapper response from the getReturns endpoint. */
export interface PosV2ReturnsResponse {
  terminalId: string;
  from: string;
  to: string;
  totalReturns: number;
  returns: PosV2ReturnOrder[];
}

export interface PosV2SellerSalesEntry {
  seller: { nombre: string; email: string };
  orderCount: number;
  totalSales: number;
  averageTicket: number;
  percentage: number;
}

export interface PosV2SellerSalesReport {
  terminalId: string;
  from: string;
  to: string;
  sellers: PosV2SellerSalesEntry[];
}

/** Inventory movement entry returned by the Z report backend (from inventoryMovement collection) */
export interface PosV2InventoryMovement {
  _id?: string;
  cantidad: number;
  tipo: string;
  tipoMovimiento: string;
  productoId?: string;
  ordenId?: string;
  [key: string]: any;
}

export interface PosV2ZReport {
  terminalName: string;
  cashierName: string;
  shiftPeriod: { from: string; to: string };
  cashRegisterId?: string;

  totalSales: number;
  totalOrders: number;
  averageTicket: number;

  salesByMethod: { method: string; label: string; count: number; total: number }[];

  salesBySeller: PosV2SellerSalesEntry[];

  totalDiscounts: number;
  discountedOrdersCount: number;

  totalReturns: number;
  returnsCount: number;
  returns: PosV2InventoryMovement[];
  cashRefunds: number;

  totalTips: number;
  tipsCount: number;

  cashMovements: PosV2CashMovement[];
  totalCashIn: number;
  totalCashOut: number;

  initialAmount: number;
  expectedCashInDrawer: number;
  actualCash?: number;
  cashDifference?: number;
}
