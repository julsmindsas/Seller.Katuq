import { Component, Input, OnInit } from '@angular/core';
import { DetallePedido, PedidosParaProduccionEnsamble } from 'src/app/shared/models/produccion/Produccion';

@Component({
    selector: 'app-tracking',
    templateUrl: 'proceso-tracking.component.html',
    styleUrls: ['./proceso-tracking.component.scss']
})

export class ProcesoTrackingComponent implements OnInit {

    @Input()
    articuloEnsamble: PedidosParaProduccionEnsamble;

    constructor() { }

    ngOnInit() {
    }

    getTotalPiezasProducidas(historialPiezasProducidas) {
        return historialPiezasProducidas?.reduce((acc, historial) => acc + (historial.piezasProducidas || 0), 0);
    }
}