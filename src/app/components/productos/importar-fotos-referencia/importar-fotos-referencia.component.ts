import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { ImagenService } from '../../../shared/utils/image.service';
import { FotosPorReferenciaService } from '../../../shared/services/productos/fotos-por-referencia.service';

/** Estados que devuelve el backend por archivo (services/productos/fotosPorReferencia.js). */
type Estado = 'asignada' | 'sin_producto' | 'ambiguo' | 'repetida' | 'formato_no_valido' | 'nombre_no_valido' | 'muy_pesada';

interface Fila {
  nombre: string;
  estado: Estado;
  productoId?: string;
  referencia?: string;
  titulo?: string;
  fotosActuales?: number;
  orden: number | null;
  archivo?: File;
  resultado?: 'ok' | 'error';
}

interface Grupo {
  productoId: string;
  referencia: string;
  titulo: string;
  fotosActuales: number;
  filas: Fila[];
}

const EXTENSIONES = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const PRODUCTOS_POR_TANDA = 50;
const SUBIDAS_A_LA_VEZ = 3;

export const TEXTO_ESTADO: Record<Estado, string> = {
  asignada: 'Asignada',
  sin_producto: 'Sin producto',
  ambiguo: 'Ambiguo',
  repetida: 'Repetida',
  formato_no_valido: 'Formato no válido',
  nombre_no_valido: 'Nombre no válido',
  muy_pesada: 'Muy pesada',
};

/**
 * Ticket 1425: importar fotos de productos en lote. Cada foto se asigna por la referencia
 * del nombre del archivo (ALM-4789.jpg, ALM-4789-1.jpg…). El backend decide a qué producto
 * va (vista previa), las fotos se suben por /v1/media/upload y se aplican en tandas.
 * Clases ifr-*: ninguna lleva "p-" (trampa de CSS global, igual que «Uniformar fotos»).
 */
@Component({
  selector: 'app-importar-fotos-referencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './importar-fotos-referencia.component.html',
  styleUrls: ['./importar-fotos-referencia.component.scss'],
})
export class ImportarFotosReferenciaComponent {
  @Output() cerrado = new EventEmitter<boolean>();

  readonly textoEstado = TEXTO_ESTADO;
  paso: 'elegir' | 'vista' | 'aplicando' | 'resumen' = 'elegir';
  modo: 'agregar' | 'reemplazar' = 'agregar';
  revisando = false;
  descargandoReferencias = false;
  error = '';
  filas: Fila[] = [];
  grupos: Grupo[] = [];
  progreso = 0;
  aplicados = 0;
  huboCambios = false;

  constructor(private api: FotosPorReferenciaService, private imagenes: ImagenService, private cdr: ChangeDetectorRef) {}

  get asignadas(): Fila[] { return this.filas.filter((f) => f.estado === 'asignada'); }
  get noAsignadas(): Fila[] { return this.filas.filter((f) => f.estado !== 'asignada'); }

  /** Lee los archivos elegidos (varios o una carpeta) y pide la vista previa. */
  async elegirArchivos(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivos = Array.from(input.files || []);
    input.value = '';
    if (!archivos.length) return;
    this.error = '';
    this.revisando = true;
    try {
      // En una carpeta pueden venir otros archivos: solo cuentan los que parecen imágenes.
      const imagenes = archivos.filter((a) => a.type.startsWith('image/') || EXTENSIONES.includes(this.extension(a.name)));
      const respuesta: any = await this.api.previsualizar(imagenes.map((a) => a.name));
      this.filas = (respuesta?.archivos || []).map((fila: Fila, i: number) => {
        const archivo = imagenes[i];
        const pesada = fila.estado === 'asignada' && archivo.size > MAX_BYTES;
        return { ...fila, archivo, estado: pesada ? 'muy_pesada' : fila.estado };
      });
      this.armarGrupos();
      this.paso = 'vista';
    } catch (e: any) {
      this.error = e?.error?.error || 'No pudimos revisar las fotos. Intenta de nuevo.';
    } finally {
      this.revisando = false;
      this.cdr.detectChanges();
    }
  }

  private extension(nombre: string): string {
    const punto = nombre.lastIndexOf('.');
    return punto > 0 ? nombre.slice(punto + 1).toLowerCase() : '';
  }

