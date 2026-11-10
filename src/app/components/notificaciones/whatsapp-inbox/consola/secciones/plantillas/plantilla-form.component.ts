import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BotonPlantilla, TipoBoton, TipoEncabezado } from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { WhatsappConsolaService } from '../../../../../../shared/services/messaging/whatsapp-consola.service';
import {
  LIMITES_PLANTILLA,
  MIMES_IMAGEN,
  PlantillaFormulario,
  entradaDeFormulario,
  formularioVacio,
  problemasFormulario,
} from './plantilla-modelo';

/**
 * Formulario de plantilla de WhatsApp (D-707): encabezado de texto o imagen, cuerpo con `{nombre}`, pie
 * y hasta tres botones (respuesta rápida, enlace o llamar), con vista previa en vivo. Se envía a
 * revisión de Meta en la cuenta de WhatsApp del número. Lo que Meta no acepta lo dice el servidor
 * (`TEMPLATE_INVALID`) y se muestra tal cual, sin códigos.
 *
 * Los botones y la imagen se cambian reemplazando el valor (nunca en el sitio), para que la vista
 * previa —que solo mira sus entradas— se actualice en el momento.
 */
@Component({
  selector: 'app-plantilla-form',
  templateUrl: './plantilla-form.component.html',
  styleUrls: ['./plantilla-form.component.scss'],
})
export class PlantillaFormComponent implements OnInit, OnDestroy {
  @Input() lineId = '';
  /** Para «Duplicar»: la plantilla de la que se parte. */
  @Input() inicial: PlantillaFormulario | null = null;

  @Output() creada = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('cuerpoCampo') cuerpoCampo?: ElementRef<HTMLTextAreaElement>;

  readonly limites = LIMITES_PLANTILLA;
  readonly tiposBoton: TipoBoton[] = ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'];

  f: PlantillaFormulario = formularioVacio();
  enviando = false;
  /** Ya intentó enviar: desde ahí se muestran los avisos de lo que falta. */
  intento = false;
  errorImagen: string | null = null;
  errorServidor: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly consola: WhatsappConsolaService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.f = this.inicial ? { ...this.inicial, botones: [...this.inicial.botones] } : formularioVacio();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get problemas(): string[] {
    return problemasFormulario(this.f);
  }

  get puedeAgregarBoton(): boolean {
    return this.f.botones.length < LIMITES_PLANTILLA.botones;
  }

  // ─── Encabezado ───────────────────────────────────────────────────────

  cambiarEncabezado(tipo: TipoEncabezado | ''): void {
    this.f = { ...this.f, encabezadoTipo: tipo, encabezadoTexto: tipo === 'TEXT' ? this.f.encabezadoTexto : '', imagen: tipo === 'IMAGE' ? this.f.imagen : null };
    this.errorImagen = null;
  }

  elegirImagen(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files && entrada.files[0];
    entrada.value = '';
    if (!archivo) return;
    this.errorImagen = null;
    if (!MIMES_IMAGEN.includes(archivo.type)) {
      this.errorImagen = this.translate.instant('consolaWhatsapp.plantillas.errores.imagenTipo');
      return;
    }
    if (archivo.size > LIMITES_PLANTILLA.imagenBytes) {
      this.errorImagen = this.translate.instant('consolaWhatsapp.plantillas.errores.imagenPeso');
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const url = String(lector.result || '');
      const base64 = url.includes(',') ? url.split(',')[1] : '';
      if (!base64) {
        this.errorImagen = this.translate.instant('consolaWhatsapp.plantillas.errores.imagenLectura');
        return;
      }
      this.f = { ...this.f, imagen: { base64, mime: archivo.type, nombre: archivo.name, vistaPrevia: url } };
    };
    lector.onerror = () => {
      this.errorImagen = this.translate.instant('consolaWhatsapp.plantillas.errores.imagenLectura');
    };
    lector.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.f = { ...this.f, imagen: null };
    this.errorImagen = null;
  }

  // ─── Cuerpo ───────────────────────────────────────────────────────────

  /** Pone `{nombre}` donde está el cursor del mensaje (o al final si no hay cursor). */
  insertarNombre(): void {
    const marca = '{nombre}';
    const campo = this.cuerpoCampo?.nativeElement;
    const actual = this.f.cuerpo;
    if (!campo) {
      this.f = { ...this.f, cuerpo: `${actual}${actual && !actual.endsWith(' ') ? ' ' : ''}${marca}` };
      return;
    }
    const desde = campo.selectionStart ?? actual.length;
    const hasta = campo.selectionEnd ?? actual.length;
    const nuevo = `${actual.slice(0, desde)}${marca}${actual.slice(hasta)}`;
    const posicion = desde + marca.length;
    // Se escribe en el campo y en el modelo a la vez, así el cursor queda después de la marca sin esperar a la revisión.
    campo.value = nuevo;
    campo.setSelectionRange(posicion, posicion);
    campo.focus();
    this.f = { ...this.f, cuerpo: nuevo };
  }

  // ─── Botones ──────────────────────────────────────────────────────────

  agregarBoton(tipo: TipoBoton): void {
    if (!this.puedeAgregarBoton) return;
    const boton: BotonPlantilla = { tipo, texto: '', ...(tipo === 'URL' ? { url: '' } : {}), ...(tipo === 'PHONE_NUMBER' ? { telefono: '' } : {}) };
    this.f = { ...this.f, botones: [...this.f.botones, boton] };
  }

  quitarBoton(indice: number): void {
    this.f = { ...this.f, botones: this.f.botones.filter((_, i) => i !== indice) };
  }

  cambiarBoton(indice: number, campo: 'texto' | 'url' | 'telefono', valor: string): void {
    this.f = { ...this.f, botones: this.f.botones.map((b, i) => (i === indice ? { ...b, [campo]: valor } : b)) };
  }

  claveTipoBoton(tipo: TipoBoton): string {
    return tipo === 'URL' ? 'consolaWhatsapp.plantillas.boton.enlace' : tipo === 'PHONE_NUMBER' ? 'consolaWhatsapp.plantillas.boton.llamar' : 'consolaWhatsapp.plantillas.boton.respuesta';
  }

  // ─── Enviar ───────────────────────────────────────────────────────────

  enviar(): void {
    if (this.enviando) return;
    this.intento = true;
    this.errorServidor = null;
    if (this.problemas.length > 0 || !this.lineId) return;
    this.enviando = true;
    this.consola
      .crearPlantilla(this.lineId, entradaDeFormulario(this.f))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.enviando = false;
          this.toastr.success(this.translate.instant('integrations.messagingLines.plantillaCreada'));
          this.creada.emit();
        },
        error: (err) => {
          this.enviando = false;
          const mensaje = err?.error?.message;
          // `TEMPLATE_INVALID` trae qué corregir, ya en palabras sencillas: se muestra tal cual.
          this.errorServidor =
            typeof mensaje === 'string' && mensaje.trim()
              ? mensaje
              : this.translate.instant('integrations.messagingLines.plantillaError');
        },
      });
  }
}
