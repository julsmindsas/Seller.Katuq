import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SubscriptionService } from './subscription.service';

/** Lo que el plan gratis permite en la tienda (D-319). El servidor es quien manda; esto solo se muestra. */
export interface LimitesTiendaPlan {
  tiendasPublicadas: number;
  productosVisibles: number;
  paginasPropias: number;
  cuponesActivos: number;
  promocionesActivas: number;
  puntosRetiro: number;
  dominioPropio: boolean;
  resenas: boolean;
  recordatorioCarrito: boolean;
  correosPersonalizables: boolean;
  feedPauta: boolean;
  conversionesPauta: boolean;
  diasMetricas: number;
  campanasPorMes: number;
  correosCampanaPorMes: number;
  paginasOpttiaPorMes: number;
}

const GRATIS: LimitesTiendaPlan = {
  tiendasPublicadas: 1,
  productosVisibles: 50,
  paginasPropias: 3,
  cuponesActivos: 1,
  promocionesActivas: 1,
  puntosRetiro: 1,
  dominioPropio: false,
  resenas: false,
  recordatorioCarrito: false,
  correosPersonalizables: false,
  feedPauta: false,
  conversionesPauta: false,
  diasMetricas: 1,
  campanasPorMes: 1,
  correosCampanaPorMes: 200,
  paginasOpttiaPorMes: 3,
};

/**
 * El plan de la empresa activa, para mostrar los límites de la tienda y
 * ofrecer mejorar el plan cuando el servidor rechaza algo por él (D-319).
 *
 * Solo muestra: los límites los hace cumplir el servidor, que responde
 * `codigo: "LIMITE_PLAN"` (o `"TOPE_PLAN"` en el checkout).
 */
@Injectable({ providedIn: 'root' })
export class LimitesPlanService {
  constructor(private subscriptions: SubscriptionService, private router: Router) {}

  /** Sin datos de suscripción todavía, se asume pago: no se le muestra un candado a quien no lo tiene. */
  get esGratis(): boolean {
    const s = this.subscriptions.getSubscriptionSync();
    return !!s && s.plan !== 'premium';
  }

  get limites(): LimitesTiendaPlan | null {
    return this.esGratis ? GRATIS : null;
  }

  /** Pedidos que le quedan en el mes (-1 = sin tope). */
  get pedidosRestantes(): number {
    const u = this.subscriptions.getUsageSync();
    if (!this.esGratis || !u || !u.orders) return -1;
    return Math.max(0, Number(u.orders.remaining));
  }

  /**
   * Si el error es un límite del plan, lo explica con el botón para mejorar
   * y devuelve true (quien llama no muestra otro mensaje). Si no, false.
   */
  manejar(e: any): boolean {
    const cuerpo = (e && e.error) || e || {};
    if (cuerpo.codigo !== 'LIMITE_PLAN' && cuerpo.codigo !== 'TOPE_PLAN') return false;
    Swal.fire({
      icon: 'info',
      title: 'Esto es del plan de pago',
      text: cuerpo.message || 'Tu plan actual no incluye esto.',
      showCancelButton: true,
      confirmButtonText: 'Ver planes',
      cancelButtonText: 'Ahora no',
    }).then((r) => {
      if (r.isConfirmed) this.router.navigate(['/pricing']);
    });
    return true;
  }
}
