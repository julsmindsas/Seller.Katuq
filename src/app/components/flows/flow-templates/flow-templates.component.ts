import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FlowsService } from '../services/flows.service';
import { FlowTemplate } from '../interfaces/flow.interface';

/**
 * Pilot template gallery. We hardcode the Cereza→Shopify template so the
 * lunes demo has at least one concrete option. The backend may return more
 * templates via /v1/flows/templates.
 */
const PILOT_TEMPLATE: FlowTemplate = {
  id: 'cereza-to-shopify',
  name: 'Cereza → Shopify',
  description:
    'Cuando un producto cambia en Guía Cereza (Osmosis), traducilo al formato canónico, persistilo en Katuq y publicalo en Shopify.',
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
  installingTemplateId: string | null = null;

  // Spec 003.5 — filtro por proveedor (AC-003.5-02).
  selectedProvider: string = 'all';
  availableProviders: string[] = [];
  filteredTemplates: FlowTemplate[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private flowsService: FlowsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.flowsService
      .getTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          // Always include the pilot template (dedup by id).
          const merged = [
            ...templates.filter((t) => t.id !== PILOT_TEMPLATE.id),
            PILOT_TEMPLATE
          ];
          this.templates = merged;
          this._recomputeProvidersAndFilter();
          this.loading = false;
        },
        error: () => {
          // graceful degrade: just show the pilot
          this.templates = [PILOT_TEMPLATE];
          this._recomputeProvidersAndFilter();
          this.loading = false;
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
      siigo: 'Siigo',
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

  installAndOpen(template: FlowTemplate): void {
    this.installingTemplateId = template.id;
    this.errorMessage = '';
    this.flowsService.installTemplate(template.id).subscribe({
      next: (flow) => {
        this.installingTemplateId = null;
        if (flow) {
          this.router.navigate(['/flows/editor', flow.id]);
        } else {
          this.openInEditorPreview(template);
        }
      },
      error: (err) => {
        this.installingTemplateId = null;
        // Fallback: take user to a "new flow" prefilled with the template graph
        // by stashing it in sessionStorage, so the editor can pick it up.
        try {
          sessionStorage.setItem('katuq.flow.prefill', JSON.stringify(template));
        } catch {
          /* no-op */
        }
        this.openInEditorPreview(template);
      }
    });
  }

  private openInEditorPreview(template: FlowTemplate): void {
    this.router.navigate(['/flows/editor'], { queryParams: { template: template.id } });
  }

  goBack(): void {
    this.router.navigate(['/flows']);
  }

  trackById(_i: number, t: FlowTemplate): string {
    return t.id;
  }
}
