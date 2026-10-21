import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { merge, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ErrorDomicilios, interpretarErrorDomicilios } from '../domicilios.errores';
import { crearGrupoPunto, GrupoPunto, GrupoRecogida } from '../domicilios.formularios';
import { MAX_DESCRIPCION, MAX_ID_EXTERNO } from '../domicilios.cuerpos';
import { DomicilioNuevo, PuntoDomicilio } from '../domicilios.models';
import { DomiciliosService } from '../domicilios.service';
import { validarDomicilioPorCampo } from '../domicilios.utils';

interface DomicilioCreado {
  numero: string;
  /** Ya existía uno con ese id externo: no se creó otro. */
  repetido: boolean;
}

/**
 * Pestaña «Nuevo domicilio»: formulario reactivo para montar una entrega a mano. «Recoger en» viene de la
 * pantalla (se comparte con «Cargar archivo») y se precarga con la recogida guardada del comercio.
 */
@Component({
  selector: 'app-domicilios-nuevo',
  templateUrl: './nuevo-domicilio.component.html',
  styleUrls: ['./nuevo-domicilio.component.scss']
})
export class NuevoDomicilioComponent implements OnInit, OnDestroy {
  @Input() recogida!: GrupoRecogida;
  /** Solo un administrador puede guardar la recogida del comercio (`PUT /configuracion`). */
  @Input() esAdmin = false;
  /** Lleva a «Mis domicilios» buscando el número recién creado. */
  @Output() verEnLista = new EventEmitter<string>();
  @Output() irAIntegracion = new EventEmitter<void>();
  @Output() recogidaGuardada = new EventEmitter<Partial<PuntoDomicilio>>();

  readonly maxIdExterno = MAX_ID_EXTERNO;
  readonly maxDescripcion = MAX_DESCRIPCION;

  readonly form = new FormGroup({
    entrega: crearGrupoPunto() as GrupoPunto,
    valorDomicilio: new FormControl<number | null>(null),
    valorPedido: new FormControl<number | null>(null),
    cobrarAlEntregar: new FormControl<number | null>(null),
    descripcion: new FormControl('', { nonNullable: true }),
    idExterno: new FormControl('', { nonNullable: true }),
    guardarRecogida: new FormControl(false, { nonNullable: true })
  });

  enviando = false;
  /** Ya se intentó enviar: desde ahí los errores se revisan mientras se escribe. */
  intento = false;
  erroresCliente: Array<{ campo: string; mensaje: string }> = [];
  errorServidor: ErrorDomicilios | null = null;
  creado: DomicilioCreado | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly servicio: DomiciliosService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Mientras se corrige, los errores se van quitando solos; el del servidor se quita al tocar cualquier dato.
    merge(this.form.valueChanges, this.recogida.valueChanges)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.errorServidor = null;
        if (this.intento) this.erroresCliente = validarDomicilioPorCampo(this.armar());
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Errores por campo de la API, del lado del cliente y del servidor, para mostrarlos junto a cada campo. */
  get erroresPorCampo(): Record<string, string> {
    const mapa: Record<string, string> = {};
    this.erroresCliente.forEach(e => (mapa[e.campo] = e.mensaje));
    if (this.errorServidor?.accion === 'campo' && this.errorServidor.campo) {
      mapa[this.errorServidor.campo] = this.errorServidor.texto;
    }
    return mapa;
  }

  error(campo: string): string | null {
    return this.erroresPorCampo[campo] || null;
  }

  /** `id` del campo en la página: `entrega.ciudad` → `nuevo-entrega-ciudad`. */
  id(campo: string): string {
    return 'nuevo-' + campo.replace('.', '-');
  }

  enviar(): void {
    if (this.enviando) return;
    this.intento = true;
    this.creado = null;
    this.errorServidor = null;

    const domicilio = this.armar();
    this.erroresCliente = validarDomicilioPorCampo(domicilio);
    if (this.erroresCliente.length) {
      this.enfocar(this.erroresCliente[0].campo);
      return;
    }

    this.enviando = true;
    this.servicio
      .crear(domicilio)
      .pipe(
        finalize(() => (this.enviando = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: respuesta => {
          this.creado = { numero: respuesta.domicilio?.numero || '', repetido: respuesta.repetido === true };
          if (this.form.controls.guardarRecogida.value) this.guardarRecogida(domicilio.recogida);
          this.dejarListoParaOtro();
        },
        error: err => this.alFallar(err)
      });
  }

  /** Vacía lo del domicilio y deja «Recoger en» como está, listo para el siguiente. */
  limpiar(): void {
    this.creado = null;
    this.errorServidor = null;
    this.dejarListoParaOtro();
  }

  private dejarListoParaOtro(): void {
    this.intento = false;
    this.erroresCliente = [];
    this.form.reset({ guardarRecogida: false });
  }

  private alFallar(err: unknown): void {
    this.errorServidor = interpretarErrorDomicilios(err);
    if (this.errorServidor.accion === 'campo' && this.errorServidor.campo) this.enfocar(this.errorServidor.campo);
  }

  /** «Guardar como mi dirección de recogida»: se guarda después de crear el domicilio. */
  private guardarRecogida(punto: PuntoDomicilio): void {
    this.servicio
      .guardarConfiguracion({ recogidaPorDefecto: punto })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recogidaGuardada.emit(punto);
          this.toastr.success('Guardamos esta dirección como la recogida de tu comercio.', 'Recogida guardada');
        },
        error: err => this.toastr.warning(interpretarErrorDomicilios(err).texto, 'No guardamos la recogida')
      });
  }

  private armar(): DomicilioNuevo {
    const v = this.form.getRawValue();
    return {
      idExterno: v.idExterno,
      recogida: this.recogida.getRawValue(),
      entrega: v.entrega,
      valorDomicilio: Number(v.valorDomicilio) || 0,
      valorPedido: Number(v.valorPedido) || 0,
      cobrarAlEntregar: Number(v.cobrarAlEntregar) || 0,
      descripcion: v.descripcion
    };
  }

  private enfocar(campo: string): void {
    document.getElementById(campo.startsWith('recogida.') ? `nuevo-recogida-${campo.slice(9)}` : this.id(campo))?.focus();
  }
}
