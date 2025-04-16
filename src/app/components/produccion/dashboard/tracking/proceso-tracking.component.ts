import { Component, Input, OnInit } from '@angular/core';
import { DetallePedido, PedidosParaProduccionEnsamble } from 'src/app/shared/models/produccion/Produccion';

@Component({
    selector: 'app-tracking',
    templateUrl: 'proceso-tracking.component.html',
    styleUrls: ['./proceso-tracking.component.scss']
})
export class ProcesoTrackingComponent implements OnInit {
    @Input() articuloEnsamble: PedidosParaProduccionEnsamble;
    
    // Tooltips para ayudar a usuarios mayores
    tooltips = {
        fechaEntrega: 'Fecha programada para la entrega del pedido',
        formaEntrega: 'Método seleccionado para entregar el pedido',
        horario: 'Horario establecido para la entrega',
        cantidad: 'Número total de artículos en este pedido',
        historial: 'Registro detallado de la producción',
        piezas: 'Cantidad de piezas producidas en esta etapa',
        proceso: 'Etapa del proceso de producción',
        responsable: 'Persona a cargo de esta etapa'
    };

    constructor() { }

    ngOnInit() {
        // Añadir soporte para teclado
        this.setupKeyboardNavigation();
    }

    getTotalPiezasProducidas(historialPiezasProducidas): number {
        if (!historialPiezasProducidas) return 0;
        return historialPiezasProducidas.reduce((acc, historial) => acc + (historial.piezasProducidas || 0), 0);
    }

    // Método para formatear fechas de manera más legible
    formatearFecha(fecha: string): string {
        if (!fecha) return '';
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Método para obtener el color del estado según la cantidad producida
    getEstadoColor(producidas: number, total: number): string {
        const porcentaje = (producidas / total) * 100;
        if (porcentaje >= 100) return 'success';
        if (porcentaje >= 50) return 'warning';
        return 'danger';
    }

    // Soporte para navegación por teclado
    private setupKeyboardNavigation() {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.classList.contains('info-card')) {
                    activeElement.dispatchEvent(new MouseEvent('click'));
                }
            }
        });
    }

    // Método para texto a voz (accesibilidad)
    anunciarCambio(mensaje: string) {
        const anuncio = document.createElement('div');
        anuncio.setAttribute('aria-live', 'polite');
        anuncio.classList.add('sr-only'); // Solo visible para lectores de pantalla
        anuncio.textContent = mensaje;
        document.body.appendChild(anuncio);
        setTimeout(() => document.body.removeChild(anuncio), 1000);
    }

    // Método para obtener el estado del proceso
    getEstadoProceso(producidas: number, total: number): string {
        const porcentaje = (producidas / total) * 100;
        if (porcentaje >= 100) return 'Completado';
        if (porcentaje > 0) return 'En progreso';
        return 'Pendiente';
    }
}