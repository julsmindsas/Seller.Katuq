import { Component, Input, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';

interface UbicacionPedido {
  nroPedido: string;
  estado: string;
  cliente: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  transportador?: string;
  fechaEntrega: string;
  horaEstimada?: string;
  distanciaRestante?: number;
  tiempoEstimado?: number;
}

interface ConfiguracionMapa {
  centroMapa: { lat: number; lng: number };
  zoom: number;
  ubicaciones: UbicacionPedido[];
}

@Component({
  selector: 'app-mapa-ubicaciones',
  templateUrl: './mapa-ubicaciones.component.html',
  styleUrls: ['./mapa-ubicaciones.component.scss']
})
export class MapaUbicacionesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef;
  
  @Input() configuracion: ConfiguracionMapa = {
    centroMapa: { lat: 4.6097, lng: -74.0817 },
    zoom: 11,
    ubicaciones: []
  };
  
  @Input() altura: string = '400px';
  @Input() mostrarControles: boolean = true;
  @Input() tiempoReal: boolean = false;

  mapa: any = null;
  marcadores: any[] = [];
  intervalTimer: any = null;
  leafletCargado: boolean = false;

  // Configuración de íconos para diferentes estados
  iconosEstado = {
    'Despachado': {
      color: 'green',
      icon: '🚚',
      animation: true
    },
    'ParaDespachar': {
      color: 'orange',
      icon: '📦',
      animation: false
    },
    'Empacado': {
      color: 'blue',
      icon: '📋',
      animation: false
    },
    'ProducidoTotalmente': {
      color: 'purple',
      icon: '✅',
      animation: false
    }
  };

  constructor() { }

  ngOnInit(): void {
    this.cargarLeaflet();
  }

  ngAfterViewInit(): void {
    // Inicializar el mapa después de que la vista esté lista
    setTimeout(() => {
      if (this.leafletCargado) {
        this.inicializarMapa();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    if (this.mapa) {
      this.mapa.remove();
    }
  }

  public async cargarLeaflet(): Promise<void> {
    try {
      // Verificar si Leaflet ya está cargado
      if (typeof window !== 'undefined' && (window as any).L) {
        this.leafletCargado = true;
        return;
      }

      // Cargar dinámicamente Leaflet
      await this.cargarScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await this.cargarCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      
      this.leafletCargado = true;
      
      // Inicializar el mapa una vez que Leaflet esté cargado
      if (this.mapaContainer) {
        this.inicializarMapa();
      }
    } catch (error) {
      console.error('Error cargando Leaflet:', error);
      this.leafletCargado = false;
    }
  }

  private cargarScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Error cargando script: ${url}`));
      document.head.appendChild(script);
    });
  }

  private cargarCSS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Error cargando CSS: ${url}`));
      document.head.appendChild(link);
    });
  }

  private inicializarMapa(): void {
    if (!this.leafletCargado || !this.mapaContainer) {
      return;
    }

    try {
      const L = (window as any).L;
      
      // Crear el mapa
      this.mapa = L.map(this.mapaContainer.nativeElement, {
        center: [this.configuracion.centroMapa.lat, this.configuracion.centroMapa.lng],
        zoom: this.configuracion.zoom,
        zoomControl: this.mostrarControles
      });

      // Agregar capa de tiles (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.mapa);

      // Agregar marcadores
      this.agregarMarcadores();

      // Configurar actualización en tiempo real si está habilitada
      if (this.tiempoReal) {
        this.iniciarActualizacionTiempoReal();
      }

      // Ajustar vista a todos los marcadores
      this.ajustarVistaAMarcadores();

    } catch (error) {
      console.error('Error inicializando mapa:', error);
    }
  }

  private agregarMarcadores(): void {
    if (!this.mapa || !this.leafletCargado) {
      return;
    }

    const L = (window as any).L;
    
    // Limpiar marcadores existentes
    this.marcadores.forEach(marcador => {
      this.mapa.removeLayer(marcador);
    });
    this.marcadores = [];

    // Agregar nuevos marcadores
    this.configuracion.ubicaciones.forEach(ubicacion => {
      if (ubicacion.latitud && ubicacion.longitud) {
        const iconoConfig = this.iconosEstado[ubicacion.estado] || this.iconosEstado['ParaDespachar'];
        
        // Crear ícono personalizado
        const icono = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="marker-container" style="
              background-color: ${iconoConfig.color};
              border-radius: 50%;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              ${iconoConfig.animation ? 'animation: pulse 2s infinite;' : ''}
            ">
              ${iconoConfig.icon}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        // Crear marcador
        const marcador = L.marker([ubicacion.latitud, ubicacion.longitud], { icon: icono });

        // Crear popup con información del pedido
        const popupContent = this.crearContenidoPopup(ubicacion);
        marcador.bindPopup(popupContent);

        // Agregar evento de click
        marcador.on('click', () => {
          this.onMarcadorClick(ubicacion);
        });

        // Agregar al mapa
        marcador.addTo(this.mapa);
        this.marcadores.push(marcador);
      }
    });
  }

  private crearContenidoPopup(ubicacion: UbicacionPedido): string {
    const estadoClass = this.obtenerClaseEstado(ubicacion.estado);
    
    return `
      <div class="popup-pedido" style="min-width: 200px; font-family: Arial, sans-serif;">
        <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
          <h6 style="margin: 0; color: #333; font-size: 14px;">
            <strong>Pedido #${ubicacion.nroPedido}</strong>
          </h6>
          <span class="badge ${estadoClass}" style="
            font-size: 10px; 
            padding: 2px 6px; 
            border-radius: 12px;
            margin-top: 4px;
            display: inline-block;
          ">${ubicacion.estado}</span>
        </div>
        
        <div style="font-size: 12px; color: #666; line-height: 1.4;">
          <div style="margin-bottom: 4px;">
            <strong>Cliente:</strong> ${ubicacion.cliente}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Dirección:</strong> ${ubicacion.direccion}
          </div>
          ${ubicacion.transportador ? `
            <div style="margin-bottom: 4px;">
              <strong>Transportador:</strong> ${ubicacion.transportador}
            </div>
          ` : ''}
          ${ubicacion.horaEstimada ? `
            <div style="margin-bottom: 4px;">
              <strong>Hora estimada:</strong> ${ubicacion.horaEstimada}
            </div>
          ` : ''}
          ${ubicacion.tiempoEstimado ? `
            <div style="margin-bottom: 4px;">
              <strong>Tiempo estimado:</strong> ${ubicacion.tiempoEstimado} min
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private obtenerClaseEstado(estado: string): string {
    const clases = {
      'Despachado': 'bg-success',
      'ParaDespachar': 'bg-warning',
      'Empacado': 'bg-info',
      'ProducidoTotalmente': 'bg-primary'
    };
    return clases[estado] || 'bg-secondary';
  }

  public ajustarVistaAMarcadores(): void {
    if (!this.mapa || this.marcadores.length === 0) {
      return;
    }

    const L = (window as any).L;
    const grupo = new L.featureGroup(this.marcadores);
    this.mapa.fitBounds(grupo.getBounds().pad(0.1));
  }

  private iniciarActualizacionTiempoReal(): void {
    // Actualizar posiciones cada 30 segundos (simulado)
    this.intervalTimer = setInterval(() => {
      this.simularMovimientoPedidos();
    }, 30000);
  }

  private simularMovimientoPedidos(): void {
    // Simular pequeños movimientos para pedidos en ruta
    this.configuracion.ubicaciones.forEach(ubicacion => {
      if (ubicacion.estado === 'Despachado' && ubicacion.latitud && ubicacion.longitud) {
        // Pequeño movimiento aleatorio (simulando avance en la ruta)
        const variacion = 0.001; // Aproximadamente 100 metros
        ubicacion.latitud += (Math.random() - 0.5) * variacion;
        ubicacion.longitud += (Math.random() - 0.5) * variacion;
        
        // Actualizar tiempo estimado (reducir aleatoriamente)
        if (ubicacion.tiempoEstimado && ubicacion.tiempoEstimado > 5) {
          ubicacion.tiempoEstimado -= Math.floor(Math.random() * 3) + 1;
        }
      }
    });

    // Actualizar marcadores en el mapa
    this.agregarMarcadores();
  }

  // Método público para actualizar configuración
  actualizarConfiguracion(nuevaConfiguracion: ConfiguracionMapa): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
    
    if (this.mapa) {
      this.agregarMarcadores();
      this.ajustarVistaAMarcadores();
    }
  }

  // Método público para centrar en una ubicación específica
  centrarEnUbicacion(nroPedido: string): void {
    const ubicacion = this.configuracion.ubicaciones.find(u => u.nroPedido === nroPedido);
    
    if (ubicacion && ubicacion.latitud && ubicacion.longitud && this.mapa) {
      this.mapa.setView([ubicacion.latitud, ubicacion.longitud], 15);
      
      // Abrir popup del marcador correspondiente
      const marcador = this.marcadores.find((m, index) => 
        this.configuracion.ubicaciones[index].nroPedido === nroPedido
      );
      
      if (marcador) {
        marcador.openPopup();
      }
    }
  }

  // Evento cuando se hace click en un marcador
  private onMarcadorClick(ubicacion: UbicacionPedido): void {
    // Emitir evento o realizar acción específica
    console.log('Pedido seleccionado:', ubicacion);
  }

  // Métodos getter para usar en el template
  get contadorDespachados(): number {
    return this.configuracion.ubicaciones.filter(u => u.estado === 'Despachado').length;
  }

  get contadorParaDespachar(): number {
    return this.configuracion.ubicaciones.filter(u => u.estado === 'ParaDespachar').length;
  }

  get contadorEmpacados(): number {
    return this.configuracion.ubicaciones.filter(u => u.estado === 'Empacado').length;
  }

  get contadorProducidos(): number {
    return this.configuracion.ubicaciones.filter(u => u.estado === 'ProducidoTotalmente').length;
  }

  get contadorPendientes(): number {
    return this.configuracion.ubicaciones.filter(u => u.estado !== 'Despachado').length;
  }

  get contadorEnRuta(): number {
    return this.configuracion.ubicaciones.filter(u => u.estado === 'Despachado').length;
  }

  // Método público para obtener estadísticas del mapa
  obtenerEstadisticas() {
    const stats = {
      totalUbicaciones: this.configuracion.ubicaciones.length,
      enRuta: this.contadorDespachados,
      paraDespacho: this.contadorParaDespachar,
      empacados: this.contadorEmpacados,
      tiempoPromedioEstimado: this.calcularTiempoPromedioEstimado()
    };

    return stats;
  }

  private calcularTiempoPromedioEstimado(): number {
    const tiempos = this.configuracion.ubicaciones
      .filter(u => u.tiempoEstimado && u.tiempoEstimado > 0)
      .map(u => u.tiempoEstimado!);
    
    if (tiempos.length === 0) return 0;
    
    return Math.round(tiempos.reduce((sum, tiempo) => sum + tiempo, 0) / tiempos.length);
  }
}