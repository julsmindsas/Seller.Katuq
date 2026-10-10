import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Ancho de la columna principal: `angosto` para formularios cortos, `lectura` para textos largos. */
export type AnchoPublica = 'angosto' | 'lectura' | 'amplio';

/**
 * Marco de las pantallas públicas (D-398): el mismo de "Regístrese". Barra superior con el logo de
 * Katuq y un enlace opcional a la derecha, la columna principal y, en pantallas anchas, un panel
 * lateral lila opcional (`conAside` + contenido con el atributo `publica-aside`).
 *
 * El contenido lo estiliza la página que lo usa, con las piezas de `_publica.scss`
 * (`@include publica-piezas`).
 */
@Component({
  selector: 'app-publica-marco',
  templateUrl: './publica-marco.component.html',
  styleUrls: ['./publica-marco.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicaMarcoComponent {
  @Input() ancho: AnchoPublica = 'angosto';
  /** Muestra el panel lateral (solo en >= 960 px; en celular se apila debajo). */
  @Input() conAside = false;
  /** A dónde lleva el logo. */
  @Input() rutaLogo = '/login';
  /** Enlace de la barra superior, p. ej. "¿Ya tienes cuenta?" + "Entrar". */
  @Input() enlacePregunta = '';
  @Input() enlaceTexto = '';
  @Input() enlaceRuta = '';
  /** Línea pequeña al pie (p. ej. la versión). */
  @Input() pie = '';
}
