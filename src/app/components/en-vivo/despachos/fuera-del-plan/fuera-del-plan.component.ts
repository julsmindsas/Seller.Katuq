import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { EnvioAutomatico, FueraDelPlan } from '../plan-despachos.modelos';

interface Bloque {
  razon: string;
  pedidos: Array<{ id: string; nroPedido: string; detalle?: string }>;
}

/**
 * Lo que no entra al plan, agrupado por razón (recoge en tienda, fecha vencida, sin zona…), y lo
 * que va en un envío automático con su estado (D-410). Tocar un número abre la ficha del pedido.
 */
@Component({
  selector: 'app-en-vivo-fuera-del-plan',
  templateUrl: './fuera-del-plan.component.html',
  styleUrls: ['./fuera-del-plan.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFueraDelPlanComponent implements OnChanges, OnDestroy {
  @Input() fuera: ReadonlyArray<FueraDelPlan> = [];
  @Input() automaticos: ReadonlyArray<EnvioAutomatico> = [];
  @Output() abrirPedido = new EventEmitter<string>();

  bloques: Bloque[] = [];
  bloquesAutomaticos: Bloque[] = [];

  private readonly idioma: Subscription;

  constructor(private readonly cambios: ChangeDetectorRef, private readonly translate: TranslateService) {
    // Los bloques se arman en `ngOnChanges`: al cambiar el idioma se rehacen para que no queden en el anterior.
    this.idioma = this.translate.onLangChange.subscribe(() => {
      this.armar();
      this.cambios.markForCheck();
    });
  }

  ngOnChanges(): void {
    this.armar();
  }

  ngOnDestroy(): void {
    this.idioma.unsubscribe();
  }

  private armar(): void {
    const t = (clave: string, params?: Record<string, unknown>): string => this.translate.instant(clave, params);
    this.bloques = agrupar(
      this.fuera.map((f) => ({
        id: f.id,
        nroPedido: f.nroPedido,
        razon: f.razon,
        detalle: f.dias ? t(f.dias === 1 ? 'enVivo.despachos.haceUnDia' : 'enVivo.despachos.haceDias', { n: f.dias }) : undefined,
      }))
    );
    const estado = (a: EnvioAutomatico): string => {
      if (a.estado === 'fallo') return a.proveedor ? t('enVivo.despachos.envioFalloProveedor', { proveedor: a.proveedor }) : t('enVivo.despachos.envioFallo');
      if (a.estado === 'enviado') return a.proveedor ? t('enVivo.despachos.envioEnviadoProveedor', { proveedor: a.proveedor }) : t('enVivo.despachos.envioEnviado');
      return t('enVivo.despachos.envioEsperando');
    };
    this.bloquesAutomaticos = agrupar(this.automaticos.map((a) => ({ id: a.id, nroPedido: a.nroPedido, razon: estado(a), detalle: a.motivo })));
  }

  trackBloque(_: number, b: Bloque): string {
    return b.razon;
  }
}

function agrupar(filas: Array<{ id: string; nroPedido: string; razon: string; detalle?: string }>): Bloque[] {
  const porRazon = new Map<string, Bloque>();
  for (const f of filas) {
    if (!porRazon.has(f.razon)) porRazon.set(f.razon, { razon: f.razon, pedidos: [] });
    porRazon.get(f.razon)!.pedidos.push({ id: f.id, nroPedido: f.nroPedido, detalle: f.detalle });
  }
  return [...porRazon.values()].sort((a, b) => b.pedidos.length - a.pedidos.length || a.razon.localeCompare(b.razon));
}
