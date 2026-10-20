import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { stringify } from 'flatted';

import {
  AtributoEfectivo,
  AttributeSchemas,
  esquemaEfectivo,
  IndiceDeRutas,
  nombresDeRuta,
  ResolucionDeRuta,
  rutaDelProducto,
  SEPARADOR,
} from 'src/app/shared/services/catalogo/atributos-categoria';
import {
  mensajeDeError,
  obligatoriosFaltantes,
  valorInicial,
  ValorDeFormulario,
  valoresParaGuardar,
} from 'src/app/shared/services/catalogo/atributos-editor';
import { CatalogAttributesService } from 'src/app/shared/services/catalogo/catalog-attributes.service';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';

export interface ResultadoEspecificaciones {
  ok: boolean;
  /** Etiquetas de los obligatorios sin valor (se avisa, no bloquea). */
  faltantes: string[];
  mensaje?: string;
}

interface SeccionDeFormulario {
  titulo: string;
  defs: AtributoEfectivo[];
}

/**
 * Pestaña «Especificaciones» del producto (D-495, ticket 1234). Solo existe con la
 * bandera `categoryAttributes`; se crea al abrir la pestaña y entonces lee los esquemas.
 *
 * Los campos salen de la categoría elegida y cambian con ella. La ruta se resuelve con
 * el espejo de `rutaDelProducto` y el índice que manda el servidor (revisión
 * 2026-10-19): etiquetas, alias y ambiguas dan lo mismo que POST /v1/productos/attributes.
 * No es parte del formulario del producto: el payload de /create y /edit no cambia. El padre llama
 * `guardar(cd)` en el `next` de crear o editar; aquí se manda solo lo que cambió
 * (vaciar = null) a POST /v1/productos/attributes, que no reenvía el producto a las
 * tiendas conectadas. Si falla, se dice y se puede reintentar.
 */
