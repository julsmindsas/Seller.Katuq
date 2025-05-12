// warehouse-selector.component.ts
import { Component, ElementRef, ViewChild, Output, EventEmitter, AfterViewInit, OnInit } from '@angular/core';
import { DataStoreService } from '../../../../../shared/services/dataStoreService'
import { BodegaService } from '../../../../../shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';
import { CartService } from '../../../../../shared/services/cart.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-warehouse-selector',
    templateUrl: './warehouse-selector.html',
    styleUrls: ['./warehouse-selector.scss']
})
export class WarehouseSelectorComponent implements OnInit, AfterViewInit {
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
        public cartService: CartService,
    ) {

    }

    ngOnInit() {
        this.cargarBodegas();

        try {
            const warehouseStr = localStorage.getItem('warehousePOS');
            if (warehouseStr) {
                this.bodega = JSON.parse(warehouseStr);
                if (this.bodega && this.bodega.nombre) {
                    this.selectedWarehouse = this.bodega.nombre;
                    console.log('Bodega inicializada desde localStorage:', this.bodega);
                }
            } else {
                console.log('No hay bodega en localStorage');
            }
        } catch (error) {
            console.error('Error al cargar bodega del localStorage:', error);
        }
    }

    ngAfterViewInit() {
        // Espera a que las bodegas se carguen y la vista esté inicializada
        setTimeout(() => {
            this.actualizarSeleccionBodega();
        }, 500);
    }

    // Método centralizado para actualizar la selección de bodega
    private actualizarSeleccionBodega() {
        if (!this.ware || !this.bodegas.length) {
            console.log('No se puede actualizar la selección: el elemento select o las bodegas no están disponibles');
            return;
        }

        if (!this.bodega) {
            console.log('No hay bodega guardada para seleccionar');
            return;
        }

        console.log('Intentando establecer bodega en el elemento select:', this.bodega);
        
        // Verificar si la bodega tiene idBodega
        if (this.bodega.idBodega) {
            // Buscar la bodega en la lista por idBodega
            const index = this.bodegas.findIndex(b => b.idBodega === this.bodega.idBodega);
            if (index >= 0) {
                console.log('Bodega encontrada en la lista, seleccionando por idBodega:', this.bodega.idBodega);
                this.ware.nativeElement.value = this.bodegas[index].id || this.bodegas[index].idBodega;
                return;
            }
        }
        
        // Si no se encontró por idBodega, intentar por id
        if (this.bodega.id) {
            const index = this.bodegas.findIndex(b => b.id === this.bodega.id);
            if (index >= 0) {
                console.log('Bodega encontrada en la lista, seleccionando por id:', this.bodega.id);
                this.ware.nativeElement.value = this.bodega.id;
                return;
            }
        }
        
        console.warn('No se pudo encontrar la bodega guardada en la lista de bodegas disponibles');
        // Limpiar selección si la bodega no se encuentra
        this.selectedWarehouse = '';
        localStorage.removeItem('warehousePOS');
        this.dataStore.remove('warehousePOS');
    }

    cargarBodegas() {
        this.cargando = true;
        this.bodegaService.getBodegas().subscribe({
            next: (bodegas) => {
                this.bodegas = bodegas;
                this.cargando = false;
                console.log('Bodegas cargadas:', this.bodegas);
                
                // Actualizar la selección después de cargar las bodegas
                setTimeout(() => {
                    this.actualizarSeleccionBodega();
                }, 100);
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
        let total = this.cartService.getPOSSubTotal();
        let total1: number = parseFloat(total?.replace('$','') || '0');

        if (total1 > 0) {
            Swal.fire({
                title: 'Cambio bodega.',
                text: 'No se puede cambiar de bodega si hay productos seleccionados en el carrito.',
                icon: 'error',
                confirmButtonText: 'Ok',
            });
            // Restaurar la selección anterior
            this.actualizarSeleccionBodega();
            return;
        }

        const target = event.target as HTMLSelectElement;
        const selectedId = target.value;
        
        if (!selectedId) {
            console.log('No se seleccionó ninguna bodega');
            this.selectedWarehouse = '';
            localStorage.removeItem('warehousePOS');
            this.dataStore.remove('warehousePOS');
            this.warehouseChange.emit();
            return;
        }
        
        console.log('Bodega seleccionada, id:', selectedId);
        
        // Buscar la bodega seleccionada en la lista
        const selected = this.bodegas.find(warehouse => 
            warehouse.id === selectedId || warehouse.idBodega === selectedId
        );

        if (selected) {
            console.log('Bodega encontrada en la lista:', selected);
            this.selectedWarehouse = selected.nombre;
            
            // Asegurarse de que el objeto tenga idBodega para validaciones
            if (!selected.idBodega && selected.id) {
                selected.idBodega = selected.id;
            }
            
            // Guardar en localStorage y dataStore
            localStorage.setItem('warehousePOS', JSON.stringify(selected));
            console.log('Bodega guardada en localStorage:', selected);
            
            this.dataStore.set('warehousePOS', selected);
            this.bodega = selected;
        } else {
            console.warn('No se encontró la bodega seleccionada en la lista');
            this.selectedWarehouse = '';
            localStorage.removeItem('warehousePOS');
            this.dataStore.remove('warehousePOS');
            this.bodega = null;
        }
        
        // Notificar el cambio
        this.warehouseChange.emit();
    }
}