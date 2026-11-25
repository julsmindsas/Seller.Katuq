import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { EnVivoPropuestaEscenaPuente } from '../propuestas/propuestas-escena.puente';
import { ContadorPropuestas } from '../propuestas/propuestas.modelos';
import { EnVivoOrbeService, RecorridoOrbe } from './opttia-guia.service';
import { textoIdeas } from './opttia-puntos';
import type { Traductor } from '../utilidades/traductor';

interface VistaBoton {
  visible: boolean;
  enRecorrido: boolean;
  /** Opttia tiene propuestas: el botón las anuncia y abre la tarjeta. */
  conIdeas: boolean;
  texto: string;
  aria: string;
}

function vistaDe(hay: boolean, recorrido: RecorridoOrbe | null, c: ContadorPropuestas, t: Traductor): VistaBoton {
  if (recorrido) {
    return {
      visible: hay,
      enRecorrido: true,
      conIdeas: false,
      texto: t('enVivo.escenas.orbe.detener', { paso: recorrido.paso, total: recorrido.total }),
      aria: t('enVivo.escenas.orbe.detenerAria'),
    };
  }
  if (c.ideas > 0) {
    const texto = textoIdeas(c, t);
    return { visible: hay, enRecorrido: false, conIdeas: true, texto, aria: t('enVivo.escenas.orbe.verPropuestaAria', { texto: texto.replace(' · ', ', ') }) };
  }
  return {
    visible: hay,
    enRecorrido: false,
    conIdeas: false,
    texto: t('enVivo.escenas.orbe.recorrido'),
    aria: t('enVivo.escenas.orbe.recorridoAria'),
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

  constructor(
    private readonly orbe: EnVivoOrbeService,
    private readonly puente: EnVivoPropuestaEscenaPuente,
    private readonly translate: TranslateService
  ) {
    const t: Traductor = (clave, params) => this.translate.instant(clave, params);
    this.vm$ = combineLatest([orbe.hayOrbe$, orbe.recorrido$, puente.contador$, translate.onLangChange.pipe(startWith(null))]).pipe(
      map(([hay, recorrido, contador]) => vistaDe(hay, recorrido, contador, t))
    );
  }

  alternar(vm: VistaBoton): void {
    if (vm.conIdeas) this.puente.pedirTarjeta();
    else this.orbe.alternarRecorrido();
  }
}