@Component({
  selector: 'app-especificaciones-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './especificaciones-producto.component.html',
  styleUrls: ['./especificaciones-producto.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EspecificacionesProductoComponent implements OnInit, OnChanges {
  /** Valor del control de categorías del formulario (nodo, o texto flatted en edición). */
  @Input() categoria: unknown = null;
  /** Id del producto en edición; vacío al crear. */
  @Input() productoId: string | null = null;
  /** `attributes` del producto, si ya venían con él. */
  @Input() guardados: Record<string, unknown> | null = null;

  cargando = true;
  errorCarga = '';
  rutaNombres: string[] = [];
  resolucion: ResolucionDeRuta = { estado: 'sinCategoria' };
  esquema: AtributoEfectivo[] = [];
  secciones: SeccionDeFormulario[] = [];
  valores: Record<string, ValorDeFormulario> = {};
  aviso = '';
  avisoError = false;
  guardando = false;

  private schemas: AttributeSchemas = {};
  private indice: IndiceDeRutas | null = null;
  private conocidos: Record<string, unknown> = {};
  private iniciales: Record<string, ValorDeFormulario> = {};
  private ultimoGuardado: string | null = null;

  constructor(
    private readonly servicio: CatalogAttributesService,
    private readonly maestro: MaestroService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.conocidos = this.guardados && typeof this.guardados === 'object' ? { ...this.guardados } : {};
    this.servicio.getSchemas().subscribe({
      next: (r) => {
        this.schemas = (r && r.schemas) || {};
        this.indice = (r && r.indice) || null;
        this.cargando = false;
        this.recalcular();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.errorCarga = mensajeDeError(err);
        this.cdr.markForCheck();
      },
    });
    if (this.productoId && !(this.guardados && typeof this.guardados === 'object')) this.leerGuardados(this.productoId);
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['categoria'] && !cambios['categoria'].firstChange) {
      this.recalcular();
    }
    const id = cambios['productoId'];
    // Otro producto (no el que se acaba de guardar desde aquí): se vuelve a cargar.
    if (id && !id.firstChange && id.currentValue && id.currentValue !== this.ultimoGuardado) {
      this.valores = {};
      this.iniciales = {};
      this.conocidos = this.guardados && typeof this.guardados === 'object' ? { ...this.guardados } : {};
      this.recalcular();
      if (!(this.guardados && typeof this.guardados === 'object')) this.leerGuardados(id.currentValue);
    }
  }

  get nombreRuta(): string {
    return this.rutaNombres.join(SEPARADOR);
  }

  /** Por qué no hay campos: lo mismo que respondería el servidor para este producto. */
  get tituloVacio(): string {
    if (this.resolucion.ruta) return 'Sin especificaciones para esta categoría';
    return this.resolucion.estado === 'sinCategoria' ? 'Falta la categoría' : 'No se sabe la categoría de este producto';
  }

  get textoVacio(): string {
    switch (this.resolucion.estado) {
      case 'sinCategoria':
        return 'Elige la categoría del producto en la pestaña «Categorías».';
      case 'ambigua':
        return this.resolucion.motivo === 'etiquetas_divergentes'
          ? 'El producto tiene categorías de ramas distintas del árbol. Deja una sola en la pestaña «Categorías».'
          : 'Hay varias categorías con el mismo nombre y no se sabe cuál es la de este producto. Elige una subcategoría en la pestaña «Categorías» o cambia el nombre repetido en Maestros > Categorías.';
      case 'enColision':
        return 'Hay dos categorías que se llaman igual en esta rama. Cambia el nombre de una en Maestros > Categorías para usar especificaciones.';
      case 'fueraDelArbol':
        return 'La categoría de este producto ya no está en Maestros > Categorías. Elige una en la pestaña «Categorías».';
      default:
        return `Agrega atributos a «${this.nombreRuta}» en Maestros > Categorías.`;
    }
  }

  nombreDe(origen: string): string {
    return this.rutaNombres.slice(0, origen.split(SEPARADOR).length).join(SEPARADOR);
  }

  porClave(_: number, d: AtributoEfectivo): string {
    return d.key;
  }

  marcado(key: string, opcion: string): boolean {
    const v = this.valores[key];
    return Array.isArray(v) && v.includes(opcion);
  }

  alternar(key: string, opcion: string, encendido: boolean): void {
    const actual = Array.isArray(this.valores[key]) ? [...(this.valores[key] as string[])] : [];
    const siguiente = encendido ? (actual.includes(opcion) ? actual : [...actual, opcion]) : actual.filter((o) => o !== opcion);
    this.valores = { ...this.valores, [key]: siguiente };
  }

  /** ¿Hay algo distinto de lo que se cargó? */
  hayCambios(): boolean {
    return Object.keys(valoresParaGuardar(this.esquema, this.valores, this.iniciales)).length > 0;
  }

  /** Lo llama el padre en el `next` de crear o editar (sin setTimeout). */
  guardar(cd: string): Promise<ResultadoEspecificaciones> {
    const cambios = valoresParaGuardar(this.esquema, this.valores, this.iniciales);
    const faltantes = obligatoriosFaltantes(this.esquema, this.valores);
    if (!cd || !Object.keys(cambios).length) return Promise.resolve({ ok: true, faltantes });
    this.ultimoGuardado = cd;
    this.guardando = true;
    this.aviso = '';
    this.cdr.markForCheck();
    return new Promise((listo) => {
      this.servicio.saveProductAttributes(cd, cambios).subscribe({
        next: () => {
          this.guardando = false;
          for (const k of Object.keys(cambios)) {
            if (cambios[k] === null) delete this.conocidos[k];
            else this.conocidos[k] = cambios[k];
          }
          this.iniciales = { ...this.valores };
          this.avisoError = false;
          this.aviso = faltantes.length ? `Especificaciones guardadas. Faltan obligatorias: ${faltantes.join(', ')}.` : 'Especificaciones guardadas.';
          this.cdr.markForCheck();
          listo({ ok: true, faltantes });
        },
        error: (err) => {
          this.guardando = false;
          const mensaje = mensajeDeError(err);
          this.avisoError = true;
          this.aviso = `El producto se guardó, pero las especificaciones no: ${mensaje}`;
          this.cdr.markForCheck();
          listo({ ok: false, faltantes, mensaje });
        },
      });
    });
  }

  reintentar(): void {
    if (this.ultimoGuardado && !this.guardando) this.guardar(this.ultimoGuardado);
  }

  private leerGuardados(id: string): void {
    this.maestro.getProductsByIds([id]).subscribe({
      next: (r: any) => {
        const producto = r && Array.isArray(r.products) ? r.products.find((p: any) => p && p.cd === id) : null;
        const attributes = producto && producto.attributes && typeof producto.attributes === 'object' ? producto.attributes : {};
        this.conocidos = { ...attributes };
        // Lo que la persona ya escribió no se pisa; lo demás toma el valor guardado.
        const tocados = valoresParaGuardar(this.esquema, this.valores, this.iniciales);
        for (const d of this.esquema) {
          this.iniciales[d.key] = valorInicial(d, this.conocidos[d.key]);
          if (!(d.key in tocados)) this.valores[d.key] = this.iniciales[d.key];
        }
        this.valores = { ...this.valores };
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  /**
   * Esquema de la categoría actual; los valores ya escritos se conservan por clave.
   * La categoría se lee como la leerá el servidor: /create y /edit guardan
   * `stringify(valor del control)` (sin `exposicion.categorias`) y el POST de
   * especificaciones corre después de ese guardado.
   */
  private recalcular(): void {
    this.resolucion = rutaDelProducto({ categorias: this.comoLaGuardaElFormulario(this.categoria) }, this.indice, this.schemas);
    const ruta = this.resolucion.ruta || '';
    this.rutaNombres = nombresDeRuta(this.indice, ruta);
    this.esquema = ruta ? esquemaEfectivo(this.schemas, ruta, this.indice) : [];
    for (const d of this.esquema) {
      if (!(d.key in this.iniciales)) this.iniciales[d.key] = valorInicial(d, this.conocidos[d.key]);
      if (!(d.key in this.valores)) this.valores[d.key] = this.iniciales[d.key];
    }
    this.valores = { ...this.valores };
    this.secciones = [
      { titulo: 'Especificaciones', defs: this.esquema.filter((d) => d.section !== 'compatibility') },
      { titulo: 'Compatibilidad', defs: this.esquema.filter((d) => d.section === 'compatibility') },
    ].filter((s) => s.defs.length);
  }

  /** Lo que crear-productos manda en `categorias` (`stringify` de flatted, como en /create y /edit). */
  private comoLaGuardaElFormulario(valor: unknown): string | null {
    try {
      return stringify(valor);
    } catch {
      return null;
    }
  }
}
