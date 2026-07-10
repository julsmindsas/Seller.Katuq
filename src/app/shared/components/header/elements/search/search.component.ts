import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { NavService, Menu } from '../../../../services/nav.service';
import { VentasService } from '../../../../services/ventas/ventas.service';
import { MaestroService } from '../../../../services/maestros/maestro.service';

/**
 * Buscador global del header (rediseño 2026).
 * Busca en tres frentes:
 *  - Menú: filtro local instantáneo sobre los ítems de navegación.
 *  - Pedidos: server-side vía /v1/orders/search (debounce + cancelación).
 *  - Clientes: server-side vía /v1/clients/search (no baja los 7k+ clientes).
 * Al elegir un resultado navega al módulo correspondiente con ?buscar=.
 */
@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private dataQuery$ = new Subject<string>();

  public menuItems: Menu[] = [];
  public items: Menu[];
  public orderResults: any[] = [];
  public clientResults: any[] = [];

  public searchResult: boolean = false;      // hay texto → mostrar panel
  public searchResultEmpty: boolean = false; // sin ningún resultado
  public isSearchingData: boolean = false;   // consulta de pedidos/clientes en curso
  public text: string;

  private readonly DATA_MIN = 2;             // mínimo de caracteres para el servidor

  constructor(
    public navServices: NavService,
    private router: Router,
    private ventasService: VentasService,
    private maestroService: MaestroService,
  ) { }

  ngOnInit() {
    this.navServices.items
      .pipe(takeUntil(this.destroy$))
      .subscribe(menuItems => this.items = menuItems);

    // Pipeline server-side: pedidos + clientes en paralelo, con debounce y
    // cancelación (switchMap descarta respuestas de términos ya superados).
    this.dataQuery$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        const t = (term || '').trim();
        if (t.length < this.DATA_MIN) {
          return of({ orders: [], clients: [] });
        }
        return forkJoin({
          orders: this.ventasService.searchOrders(t).pipe(catchError(() => of([]))),
          clients: this.maestroService.searchClients(t, 6).pipe(catchError(() => of([]))),
        });
      }),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      this.orderResults = Array.isArray(res.orders) ? res.orders.slice(0, 6) : [];
      this.clientResults = Array.isArray(res.clients) ? res.clients.slice(0, 6) : [];
      this.isSearchingData = false;
      this.updateEmptyState();
    });
  }

  searchTerm(term: any) {
    term ? this.addFix() : this.removeFix();
    if (!term || !String(term).trim()) {
      this.clearResults();
      return;
    }
    // Menú: instantáneo. Datos: server con debounce.
    this.menuItems = this.filterMenu(String(term).toLowerCase());
    if (String(term).trim().length >= this.DATA_MIN) {
      this.isSearchingData = true;
    }
    this.dataQuery$.next(String(term));
    this.updateEmptyState();
  }

  private filterMenu(term: string): Menu[] {
    const items: Menu[] = [];
    (this.items || []).forEach(menuItem => {
      if (!menuItem?.title) return;
      if (menuItem.title.toLowerCase().includes(term) && menuItem.type === 'link') {
        items.push(menuItem);
      }
      (menuItem.children || []).forEach(sub => {
        if (sub?.title?.toLowerCase().includes(term) && sub.type === 'link') {
          sub.icon = menuItem.icon;
          items.push(sub);
        }
        (sub?.children || []).forEach(gsub => {
          if (gsub?.title?.toLowerCase().includes(term)) {
            gsub.icon = menuItem.icon;
            items.push(gsub);
          }
        });
      });
    });
    return items.slice(0, 8);
  }

  private updateEmptyState() {
    const total = (this.menuItems?.length || 0) + this.orderResults.length + this.clientResults.length;
    const term = (this.text || '').trim();
    // "Sin resultados" solo cuando ya se buscó en servidor (≥2 chars), terminó y no hay nada.
    this.searchResultEmpty = total === 0 && !this.isSearchingData && term.length >= this.DATA_MIN;
  }

  goToOrder(order: any) {
    if (!order?.nroPedido) return;
    this.router.navigate(['/ventas/pedidos'], { queryParams: { buscar: order.nroPedido } });
    this.close();
  }

  goToClient(client: any) {
    const term = client?.documento || client?.nombres_completos || '';
    this.router.navigate(['/ventas/clienteslista'], { queryParams: { buscar: term } });
    this.close();
  }

  onMenuNavigate() {
    // Los ítems de menú navegan con routerLink; aquí solo cerramos el panel.
    this.close();
  }

  clientName(c: any): string {
    return `${c?.nombres_completos || ''} ${c?.apellidos_completos || ''}`.trim() || 'Cliente';
  }

  addFix() { this.searchResult = true; }

  removeFix() { this.close(); }

  searchToggle() { this.close(); }

  private clearResults() {
    this.menuItems = [];
    this.orderResults = [];
    this.clientResults = [];
    this.isSearchingData = false;
    this.searchResultEmpty = false;
  }

  private close() {
    this.text = '';
    this.searchResult = false;
    this.clearResults();
    this.navServices.search = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
