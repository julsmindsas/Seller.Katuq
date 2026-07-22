import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DispatchRulesService } from '../../services/dispatch-rules.service';

interface GrupoDespacho {
  key: string;
  ciudad: string;
  zona: string;
  pedidos: any[];
  transportadorId: string;
  transportadorNombre: string;
  metodoEnvio: string;
  confianza: string;
  razon: string;
  totalValor: number;
}

@Component({
  selector: 'app-despacho-express-modal',
  templateUrl: './despacho-express-modal.component.html',
  styleUrls: ['./despacho-express-modal.component.scss']
})
export class DespachoExpressModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() pedidos: any[] = [];
  @Input() vendors: any[] = [];
  @Input() ordenesExistentes: any[] = [];
  @Input() visible = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onDispatch = new EventEmitter<{
    grupos: Array<{
      pedidos: string[];
      transportadorId: string;
      transportadorNombre: string;
      metodoEnvio: string;
      zona: string;
    }>;
  }>();

  grupos: GrupoDespacho[] = [];
  pedidosConOrden: any[] = [];
  vendorOptions: { label: string; value: string }[] = [];
  loading = false;
  dispatching = false;

  private destroy$ = new Subject<void>();

  constructor(private dispatchRulesService: DispatchRulesService) {}

  ngOnInit(): void {
    this.buildVendorOptions();
    this.agruparPedidos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vendors']) {
      this.buildVendorOptions();
    }
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.dispatching = false;
      this.pedidosConOrden = [];
      this.agruparPedidos();
      this.sugerirTransportadores();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildVendorOptions(): void {
    if (!this.vendors?.length) return;
    this.vendorOptions = this.vendors.map(v => ({
      label: v.nombres || v.nombre,
      value: v.id || v._id,
    }));
  }

  agruparPedidos(): void {
    const groupMap = new Map<string, GrupoDespacho>();

    for (const pedido of this.pedidos) {
      const ciudad = pedido.envio?.ciudad || pedido.ciudad || 'Sin ciudad';
      const zona = pedido.envio?.zonaCobro || pedido.zonaCobro || 'Sin zona';
      const key = `${ciudad}|${zona}`;

      if (pedido.shippingOrder) {
        this.pedidosConOrden.push(pedido);
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          ciudad,
          zona,
          pedidos: [],
          transportadorId: '',
          transportadorNombre: '',
          metodoEnvio: 'mensajeroPropio',
          confianza: '',
          razon: '',
          totalValor: 0,
        });
      }

      const grupo = groupMap.get(key)!;
      grupo.pedidos.push(pedido);
      grupo.totalValor += pedido.faltaPorPagar || pedido.totalPedidoConDescuento || 0;
    }

    this.grupos = Array.from(groupMap.values()).sort((a, b) => b.pedidos.length - a.pedidos.length);
  }

  private sugerirTransportadores(): void {
    if (this.grupos.length === 0) return;

    this.loading = true;
    this.dispatchRulesService.getRules().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const pendingGroups: GrupoDespacho[] = [];

        for (const grupo of this.grupos) {
          if (grupo.pedidos.length > 0) {
            const accion = this.dispatchRulesService.evaluateRulesLocally(grupo.pedidos[0]);
            if (accion) {
              this.applySuggestion(grupo, accion.transportadorId, accion.transportadorNombre, accion.metodoEnvio || 'mensajeroPropio', 'Regla: ' + accion.transportadorNombre, 'alta');
            } else {
              pendingGroups.push(grupo);
            }
          }
        }

        if (pendingGroups.length > 0) {
          this.fetchBackendSuggestions(pendingGroups);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.fetchBackendSuggestions(this.grupos);
      }
    });
  }

  private fetchBackendSuggestions(groups: GrupoDespacho[]): void {
    let completed = 0;
    const total = groups.length;

    if (total === 0) {
      this.loading = false;
      return;
    }

    for (const grupo of groups) {
      this.dispatchRulesService.suggestTransporter({
        ciudad: grupo.ciudad,
        zonaCobro: grupo.zona,
        valor: grupo.pedidos.length > 0 ? grupo.totalValor / grupo.pedidos.length : 0
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (result) => {
          if (result.sugerido) {
            this.applySuggestion(grupo, result.sugerido.transportadorId, result.sugerido.nombre, result.sugerido.metodoEnvio || 'mensajeroPropio', result.sugerido.razon, result.sugerido.confianza);
          }
          completed++;
          if (completed >= total) this.loading = false;
        },
        error: () => {
          completed++;
          if (completed >= total) this.loading = false;
        }
      });
    }
  }

  private applySuggestion(grupo: GrupoDespacho, transportadorId: string, nombre: string, metodo: string, razon: string, confianza: string): void {
    grupo.transportadorId = transportadorId;
    grupo.transportadorNombre = nombre;
    grupo.metodoEnvio = metodo;
    grupo.razon = razon;
    grupo.confianza = confianza;
  }

  onTransportadorChange(grupo: GrupoDespacho, vendorId: string): void {
    if (vendorId) {
      const vendor = this.vendors.find(v => (v.id || v._id) === vendorId);
      grupo.transportadorId = vendorId;
      grupo.transportadorNombre = vendor ? (vendor.nombres || vendor.nombre) : '';
      grupo.confianza = '';
      grupo.razon = '';
    } else {
      grupo.transportadorId = '';
      grupo.transportadorNombre = '';
      grupo.confianza = '';
      grupo.razon = '';
    }
  }

  onMetodoChange(grupo: GrupoDespacho, metodo: string): void {
    grupo.metodoEnvio = metodo;
    if (metodo === 'recogeEnTienda') {
      grupo.transportadorId = 'recoge-en-tienda';
      grupo.transportadorNombre = 'Recoge en tienda';
      grupo.confianza = '';
      grupo.razon = '';
    } else if (!grupo.transportadorId || grupo.transportadorId === 'recoge-en-tienda') {
      grupo.transportadorId = '';
      grupo.transportadorNombre = '';
    }
  }

  get totalPedidos(): number {
    return this.grupos.reduce((sum, g) => sum + g.pedidos.length, 0);
  }

  get totalValor(): number {
    return this.grupos.reduce((sum, g) => sum + g.totalValor, 0);
  }

  get canDispatch(): boolean {
    return this.grupos.every(g => g.transportadorId) && !this.dispatching;
  }

  despacharTodo(): void {
    if (!this.canDispatch) return;

    this.dispatching = true;

    // Consolidar por mensajero: los grupos por zona que van al MISMO transportador
    // y método de envío se fusionan en UNA sola ruta/orden. El backend crea una
    // shipping order por grupo recibido, así que la fusión se hace aquí.
    // (Tarea 86b8h02pv: "si van un solo mensajero debe ser una sola ruta").
    const consolidado = new Map<string, {
      pedidos: string[];
      transportadorId: string;
      transportadorNombre: string;
      metodoEnvio: string;
      zonas: string[];
    }>();

    for (const g of this.grupos) {
      const mergeKey = `${g.transportadorId}|${g.metodoEnvio}`;
      const zonaLabel = `${g.ciudad} - ${g.zona}`;

      if (!consolidado.has(mergeKey)) {
        consolidado.set(mergeKey, {
          pedidos: [],
          transportadorId: g.transportadorId,
          transportadorNombre: g.transportadorNombre,
          metodoEnvio: g.metodoEnvio,
          zonas: [],
        });
      }

      const entry = consolidado.get(mergeKey)!;
      entry.pedidos.push(...g.pedidos.map(p => p._id));
      if (!entry.zonas.includes(zonaLabel)) entry.zonas.push(zonaLabel);
    }

    const gruposPayload = Array.from(consolidado.values()).map(e => ({
      pedidos: e.pedidos,
      transportadorId: e.transportadorId,
      transportadorNombre: e.transportadorNombre,
      metodoEnvio: e.metodoEnvio,
      zona: e.zonas.join(', '),
    }));

    this.onDispatch.emit({ grupos: gruposPayload });
  }

  cerrar(): void {
    this.onClose.emit();
  }
}
