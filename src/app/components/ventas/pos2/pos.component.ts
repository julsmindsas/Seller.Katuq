import { Component, ViewChild, AfterViewInit, OnInit, HostListener } from '@angular/core'; // Importar OnInit
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ProductCategoryComponent } from "./widgets/product-category/product-category.component";
import { ProductComponent } from './widgets/product/product.component';
import { PosCheckoutComponent } from "./widgets/pos-checkout/pos-checkout.component";
import { WarehouseSelectorComponent } from './widgets/warehouse-selector/warehouse-selector'; // Importar WarehouseSelectorComponent
import { CashClosingComponent } from './widgets/cash-closing/cash-closing.component';
import { CashClosingHistoryComponent } from './widgets/cash-closing-history/cash-closing-history.component';
import { CartService } from '../../../shared/services/cart.service';
import { PosCheckoutService } from '../../../shared/services/ventas/pos-checkout.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})

export class PosComponent implements OnInit, AfterViewInit { // Implementar OnInit además de AfterViewInit
  @ViewChild(ProductComponent) productComponent: ProductComponent;
  @ViewChild(WarehouseSelectorComponent) warehouseSelectorComponent: WarehouseSelectorComponent; // Añadir ViewChild para WarehouseSelector

  constructor(
    private modal: NgbModal,
    private cartService: CartService,
    private checkoutService: PosCheckoutService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Debug logging para verificar contexto de empresa
    const currentCompanyStr = localStorage.getItem("currentCompany");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    console.log("🏢 [POS Init] Current Company from localStorage:",
      currentCompanyStr ? JSON.parse(currentCompanyStr) : null);
    console.log("👤 [POS Init] User Company:", user.company);

    // Sync company data to both storages for receipt compatibility
    if (currentCompanyStr) {
      sessionStorage.setItem("currentCompany", currentCompanyStr);
      console.log("✅ [POS Init] Company data synced to sessionStorage for receipt");
    } else {
      console.warn("⚠️ [POS Init] No company data found in localStorage - receipt may have incomplete info");
    }

    // Limpiar datos al inicializar el POS para empezar siempre con estado limpio
    this.limpiarDatos();
  }

  ngAfterViewInit(): void {
    // Carga inicial de productos después de que los componentes hijos estén listos
    // Verifica si ya hay una bodega seleccionada en localStorage al iniciar
    let initialBodega: any = null;
    try {
      const raw = localStorage.getItem('warehousePOS');
      initialBodega = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('warehousePOS en localStorage corrupto, ignorado:', e);
    }
    const initialBodegaId = initialBodega?.idBodega;

    if (this.productComponent) {
      if (!initialBodegaId) {
        // No cargar productos si no hay bodega seleccionada
        console.warn('POS: No se puede cargar productos sin una bodega asignada');
        // El componente product mostrará un mensaje al usuario
      } else {
        this.productComponent.obtenerProductos(initialBodegaId);
      }
    }
  }

  /**
   * Limpia los datos del carrito y cliente al inicializar el POS
   */
  private limpiarDatos(): void {
    // Limpiar carrito
    this.cartService.clearCart();
    
    // Limpiar datos del cliente
    this.checkoutService.clearCustomer();
    
    // Limpiar cualquier dato temporal del POS
    localStorage.removeItem('selectedCustomerPOS');
    localStorage.removeItem('tempOrderData');
  }

  /**
   * Método público para iniciar una nueva venta limpiando todos los datos
   */
  public nuevaVenta(): void {
    this.limpiarDatos();
    
    // Opcional: mostrar mensaje de confirmación
    console.log('POS limpiado - listo para nueva venta');
  }

  onWarehouseChanged() {
    let bodegaSeleccionada: any = null;
    try {
      const raw = localStorage.getItem('warehousePOS');
      bodegaSeleccionada = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('warehousePOS en localStorage corrupto, ignorado:', e);
    }
    const bodegaId = bodegaSeleccionada ? bodegaSeleccionada.idBodega : undefined;
    // Asegúrate de que productComponent esté inicializado
    if (this.productComponent) {
      this.productComponent.obtenerProductos(bodegaId);
    } else {
      console.error("ProductComponent no está disponible todavía.");
    }
  }

  irAPedidos() {
    this.router.navigate(['/ventas/pedidos']);
  }

