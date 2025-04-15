// warehouse-selector.component.ts
import { Component, ElementRef, ViewChild, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { DataStoreService } from '../../../../../shared/services/dataStoreService'
import { BodegaService } from '../../../../../shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-warehouse-selector',
    templateUrl: './warehouse-selector.html',
    styleUrls: ['./warehouse-selector.scss']
})
export class WarehouseSelectorComponent implements AfterViewInit {
    @ViewChild('ware', { static: false }) ware: ElementRef
    @Output() warehouseChange = new EventEmitter<void>();

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

        this.bodega = JSON.parse(localStorage.getItem('warehousePOS')!);

        if(this.bodega){
            this.selectedWarehouse = this.bodega.nombre;
            // El acceso a this.ware se maneja en ngAfterViewInit
        }
    }

    ngAfterViewInit() {
        // Espera a que las bodegas se carguen y la vista esté inicializada
        if(this.bodega && this.ware && this.bodegas.length > 0) {
             // Verifica si la bodega seleccionada existe en la lista de bodegas
             const bodegaExists = this.bodegas.some(b => b.idBodega === this.bodega.idBodega);
             if (bodegaExists) {
                this.ware.nativeElement.value = this.bodega.idBodega;
             } else {
                 console.warn('La bodega almacenada no se encontró en la lista actual.');
                 // Opcionalmente, limpia la selección si la bodega no es válida
                 this.selectedWarehouse = '';
                 localStorage.removeItem('warehousePOS');
                 this.dataStore.remove('warehousePOS');
             }
        } else if (this.bodega && this.ware) {
            // Si las bodegas aún no se han cargado, intenta establecer el valor más tarde
            // Esto podría necesitar una lógica más robusta si la carga es muy lenta
            setTimeout(() => {
                if(this.bodega && this.ware && this.bodegas.length > 0) {
                    const bodegaExists = this.bodegas.some(b => b.idBodega === this.bodega.idBodega);
                    if (bodegaExists) {
                       this.ware.nativeElement.value = this.bodega.idBodega;
                    }
                }
            }, 500); // Espera un poco más
        }
    }

    cargarBodegas() {
        this.cargando = true;
        this.bodegaService.getBodegas().subscribe({
          next: (bodegas) => {
            this.bodegas = bodegas;
            this.cargando = false;
            // Llama a ngAfterViewInit de nuevo o a una función específica
            // para establecer el valor después de cargar las bodegas
            this.setInitialWarehouseValue();
          },
          error: (error) => {
            console.error('Error al cargar bodegas:', error);
            this.toastr.error('Error al cargar las bodegas', 'Error');
            this.cargando = false;
          }
        });
      }

    // Nueva función para establecer el valor inicial después de cargar bodegas
    setInitialWarehouseValue() {
        if (this.bodega && this.ware && this.bodegas.length > 0) {
            const bodegaExists = this.bodegas.some(b => b.idBodega === this.bodega.idBodega);
            if (bodegaExists) {
                this.ware.nativeElement.value = this.bodega.idBodega;
            } else {
                console.warn('La bodega almacenada no se encontró en la lista actual (después de cargar).');
                 // Opcionalmente, limpia la selección si la bodega no es válida
                 this.selectedWarehouse = '';
                 localStorage.removeItem('warehousePOS');
                 this.dataStore.remove('warehousePOS');
            }
        }
    }

    // Función para manejar la selección de una bodega
    onWarehouseChange(event: Event): void {

        const target = event.target as HTMLSelectElement;
        const selectedId = target.value;
        // Asegúrate de comparar con idBodega
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
        this.warehouseChange.emit();
    }
}