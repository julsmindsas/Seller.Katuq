/**
 * KatuqDispatchMap Component
 *
 * Displays dispatch routes on a Google Maps map with markers and polylines.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { KatuqDispatchMapProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';
import { environment } from 'src/environments/environment';

declare var google: any;

interface DispatchMarker {
  id: string;
  nroPedido: string;
  cliente: string;
  direccion: string;
  lat: number;
  lng: number;
  sequence?: number;
  zone?: string;
  valorTotal?: number;
}

interface DispatchRoute {
  zone: string;
  orders_count: number;
  orders: DispatchMarker[];
  polyline?: string;
  color?: string;
  metrics?: {
    total_distance_km: number;
    estimated_duration_minutes: number;
    total_value: number;
  };
}

@Component({
  selector: 'app-katuq-dispatch-map',
  template: `
    <div class="katuq-dispatch-map">
      <div class="map-header">
        <h4>Rutas de Despacho</h4>
        <div class="map-actions" *ngIf="interactive">
          <button class="btn-dispatch" (click)="onDispatchAll()">
            <i class="pi pi-send"></i> Despachar Todo
          </button>
        </div>
      </div>

      <div class="map-container">
        <div #mapElement class="map"></div>
      </div>

      <div class="map-summary" *ngIf="showSummary && summary">
        <div class="summary-item">
          <span class="label">Pedidos</span>
          <span class="value">{{ summary.total_orders }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Zonas</span>
          <span class="value">{{ summary.total_zones }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Distancia</span>
          <span class="value">{{ summary.total_distance_km?.toFixed(1) }} km</span>
        </div>
        <div class="summary-item">
          <span class="label">Tiempo Est.</span>
          <span class="value">{{ formatDuration(summary.total_duration_minutes) }}</span>
        </div>
      </div>

      <div class="routes-list" *ngIf="routes.length > 0">
        <div class="route-card" *ngFor="let route of routes; let i = index"
             [style.border-left-color]="getRouteColor(i)">
          <div class="route-header">
            <span class="route-zone">{{ route.zone }}</span>
            <span class="route-count">{{ route.orders_count }} pedidos</span>
          </div>
          <div class="route-metrics" *ngIf="route.metrics">
            <span>{{ route.metrics.total_distance_km?.toFixed(1) }} km</span>
            <span>{{ route.metrics.estimated_duration_minutes }} min</span>
          </div>
          <button class="btn-route-dispatch" *ngIf="interactive"
                  (click)="onDispatchRoute(route, i)">
            Despachar Ruta
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .katuq-dispatch-map {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .map-header h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .btn-dispatch {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .btn-dispatch:hover {
      background: #2563eb;
    }

    .map-container {
      height: 400px;
      position: relative;
    }

    .map {
      width: 100%;
      height: 100%;
    }

    .map-summary {
      display: flex;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-item .label {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .summary-item .value {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    .routes-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .route-card {
      flex: 1;
      min-width: 200px;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 0.5rem;
      border-left: 4px solid #6366f1;
    }

    .route-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .route-zone {
      font-weight: 600;
      color: #374151;
    }

    .route-count {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .route-metrics {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .btn-route-dispatch {
      width: 100%;
      padding: 0.375rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.75rem;
      color: #374151;
    }

    .btn-route-dispatch:hover {
      background: #f3f4f6;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqDispatchMapComponent implements AfterViewInit, OnChanges {
  @Input() props: KatuqDispatchMapProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  @Output() dispatchAction = new EventEmitter<{ action: string; data: any }>();

  @ViewChild('mapElement') mapElement!: ElementRef<HTMLDivElement>;

  private map: any = null;
  private markers: any[] = [];
  private polylines: any[] = [];
  private mapLoaded = false;
  private readonly GOOGLE_MAPS_API_KEY = environment.googleMapsApiKey;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.loadGoogleMaps().then(() => {
      this.mapLoaded = true;
      this.initMap();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.mapLoaded && (changes['props'] || changes['dataModel'])) {
      this.updateMap();
    }
  }

  get center(): { lat: number; lng: number } {
    const centerProps = this.props?.center;
    if (!centerProps) return { lat: 4.6097, lng: -74.0817 }; // Bogota default

    return {
      lat: this.resolve(centerProps.lat) || 4.6097,
      lng: this.resolve(centerProps.lng) || -74.0817
    };
  }

  get zoom(): number {
    return this.resolve(this.props?.zoom) || 12;
  }

  get markers_data(): DispatchMarker[] {
    return this.resolve(this.props?.markers) || [];
  }

  get routes(): DispatchRoute[] {
    return this.resolve(this.props?.routes) || [];
  }

  get polylines_data(): any[] {
    return this.resolve(this.props?.polylines) || [];
  }

  get showSummary(): boolean {
    const value = this.resolve(this.props?.showSummary);
    return value !== false;
  }

  get interactive(): boolean {
    const value = this.resolve(this.props?.interactive);
    return value !== false;
  }

  get summary(): any {
    return this.dataModel?.dispatch?.summary || this.calculateSummary();
  }

  private async loadGoogleMaps(): Promise<void> {
    if (typeof google !== 'undefined' && google.maps) {
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private initMap(): void {
    if (!this.mapElement?.nativeElement) return;

    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: this.center,
      zoom: this.zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    this.updateMap();
  }

  private updateMap(): void {
    if (!this.map) return;

    // Clear existing markers and polylines
    this.clearMap();

    // Add markers
    this.addMarkers();

    // Add polylines
    this.addPolylines();

    // Fit bounds if we have markers
    this.fitBounds();

    this.cdr.markForCheck();
  }

  private clearMap(): void {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    this.polylines.forEach(p => p.setMap(null));
    this.polylines = [];
  }

  private addMarkers(): void {
    const markersData = this.markers_data;

    markersData.forEach((m, index) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: this.map,
        title: `${m.sequence || index + 1}. ${m.cliente || m.nroPedido}`,
        label: {
          text: String(m.sequence || index + 1),
          color: 'white',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: this.getMarkerColor(m.zone || '', index),
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 0.5rem;">
            <strong>${m.nroPedido || 'Pedido'}</strong><br>
            ${m.cliente || ''}<br>
            <small>${m.direccion || ''}</small>
            ${m.valorTotal ? `<br>$${m.valorTotal.toLocaleString()}` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
    });
  }

  private addPolylines(): void {
    const routes = this.routes;

    routes.forEach((route, index) => {
      if (route.polyline) {
        // Decode polyline
        const path = google.maps.geometry.encoding.decodePath(route.polyline);
        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: route.color || this.getRouteColor(index),
          strokeOpacity: 0.8,
          strokeWeight: 4
        });

        polyline.setMap(this.map);
        this.polylines.push(polyline);
      }
    });
  }

  private fitBounds(): void {
    if (this.markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(m => bounds.extend(m.getPosition()));
    this.map.fitBounds(bounds);
  }

  private calculateSummary(): any {
    const routes = this.routes;
    const markers = this.markers_data;

    return {
      total_orders: markers.length || routes.reduce((sum, r) => sum + (r.orders_count || 0), 0),
      total_zones: routes.length,
      total_distance_km: routes.reduce((sum, r) => sum + (r.metrics?.total_distance_km || 0), 0),
      total_duration_minutes: routes.reduce((sum, r) => sum + (r.metrics?.estimated_duration_minutes || 0), 0)
    };
  }

  getRouteColor(index: number): string {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#ec4899', '#84cc16'
    ];
    return colors[index % colors.length];
  }

  private getMarkerColor(zone: string, index: number): string {
    // Try to match zone to route color
    const routeIndex = this.routes.findIndex(r => r.zone === zone);
    if (routeIndex >= 0) {
      return this.getRouteColor(routeIndex);
    }
    return this.getRouteColor(index);
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  }

  onDispatchAll(): void {
    this.ngZone.run(() => {
      this.dispatchAction.emit({
        action: 'dispatch_all',
        data: { routes: this.routes }
      });
    });
  }

  onDispatchRoute(route: DispatchRoute, index: number): void {
    this.ngZone.run(() => {
      this.dispatchAction.emit({
        action: 'dispatch_route',
        data: { route, index }
      });
    });
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
