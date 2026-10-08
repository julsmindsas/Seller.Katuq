import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { FlowsService } from '../services/flows.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { FlowTemplate, FlowSpec, NodeSpec } from '../interfaces/flow.interface';
import { SistemaVisible, cuandoArranca, inicialDe, integracionesNecesarias, recorrido } from '../flows-lenguaje';

/** Node credential key → integration provider key (no siempre coinciden). */
const PROVIDER_ALIASES: { [k: string]: string } = {
  worldoffice: 'world_office',
  aliaddo: 'aliaddo_fulfillment'
};

/** Labels amigables para el wizard. */
const PROVIDER_LABELS: { [k: string]: string } = {
  osmosis: 'Cereza',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  siigo: 'SIIGO',
  fullpi: 'Fullpi',
  aliaddo_fulfillment: 'Aliaddo',
  world_office: 'World Office',
  worldoffice: 'World Office',
  aliaddo: 'Aliaddo',
  enviame: 'Envíame',
  wompi: 'Wompi',
  epayco: 'ePayco'
};

function normalizeProvider(p: string): string {
  const key = (p || '').toLowerCase();
  return PROVIDER_ALIASES[key] || key;
}

function providerLabel(p: string): string {
  const key = (p || '').toLowerCase();
  return PROVIDER_LABELS[normalizeProvider(key)] || PROVIDER_LABELS[key] || p;
}

/**
 * Textos para el comercio. Las plantillas del backend traen nombres y
 * descripciones técnicas ("CanonicalOrder", "Idempotente vía…") y en voseo.
 * Solo cambia lo que se MUESTRA: se instala la misma plantilla (mismo id).
 */
const TEXTOS_PLANTILLA: { [idONombre: string]: { name: string; description: string } } = {
  'cereza-products-to-shopify': {
    name: 'Publicar en Shopify los productos de Cereza',
    description: 'Cada 5 minutos Katuq revisa los productos que cambiaron en Cereza, los guarda y los publica en tu tienda Shopify.'
  },
  'shopify-orders-to-cereza': {
    name: 'Mandar a Cereza los pedidos de Shopify',
    description: 'Cuando entra un pedido en tu Shopify, Katuq lo registra y se lo pasa a Cereza para que lo despache. Si el aviso llega dos veces, no lo duplica.'
  },
  'Empujar stock de Katuq a WooCommerce': {
    name: 'Mantener al día tus existencias en WooCommerce',
    description: 'Cuando cambian tus existencias en Katuq, se actualizan solas en tu tienda WooCommerce. Útil si manejas varias bodegas.'
  },
  'Sincronizar productos de WooCommerce a Katuq': {
    name: 'Traer a Katuq los productos de WooCommerce',
    description: 'Cada 15 minutos Katuq trae los productos que agregues o cambies en tu tienda WooCommerce, sin que hagas nada.'
  }
};

function conTextosParaComercio(t: FlowTemplate): FlowTemplate {
  const textos = TEXTOS_PLANTILLA[t.id] || TEXTOS_PLANTILLA[t.name];
  return textos ? { ...t, ...textos } : t;
}

interface RequiredIntegration {
  provider: string;
  label: string;
  connected: boolean;
}

interface FreqOption {
  value: number;
  label: string;
}

/**
 * Pilot template gallery. We hardcode the Cereza→Shopify template so the
 * lunes demo has at least one concrete option. The backend may return more
 * templates via /v1/flows/templates.
 */
