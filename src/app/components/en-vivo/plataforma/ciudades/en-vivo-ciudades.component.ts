import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { armarCiudades, FilaCiudad } from '../utilidades/ciudades';

/**
 * "A dónde van los pedidos": las ciudades con más pedidos hoy, con una barra contra la primera. Son
 * las ciudades del CLIENTE que el servidor pudo ubicar (`cifrasGlobal.ciudades`, tope de 30), así
 * que no llevan nombres de clientes ni de comercios y la privacidad no les cambia nada.
 *
 * Solo lectura y sin acciones: en toda Katuq la foto no trae la lista de pedidos, así que una
 * ciudad no se abre (a diferencia de la vista de un comercio).
 */
@Component({
  selector: 'app-en-vivo-katuq-ciudades',
  templateUrl: './en-vivo-ciudades.component.html',
  styleUrls: ['./en-vivo-ciudades.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoCiudadesComponent {
  readonly filas$: Observable<FilaCiudad[]>;

  constructor(estado: EnVivoEstadoService) {
    this.filas$ = estado.estado$.pipe(
      map((e) => e.cifrasGlobal?.ciudades),
      distinctUntilChanged(),
      map((ciudades) => armarCiudades(ciudades))
    );
  }

  porDane(_: number, fila: FilaCiudad): string {
    return fila.dane;
  }
}
