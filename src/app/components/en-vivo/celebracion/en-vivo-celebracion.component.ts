import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Confeti } from '../utilidades/celebraciones';
import { prefiereMenosMovimiento } from '../utilidades/movimiento';

const DURACION_AVISO_MS = 3800;
const VARIABLES_CONFETI: ReadonlyArray<string> = [
  '--ev-accent',
  '--ev-accent-2',
  '--ev-ok',
  '--ev-warn',
  '--ev-info',
  '--ev-pack',
];

/**
 * Aviso de celebración ("¡40 pedidos hoy!") con confeti plano. Cubre el contenedor sin tapar los
 * clics (`pointer-events: none`). Quien decide cuándo celebrar (una vez por día por hito, nunca al
 * cargar ni al repetir el día) llama `celebrar(texto)`. Con "reducir movimiento" el aviso sale
 * sin animación y sin confeti. Los colores del confeti son los de la paleta (planos, sin
 * gradientes).
 */
@Component({
  selector: 'app-en-vivo-celebracion',
  templateUrl: './en-vivo-celebracion.component.html',
  styleUrls: ['./en-vivo-celebracion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoCelebracionComponent implements OnDestroy {
  @ViewChild('lienzo', { static: true }) lienzo!: ElementRef<HTMLCanvasElement>;

  mensaje: string | null = null;

  private readonly confeti = new Confeti();
  private temporizador = 0;

  constructor(
    private readonly anfitrion: ElementRef<HTMLElement>,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef
  ) {}

  /** Muestra el aviso unos 4 segundos y lanza el confeti (si no se pidió menos movimiento). */
  celebrar(texto: string): void {
    window.clearTimeout(this.temporizador);
    this.mensaje = texto;
    this.cambios.markForCheck();
    this.temporizador = window.setTimeout(() => {
      this.mensaje = null;
      this.cambios.markForCheck();
    }, DURACION_AVISO_MS);

    if (prefiereMenosMovimiento()) return;
    const caja = this.anfitrion.nativeElement;
    const estilo = getComputedStyle(caja);
    const colores = VARIABLES_CONFETI.map((v) => estilo.getPropertyValue(v).trim()).filter(Boolean);
    this.zona.runOutsideAngular(() =>
      this.confeti.lanzar(this.lienzo.nativeElement, caja.clientWidth, caja.clientHeight, colores)
    );
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.temporizador);
    this.confeti.detener();
  }
}