const PILOT_TEMPLATE: FlowTemplate = {
  id: 'cereza-to-shopify',
  name: 'Cereza → Shopify',
  description:
    'Cuando un producto cambia en Cereza, Katuq lo guarda y lo publica en tu tienda Shopify.',
  category: 'Catálogo',
  tags: ['osmosis', 'shopify', 'productos'],
  graph: {
    nodes: [
      {
        id: 'trigger',
        type: 'osmosis-product-changed',
        position: { x: 80, y: 120 },
        params: { nodeSlug: 'cereza', events: ['created', 'updated'] }
      },
      {
        id: 'mapper',
        type: 'katuq-canonical-mapper',
        position: { x: 360, y: 120 },
        params: {
          direction: 'external_to_canonical',
          provider: 'osmosis',
          entity: 'product'
        }
      },
      {
        id: 'persist',
        type: 'katuq-product-upsert',
        position: { x: 640, y: 120 },
        params: { matchBy: 'referencia', createIfMissing: true }
      },
      {
        id: 'publish',
        type: 'shopify-product-upsert',
        position: { x: 920, y: 120 },
        params: { publishToOnlineStore: true, syncImages: true, syncInventory: false }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger', sourcePort: 'main', target: 'mapper', targetPort: 'main' },
      { id: 'e2', source: 'mapper', sourcePort: 'main', target: 'persist', targetPort: 'main' },
      { id: 'e3', source: 'persist', sourcePort: 'main', target: 'publish', targetPort: 'main' }
    ]
  }
};

@Component({
  selector: 'app-flow-templates',
  templateUrl: './flow-templates.component.html',
  styleUrls: ['./flow-templates.component.scss']
})
export class FlowTemplatesComponent implements OnInit, OnDestroy {
  templates: FlowTemplate[] = [];
  loading = false;
  errorMessage = '';

  // Spec 003.5 — filtro por proveedor (AC-003.5-02).
  selectedProvider: string = 'all';
  availableProviders: string[] = [];
  filteredTemplates: FlowTemplate[] = [];

  // ----- Wizard de setup -----
  @ViewChild('setupModal') setupModalTpl!: TemplateRef<any>;
  private modalRef?: NgbModalRef;
  private catalogByType = new Map<string, NodeSpec>();
  /** null = aún no verificado / fetch falló → no bloquear ni marcar como faltante. */
  private connectedProviders: string[] | null = null;

  wizardTemplate: FlowTemplate | null = null;
  requiredIntegrations: RequiredIntegration[] = [];
  pollingNodeId: string | null = null;
  syncMinutes: number | null = null;
  wizardBusy = false;
  readonly freqOptions: FreqOption[] = [
    { value: 5, label: 'Cada 5 minutos' },
    { value: 15, label: 'Cada 15 minutos' },
    { value: 30, label: 'Cada 30 minutos' },
    { value: 60, label: 'Cada hora' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private flowsService: FlowsService,
    private integrationsService: IntegrationsService,
    private modal: NgbModal,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.flowsService
      .getTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          // La plantilla local solo se usa si el backend no devolvió ninguna:
          // repetía "Cereza → Shopify (Productos)" con otro nombre.
          const merged = templates.length ? templates : [PILOT_TEMPLATE];
          this.templates = merged.map(conTextosParaComercio);
          this._recomputeProvidersAndFilter();
          this.loading = false;
        },
        error: () => {
          // graceful degrade: just show the pilot
          this.templates = [PILOT_TEMPLATE].map(conTextosParaComercio);
          this._recomputeProvidersAndFilter();
          this.loading = false;
        }
      });

    // Catálogo de nodos → mapear node.type → credentials para el wizard.
    this.flowsService
      .getNodeCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe((catalog) => {
        this.catalogByType = new Map((catalog || []).map((s) => [s.type, s]));
      });

    // Integraciones conectadas → chequeo del wizard. Si falla, null (no bloquear).
    this.integrationsService
      .getActiveIntegrations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (integrations) => {
          this.connectedProviders = (integrations || [])
            .map((i) => (i.provider || i.type || '').toLowerCase())
            .filter(Boolean);
        },
        error: () => {
          this.connectedProviders = null;
        }
      });
  }

  /** Spec 003.5 — usuario hace click en un chip de proveedor. */
  selectProvider(provider: string): void {
    this.selectedProvider = provider;
    this._recomputeProvidersAndFilter();
  }

  /** Nombre amigable para mostrar en el chip. */
  providerLabel(provider: string): string {
    if (provider === 'all') return 'Todas';
    const map: { [k: string]: string } = {
      woocommerce: 'WooCommerce',
      shopify: 'Shopify',
      osmosis: 'Cereza',
      wompi: 'Wompi',
      siigo: 'Siigo'
    };
    return map[provider] || provider;
  }

  private _recomputeProvidersAndFilter(): void {
    const providers = new Set<string>();
    for (const t of this.templates) {
      const p = this._inferProvider(t);
      if (p) providers.add(p);
    }
    this.availableProviders = Array.from(providers).sort();

    if (this.selectedProvider === 'all') {
      this.filteredTemplates = [...this.templates];
    } else {
      this.filteredTemplates = this.templates.filter(
        (t) => this._inferProvider(t) === this.selectedProvider
      );
    }
  }

  /**
   * Resuelve el proveedor de un template. Prioriza `template.provider` explícito
   * (seedeado Spec 003.5). Para templates legacy sin provider, lo infiere de tags.
   */
  private _inferProvider(t: FlowTemplate): string | null {
    if (t.provider) return t.provider;
    const tags = (t.tags || []).map((x) => x.toLowerCase());
    const known = ['woocommerce', 'shopify', 'osmosis', 'cereza', 'wompi', 'siigo'];
    for (const p of known) {
      if (tags.includes(p)) return p === 'cereza' ? 'osmosis' : p;
    }
    return null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===================== WIZARD =====================

  /** Abre el wizard de setup para el template elegido. */
  openWizard(template: FlowTemplate): void {
    this.wizardTemplate = template;
    this.requiredIntegrations = this._deriveRequiredIntegrations(template);
    const polling = this._derivePolling(template);
    this.pollingNodeId = polling ? polling.nodeId : null;
    this.syncMinutes = polling ? polling.interval : null;
    this.wizardBusy = false;
    this.modalRef = this.modal.open(this.setupModalTpl, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      windowClass: 'kq-au-modal'
    });
  }

  /** ¿Pudimos verificar las integraciones de la empresa? */
  get integrationsVerified(): boolean {
    return this.connectedProviders !== null;
  }

  /** Habilita "Activar ahora": si no pudimos verificar, no bloqueamos. */
  get canActivate(): boolean {
    if (!this.integrationsVerified) return true;
    return this.requiredIntegrations.every((r) => r.connected);
  }

  /** Lista de integraciones faltantes (para el resumen del wizard). */
  get missingIntegrations(): RequiredIntegration[] {
    return this.requiredIntegrations.filter((r) => !r.connected);
  }

  private _deriveRequiredIntegrations(t: FlowTemplate): RequiredIntegration[] {
    const providers = new Set<string>();
    for (const n of t.graph?.nodes || []) {
      const spec = this.catalogByType.get(n.type);
      const creds = spec && (spec as any).credentials;
      if (!creds) continue;
      (Array.isArray(creds) ? creds : [creds]).forEach((c: string) =>
        providers.add(normalizeProvider(c))
      );
    }
    // El catálogo hoy no trae `credentials`, así que el asistente decía siempre
    // "no requiere integraciones" y dejaba encender plantillas que fallarían.
    // Se deducen también del tipo de cada paso (shopify-*, osmosis-*…).
    integracionesNecesarias(t.graph).forEach((s) => providers.add(normalizeProvider(s.integracion!)));
    const verified = this.connectedProviders !== null;
    const connectedSet = new Set((this.connectedProviders || []).map(normalizeProvider));
    return Array.from(providers).map((p) => ({
      provider: p,
      label: providerLabel(p),
      // Si no verificamos, lo dejamos como "conectado" para no bloquear ni
      // marcar falso-faltante; la UI muestra estado neutro vía integrationsVerified.
      connected: verified ? connectedSet.has(p) : true
    }));
  }

  /** Resuelve el nodo trigger de polling y su intervalo, si aplica. */
  private _derivePolling(t: FlowTemplate): { nodeId: string; interval: number } | null {
    const binding = (t.triggers || []).find((tr: any) => tr.type === 'polling');
    if (binding && binding.nodeId) {
      return { nodeId: binding.nodeId, interval: binding.config?.intervalMinutes ?? 5 };
    }
    const nodeWithInterval = (t.graph?.nodes || []).find(
      (n: any) => n.params && typeof n.params.intervalMinutes === 'number'
    );
    if (nodeWithInterval) {
      return { nodeId: nodeWithInterval.id, interval: nodeWithInterval.params.intervalMinutes };
    }
    // ¿Trigger con capacidad de polling según su schema?
    const triggerNode = (t.graph?.nodes || []).find((n: any) => {
      const spec = this.catalogByType.get(n.type);
      return spec?.category === 'trigger' && spec?.schema?.properties?.intervalMinutes;
    });
    if (triggerNode) {
      const spec = this.catalogByType.get(triggerNode.type);
      const def = spec?.schema?.properties?.intervalMinutes?.default ?? 5;
      return { nodeId: triggerNode.id, interval: triggerNode.params?.intervalMinutes ?? def };
    }
    return null;
  }

  /** Construye el PUT de override (solo si cambió la frecuencia). */
  private _buildOverridePayload(flow: FlowSpec): Partial<FlowSpec> | null {
    if (!this.pollingNodeId || this.syncMinutes == null) return null;
    const minutes = this.syncMinutes;
    let changed = false;

    const graph = JSON.parse(JSON.stringify(flow.graph || { nodes: [], edges: [] }));
    const node = (graph.nodes || []).find((n: any) => n.id === this.pollingNodeId);
    if (node) {
      node.params = { ...(node.params || {}), intervalMinutes: minutes };
      changed = true;
    }

    let triggers = flow.triggers;
    if (Array.isArray(flow.triggers) && flow.triggers.length) {
      triggers = JSON.parse(JSON.stringify(flow.triggers)).map((tr: any) => {
        if (tr.nodeId === this.pollingNodeId || tr.type === 'polling') {
          tr.config = { ...(tr.config || {}), intervalMinutes: minutes };
          changed = true;
        }
        return tr;
      });
    }

    return changed ? { graph, triggers } : null;
  }

  /** Botón primario: instala + aplica ajustes + activa. */
  activateNow(): void {
    this._runInstall(true);
  }

  /** Botón secundario: instala + aplica ajustes y abre el editor (borrador). */
  openInEditor(): void {
    this._runInstall(false);
  }

  private _runInstall(activate: boolean): void {
    const template = this.wizardTemplate;
    if (!template || this.wizardBusy) return;
    this.wizardBusy = true;

    this.flowsService
      .installTemplate(template.id)
      .pipe(
        switchMap((flow) => {
          if (!flow) return of(null as FlowSpec | null);
          const override = this._buildOverridePayload(flow);
          if (!override) return of(flow);
          return this.flowsService.update(flow.id, override).pipe(map((u) => u || flow));
        }),
        switchMap((flow) => {
          if (!flow || !activate) return of(flow);
          return this.flowsService.activate(flow.id).pipe(map((a) => a || flow));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (flow) => {
          this.wizardBusy = false;
          if (!flow) {
            this._fallbackToPreview(template);
            return;
          }
          this.closeWizard();
          if (activate) {
            this.toastr.success(`«${flow.name}» quedó encendida.`, '', { timeOut: 2800 });
            this.router.navigate(['/flows']);
          } else {
            this.router.navigate(['/flows/editor', flow.id]);
          }
        },
        error: (err) => {
          this.wizardBusy = false;
          if (activate) {
            this.toastr.error(
              'No pudimos encender la automatización. Ábrela en modo avanzado y revisa sus pasos.',
              'Error',
              { timeOut: 5000 }
            );
          } else {
            this._fallbackToPreview(template);
          }
        }
      });
  }

  /** Si el backend de install no está disponible, prefill + editor (como antes). */
  private _fallbackToPreview(template: FlowTemplate): void {
    try {
      sessionStorage.setItem('katuq.flow.prefill', JSON.stringify(template));
    } catch {
      /* no-op */
    }
    this.closeWizard();
    this.router.navigate(['/flows/editor'], { queryParams: { template: template.id } });
  }

  closeWizard(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = undefined;
    }
  }

  goToIntegrations(): void {
    if (this.modalRef) {
      this.modalRef.dismiss();
      this.modalRef = undefined;
    }
    this.router.navigate(['/integrations']);
  }

  goBack(): void {
    this.router.navigate(['/flows']);
  }

  trackById(_i: number, t: FlowTemplate): string {
    return t.id;
  }

  // ===== Lenguaje para personas no técnicas (2026-10-07, D-350 parte C) =====
  ruta(t: FlowTemplate): { de: SistemaVisible | null; a: SistemaVisible[] } {
    return recorrido(t.graph, t.triggers, this.catalogByType);
  }

  cuando(t: FlowTemplate): string {
    return cuandoArranca(t, this.catalogByType);
  }

  /** "Katuq y Shopify" / "Katuq, SIIGO y Shopify". */
  nombresDe(sistemas: { nombre: string }[]): string {
    const n = sistemas.map((s) => s.nombre);
    return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
  }

  inicialDe(nombre: string): string {
    return inicialDe(nombre);
  }
}
