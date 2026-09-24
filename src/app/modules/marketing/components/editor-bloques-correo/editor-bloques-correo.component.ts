import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BloqueCorreo, TipoBloque } from '../../services/marketing-correo.service';

interface TipoDisponible {
  tipo: TipoBloque;
  nombre: string;
  icono: string;
}

/**
 * Editor por bloques del correo de campaña (D-318).
 *
 * Solo arma la lista de bloques; el HTML final (escapado, con el pie
 * obligatorio y los enlaces con seguimiento) lo arma el servidor. Por eso no
 * hay campo de HTML libre: el comerciante escribe texto y elige.
 */
@Component({
  selector: 'app-editor-bloques-correo',
  templateUrl: './editor-bloques-correo.component.html',
  styleUrls: ['./editor-bloques-correo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorBloquesCorreoComponent {
  @Input() bloques: BloqueCorreo[] = [];
  /** Códigos de los cupones activos de la tienda. */
  @Input() cupones: string[] = [];
  @Output() bloquesChange = new EventEmitter<BloqueCorreo[]>();

  readonly tipos: TipoDisponible[] = [
    { tipo: 'titulo', nombre: 'Título', icono: 'fa-header' },
    { tipo: 'texto', nombre: 'Texto', icono: 'fa-align-left' },
    { tipo: 'productos', nombre: 'Productos', icono: 'fa-shopping-bag' },
    { tipo: 'boton', nombre: 'Botón', icono: 'fa-hand-pointer-o' },
    { tipo: 'imagen', nombre: 'Imagen', icono: 'fa-picture-o' },
    { tipo: 'cupon', nombre: 'Cupón', icono: 'fa-ticket' },
    { tipo: 'separador', nombre: 'Separador', icono: 'fa-minus' },
  ];

  /** Va como propiedad: una llave en la plantilla abriría un mensaje ICU. */
  readonly placeholderTexto = 'Hola {nombre}, esta semana tenemos…';

  /** Índice del bloque de productos cuyo selector está abierto. */
  eligiendoProductos: number | null = null;

  nombreDe(tipo: TipoBloque): string {
    return (this.tipos.find((t) => t.tipo === tipo) || { nombre: tipo }).nombre;
  }

  iconoDe(tipo: TipoBloque): string {
    return (this.tipos.find((t) => t.tipo === tipo) || { icono: 'fa-square' }).icono;
  }

  agregar(tipo: TipoBloque): void {
    const nuevo: BloqueCorreo = { tipo };
    if (tipo === 'productos') nuevo.productoIds = [];
    if (tipo === 'cupon' && this.cupones.length) nuevo.codigo = this.cupones[0];
    this.emitir([...this.bloques, nuevo]);
    if (tipo === 'productos') this.eligiendoProductos = this.bloques.length;
  }

  mover(i: number, delta: number): void {
    const j = i + delta;
    if (j < 0 || j >= this.bloques.length) return;
    const lista = [...this.bloques];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.emitir(lista);
  }

  quitar(i: number): void {
    this.emitir(this.bloques.filter((_, k) => k !== i));
  }

  /** Cualquier campo editado: se emite una copia para que el padre guarde. */
  cambio(): void {
    this.emitir([...this.bloques]);
  }

  productosElegidos(ids: string[]): void {
    if (this.eligiendoProductos === null) return;
    const i = this.eligiendoProductos;
    const lista = [...this.bloques];
    lista[i] = { ...lista[i], productoIds: ids.slice(0, 6) };
    this.eligiendoProductos = null;
    this.emitir(lista);
  }

  trackPorIndice(i: number): number {
    return i;
  }

  private emitir(lista: BloqueCorreo[]): void {
    this.bloques = lista;
    this.bloquesChange.emit(lista);
  }
}