  private armarGrupos(): void {
    const mapa = new Map<string, Grupo>();
    for (const f of this.asignadas) {
      const id = f.productoId as string;
      if (!mapa.has(id)) {
        mapa.set(id, { productoId: id, referencia: f.referencia || '', titulo: f.titulo || '', fotosActuales: f.fotosActuales || 0, filas: [] });
      }
      mapa.get(id)!.filas.push(f);
    }
    this.grupos = [...mapa.values()]
      .map((g) => ({ ...g, filas: g.filas.sort((a, b) => (a.orden || 0) - (b.orden || 0)) }))
      .sort((a, b) => a.referencia.localeCompare(b.referencia, 'es', { numeric: true }));
  }

  volver(): void {
    this.paso = 'elegir';
    this.filas = [];
    this.grupos = [];
  }

  /** Sube las fotos asignadas y las aplica por tandas de productos. */
  async aplicar(): Promise<void> {
    if (!this.grupos.length) return;
    this.paso = 'aplicando';
    this.progreso = 0;
    this.aplicados = 0;
    const total = this.asignadas.length;
    let hechas = 0;

    for (let i = 0; i < this.grupos.length; i += PRODUCTOS_POR_TANDA) {
      const tanda = this.grupos.slice(i, i + PRODUCTOS_POR_TANDA);
      const productos: any[] = [];
      for (const grupo of tanda) {
        const fotos: any[] = [];
        for (let j = 0; j < grupo.filas.length; j += SUBIDAS_A_LA_VEZ) {
          const parte = grupo.filas.slice(j, j + SUBIDAS_A_LA_VEZ);
          const subidas = await Promise.all(parte.map((fila) => this.subir(fila)));
          subidas.forEach((s, k) => {
            if (s) fotos.push({ urls: s.url, path: s.path, nombreImagen: s.name, orden: parte[k].orden || 0 });
          });
          hechas += parte.length;
          this.progreso = Math.round((hechas / total) * 100);
          this.cdr.detectChanges();
        }
        if (fotos.length) productos.push({ productoId: grupo.productoId, fotos });
      }
      if (!productos.length) continue;
      try {
        const r: any = await this.api.aplicar({ modo: this.modo, archivo: 'Importar fotos por referencia', productos });
        const fallidos = new Set((r?.resultado || []).filter((x: any) => !x.ok).map((x: any) => x.productoId));
        for (const grupo of tanda) {
          if (fallidos.has(grupo.productoId)) grupo.filas.forEach((f) => (f.resultado = 'error'));
        }
        this.aplicados += r?.aplicados || 0;
        if (r?.aplicados) this.huboCambios = true;
      } catch {
        tanda.forEach((g) => g.filas.forEach((f) => (f.resultado = 'error')));
      }
    }
    this.paso = 'resumen';
    this.cdr.detectChanges();
  }

  private async subir(fila: Fila) {
    try {
      const unico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fila.nombre}`;
      const s = await this.imagenes.subirImagen(fila.archivo as File, unico);
      fila.resultado = 'ok';
      return s;
    } catch {
      fila.resultado = 'error';
      return null;
    }
  }

  get fallidas(): number { return this.asignadas.filter((f) => f.resultado === 'error').length; }

  /** Reporte en Excel: cada archivo con su estado y el producto al que fue. */
  descargarReporte(): void {
    const filas = this.filas.map((f) => ({
      Archivo: f.nombre,
      Estado: f.estado === 'asignada' && f.resultado === 'error' ? 'No se pudo subir' : this.textoEstado[f.estado],
      Referencia: f.referencia || '',
      Producto: f.titulo || '',
    }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Fotos');
    XLSX.writeFile(libro, `importar-fotos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /** Lista de referencias de la empresa, para nombrar las fotos. */
  async descargarReferencias(): Promise<void> {
    this.descargandoReferencias = true;
    try {
      const r: any = await this.api.referencias();
      const filas = (r?.productos || []).map((p: any) => ({ Referencia: p.referencia, Producto: p.titulo, 'Fotos actuales': p.fotos }));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Referencias');
      XLSX.writeFile(libro, 'referencias-para-fotos.xlsx');
    } catch {
      this.error = 'No pudimos descargar la lista de referencias.';
    } finally {
      this.descargandoReferencias = false;
      this.cdr.detectChanges();
    }
  }

  cerrar(): void {
    if (this.paso === 'aplicando') return;
    this.cerrado.emit(this.huboCambios);
  }
}
