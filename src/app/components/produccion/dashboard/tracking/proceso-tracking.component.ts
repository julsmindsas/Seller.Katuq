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
        responsable: 'Persona a cargo de esta etapa',
        tiempoRestante: 'Tiempo estimado para completar la producción',
        eficiencia: 'Porcentaje de eficiencia de producción',
        siguienteAccion: 'Acción recomendada a realizar'
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

    getProgressPercentage(detalle: DetallePedido): number {
        if (!detalle || !detalle.historialPiezasProducidas || !detalle.cantidadArticulosPorPedido) return 0;
        const total = detalle.cantidadArticulosPorPedido;
        const producidas = this.getTotalPiezasProducidas(detalle.historialPiezasProducidas);
        return Math.min(Math.round((producidas / total) * 100), 100);
    }

    getPedidoStatus(detalle: DetallePedido): string {
        if (!detalle || !detalle.historialPiezasProducidas) return 'pendiente';
        
        const porcentaje = this.getProgressPercentage(detalle);
        
        if (porcentaje >= 100) return 'completado';
        if (porcentaje > 0) return 'parcial';
        return 'pendiente';
    }

    getPedidoStatusLabel(detalle: DetallePedido): string {
        const status = this.getPedidoStatus(detalle);
        
        switch (status) {
            case 'completado': return 'Completado';
            case 'parcial': return 'En proceso';
            case 'pendiente': return 'Pendiente';
            default: return 'Desconocido';
        }
    }

    getTotalArticulos(): number {
        if (!this.articuloEnsamble || !this.articuloEnsamble.detallePedido) return 0;
        return this.articuloEnsamble.detallePedido.reduce((total, detalle) => 
            total + (detalle.cantidadArticulosPorPedido || 0), 0);
    }

    getArticulosCompletados(): number {
        if (!this.articuloEnsamble || !this.articuloEnsamble.detallePedido) return 0;
        return this.articuloEnsamble.detallePedido.filter(detalle => 
            this.getPedidoStatus(detalle) === 'completado'
        ).reduce((total, detalle) => total + (detalle.cantidadArticulosPorPedido || 0), 0);
    }

    getArticulosEnProceso(): number {
        if (!this.articuloEnsamble || !this.articuloEnsamble.detallePedido) return 0;
        return this.articuloEnsamble.detallePedido.filter(detalle => 
            this.getPedidoStatus(detalle) === 'parcial'
        ).reduce((total, detalle) => total + (detalle.cantidadArticulosPorPedido || 0), 0);
    }

    getArticulosPendientes(): number {
        if (!this.articuloEnsamble || !this.articuloEnsamble.detallePedido) return 0;
        return this.articuloEnsamble.detallePedido.filter(detalle => 
            this.getPedidoStatus(detalle) === 'pendiente'
        ).reduce((total, detalle) => total + (detalle.cantidadArticulosPorPedido || 0), 0);
    }

    getEstimatedTimeLeft(detalle: DetallePedido): string {
        if (this.getProgressPercentage(detalle) >= 100) {
            return 'Completado';
        }

        if (!detalle.historialPiezasProducidas || detalle.historialPiezasProducidas.length === 0) {
            return 'No estimado';
        }

        try {
            const historial = detalle.historialPiezasProducidas;
            
            const recentEntries = historial.slice(0, Math.min(3, historial.length));
            
            if (recentEntries.length < 2) {
                return 'Calculando...';
            }
            
            let totalPiezas = 0;
            let firstDate = new Date(recentEntries[recentEntries.length - 1].fecha);
            let lastDate = new Date(recentEntries[0].fecha);
            
            recentEntries.forEach(entry => {
                totalPiezas += entry.piezasProducidas || 0;
            });
            
            const diffDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
            
            const piezasPorDia = diffDays > 0 ? totalPiezas / diffDays : totalPiezas;
            
            const piezasRestantes = detalle.cantidadArticulosPorPedido - this.getTotalPiezasProducidas(detalle.historialPiezasProducidas);
            
            const diasEstimados = piezasPorDia > 0 ? Math.ceil(piezasRestantes / piezasPorDia) : 0;
            
            if (diasEstimados <= 0) {
                return 'Hoy';
            } else if (diasEstimados === 1) {
                return '1 día';
            } else if (diasEstimados <= 7) {
                return `${diasEstimados} días`;
            } else if (diasEstimados <= 30) {
                return `${Math.ceil(diasEstimados / 7)} semanas`;
            } else {
                return `${Math.ceil(diasEstimados / 30)} meses`;
            }
            
        } catch (error) {
            console.error('Error calculando tiempo estimado:', error);
            return 'No disponible';
        }
    }

    getEfficiency(detalle: DetallePedido): number {
        if (!detalle.historialPiezasProducidas || detalle.historialPiezasProducidas.length === 0 || !detalle.cantidadArticulosPorPedido) {
            return 0;
        }

        try {
            const fechas = detalle.historialPiezasProducidas.map(h => new Date(h.fecha));
            const primeraFecha = new Date(Math.min(...fechas.map(d => d.getTime())));
            const ultimaFecha = new Date(Math.max(...fechas.map(d => d.getTime())));
            
            const diasTranscurridos = Math.max(1, (ultimaFecha.getTime() - primeraFecha.getTime()) / (1000 * 3600 * 24));
            
            const piezasProducidas = this.getTotalPiezasProducidas(detalle.historialPiezasProducidas);
            const piezasPorDia = piezasProducidas / diasTranscurridos;
            
            const eficienciaBase = Math.min(100, Math.round((piezasPorDia / (detalle.cantidadArticulosPorPedido / 7)) * 100));
            
            const progreso = this.getProgressPercentage(detalle);
            
            if (progreso >= 100) {
                return Math.max(80, eficienciaBase);
            }
            
            return eficienciaBase;
        } catch (error) {
            console.error('Error calculando eficiencia:', error);
            return 0;
        }
    }

    showNextActions(detalle: DetallePedido): boolean {
        return this.getProgressPercentage(detalle) < 100;
    }

    getNextAction(detalle: DetallePedido): string {
        const progreso = this.getProgressPercentage(detalle);
        
        if (progreso >= 100) {
            return 'Producción completa';
        }
        
        if (progreso === 0) {
            return 'Iniciar producción';
        }
        
        if (detalle.historialPiezasProducidas && detalle.historialPiezasProducidas.length > 0) {
            const ultimoProceso = detalle.historialPiezasProducidas[0].proceso;
            
            if (ultimoProceso.includes('Corte')) {
                return 'Continuar con Costura';
            } else if (ultimoProceso.includes('Costura')) {
                return 'Continuar con Acabado';
            } else if (ultimoProceso.includes('Acabado')) {
                return 'Continuar con Empaque';
            } else {
                return 'Continuar producción';
            }
        }
        
        return 'Verificar estado';
    }

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

    getEstadoColor(producidas: number, total: number): string {
        const porcentaje = (producidas / total) * 100;
        if (porcentaje >= 100) return 'success';
        if (porcentaje >= 50) return 'warning';
        return 'danger';
    }

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

    anunciarCambio(mensaje: string) {
        const anuncio = document.createElement('div');
        anuncio.setAttribute('aria-live', 'polite');
        anuncio.classList.add('sr-only'); // Solo visible para lectores de pantalla
        anuncio.textContent = mensaje;
        document.body.appendChild(anuncio);
        setTimeout(() => document.body.removeChild(anuncio), 1000);
    }

    getEstadoProceso(producidas: number, total: number): string {
        const porcentaje = (producidas / total) * 100;
        if (porcentaje >= 100) return 'Completado';
        if (porcentaje > 0) return 'En progreso';
        return 'Pendiente';
    }
}