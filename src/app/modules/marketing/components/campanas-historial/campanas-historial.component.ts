import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CampaignSummary, MarketingService } from '../../services/marketing.service';
import { CampanaCorreo, EstadoCampana, MarketingCorreoService } from '../../services/marketing-correo.service';

/**
 * Historial de campañas WhatsApp (spec 022 — D-096).
 *
 * Lee GET /v1/whatsapp/campaigns: agregado desde whatsapp_usage (docs
 * etiquetados con campaignId por el wizard) SIN colección nueva.
 * La tasa de conversión = % de destinatarios con pedido en la misma empresa
 * dentro de los 30 días posteriores al primer envío (match por teléfono,
 * mismo criterio que el panel de contacto del inbox).
 *
 * Desde D-318 también lista las campañas de CORREO, en su propia pestaña. La
 * pestaña solo aparece si el servidor ya tiene las campañas de correo: así
 * este front puede publicarse antes que el backend sin mostrar nada roto.
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

  canal: 'whatsapp' | 'correo' = 'whatsapp';
  correoDisponible = false;
  cargandoCorreo = false;
  campanasCorreo: CampanaCorreo[] = [];

  constructor(
    private marketing: MarketingService,
    private correo: MarketingCorreoService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargar();
    if (this.route.snapshot.queryParamMap.get('canal') === 'correo') this.canal = 'correo';
    this.cargarCorreo();
  }

  cargarCorreo(): void {
    this.cargandoCorreo = true;
    this.correo.listar().subscribe({
      next: (r) => {
        this.correoDisponible = true;
        this.campanasCorreo = r.data.items || [];
        this.cargandoCorreo = false;
      },
      error: () => {
        // Sin el servidor de campañas de correo: la pestaña no existe.
        this.correoDisponible = false;
        this.cargandoCorreo = false;
        this.canal = 'whatsapp';
      },
    });
  }

  etiquetaEstado(e: EstadoCampana): string {
    return (
      {
        borrador: 'Borrador',
        programada: 'Programada',
        enviando: 'Enviando',
        pausada: 'Pausada',
        pausada_auto: 'Pausada por rebotes',
        terminada: 'Terminada',
        cancelada: 'Cancelada',
      } as Record<EstadoCampana, string>
    )[e];
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
