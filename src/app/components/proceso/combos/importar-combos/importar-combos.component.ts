import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';

/** Columnas de la plantilla: encabezado del Excel → campo que espera el servidor. */
const COLUMNAS: { titulo: string; campo: string }[] = [
  { titulo: 'Código del combo', campo: 'codigo' },
  { titulo: 'Nombre del combo', campo: 'nombre' },
  { titulo: 'Descripción', campo: 'descripcion' },
  { titulo: 'Referencia del producto', campo: 'referencia' },
  { titulo: 'Cantidad', campo: 'cantidad' },
  { titulo: 'Activo (SI/NO)', campo: 'activo' },
];

const normalizar = (t: any): string =>
  String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

interface ResultadoImportacion {
  guardado: boolean;
  resumen: { filas: number; crear: number; actualizar: number };
  errores: { fila: number; codigo: string; mensaje: string }[];
  combos: { accion: 'crear' | 'actualizar'; codigo: string; nombre: string; productos: number }[];
}

/**
 * Ticket 1323 (D-538): carga de combos desde Excel. Una fila por producto del
 * combo. Primero se simula en el servidor (no guarda nada) y se muestra qué se
 * crea, qué se actualiza y los errores; solo sin errores se puede confirmar.
 */
@Component({
  selector: 'app-importar-combos',
  templateUrl: './importar-combos.component.html',
  styleUrls: ['./importar-combos.component.scss'],
})
export class ImportarCombosComponent {
  /** Combos actuales: la plantilla sale con ellos para editarlos y volver a subirlos. */
  @Input() combos: any[] = [];

  nombreArchivo = '';
  filas: any[] = [];
  resultado: ResultadoImportacion | null = null;
  procesando = false;
  readonly columnas = COLUMNAS;

  constructor(public activeModal: NgbActiveModal, private service: MaestroService) {}

  descargarPlantilla(): void {
    const filas: any[][] = [COLUMNAS.map((c) => c.titulo)];
    const conCodigo = (this.combos || []).filter((c) => c?.codigo);
    if (conCodigo.length) {
      conCodigo.forEach((c) => (c.productos || []).forEach((p: any, i: number) => {
        filas.push([c.codigo, i === 0 ? c.nombre : '', i === 0 ? c.descripcion || '' : '', p.referencia || '', p.cantidad || '', c.activo === false ? 'NO' : 'SI']);
      }));
    } else {
      filas.push(['ENS-001', 'Ensamble bomba + motor', 'Lista para instalar', 'REFERENCIA-BOMBA', 1, 'SI']);
      filas.push(['ENS-001', '', '', 'REFERENCIA-MOTOR', 1, 'SI']);
    }
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 34 }, { wch: 26 }, { wch: 10 }, { wch: 14 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Combos');
    XLSX.writeFile(libro, 'plantilla_combos_katuq.xlsx');
  }

  alElegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.nombreArchivo = archivo.name;
    this.resultado = null;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const libro = XLSX.read(lector.result as ArrayBuffer, { type: 'array' });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const crudas: any[] = XLSX.utils.sheet_to_json(hoja, { defval: '' });
        this.filas = crudas.map((fila) => this.aCampos(fila)).filter((f) => Object.values(f).some((v) => String(v).trim()));
        if (!this.filas.length) {
          Swal.fire('Archivo vacío', 'El Excel no trae filas de combos. Usa la plantilla.', 'warning');
          return;
        }
        this.enviar(true);
      } catch (_) {
        Swal.fire('No se pudo leer', 'Revisa que sea un archivo de Excel (.xlsx) con la plantilla de combos.', 'error');
      }
    };
    lector.readAsArrayBuffer(archivo);
  }

  /** Encabezado del Excel → campo, sin importar tildes, mayúsculas ni espacios. */
  private aCampos(fila: any): any {
    const porTitulo = new Map(COLUMNAS.map((c) => [normalizar(c.titulo), c.campo]));
    const salida: any = {};
    Object.keys(fila).forEach((k) => {
      const campo = porTitulo.get(normalizar(k)) || COLUMNAS.find((c) => normalizar(c.campo) === normalizar(k))?.campo;
      if (campo) salida[campo] = fila[k];
    });
    return salida;
  }

  get puedeConfirmar(): boolean {
    return !!this.resultado && !this.resultado.guardado && this.resultado.errores.length === 0 && this.resultado.combos.length > 0;
  }

  confirmar(): void {
    if (this.puedeConfirmar) this.enviar(false);
  }

  private enviar(simular: boolean): void {
    this.procesando = true;
    this.service.importarCombos(this.filas, simular).subscribe({
      next: (res: any) => {
        this.procesando = false;
        this.resultado = res as ResultadoImportacion;
        if (!simular && this.resultado.guardado) {
          const r = this.resultado.resumen;
          Swal.fire('¡Listo!', `Se crearon ${r.crear} y se actualizaron ${r.actualizar} combos.`, 'success')
            .then(() => this.activeModal.close('success'));
        }
      },
      error: (err) => {
        this.procesando = false;
        Swal.fire('Error', err?.error?.message || 'No se pudo revisar el archivo.', 'error');
      },
    });
  }
}
