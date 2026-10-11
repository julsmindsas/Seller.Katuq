import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModuloIA, ModulosIaService } from '../../services/modulos-ia.service';
import { OpttiaChatService } from '../../services/opttia-chat.service';

const TITULOS: Record<ModuloIA, string> = {
  clientes: 'Clientes para recuperar',
  cartera: 'A quién cobrar primero',
  pedidos: 'Pedidos que necesitan atención',
};

const PREGUNTAS: Record<ModuloIA, string[]> = {
  clientes: ['¿Qué clientes dejaron de comprarme?', '¿Quiénes son mis mejores clientes este trimestre?'],
  cartera: ['¿A quién le cobro primero esta semana?', '¿Cuánta cartera tengo vencida?'],
  pedidos: ['¿Qué pedidos necesitan atención hoy?'],
};

const TIPOS_PEDIDO: Record<string, { texto: string; clase: string }> = {
  por_producir: { texto: 'Por producir', clase: 'is-danger' },
  pagado_quieto: { texto: 'Pagado sin empezar', clase: 'is-warning' },
  sin_pago: { texto: 'Sin pago', clase: 'is-slate' },
};

/**
 * IA de los módulos principales (openspec/changes/ia-modulos-principales). Se carga solo
 * cuando la persona lo pide: leer 12 meses de pedidos en cada apertura de pantalla le
 * costaría lecturas al comercio. Toda cifra viene del servidor; Opttia solo redacta.
 * El mensaje de WhatsApp lo envía la persona (enlace wa.me): nada sale solo.
 */
@Component({
  selector: 'app-modulo-ia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modulo-ia.component.html',
  styleUrls: ['../../../components/inventarios/central-abastecimiento/insights.shared.scss', './modulo-ia.component.scss']
})
export class ModuloIaComponent implements OnDestroy {
  @Input() modulo: ModuloIA = 'clientes';

  private destroy$ = new Subject<void>();
  abierto = false;
  cargando = false;
  explicando = false;
  error: string | null = null;
  d: any = null;
  ia: any = null;
  avisoIA: string | null = null;
  copiado: string | null = null;

  // markForCheck: el panel vive dentro de pantallas OnPush (Cartera) y sin esto no se repinta.
  constructor(private servicio: ModulosIaService, private opttia: OpttiaChatService, private cdr: ChangeDetectorRef) {}

  get titulo(): string { return TITULOS[this.modulo]; }
  get preguntas(): string[] { return PREGUNTAS[this.modulo]; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrir(): void {
    this.abierto = true;
    if (!this.d) this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.servicio.obtener(this.modulo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.d = r.insights; this.cargando = false; this.cdr.markForCheck(); },
      error: (e) => {
        this.error = e?.status === 403
          ? 'Esta información la ven los roles de tesorería y administración.'
          : (e?.error?.error || 'No pudimos calcular esto en este momento. Intente de nuevo en unos minutos.');
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  explicar(): void {
    if (this.explicando) return;
    this.explicando = true;
    this.avisoIA = null;
    this.servicio.explicar(this.modulo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.d = r.insights; this.ia = r.ia || null; this.avisoIA = r.aviso || null; this.explicando = false; this.cdr.markForCheck(); },
      error: (e) => {
        this.avisoIA = e?.status === 429 || e?.status === 403
          ? (e?.error?.message || 'Se acabaron los mensajes de Opttia de su plan por hoy. Las cifras siguen siendo correctas.')
          : 'Opttia no está disponible ahora; las cifras son las calculadas.';
        this.explicando = false;
        this.cdr.markForCheck();
      },
    });
  }

  frase(bloque: string, id: string, base: string): string {
    return this.ia?.[bloque]?.[id] || base;
  }

  esIA(bloque: string, id: string): boolean {
    return !!this.ia?.[bloque]?.[id];
  }

  /** Enlace de WhatsApp con la plantilla de Opttia y el primer nombre; lo envía la persona. */
  whatsapp(f: any, plantilla: string): string | null {
    const texto = this.ia?.plantillas?.[plantilla];
    if (!f?.whatsapp || !texto) return null;
    const nombre = String(f.nombre || '').split(' ')[0] || '';
    return `https://wa.me/${f.whatsapp}?text=${encodeURIComponent(texto.replace(/\{nombre\}/g, nombre).trim())}`;
  }

  async copiar(f: any, plantilla: string): Promise<void> {
    const texto = this.ia?.plantillas?.[plantilla];
    if (!texto) return;
    const nombre = String(f.nombre || '').split(' ')[0] || '';
    try {
      await navigator.clipboard.writeText(texto.replace(/\{nombre\}/g, nombre).trim());
      this.copiado = f.id;
      this.cdr.markForCheck();
      setTimeout(() => { this.copiado = null; this.cdr.markForCheck(); }, 2000);
    } catch {
      this.copiado = null;
    }
  }

  tipoPedido(t: string): { texto: string; clase: string } {
    return TIPOS_PEDIDO[t] || { texto: t, clase: 'is-slate' };
  }

  dinero(v: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
  }

  preguntar(p: string): void {
    this.opttia.askFromScreen(p);
  }
}
