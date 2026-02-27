import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PosV2CartService } from '../../services/pos-v2-cart.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';

@Component({
  selector: 'app-pos-v2-catalog-mode',
  templateUrl: './catalog-mode.component.html',
  styleUrls: ['./catalog-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogModeComponent implements OnInit, OnDestroy {

  products: any[] = [];
  loading = false;
  loadError = false;

  searchTerm = '';
  selectedCategory = '';
  currentPage = 1;
  readonly pageSize = 12;

  categories: string[] = [];
  filteredProducts: any[] = [];
  pagedProducts: any[] = [];
  totalPages = 1;

  private destroy$ = new Subject<void>();

  constructor(
    private cartService: PosV2CartService,
    private terminalService: PosV2TerminalService,
    private inventarioService: InventarioService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    const terminal = this.terminalService.getTerminalSnapshot();
    if (!terminal?.id) {
      this.products = [];
      this.applyFilters();
      return;
    }

    this.loading = true;
    this.loadError = false;
    this.cdr.markForCheck();

    this.inventarioService.obtenerInventarioPorBodega(terminal.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r: any) => {
          if (Array.isArray(r.productos) && r.productos.length > 0) {
            this.products = r.productos.map((itemInventario: any) => ({
              ...itemInventario,
              ...itemInventario.producto,
              disponibilidad: {
                ...itemInventario?.producto?.disponibilidad,
                cantidadDisponible: itemInventario.cantidad,
                stockDisponible: itemInventario.cantidad,
              },
            }));
          } else {
            this.products = [];
          }
          this.buildCategories();
          this.applyFilters();
        },
        error: () => {
          this.products = [];
          this.loadError = true;
          this.applyFilters();
        },
      });
  }

  private buildCategories(): void {
    const catSet = new Set<string>();
    for (const p of this.products) {
      const label = p?.categorias?.label;
      if (label) {
        catSet.add(label);
      }
    }
    this.categories = Array.from(catSet).sort();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onCategorySelect(category: string): void {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = this.products;

    if (this.selectedCategory) {
      result = result.filter(
        (p) => p?.categorias?.label === this.selectedCategory
      );
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter((p) => {
        const title = (p?.crearProducto?.titulo || '').toLowerCase();
        const ref = (p?.identificacion?.referencia || '').toLowerCase();
        const barcode = (p?.identificacion?.codigoBarras || '').toLowerCase();
        return title.includes(term) || ref.includes(term) || barcode.includes(term);
      });
    }

    this.filteredProducts = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePage();
  }

  private updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.pageSize);
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePage();
  }

  addToCart(product: any): void {
    this.cartService.addItem(product, 1);
  }

  getProductImage(product: any): string | null {
    const images = product?.crearProducto?.imagenesPrincipales;
    if (Array.isArray(images) && images.length > 0) {
      return images[0]?.urls || null;
    }
    return null;
  }

  getProductPrice(product: any): number {
    return product?.precio?.precioUnitarioConIva ?? product?.precio?.precioUnitarioSinIva ?? 0;
  }

  getStock(product: any): number | null {
    const disp = product?.disponibilidad;
    if (!disp) return null;
    return disp.cantidadDisponible ?? disp.stockDisponible ?? null;
  }

  isOutOfStock(product: any): boolean {
    const stock = this.getStock(product);
    return stock !== null && stock <= 0;
  }

  trackByProductId(_index: number, product: any): string {
    return product?._id || product?.crearProducto?.cd || _index.toString();
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
