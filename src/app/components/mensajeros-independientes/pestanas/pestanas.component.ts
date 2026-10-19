import { Component } from '@angular/core';

/**
 * Pestañas de "Mensajeros independientes": Solicitudes y Liquidación. Cada una es una ruta del módulo,
 * así que se puede enlazar directo y el botón de atrás funciona.
 */
@Component({
  selector: 'app-mensajeros-pestanas',
  templateUrl: './pestanas.component.html',
  styleUrls: ['./pestanas.component.scss'],
})
export class PestanasComponent {
  readonly pestanas = [
    { ruta: '/mensajeros-independientes', texto: 'Solicitudes', exacta: true },
    { ruta: '/mensajeros-independientes/liquidacion', texto: 'Liquidación', exacta: false },
  ];
}
