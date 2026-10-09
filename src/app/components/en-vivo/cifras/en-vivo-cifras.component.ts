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
import { dineroCorto, entero, formatearCifra } from '../utilidades/formato';
import { ClaveLista, TarjetaCifra } from '../utilidades/tarjetas';
import { claseTono } from '../utilidades/tonos';

/** Marca "+N" que aparece un momento sobre una tarjeta cuando su cifra sube. */
interface MarcaSube {
  n: number;
  texto: string;
}

const DURACION_MARCA_MS = 1700;
const DURACION_REBOTE_MS = 520;

/**
 * Tarjetas de cifras del día. Reciben las cifras YA calculadas por el servidor (el front no suma
 * nada): cuentan hasta el valor nuevo con transición, muestran una marca "+1" cuando suben y,
 * si la tarjeta tiene `clave`, se pueden tocar para abrir la lista (`abrir`).
 *
 * Accesibilidad: el número animado va `aria-hidden` y cada tarjeta lleva su texto con el valor
 * final; un solo aviso `aria-live` dice qué cifras cambiaron (no anuncia cada cuadro del conteo).
 */
@Component({
  selector: 'app-en-vivo-cifras',
  templateUrl: './en-vivo-cifras.component.html',
  styleUrls: ['./en-vivo-cifras.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoCifrasComponent implements OnChanges, OnDestroy {
  @Input() tarjetas: ReadonlyArray<TarjetaCifra> = [];
  /** false: sin conteo ni marcas (la repetición del día, por ejemplo). */
  @Input() animar = true;
  /** Texto del grupo para lectores de pantalla. */
  @Input() rotulo = 'Cifras de hoy';
  @Output() abrir = new EventEmitter<ClaveLista>();

  marcas: Record<string, MarcaSube[]> = {};
  rebotando = new Set<string>();
  anuncio = '';

  private previos = new Map<string, number>();
  private haPintado = false;
  private temporizadores = new Set<number>();
  private contador = 0;

  constructor(private readonly cambios: ChangeDetectorRef) {}

  readonly formatear = formatearCifra;
  readonly claseDe = (t: TarjetaCifra): string => (t.tono === 'tinta' ? 't-ink' : claseTono(t.tono));

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['tarjetas']) return;
    const anuncios: string[] = [];
    for (const tarjeta of this.tarjetas) {
      const previo = this.previos.get(tarjeta.id);
      if (this.haPintado && previo !== undefined && tarjeta.valor !== previo) {
        anuncios.push(`${tarjeta.etiqueta}: ${formatearCifra(tarjeta.valor, tarjeta.formato)}`);
        if (this.animar && tarjeta.valor > previo && tarjeta.formato !== 'decimal') this.marcarSube(tarjeta, tarjeta.valor - previo);
      }
      this.previos.set(tarjeta.id, tarjeta.valor);
    }
    if (this.tarjetas.length > 0) this.haPintado = true;
    if (anuncios.length > 0) this.anuncio = anuncios.join('. ');
  }

  ngOnDestroy(): void {
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
  }

  alTocar(tarjeta: TarjetaCifra): void {
    if (tarjeta.clave) this.abrir.emit(tarjeta.clave);
  }

  porId(_: number, tarjeta: TarjetaCifra): string {
    return tarjeta.id;
  }

  porMarca(_: number, marca: MarcaSube): number {
    return marca.n;
  }

  private marcarSube(tarjeta: TarjetaCifra, diferencia: number): void {
    const texto = tarjeta.formato === 'dinero' ? `+${dineroCorto(diferencia)}` : `+${entero(diferencia)}`;
    const marca: MarcaSube = { n: ++this.contador, texto };
    this.marcas = { ...this.marcas, [tarjeta.id]: [marca] };
    this.rebotando = new Set(this.rebotando).add(tarjeta.id);
    this.despues(DURACION_MARCA_MS, () => {
      if (this.marcas[tarjeta.id]?.[0] === marca) {
        const { [tarjeta.id]: _quitada, ...resto } = this.marcas;
        this.marcas = resto;
      }
    });
    this.despues(DURACION_REBOTE_MS, () => {
      const copia = new Set(this.rebotando);
      copia.delete(tarjeta.id);
      this.rebotando = copia;
    });
  }

  private despues(ms: number, tarea: () => void): void {
    const id = window.setTimeout(() => {
      this.temporizadores.delete(id);
      tarea();
      this.cambios.markForCheck();
    }, ms);
    this.temporizadores.add(id);
  }
}
