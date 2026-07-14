import { Component, OnInit } from '@angular/core';
import { CampaignSummary, MarketingService } from '../../services/marketing.service';

/**
 * Historial de campañas WhatsApp (spec 022 — D-096).
 *
 * Lee GET /v1/whatsapp/campaigns: agregado desde whatsapp_usage (docs
 * etiquetados con campaignId por el wizard) SIN colección nueva.
 * La tasa de conversión = % de destinatarios con pedido en la misma empresa
 * dentro de los 30 días posteriores al primer envío (match por teléfono,
 * mismo criterio que el panel de contacto del inbox).
 */
@Component({
  selector: 'app-campanas-historial',
  templateUrl: './campanas-historial.component.html',
  styleUrls: ['./campanas-historial.component.scss'],
})
export class CampanasHistorialComponent implements OnInit {
  loading = false;
  error = false;
  campanas: CampaignSummary[] = [];

  constructor(private marketing: MarketingService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = false;
    this.marketing.getCampaigns().subscribe({
      next: (resp) => {
        this.campanas = resp?.items || [];
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  // --- Totales del encabezado ---
  get totalEnviados(): number {
    return this.campanas.reduce((s, c) => s + c.enviados, 0);
  }

  get totalConvertidos(): number {
    return this.campanas.reduce((s, c) => s + c.convertidos, 0);
  }

  get totalDestinatarios(): number {
    return this.campanas.reduce((s, c) => s + c.destinatarios, 0);
  }

  /** Tasa de conversión global: convertidos / destinatarios de todas las campañas. */
  get tasaGlobal(): number {
    const d = this.totalDestinatarios;
    return d > 0 ? Math.round((this.totalConvertidos / d) * 1000) / 10 : 0;
  }

  get totalVentasAtribuidas(): number {
    return this.campanas.reduce((s, c) => s + (c.ventasAtribuidasCOP || 0), 0);
  }
}
