import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { EtapaId, EtapaInfo } from '../servicios/en-vivo.modelos';
import { ClaveLista } from '../utilidades/tarjetas';
import { claseTono, ETAPAS_DE_LA_BANDA, mapaDeEtapas } from '../utilidades/tonos';

interface PasoEtapa {
  id: EtapaId;
  nombre: string;
  clase: string;
  n: number;
}

const DURACION_REBOTE_MS = 520;

/**
 * Franja de etapas en TEXTO accesible: una lista ordenada con el nombre y la cantidad de cada
 * etapa (Sin producir → En producción → Producido → Empacado → Para despachar → Despachado → Entregado).
 * Sirve sola, sin la escena 3D. Los nombres y tonos vienen del servidor (`foto.etapas`); las
 * cantidades también. Cada paso se puede tocar para abrir la lista de esos pedidos (`abrir`).
 */
@Component({
  selector: 'app-en-vivo-etapas',
  templateUrl: './en-vivo-etapas.component.html',
  styleUrls: ['./en-vivo-etapas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEtapasComponent implements OnChanges, OnDestroy {
  /** Etapas con nombre y tono, tal como vienen en la foto. Sin ellas se usan las de siempre. */
  @Input() etapas: ReadonlyArray<EtapaInfo> = [];
  @Input() conteos: Partial<Record<EtapaId, number>> = {};
  /** Cuáles se muestran, en orden. Por defecto la banda completa (sin rechazado ni cancelado). */
  @Input() visibles: ReadonlyArray<EtapaId> = ETAPAS_DE_LA_BANDA;
  @Input() animar = true;
  /** false: los pasos no son botones (solo texto). */
  @Input() tocables = true;
  @Output() abrir = new EventEmitter<ClaveLista>();

  pasos: PasoEtapa[] = [];
  rebotando = new Set<EtapaId>();

  private previos = new Map<EtapaId, number>();
  private temporizadores = new Set<number>();

  constructor(private readonly cambios: ChangeDetectorRef) {}

  ngOnChanges(_: SimpleChanges): void {
    const mapa = mapaDeEtapas(this.etapas);
    const siguientes: PasoEtapa[] = [];
    for (const id of this.visibles) {
      const info = mapa.get(id);
      if (!info) continue;
      siguientes.push({ id, nombre: info.nombre, clase: claseTono(info.tono), n: this.conteos[id] ?? 0 });
    }
    if (this.animar) {
      for (const paso of siguientes) {
        const previo = this.previos.get(paso.id);
        if (previo !== undefined && previo !== paso.n) this.rebotar(paso.id);
      }
    }
    for (const paso of siguientes) this.previos.set(paso.id, paso.n);
    this.pasos = siguientes;
  }

  ngOnDestroy(): void {
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  porId(_: number, paso: PasoEtapa): EtapaId {
    return paso.id;
  }

  alTocar(paso: PasoEtapa): void {
    this.abrir.emit(`etapa:${paso.id}`);
  }

  private rebotar(id: EtapaId): void {
    this.rebotando = new Set(this.rebotando).add(id);
    const temporizador = window.setTimeout(() => {
      this.temporizadores.delete(temporizador);
      const copia = new Set(this.rebotando);
      copia.delete(id);
      this.rebotando = copia;
      this.cambios.markForCheck();
    }, DURACION_REBOTE_MS);
    this.temporizadores.add(temporizador);
  }
}
