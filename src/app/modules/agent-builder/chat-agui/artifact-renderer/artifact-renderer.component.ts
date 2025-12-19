import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    AgUiArtifact,
    AgUiArtifactType,
    AgUiChartArtifact,
    AgUiMapArtifact,
    AgUiTableArtifact,
    AgUiMetricArtifact,
    AgUiProductCardArtifact,
    AgUiOrderCardArtifact,
    AgUiStockAlertArtifact,
    AgUiImageArtifact,
    AgUiConfirmationRequest,
    AgUiDispatchMapArtifact,
    AgUiDispatchMarker
} from '../../shared/models/agui.model';

declare var google: any;

@Component({
    selector: 'app-artifact-renderer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './artifact-renderer.component.html',
    styleUrls: ['./artifact-renderer.component.scss']
})
export class ArtifactRendererComponent implements OnInit, OnChanges, AfterViewInit {
    @Input() artifact!: AgUiArtifact;
    @Input() confirmationRequest?: AgUiConfirmationRequest;

    @Output() confirmationResponse = new EventEmitter<{ decision: string; comment?: string }>();
    @Output() dispatchAction = new EventEmitter<{ action: string; data: any }>();

    @ViewChild('mapContainer') mapContainer?: ElementRef;
    @ViewChild('chartCanvas') chartCanvas?: ElementRef;

    private map: any;
    private chart: any;

    // Type guards
    get isImage(): boolean { return this.artifact?.type === 'image'; }
    get isMap(): boolean { return this.artifact?.type === 'map' || this.artifact?.type === 'route_map'; }
    get isDispatchMap(): boolean { return this.artifact?.type === 'dispatch_map'; }
    get isChart(): boolean { return this.artifact?.type === 'chart' || this.artifact?.type === 'sales_chart'; }
    get isTable(): boolean { return this.artifact?.type === 'table'; }
    get isMetric(): boolean { return this.artifact?.type === 'metric'; }
    get isProductCard(): boolean { return this.artifact?.type === 'product_card'; }
    get isOrderCard(): boolean { return this.artifact?.type === 'order_card'; }
    get isStockAlert(): boolean { return this.artifact?.type === 'stock_alert'; }

    // Typed getters
    get imageArtifact(): AgUiImageArtifact { return this.artifact as AgUiImageArtifact; }
    get mapArtifact(): AgUiMapArtifact { return this.artifact as AgUiMapArtifact; }
    get dispatchMapArtifact(): AgUiDispatchMapArtifact { return this.artifact as AgUiDispatchMapArtifact; }
    get chartArtifact(): AgUiChartArtifact { return this.artifact as AgUiChartArtifact; }
    get tableArtifact(): AgUiTableArtifact { return this.artifact as AgUiTableArtifact; }
    get metricArtifact(): AgUiMetricArtifact { return this.artifact as AgUiMetricArtifact; }
    get productCardArtifact(): AgUiProductCardArtifact { return this.artifact as AgUiProductCardArtifact; }
    get orderCardArtifact(): AgUiOrderCardArtifact { return this.artifact as AgUiOrderCardArtifact; }
    get stockAlertArtifact(): AgUiStockAlertArtifact { return this.artifact as AgUiStockAlertArtifact; }

