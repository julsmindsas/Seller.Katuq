import { Component, Input, OnInit } from '@angular/core';
import { PedidosParaProduccionEnsamble } from '../../../../shared/models/produccion/Produccion';
import { DatosProducto, ProcesoLite } from '../dashboard.component';
import { EstadoProcesoItem } from 'src/app/shared/models/productos/otrosprocesos';
import { EstadoProceso } from 'src/app/components/ventas/modelo/pedido';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
@Component({
    selector: 'app-produccion-cerrarproducto',
    templateUrl: 'cerrarproducto.component.html',
    styleUrls: ['cerrarproducto.component.scss']
})

export class CerrarProductoComponent implements OnInit {
    @Input()
    productsToClose: DatosProducto[]
    procesosUnicos: string[];

    constructor(private modalService: NgbModal) { }
    ngOnInit(): void {
        this.productsToClose.forEach(producto => {
            producto.procesosUnicos = this.extraerProcesosUnicos(producto);
        });
    }


    private extraerProcesosUnicos(producto: DatosProducto): string[] {
        const todosProcesos = new Set<string>();
        producto.articulosConProcesos.forEach(articulo => {
            articulo.procesos.forEach(proceso => {
                todosProcesos.add(proceso.proceso);
            });
        });
        return Array.from(todosProcesos);
    }

    getStatusProceso(procesos: ProcesoLite[], nombreProceso: string): string {
        const proceso = procesos.find(p => p.proceso === nombreProceso);
        return proceso ? proceso.statusProceso : 'No Aplica';
    }

    getProcesoIcono(status: string): string {
        if (status === 'No Aplica') {
            return status;  // Devuelve el texto "No Aplica"
        }
        switch (status) {
            case EstadoProcesoItem.ProducidasTotalmente:
                return '✔';
            case EstadoProcesoItem.ProducidasParcialmente:
                return '–';
            case EstadoProcesoItem.SinProducir:
            case 'Produccion':
                return '✖';
            default:
                return 'No Aplica';
        }
    }
    verificarProduccionTotal(producto: DatosProducto): boolean {
        return producto.articulosConProcesos.every(articulo =>
            articulo.procesos.every(proceso =>
                proceso.statusProceso === EstadoProcesoItem.ProducidasTotalmente
            )
        )
    }

    cambiarProductoEstado(producto: DatosProducto) {
        producto.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
        //cerrar el modal
        this.modalService.dismissAll('cerrar');
    }

}