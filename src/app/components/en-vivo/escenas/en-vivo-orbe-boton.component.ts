import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoPropuestaEscenaPuente } from '../propuestas/propuestas-escena.puente';
import { ContadorPropuestas } from '../propuestas/propuestas.modelos';
import { EnVivoOrbeService, RecorridoOrbe } from './opttia-guia.service';
import { textoIdeas } from './opttia-puntos';

interface VistaBoton {
  visible: boolean;
  enRecorrido: boolean;
  /** Opttia tiene propuestas: el botón las anuncia y abre la tarjeta. */
  conIdeas: boolean;
  texto: string;
  aria: string;
}

function vistaDe(hay: boolean, recorrido: RecorridoOrbe | null, c: ContadorPropuestas): VistaBoton {
  if (recorrido) {
    return {
      visible: hay,
      enRecorrido: true,
      conIdeas: false,
      texto: `Detener · ${recorrido.paso} de ${recorrido.total}`,
      aria: 'Detener el recorrido guiado de Opttia',
    };
  }
  if (c.ideas > 0) {
    const texto = textoIdeas(c);
    return { visible: hay, enRecorrido: false, conIdeas: true, texto, aria: `${texto.replace(' · ', ', ')}. Ver la propuesta` };
  }
  return {
    visible: hay,
    enRecorrido: false,
    conIdeas: false,
    texto: 'Recorrido con Opttia',
    aria: 'Empezar el recorrido guiado de Opttia por lo que necesita atención',
  };
}

/**
 * Botón del orbe sobre la escena 3D (D-386, 5.14): el mismo recorrido que se empieza tocando al orbe
 * o con el botón de la tarjeta de Opttia; mientras dura dice "Detener · 2 de 5". Con propuestas de
 * Opttia (D-422) dice "Opttia tiene 3 ideas · 1 urgente", su halo late dos veces al aparecer y al
 * tocarlo pide la tarjeta. Solo se ve cuando la escena tiene su orbe (sin WebGL no hay orbe ni botón).
 */
@Component({
  selector: 'app-en-vivo-orbe-boton',
  templateUrl: './en-vivo-orbe-boton.component.html',
  styleUrls: ['./en-vivo-orbe-boton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoOrbeBotonComponent {
  readonly vm$: Observable<VistaBoton>;

  constructor(private readonly orbe: EnVivoOrbeService, private readonly puente: EnVivoPropuestaEscenaPuente) {
    this.vm$ = combineLatest([orbe.hayOrbe$, orbe.recorrido$, puente.contador$]).pipe(
      map(([hay, recorrido, contador]) => vistaDe(hay, recorrido, contador))
    );
  }

  alternar(vm: VistaBoton): void {
    if (vm.conIdeas) this.puente.pedirTarjeta();
    else this.orbe.alternarRecorrido();
  }
}
