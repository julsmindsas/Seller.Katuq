import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoOrbeBotonComponent } from './en-vivo-orbe-boton.component';
import { EnVivoEscenaCiudadComponent } from './en-vivo-escena-ciudad.component';
import { EnVivoEscenaMapaComponent } from './en-vivo-escena-mapa.component';
import { EnVivoEscenaOperacionComponent } from './en-vivo-escena-operacion.component';
import { EnVivoEscenaPaisComponent } from './en-vivo-escena-pais.component';

/**
 * Escenas 3D del tablero "En vivo" (D-386, tareas 5.x). Hoy:
 * - la operación del comercio (`<app-en-vivo-escena-operacion>`),
 * - "Mi país" del comercio (`<app-en-vivo-escena-mapa>`),
 * - Katuq en Colombia (`<app-en-vivo-escena-pais>`) y la ciudad de Katuq (`<app-en-vivo-escena-ciudad>`).
 * three y las escenas bajan como chunks aparte, solo cuando el componente se monta (import dinámico
 * dentro del componente), así que importar este módulo no agrega nada al bundle de la pantalla.
 */
const ESCENAS = [
  EnVivoEscenaOperacionComponent,
  EnVivoEscenaMapaComponent,
  EnVivoEscenaPaisComponent,
  EnVivoEscenaCiudadComponent,
];

/** El botón del recorrido de Opttia va dentro de cada escena; no se usa suelto. */
const INTERNOS = [EnVivoOrbeBotonComponent];

@NgModule({
  imports: [CommonModule, EnVivoCompartidoModule],
  declarations: [...ESCENAS, ...INTERNOS],
  exports: ESCENAS,
})
export class EnVivoEscenasModule {}