    // Selected route for details panel
    selectedRoute: any = null;

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['artifact'] && this.artifact) {
            this.renderArtifact();
        }
    }

    ngAfterViewInit(): void {
        this.renderArtifact();
    }

    private renderArtifact(): void {
        if (!this.artifact) return;

        setTimeout(() => {
            if (this.isDispatchMap && this.mapContainer) {
                this.renderDispatchMap();
            } else if (this.isMap && this.mapContainer) {
                this.renderMap();
            }
            if (this.isChart && this.chartCanvas) {
                this.renderChart();
            }
        }, 100);
    }

    // =============================================================================
    // MAP RENDERING
    // =============================================================================

    private renderMap(): void {
        if (!this.mapContainer?.nativeElement) return;
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded');
            return;
        }

        const data = this.mapArtifact.data;
        const center = data.center || { lat: 4.6097, lng: -74.0817 }; // Default: Bogotá

        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
            center: center,
            zoom: data.zoom || 12,
            mapTypeId: data.style || 'roadmap',
            styles: this.getMapStyles()
        });

        // Add markers
        if (data.markers) {
            data.markers.forEach((marker, index) => {
                const mapMarker = new google.maps.Marker({
                    position: { lat: marker.lat, lng: marker.lng },
                    map: this.map,
                    label: marker.label ? {
                        text: marker.label,
                        color: '#fff',
                        fontWeight: 'bold'
                    } : undefined,
                    icon: this.getMarkerIcon(marker.color || '#3b82f6', index)
                });

                if (marker.info) {
                    const infoWindow = new google.maps.InfoWindow({
                        content: `<div class="map-info-window">${marker.info}</div>`
                    });
                    mapMarker.addListener('click', () => {
                        infoWindow.open(this.map, mapMarker);
                    });
                }
            });
        }

        // Add routes
        if (data.routes) {
            data.routes.forEach(route => {
                if (route.points && route.points.length > 1) {
                    new google.maps.Polyline({
                        path: route.points,
                        geodesic: true,
                        strokeColor: route.color || '#3b82f6',
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        map: this.map
                    });
                }
            });
        }

        // Fit bounds if multiple markers
        if (data.markers && data.markers.length > 1) {
            const bounds = new google.maps.LatLngBounds();
            data.markers.forEach(marker => {
                bounds.extend({ lat: marker.lat, lng: marker.lng });
            });
            this.map.fitBounds(bounds);
        }
    }

    private getMarkerIcon(color: string, index: number): any {
        return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 12
        };
    }

    private getMapStyles(): any[] {
        return [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ];
    }

    // =============================================================================
    // 🗺️ DISPATCH MAP RENDERING - Mapa de Despachos con Rutas Optimizadas
    // =============================================================================

    private renderDispatchMap(): void {
        if (!this.mapContainer?.nativeElement) return;
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded - using fallback');
            this.renderDispatchMapFallback();
            return;
        }

        const data = this.dispatchMapArtifact.data;
        const center = data.center || { lat: 4.710989, lng: -74.072092 };

        // Create map
        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
            center: center,
            zoom: data.zoom || 12,
            mapTypeId: 'roadmap',
            styles: this.getDispatchMapStyles(),
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true
        });

        // Add warehouse marker
        if (data.warehouse) {
            new google.maps.Marker({
                position: { lat: data.warehouse.lat, lng: data.warehouse.lng },
                map: this.map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#1e40af">
                            <path d="M12 2L2 7v15h20V7L12 2zm0 2.5L18.5 8v12H5.5V8L12 4.5z"/>
                            <path d="M10 13h4v7h-4z"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 40)
                },
                title: 'Almacén Central',
                zIndex: 1000
            });
        }

        // Add delivery markers with sequence numbers
        const bounds = new google.maps.LatLngBounds();

        if (data.markers && data.markers.length > 0) {
            data.markers.forEach((marker: AgUiDispatchMarker) => {
                const position = { lat: marker.lat, lng: marker.lng };
                bounds.extend(position);

                const color = this.getPriorityColor(marker.prioridad);
                const mapMarker = new google.maps.Marker({
                    position: position,
                    map: this.map,
                    label: {
                        text: String(marker.sequence),
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: color,
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 3,
                        scale: 18
                    },
                    title: `${marker.nroPedido} - ${marker.cliente}`,
                    zIndex: 100 + marker.sequence
                });

                // Info window with order details
                const infoContent = `
                    <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
                        <div style="font-weight: bold; font-size: 14px; color: #1e40af; margin-bottom: 8px;">
                            📦 Pedido #${marker.nroPedido}
                        </div>
                        <div style="margin-bottom: 4px;"><strong>Cliente:</strong> ${marker.cliente}</div>
                        <div style="margin-bottom: 4px;"><strong>Dirección:</strong> ${marker.direccion}</div>
                        <div style="margin-bottom: 4px;"><strong>Valor:</strong> ${this.formatCurrency(marker.valorTotal)}</div>
                        <div style="margin-bottom: 4px;"><strong>Pago:</strong> ${marker.tipoPago}</div>
                        ${marker.telefono ? `<div><strong>Tel:</strong> ${marker.telefono}</div>` : ''}
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                            <span style="background: ${color}; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                Parada #${marker.sequence}
                            </span>
                        </div>
                    </div>
                `;

                const infoWindow = new google.maps.InfoWindow({ content: infoContent });
                mapMarker.addListener('click', () => {
                    infoWindow.open(this.map, mapMarker);
                });
            });
        }

        // Add polylines (routes)
        if (data.polylines && data.polylines.length > 0) {
            data.polylines.forEach((polylineData: any) => {
                if (polylineData.polyline) {
                    // Decode encoded polyline
                    const path = google.maps.geometry.encoding.decodePath(polylineData.polyline);
                    new google.maps.Polyline({
                        path: path,
                        geodesic: true,
                        strokeColor: polylineData.color || '#3b82f6',
                        strokeOpacity: 0.9,
                        strokeWeight: 5,
                        map: this.map
                    });
                }
            });
        } else if (data.markers && data.markers.length > 1) {
            // Fallback: draw lines connecting markers in sequence
            const path: any[] = [];
            if (data.warehouse) {
                path.push({ lat: data.warehouse.lat, lng: data.warehouse.lng });
            }
            data.markers
                .sort((a: AgUiDispatchMarker, b: AgUiDispatchMarker) => a.sequence - b.sequence)
                .forEach((m: AgUiDispatchMarker) => path.push({ lat: m.lat, lng: m.lng }));

            new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#3b82f6',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                icons: [{
                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
                    offset: '100%',
                    repeat: '100px'
                }],
                map: this.map
            });
        }

        // Fit bounds to show all markers
        if (data.warehouse) {
            bounds.extend({ lat: data.warehouse.lat, lng: data.warehouse.lng });
        }
        if (data.markers && data.markers.length > 0) {
            this.map.fitBounds(bounds, { padding: 50 });
        }
    }

    private renderDispatchMapFallback(): void {
        // Fallback when Google Maps is not available
        // Show a simple placeholder with route info
        const container = this.mapContainer?.nativeElement;
        if (!container) return;

        const data = this.dispatchMapArtifact.data;
        container.innerHTML = `
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 24px; border-radius: 12px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">🗺️</div>
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Mapa de Rutas</div>
                <div style="font-size: 14px; opacity: 0.9;">
                    ${data.summary?.total_orders || 0} pedidos en ${data.summary?.total_zones || 0} zonas
                </div>
                <div style="margin-top: 16px; font-size: 13px; opacity: 0.8;">
                    📍 ${data.summary?.total_distance_km?.toFixed(1) || 0} km | ⏱️ ~${data.summary?.total_duration_minutes || 0} min
                </div>
            </div>
        `;
    }

    private getDispatchMapStyles(): any[] {
        return [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ lightness: 10 }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d6e5' }] }
        ];
    }

    getPriorityColor(priority: string): string {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#3b82f6';
        }
    }

    selectRoute(route: any): void {
        this.selectedRoute = this.selectedRoute === route ? null : route;
    }

    // =============================================================================
    // CHART RENDERING (usando Chart.js si está disponible, sino fallback simple)
    // =============================================================================

    private renderChart(): void {
        if (!this.chartCanvas?.nativeElement) return;

        const data = this.chartArtifact.data;

        // Check if Chart.js is available
        if (typeof (window as any).Chart !== 'undefined') {
            this.renderChartJS(data);
        } else {
            // Fallback: render simple bars
            this.renderSimpleChart(data);
        }
    }

    private renderChartJS(data: any): void {
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new (window as any).Chart(ctx, {
            type: data.chartType || 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: data.datasets.length > 1
                    }
                },
                ...data.options
            }
        });
    }

    private renderSimpleChart(data: any): void {
        // Fallback simple chart rendering
        const canvas = this.chartCanvas.nativeElement;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (data.chartType === 'bar' || data.chartType === 'line') {
            this.drawBarChart(ctx, data, width, height);
        } else if (data.chartType === 'pie' || data.chartType === 'doughnut') {
            this.drawPieChart(ctx, data, width, height);
        }
    }

    private drawBarChart(ctx: any, data: any, width: number, height: number): void {
        const dataset = data.datasets[0];
        const values = dataset.data;
        const labels = data.labels;
        const maxVal = Math.max(...values);
        const barWidth = (width - 60) / values.length - 10;
        const barAreaHeight = height - 50;

        // Draw bars
        values.forEach((val: number, i: number) => {
            const barHeight = (val / maxVal) * barAreaHeight;
            const x = 40 + i * (barWidth + 10);
            const y = height - 30 - barHeight;

            const colors = dataset.backgroundColor;
            ctx.fillStyle = Array.isArray(colors) ? colors[i % colors.length] : colors || '#3b82f6';
            ctx.fillRect(x, y, barWidth, barHeight);

            // Label
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i]?.substring(0, 8), x + barWidth / 2, height - 10);
        });
    }

    private drawPieChart(ctx: any, data: any, width: number, height: number): void {
        const dataset = data.datasets[0];
        const values = dataset.data;
        const total = values.reduce((a: number, b: number) => a + b, 0);
        const colors = dataset.backgroundColor || ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        const innerRadius = data.chartType === 'doughnut' ? radius * 0.6 : 0;

        let startAngle = -Math.PI / 2;

        values.forEach((val: number, i: number) => {
            const sliceAngle = (val / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();

            if (innerRadius > 0) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }

            startAngle += sliceAngle;
        });
    }

    // =============================================================================
    // HUMAN-IN-THE-LOOP ACTIONS
    // =============================================================================

    onApprove(): void {
        this.confirmationResponse.emit({ decision: 'approve' });
    }

    onReject(): void {
        this.confirmationResponse.emit({ decision: 'reject' });
    }

    onSelectOption(optionId: string): void {
        this.confirmationResponse.emit({ decision: optionId });
    }

    // =============================================================================
    // 🚀 DISPATCH ACTIONS - HITL desde el mapa
    // =============================================================================

    onDispatchAll(): void {
        if (!this.dispatchMapArtifact?.data?.routes) return;

        const dispatchData = {
            action: 'dispatch_all',
            routes: this.dispatchMapArtifact.data.routes,
            summary: this.dispatchMapArtifact.data.summary,
            total_orders: this.dispatchMapArtifact.data.summary?.total_orders || 0,
            total_value: this.dispatchMapArtifact.data.summary?.total_value || 0
        };

        this.dispatchAction.emit({ action: 'dispatch_all', data: dispatchData });
    }

    onDispatchSelected(): void {
        if (!this.selectedRoute) return;

        const dispatchData = {
            action: 'dispatch_selected',
            route: this.selectedRoute,
            zone: this.selectedRoute.zone,
            orders_count: this.selectedRoute.orders_count,
            orders: this.selectedRoute.orders,
            total_value: this.selectedRoute.metrics?.total_value || 0
        };

        this.dispatchAction.emit({ action: 'dispatch_selected', data: dispatchData });
    }

    // =============================================================================
    // HELPERS
    // =============================================================================

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    }

    getStockStatusClass(status: string): string {
        switch (status) {
            case 'critical': return 'status-critical';
            case 'low': return 'status-low';
            default: return 'status-ok';
        }
    }

    getStockStatusLabel(status: string): string {
        switch (status) {
            case 'critical': return 'Agotado';
            case 'low': return 'Stock Bajo';
            default: return 'OK';
        }
    }

    getChangeIcon(changeType?: string): string {
        switch (changeType) {
            case 'increase': return 'pi-arrow-up';
            case 'decrease': return 'pi-arrow-down';
            default: return 'pi-minus';
        }
    }

    getChangeClass(changeType?: string): string {
        switch (changeType) {
            case 'increase': return 'change-increase';
            case 'decrease': return 'change-decrease';
            default: return 'change-neutral';
        }
    }
}
