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

    constructor(
        private inventarioService: InventarioService,
        private fb: FormBuilder,
        private datePipe: DatePipe,
        private messageService: MessageService
    ) {
        this.formFiltros = this.fb.group({
            fechaInicio: [null],
            fechaFin: [null],
            producto: [null],
            bodega: [null],
            orderBy: ['fecha'],
            orderDirection: ['desc']
        });
    }

    ngOnInit(): void {
        this.cargarProductos();
        this.cargarBodegas();
    }

    toggleFiltros(): void {
        this.mostrarFiltros = !this.mostrarFiltros;
    }

    cargarProductos(): void {
        this.inventarioService.getProductos().subscribe({
            next: (response) => {
                this.productos = response;
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
            const filtros = this.formFiltros.value;

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
        const filtros = this.formFiltros.value;

        if (filtros.fechaInicio) {
            filtros.fechaInicio = this.datePipe.transform(filtros.fechaInicio, 'yyyy-MM-dd');
        }
        if (filtros.fechaFin) {
            filtros.fechaFin = this.datePipe.transform(filtros.fechaFin, 'yyyy-MM-dd');
        }

        this.inventarioService.getHistorialMovimientos(filtros).subscribe({
            next: (response: MovimientosResponse) => {
                const datosExcel = (response.movimientos || []).map(movimiento => ({
                    'Fecha': this.datePipe.transform(movimiento.fecha._seconds * 1000, 'dd/MM/yyyy HH:mm'),
                    'Producto': movimiento.productDoc.titulo,
                    'Código': movimiento.producto.identificacion.referencia,
                    'Bodega': movimiento.bodegaDoc.nombre,
                    'Tipo': movimiento.tipo,
                    'Cantidad': movimiento.cantidad,
                    'Observaciones': movimiento.observaciones,
                    'Orden Compra': movimiento.ordenCompraId,
                    'Usuario': movimiento.usuario,
                    'Compañía': movimiento.company
                }));

                const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
                const wb: XLSX.WorkBook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Historial Movimientos');

                XLSX.writeFile(wb, `historial_movimientos_${new Date().getTime()}.xlsx`);
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
        this.inventarioService.getMovimientoDetalle(movimiento.id).subscribe({
            next: (response) => {
                // Aquí puedes implementar la lógica para mostrar el detalle del documento
                // Por ejemplo, abrir un modal o navegar a otra página
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
        return tipo.startsWith('INGRESO') ? 'bg-success' : 'bg-danger';
    }

    clear(table: Table): void {
        table.clear();
        this.formFiltros.reset();
        this.lastDoc = '';
        this.buscarMovimientos();
    }

    onPageChange(event: any): void {
        this.rows = event.rows;
        this.buscarMovimientos(event);
    }
} 