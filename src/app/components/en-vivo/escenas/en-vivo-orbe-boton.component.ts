import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoOrbeService } from './opttia-guia.service';

interface VistaBoton {
  visible: boolean;
  enRecorrido: boolean;
  texto: string;
  aria: string;
}

/**
 * Botón "Recorrido con Opttia" sobre la escena 3D (D-386, 5.14): el mismo recorrido que se empieza
 * tocando al orbe o con el botón de la tarjeta de Opttia. Mientras dura dice "Detener · 2 de 5".
 * Solo se ve cuando la escena tiene su orbe (sin WebGL no hay orbe ni botón).
 */
@Component({
  selector: 'app-en-vivo-orbe-boton',
  templateUrl: './en-vivo-orbe-boton.component.html',
  styleUrls: ['./en-vivo-orbe-boton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoOrbeBotonComponent {
  readonly vm$: Observable<VistaBoton>;

  constructor(private readonly orbe: EnVivoOrbeService) {
    this.vm$ = combineLatest([orbe.hayOrbe$, orbe.recorrido$]).pipe(
      map(([hay, recorrido]): VistaBoton => ({
        visible: hay,
        enRecorrido: recorrido !== null,
        texto: recorrido ? `Detener · ${recorrido.paso} de ${recorrido.total}` : 'Recorrido con Opttia',
        aria: recorrido ? 'Detener el recorrido guiado de Opttia' : 'Empezar el recorrido guiado de Opttia por lo que necesita atención',
      }))
    );
  }

  alternar(): void {
    this.orbe.alternarRecorrido();
  }
}
