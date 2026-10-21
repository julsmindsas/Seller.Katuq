import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { ErrorDomicilios, interpretarErrorDomicilios } from '../domicilios.errores';
import { GrupoRecogida } from '../domicilios.formularios';
import {
  agruparResultadosLote, csvDeFallidos, ItemResultadoLote, NOMBRE_ARCHIVO_FALLIDOS, resumirArchivo, ResumenArchivo, ResumenLote,
  validarArchivoElegido
} from '../domicilios.lote';
import { descargarTexto, leerArchivoComoTexto } from '../domicilios.navegador';
import { formatearPesos } from '../domicilios.presentacion';
import { DomiciliosService } from '../domicilios.service';
import { ArchivoLeido, leerArchivoDomicilios, MAX_FILAS_POR_LOTE, plantillaCsv } from '../domicilios.utils';

/**
 * Pestaña «Cargar archivo»: se baja la plantilla, se llena en Excel y se sube el .csv. Antes de enviar se ve
 * cada fila con sus errores; al enviar, cada domicilio se procesa por separado y se muestra qué pasó con cada uno.
 *
 * El archivo se lee en el navegador con la recogida de «Recoger en»: si se cambia esa recogida, la vista
 * previa se recalcula sola. Lo que trae el archivo vive solo en memoria y se suelta al terminar.
 */
@Component({
  selector: 'app-domicilios-archivo',
  templateUrl: './cargar-archivo.component.html',
  styleUrls: ['./cargar-archivo.component.scss']
})
export class CargarArchivoComponent implements OnInit, OnDestroy {
  @Input() recogida!: GrupoRecogida;
  @Input() esAdmin = false;
  @Output() irAIntegracion = new EventEmitter<void>();
  @Output() verLista = new EventEmitter<void>();

  readonly pesos = formatearPesos;
  readonly maxFilas = MAX_FILAS_POR_LOTE;

  nombreArchivo = '';
  archivo: ArchivoLeido | null = null;
  resumen: ResumenArchivo | null = null;
  errorArchivo: string | null = null;
  arrastrando = false;
  leyendo = false;

  enviando = false;
  errorEnvio: ErrorDomicilios | null = null;
  resultado: ResumenLote | null = null;
  /** Ayuda según por qué fallaron las filas (sin mensajeros, API apagada…). */
  ayudaResultado: ErrorDomicilios | null = null;
  /** Filas del archivo que no se enviaron por tener errores. */
  lineasSinEnviar: number[] = [];

  private textoArchivo = '';
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly servicio: DomiciliosService) {}

  ngOnInit(): void {
    // Si se cambia la recogida con el archivo ya cargado, lo que falte en el archivo se llena con la nueva.
    this.recogida.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.textoArchivo && !this.resultado && !this.enviando) this.leerTexto();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.textoArchivo = '';
  }

  descargarPlantilla(): void {
    descargarTexto('plantilla-domicilios.csv', plantillaCsv());
  }

  // --- Elegir el archivo ----------------------------------------------------

  alElegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const elegido = entrada.files && entrada.files[0];
    entrada.value = ''; // Para poder elegir el mismo archivo otra vez después de corregirlo.
    if (elegido) this.recibir(elegido);
  }

  alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando = false;
    const soltado = evento.dataTransfer?.files?.[0];
    if (soltado) this.recibir(soltado);
  }

  alArrastrar(evento: DragEvent, dentro: boolean): void {
    evento.preventDefault();
    this.arrastrando = dentro;
  }

  private async recibir(elegido: File): Promise<void> {
    this.reiniciarResultado();
    this.errorArchivo = validarArchivoElegido(elegido);
    if (this.errorArchivo) {
      this.limpiarArchivo();
      return;
    }
    this.leyendo = true;
    try {
      this.textoArchivo = await leerArchivoComoTexto(elegido);
      this.nombreArchivo = elegido.name;
      this.leerTexto();
    } catch {
      this.limpiarArchivo();
      this.errorArchivo = 'No pudimos leer el archivo. Revisa que sea un .csv e intenta de nuevo.';
    } finally {
      this.leyendo = false;
    }
  }

  /** Convierte el texto del archivo en filas con la recogida que haya en pantalla. */
  private leerTexto(): void {
    this.archivo = leerArchivoDomicilios(this.textoArchivo, this.recogida.getRawValue());
    this.resumen = resumirArchivo(this.archivo);
    this.errorArchivo = this.archivo.errores.length ? this.archivo.errores[0] : null;
  }

  quitarArchivo(): void {
    this.limpiarArchivo();
    this.reiniciarResultado();
    this.errorArchivo = null;
  }

  private limpiarArchivo(): void {
    this.textoArchivo = '';
    this.nombreArchivo = '';
    this.archivo = null;
    this.resumen = null;
  }

  private reiniciarResultado(): void {
    this.resultado = null;
    this.ayudaResultado = null;
    this.errorEnvio = null;
    this.lineasSinEnviar = [];
  }

  // --- Enviar ---------------------------------------------------------------

  enviar(): void {
    if (this.enviando || !this.resumen || !this.resumen.listos.length) return;
    const enviadas = this.resumen.listos;
    const sinEnviar = this.resumen.conErrores.map(f => f.linea);
    this.enviando = true;
    this.errorEnvio = null;
    this.servicio
      .crearLote(enviadas)
      .pipe(
        finalize(() => (this.enviando = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: respuesta => {
          this.resultado = agruparResultadosLote(respuesta.resultados, enviadas);
          this.ayudaResultado = this.ayudaDe(this.resultado.fallidos);
          this.lineasSinEnviar = sinEnviar;
          this.limpiarArchivo(); // Ya se envió: los datos del archivo no se conservan.
        },
        error: err => (this.errorEnvio = interpretarErrorDomicilios(err))
      });
  }

  /** Si las filas fallaron por algo que se arregla en otra pantalla, se dice cuál. */
  private ayudaDe(fallidos: ItemResultadoLote[]): ErrorDomicilios | null {
    const codigo = fallidos.map(f => f.codigo).find(c => c === 'SIN_MENSAJEROS_HABILITADOS' || c === 'API_DESHABILITADA');
    return codigo ? interpretarErrorDomicilios({ status: 409, error: { codigo } }) : null;
  }

  descargarFallidos(): void {
    if (this.resultado && this.resultado.fallidos.length) {
      descargarTexto(NOMBRE_ARCHIVO_FALLIDOS, csvDeFallidos(this.resultado.fallidos));
    }
  }

  otroArchivo(): void {
    this.reiniciarResultado();
    this.limpiarArchivo();
    this.errorArchivo = null;
  }

  trackPorLinea(_i: number, f: { linea: number }): number {
    return f.linea;
  }
}
