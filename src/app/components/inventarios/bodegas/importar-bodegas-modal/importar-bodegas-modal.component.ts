import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FulfillmentWarehouse } from '../../../../shared/models/fulfillment/fulfillment.model';

interface FulfillmentWarehouseExtended extends FulfillmentWarehouse {
  provider: string;
  providerName: string;
  selected: boolean;
  city?: string;
  state?: string;
  address?: string;
}

@Component({
  selector: 'app-importar-bodegas-modal',
  templateUrl: './importar-bodegas-modal.component.html',
  styleUrls: ['./importar-bodegas-modal.component.scss']
})
export class ImportarBodegasModalComponent implements OnInit {
  @Input() warehouses: FulfillmentWarehouseExtended[] = [];
  @Input() bodegasExistentes: string[] = [];

  // Filtros
  providerFilter: string = '';
  searchQuery: string = '';

  // Checkbox para seleccionar todas
  selectAllChecked: boolean = true;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    // Inicializar el estado de selección de cada bodega
    this.warehouses.forEach(wh => {
      wh.selected = true;
    });
  }

  /**
   * Obtiene los providers únicos disponibles para el dropdown
   */
  get providers(): { value: string; label: string }[] {
    const uniqueProviders = new Map<string, string>();
    this.warehouses.forEach(wh => {
      if (!uniqueProviders.has(wh.provider)) {
        uniqueProviders.set(wh.provider, wh.providerName);
      }
    });
    return Array.from(uniqueProviders.entries()).map(([value, label]) => ({ value, label }));
  }

  /**
   * Bodegas filtradas que no están ya importadas
   */
  get warehousesFiltradas(): FulfillmentWarehouseExtended[] {
    return this.warehouses
      .filter(wh => !this.bodegasExistentes.includes(wh.id))
      .filter(wh => !this.providerFilter || wh.provider === this.providerFilter)
      .filter(wh => {
        if (!this.searchQuery || this.searchQuery.trim() === '') return true;
        const query = this.searchQuery.toLowerCase().trim();
        return (
          wh.name?.toLowerCase().includes(query) ||
          wh.city?.toLowerCase().includes(query) ||
          wh.address?.toLowerCase().includes(query)
        );
      });
  }

  /**
   * Cuenta las bodegas seleccionadas
   */
  contarSeleccionadas(): number {
    return this.warehousesFiltradas.filter(wh => wh.selected).length;
  }

  /**
   * Verifica si hay bodegas seleccionadas
   */
  tieneSeleccionadas(): boolean {
    return this.contarSeleccionadas() > 0;
  }

  /**
   * Selecciona todas las bodegas visibles
   */
  selectAll(): void {
    this.warehousesFiltradas.forEach(wh => wh.selected = true);
    this.selectAllChecked = true;
  }

  /**
   * Deselecciona todas las bodegas visibles
   */
  deselectAll(): void {
    this.warehousesFiltradas.forEach(wh => wh.selected = false);
    this.selectAllChecked = false;
  }

  /**
   * Toggle del checkbox de seleccionar todas
   */
  onSelectAllChange(): void {
    if (this.selectAllChecked) {
      this.selectAll();
    } else {
      this.deselectAll();
    }
  }

  /**
   * Actualiza el estado del checkbox "seleccionar todas"
   */
  updateSelectAllState(): void {
    const filtered = this.warehousesFiltradas;
    const selectedCount = filtered.filter(wh => wh.selected).length;
    this.selectAllChecked = selectedCount === filtered.length && filtered.length > 0;
  }

  /**
   * Obtiene la ubicación formateada
   */
  getUbicacion(wh: FulfillmentWarehouseExtended): string {
    const parts: string[] = [];
    if (wh.address) parts.push(wh.address);
    if (wh.city) parts.push(wh.city);
    if (wh.state) parts.push(wh.state);
    return parts.join(', ') || 'Sin ubicación';
  }

  /**
   * Limpia los filtros
   */
  limpiarFiltros(): void {
    this.providerFilter = '';
    this.searchQuery = '';
  }

  /**
   * Importa las bodegas seleccionadas
   */
  importarSeleccionadas(): void {
    const seleccionadas = this.warehousesFiltradas.filter(wh => wh.selected);
    if (seleccionadas.length > 0) {
      this.activeModal.close(seleccionadas);
    }
  }

  /**
   * Cancela y cierra el modal
   */
  cancelar(): void {
    this.activeModal.dismiss();
  }
}
