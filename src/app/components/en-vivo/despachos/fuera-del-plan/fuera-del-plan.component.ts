import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
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
export class EnVivoFueraDelPlanComponent implements OnChanges {
  @Input() fuera: ReadonlyArray<FueraDelPlan> = [];
  @Input() automaticos: ReadonlyArray<EnvioAutomatico> = [];
  @Output() abrirPedido = new EventEmitter<string>();

  bloques: Bloque[] = [];
  bloquesAutomaticos: Bloque[] = [];

  ngOnChanges(): void {
    this.bloques = agrupar(this.fuera.map((f) => ({ id: f.id, nroPedido: f.nroPedido, razon: f.razon, detalle: f.dias ? `hace ${f.dias} ${f.dias === 1 ? 'día' : 'días'}` : undefined })));
    const estado = (a: EnvioAutomatico) =>
      a.estado === 'fallo' ? `Falló el envío${a.proveedor ? ` a ${a.proveedor}` : ''}` : a.estado === 'enviado' ? `Ya se envió${a.proveedor ? ` a ${a.proveedor}` : ''}` : 'Esperando una condición';
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
