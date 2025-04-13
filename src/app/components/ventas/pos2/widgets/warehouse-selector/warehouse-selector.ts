// warehouse-selector.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import { DataStoreService } from '../../../../../shared/services/dataStoreService'

@Component({
    selector: 'app-warehouse-selector',
    templateUrl: './warehouse-selector.html',
    styleUrls: ['./warehouse-selector.scss']
})
export class WarehouseSelectorComponent {
    @ViewChild('ware', { static: false }) ware: ElementRef

    // Lista de bodegas disponibles
    warehouses = [
        { id: 1, name: 'Bodega Central' },
        { id: 2, name: 'Bodega Norte' },
        { id: 3, name: 'Bodega Sur' },
        { id: 4, name: 'Bodega Este' }
    ];

    public bodega: any = '';
    // Bodega seleccionada
    selectedWarehouse: string = '';


    constructor(private dataStore: DataStoreService) {

    }

    ngOnInit() {

        // this.bodega = this.dataStore.get('warehousePOS');
        this.bodega = JSON.parse(localStorage.getItem('warehousePOS')!);

        this.selectedWarehouse = this.bodega.name;

        this.ware.nativeElement.setValue(this.bodega.id);

    }

    // Función para manejar la selección de una bodega
    onWarehouseChange(event: Event): void {

        const target = event.target as HTMLSelectElement;
        const selectedId = parseInt(target.value, 10);
        const selected = this.warehouses.find(warehouse => warehouse.id === selectedId);

        if (selected) {
            this.selectedWarehouse = selected.name;
            localStorage.setItem('warehousePOS', JSON.stringify(selected));
            this.dataStore.set('warehousePOS', this.selectedWarehouse);
        } else {
            this.selectedWarehouse = '';
            this.dataStore.remove('warehousePOS');
            localStorage.removeItem('warehousePOS');
        }
    }
}