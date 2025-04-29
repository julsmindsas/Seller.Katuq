import { Component, OnInit, ViewChild } from '@angular/core';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { Table } from 'primeng/table';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Producto } from '../../productos/model/producto.model';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { MovimientosResponse, Movimiento } from '../model/movimientoinventario';

@Component({
    selector: 'app-historial-movimientos',
    templateUrl: './historial-movimientos.component.html',
    styleUrls: ['./historial-movimientos.component.scss'],
    providers: [DatePipe, MessageService]
})
export class HistorialMovimientosComponent implements OnInit {
    @ViewChild('dt') dt: Table;

    movimientos: Movimiento[] = [];
    productos: Producto[] = [];
    bodegas: Bodega[] = [];
    loading: boolean = false;
    formFiltros: FormGroup;
    totalRecords: number = 0;
    rows: number = 10;
    lastDoc: string = '';
    mostrarFiltros: boolean = true;
    viewMode: 'compact' | 'detailed' = 'compact'; // Modo de visualización
    selectedMovimiento: Movimiento | null = null; // Movimiento seleccionado

    constructor(
        private inventarioService: InventarioService,
        private fb: FormBuilder,
        private datePipe: DatePipe,
        private messageService: MessageService
    ) {
        const hoy = new Date();
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(hoy.getDate() - 7);
        this.formFiltros = this.fb.group({
            fechaInicio: [haceUnaSemana],
            fechaFin: [hoy],
            producto: [null],
            bodega: [null],
            orderBy: ['fecha'],
            orderDirection: ['desc']
        });
    }

    ngOnInit(): void {
        this.cargarProductos();
        this.cargarBodegas();
        // Cargar datos iniciales al entrar a la página
        this.buscarMovimientos();
    }

    // Método para cambiar el modo de visualización de la tabla
    setViewMode(mode: 'compact' | 'detailed'): void {
        this.viewMode = mode;
    }

    toggleFiltros(): void {
        this.mostrarFiltros = !this.mostrarFiltros;
    }

    cargarProductos(): void {
        this.inventarioService.getProductos().subscribe({
            next: (response) => {
                this.productos = response.products;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los productos'
                });
            }
        });
    }

    cargarBodegas(): void {
        this.inventarioService.getBodegas().subscribe({
            next: (response) => {
                this.bodegas = response;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar las bodegas'
                });
            }
        });
    }

    buscarMovimientos(event?: any): void {
        if (this.formFiltros.valid) {
            this.loading = true;
            const filtros = {...this.formFiltros.value};

            // Formatear fechas
            if (filtros.fechaInicio) {
                filtros.fechaInicio = this.datePipe.transform(filtros.fechaInicio, 'yyyy-MM-dd');
            }
            if (filtros.fechaFin) {
                filtros.fechaFin = this.datePipe.transform(filtros.fechaFin, 'yyyy-MM-dd');
            }

            // Agregar paginación
            if (event) {
                filtros.limit = event.rows;
                filtros.lastDoc = this.lastDoc;
            }

            this.inventarioService.getHistorialMovimientos(filtros).subscribe({
                next: (response: MovimientosResponse) => {
                    this.movimientos = response.movimientos || [];
                    this.totalRecords = response.pagination.total || 0;
                    this.lastDoc = response.pagination.lastDoc || '';
                    this.loading = false;
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar el historial de movimientos'
                    });
                    this.loading = false;
                }
            });
        }
    }

    exportarExcel(): void {
        const filtros = {...this.formFiltros.value};

        if (filtros.fechaInicio) {
            filtros.fechaInicio = this.datePipe.transform(filtros.fechaInicio, 'yyyy-MM-dd');
        }
        if (filtros.fechaFin) {
            filtros.fechaFin = this.datePipe.transform(filtros.fechaFin, 'yyyy-MM-dd');
        }

        // Mostrar mensaje de carga
        this.messageService.add({
            severity: 'info',
            summary: 'Procesando',
            detail: 'Preparando exportación a Excel...',
            life: 3000
        });

        this.inventarioService.getHistorialMovimientos(filtros).subscribe({
            next: (response: MovimientosResponse) => {
                const datosExcel = (response.movimientos || []).map(movimiento => ({
                    'Fecha': this.datePipe.transform(movimiento.fecha._seconds * 1000, 'dd/MM/yyyy HH:mm'),
                    'Producto': movimiento.productDoc.titulo,
                    'Código': movimiento.producto.identificacion.referencia,
                    'Bodega': movimiento.bodegaDoc.nombre,
                    'Tipo': movimiento.tipo,
                    'Cantidad': movimiento.cantidad,
                    'Observaciones': movimiento.observaciones || 'N/A',
                    'Orden Compra': movimiento.ordenCompraId || 'N/A',
                    'Usuario': movimiento.usuario,
                    'Compañía': movimiento.company
                }));

                const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
                const wb: XLSX.WorkBook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Historial Movimientos');

                const fileName = `historial_movimientos_${new Date().getTime()}.xlsx`;
                XLSX.writeFile(wb, fileName);
                
                // Mostrar mensaje de éxito
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Archivo ${fileName} exportado correctamente`,
                    life: 5000
                });
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al exportar el historial'
                });
            }
        });
    }

    verDocumento(movimiento: Movimiento): void {
        // Seleccionar el movimiento actual
        this.selectedMovimiento = movimiento;

        // Si estamos en modo detallado, no necesitamos hacer una nueva consulta
        // ya que el detalle se muestra expandiendo la fila
        if (this.viewMode === 'detailed') {
            return;
        }

        this.inventarioService.getMovimientoDetalle(movimiento.id).subscribe({
            next: (response) => {
                // Implementar lógica para mostrar detalles, por ejemplo en un modal
                this.messageService.add({
                    severity: 'info',
                    summary: 'Detalle del movimiento',
                    detail: `Mostrando detalles del movimiento ID: ${movimiento.id}`,
                    life: 3000
                });
                
                // Aquí podríamos abrir un modal o navegar a otra página con los detalles
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar el detalle del documento'
                });
            }
        });
    }

    getTipoMovimientoClass(tipo: string): string {
        if (tipo.includes('INGRESO')) {
            return 'bg-success';
        } else if (tipo.includes('SALIDA')) {
            return 'bg-danger';
        } else {
            return 'bg-secondary';
        }
    }

    clear(table: Table): void {
        table.clear();
        
        // Resetear formulario con valores predeterminados
        const hoy = new Date();
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(hoy.getDate() - 7);
        
        this.formFiltros.reset({
            fechaInicio: haceUnaSemana,
            fechaFin: hoy,
            producto: null,
            bodega: null,
            orderBy: 'fecha',
            orderDirection: 'desc'
        });
        
        this.lastDoc = '';
        this.selectedMovimiento = null;
        this.buscarMovimientos();
    }

    onPageChange(event: any): void {
        this.rows = event.rows;
        this.buscarMovimientos(event);
    }
}