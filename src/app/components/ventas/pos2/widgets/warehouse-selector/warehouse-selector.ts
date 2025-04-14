// warehouse-selector.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import { DataStoreService } from '../../../../../shared/services/dataStoreService'
import { BodegaService } from '../../../../../shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-warehouse-selector',
    templateUrl: './warehouse-selector.html',
    styleUrls: ['./warehouse-selector.scss']
})
export class WarehouseSelectorComponent {
    @ViewChild('ware', { static: false }) ware: ElementRef

    public bodega: any = '';
    bodegas: any[] = [];
    // Bodega seleccionada
    selectedWarehouse: string = '';
    cargando: boolean = false;


    constructor(
        private dataStore: DataStoreService,
        private bodegaService: BodegaService,
        private toastr: ToastrService,
    ) {

    }

    ngOnInit() {

        this.cargarBodegas();

        // this.bodega = this.dataStore.get('warehousePOS');
        this.bodega = JSON.parse(localStorage.getItem('warehousePOS')!);

        if(this.bodega){
        this.selectedWarehouse = this.bodega.nombre;

        this.ware.nativeElement.setValue(this.bodega.id);
        }
    }

    cargarBodegas() {
        this.cargando = true;
        this.bodegaService.getBodegas().subscribe({
          next: (bodegas) => {
            this.bodegas = bodegas;
            this.cargando = false;
          },
          error: (error) => {
            console.error('Error al cargar bodegas:', error);
            this.toastr.error('Error al cargar las bodegas', 'Error');
            this.cargando = false;
          }
        });
      }

    // Función para manejar la selección de una bodega
    onWarehouseChange(event: Event): void {

        const target = event.target as HTMLSelectElement;
        const selectedId = target.value;
        const selected = this.bodegas.find(warehouse => warehouse.idBodega === selectedId);

        if (selected) {
            this.selectedWarehouse = selected.nombre;
            localStorage.setItem('warehousePOS', JSON.stringify(selected));
            this.dataStore.set('warehousePOS', this.selectedWarehouse);
        } else {
            this.selectedWarehouse = '';
            this.dataStore.remove('warehousePOS');
            localStorage.removeItem('warehousePOS');
        }
    }
}