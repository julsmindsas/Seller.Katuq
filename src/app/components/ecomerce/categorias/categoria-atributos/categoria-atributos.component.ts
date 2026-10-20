import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AtributoEfectivo,
  AttributeSchemas,
  AttributeType,
  esquemaEfectivo,
  RutaDelArbol,
  SEPARADOR,
} from 'src/app/shared/services/catalogo/atributos-categoria';
import {
  claveDesdeEtiqueta,
  DefinicionEditable,
  erroresLocales,
  ErrorLocal,
  limpiarDefinicion,
  mensajeDeError,
  nuevaDefinicion,
  paraEditar,
  TIPOS,
  vistaPrevia,
  FilaVistaPrevia,
} from 'src/app/shared/services/catalogo/atributos-editor';
import { CatalogAttributesService, EsquemasRespuesta } from 'src/app/shared/services/catalogo/catalog-attributes.service';

/**
 * Atributos de UNA categoría (D-495, ticket 1234), en el modal de Maestros > Categorías.
 *
 * Lo heredado de las categorías superiores se ve en solo lectura; lo propio se edita
 * (nombre, tipo, opciones, unidad, obligatorio, filtro, comparador, sección y orden) y
 * hay una vista previa de la ficha. Guarda el mapa completo con la versión leída: si
 * alguien guardó antes, el servidor responde 409 y aquí se pide recargar.
 * Solo existe con la bandera `categoryAttributes`.
 */
@Component({
  selector: 'app-categoria-atributos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categoria-atributos.component.html',
  styleUrls: ['./categoria-atributos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaAtributosComponent implements OnChanges {
  /** La categoría: clave de ruta y nombres de cada nivel. */
  @Input() ruta: RutaDelArbol | null = null;
  /** Esquemas y versión tal como los devolvió el servidor al abrir. */
  @Input() esquemas: EsquemasRespuesta | null = null;

  @Output() guardado = new EventEmitter<EsquemasRespuesta>();
  @Output() cerrar = new EventEmitter<void>();

  readonly tipos = TIPOS;
  heredadas: AtributoEfectivo[] = [];
  propias: DefinicionEditable[] = [];
  previa: FilaVistaPrevia[] = [];
  errores: ErrorLocal[] = [];
  mensaje = '';
  guardando = false;

  constructor(private readonly servicio: CatalogAttributesService, private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    const schemas = (this.esquemas && this.esquemas.schemas) || {};
    const clave = this.ruta ? this.ruta.clave : '';
    this.heredadas = esquemaEfectivo(schemas, clave).filter((d) => d.heredado);
    this.propias = paraEditar((schemas[clave] && schemas[clave].attributes) || []).sort((a, b) => a.order - b.order);
    this.errores = [];
    this.mensaje = '';
    this.refrescarVista();
  }

  get nombreRuta(): string {
    return this.ruta ? this.ruta.nombres.join(SEPARADOR) : '';
  }

  /** «Networking» para una clave de ruta heredada. */
  nombreDe(origen: string): string {
    const n = this.ruta ? origen.split(SEPARADOR).length : 0;
    return this.ruta ? this.ruta.nombres.slice(0, n).join(SEPARADOR) : origen;
  }

  textoTipo(tipo: AttributeType): string {
    return (this.tipos.find((t) => t.valor === tipo) || { texto: tipo }).texto;
  }

  porIndice(i: number): number {
    return i;
  }

  agregar(): void {
    this.propias = [...this.propias, nuevaDefinicion(this.propias.length + 1)];
    this.refrescarVista();
  }

  quitar(i: number): void {
    this.propias = this.propias.filter((_, k) => k !== i);
    this.refrescarVista();
  }

  mover(i: number, paso: number): void {
    const j = i + paso;
    if (j < 0 || j >= this.propias.length) return;
    const copia = [...this.propias];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    this.propias = copia;
    this.refrescarVista();
  }

  /** La clave de un atributo nuevo sale de su nombre; la de uno guardado no cambia nunca. */
  alCambiarNombre(d: DefinicionEditable): void {
    if (d.nueva) {
      const usadas = [...this.heredadas.map((h) => h.key), ...this.propias.filter((p) => p !== d).map((p) => p.key)];
      d.key = claveDesdeEtiqueta(d.label, usadas);
    }
    this.refrescarVista();
  }

  refrescarVista(): void {
    this.previa = vistaPrevia(this.heredadas, this.propias);
  }

  erroresDe(i: number): string[] {
    return this.errores.filter((e) => e.indice === i).map((e) => e.mensaje);
  }

  get erroresGenerales(): string[] {
    return this.errores.filter((e) => e.indice === -1).map((e) => e.mensaje);
  }

  guardar(): void {
    if (!this.ruta || !this.esquemas || this.guardando) return;
    this.errores = erroresLocales(this.propias, this.heredadas);
    this.mensaje = '';
    if (this.errores.length) return;
    const clave = this.ruta.clave;
    const schemas: AttributeSchemas = { ...this.esquemas.schemas };
    const aliases = (schemas[clave] && schemas[clave].aliases) || [];
    const propias = this.propias.map((d, i) => limpiarDefinicion(d, i + 1));
    if (propias.length || aliases.length) schemas[clave] = { attributes: propias, aliases };
    else delete schemas[clave];
    this.guardando = true;
    this.servicio.saveSchemas(this.esquemas.version, schemas).subscribe({
      next: (r) => {
        this.guardando = false;
        this.guardado.emit({ version: r.version, schemas: r.schemas });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.guardando = false;
        this.mensaje = mensajeDeError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