  openCashClosingModal() {
    this.modal.open(CashClosingComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
  }

  openCashClosingHistoryModal() {
    this.modal.open(CashClosingHistoryComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
  }

  // ─── CALCULADORA — TECLADO ─────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.calcVisible) return;
    // Evitar que interfiera con inputs de texto activos
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const digitos = ['0','1','2','3','4','5','6','7','8','9'];
    if (digitos.includes(e.key))           { e.preventDefault(); this.calcPresionar(e.key); return; }
    if (e.key === '.' || e.key === ',')    { e.preventDefault(); this.calcPresionar('.'); return; }
    if (e.key === '+')                     { e.preventDefault(); this.calcOperar('+'); return; }
    if (e.key === '-')                     { e.preventDefault(); this.calcOperar('−'); return; }
    if (e.key === '*')                     { e.preventDefault(); this.calcOperar('×'); return; }
    if (e.key === '/')                     { e.preventDefault(); this.calcOperar('÷'); return; }
    if (e.key === 'Enter' || e.key === '='){ e.preventDefault(); this.calcIgual(); return; }
    if (e.key === 'Backspace')             { e.preventDefault(); this.calcBorrar(); return; }
    if (e.key === 'Escape')                { e.preventDefault(); this.toggleCalculadora(); return; }
    if (e.key === '%')                     { e.preventDefault(); this.calcPorcentaje(); return; }
    if (e.key === 'Delete')                { e.preventDefault(); this.calcLimpiar(); return; }
  }

  // ─── CALCULADORA ───────────────────────────────────────────────
  calcVisible = false;
  calcDisplay = '0';
  calcExpresion = '';
  private calcOperador = '';
  private calcPrimerValor: number | null = null;
  private calcNuevoNumero = true;

  toggleCalculadora() {
    this.calcVisible = !this.calcVisible;
  }

  calcPresionar(valor: string) {
    if (this.calcNuevoNumero) {
      this.calcDisplay = valor === '.' ? '0.' : valor;
      this.calcNuevoNumero = false;
    } else {
      if (valor === '.' && this.calcDisplay.includes('.')) return;
      this.calcDisplay = this.calcDisplay === '0' && valor !== '.' ? valor : this.calcDisplay + valor;
    }
  }

  calcOperar(op: string) {
    const actual = parseFloat(this.calcDisplay);
    if (this.calcPrimerValor !== null && !this.calcNuevoNumero) {
      const resultado = this.calcEvaluar(this.calcPrimerValor, actual, this.calcOperador);
      this.calcDisplay = this.calcFormatear(resultado);
      this.calcExpresion = `${this.calcFormatear(resultado)} ${op}`;
      this.calcPrimerValor = resultado;
    } else {
      this.calcPrimerValor = actual;
      this.calcExpresion = `${this.calcFormatear(actual)} ${op}`;
    }
    this.calcOperador = op;
    this.calcNuevoNumero = true;
  }

  calcIgual() {
    if (this.calcPrimerValor === null || this.calcNuevoNumero) return;
    const actual = parseFloat(this.calcDisplay);
    const resultado = this.calcEvaluar(this.calcPrimerValor, actual, this.calcOperador);
    this.calcExpresion = `${this.calcFormatear(this.calcPrimerValor)} ${this.calcOperador} ${this.calcFormatear(actual)} =`;
    this.calcDisplay = this.calcFormatear(resultado);
    this.calcPrimerValor = null;
    this.calcOperador = '';
    this.calcNuevoNumero = true;
  }

  calcLimpiar() {
    this.calcDisplay = '0';
    this.calcExpresion = '';
    this.calcOperador = '';
    this.calcPrimerValor = null;
    this.calcNuevoNumero = true;
  }

  calcBorrar() {
    if (this.calcNuevoNumero) return;
    this.calcDisplay = this.calcDisplay.length > 1 ? this.calcDisplay.slice(0, -1) : '0';
  }

  calcPorcentaje() {
    const valor = parseFloat(this.calcDisplay);
    this.calcDisplay = this.calcFormatear(valor / 100);
    this.calcNuevoNumero = true;
  }

  private calcEvaluar(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default:  return b;
    }
  }

  private calcFormatear(n: number): string {
    if (isNaN(n)) return '0';
    return parseFloat(n.toPrecision(10)).toString();
  }
  // ───────────────────────────────────────────────────────────────
}
