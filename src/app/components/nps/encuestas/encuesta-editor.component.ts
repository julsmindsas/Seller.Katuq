import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { EscalaNpsComponent } from '../../../shared/components/escala-nps/escala-nps.component';
import { SecurityService } from '../../../shared/services/security/security.service';
import { NpsService } from '../../../shared/services/nps/nps.service';
import { segmentoDeNota } from '../../../shared/services/feedback/feedback.models';
import {
  Encuesta, EncuestaCambios, MAX_ADICIONALES, PreguntaAdicional, PreguntasEncuesta, TipoAdicional, UsuarioResponsable,
} from '../../../shared/services/nps/nps.models';
import { NOMBRE_CANAL, NOMBRE_ESTADO_ENCUESTA, NOMBRE_ETAPA, conComercio, esAdministradorSesion, mensajeError } from '../nps-comun';
import { ResultadoEstado, cambiarEstadoEncuesta, descargarQr, eliminarEncuesta, enlaceDe, nombreArchivo, qrComoImagen } from './encuesta-acciones';

const MAX_PREGUNTA = 200;
const MAX_OPCION = 80;
const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;

/** Textos por omisión si el servidor no responde la plantilla (los de la spec). */
const PLANTILLA_LOCAL: PreguntasEncuesta = {
  nps: 'Del 0 al 10, ¿qué tan probable es que le recomiendes {comercio} a un amigo?',
  abiertas: {
    detractor: '¿Qué es lo primero que deberíamos arreglar?',
    pasivo: '¿Qué nos falta para que nos des un 10?',
    promotor: '¿Qué es lo que más te gustó?',
  },
  adicionales: [],
};

/** Una pregunta de opción única necesita de 2 a 6 opciones con texto. */
function opcionesValidas(grupo: AbstractControl): ValidationErrors | null {
  if (grupo.get('tipo')?.value !== 'opcion') return null;
  const opciones = (grupo.get('opciones') as FormArray).controls;
  if (opciones.length < MIN_OPCIONES || opciones.length > MAX_OPCIONES) return { opciones: true };
  return null;
}

function idNuevo(): string {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Crear o editar una encuesta (D-490): formulario reactivo con vista previa de lo que ve el
 * cliente (la misma escala que la página pública). El canal "entrega" pide los días de
 * espera; "enlace" da la dirección y el QR. Solo la familia Administrador escribe; la
 * encuesta de Julsmind a sus comercios se muestra de solo lectura.
 */
@Component({
  selector: 'app-nps-encuesta-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, EscalaNpsComponent],
  templateUrl: './encuesta-editor.component.html',
  styleUrls: ['./encuesta-editor.component.scss'],
})
export class EncuestaEditorComponent implements OnInit, OnDestroy {
  readonly MAX_PREGUNTA = MAX_PREGUNTA;
  readonly MAX_OPCION = MAX_OPCION;
  readonly MAX_OPCIONES = MAX_OPCIONES;
  readonly MAX_ADICIONALES = MAX_ADICIONALES;
  readonly NOMBRE_CANAL = NOMBRE_CANAL;
  readonly NOMBRE_ESTADO = NOMBRE_ESTADO_ENCUESTA;
  readonly NOMBRE_ETAPA = NOMBRE_ETAPA;
  readonly comercio = this.security.getCompanyInformationLogged()?.nombreComercio || 'tu tienda';
  readonly segmentos = [
    { key: 'detractor', etiqueta: 'Si responde de 0 a 6' },
    { key: 'pasivo', etiqueta: 'Si responde 7 u 8' },
    { key: 'promotor', etiqueta: 'Si responde 9 o 10' },
  ];

  form: FormGroup;
  encuesta: Encuesta | null = null;
  esNueva = false;
  soloLectura = false;
  cargando = true;
  error: string | null = null;
  guardando = false;
  cambiandoEstado = false;
  intentoActivar = false;
  responsables: UsuarioResponsable[] = [];
  /** Nota escogida en la vista previa, para mostrar la pregunta que sigue. */
  notaVista: number | null = null;
  qrImagen: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private nps: NpsService,
    private security: SecurityService,
    private toastr: ToastrService,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      canal: ['entrega', Validators.required],
      diasEspera: [3, [Validators.required, Validators.min(1), Validators.max(30)]],
      responsableEmail: [''],
      nps: ['', [Validators.required, Validators.maxLength(MAX_PREGUNTA)]],
      abiertas: this.fb.group({
        detractor: ['', [Validators.required, Validators.maxLength(MAX_PREGUNTA)]],
        pasivo: ['', [Validators.required, Validators.maxLength(MAX_PREGUNTA)]],
        promotor: ['', [Validators.required, Validators.maxLength(MAX_PREGUNTA)]],
      }),
      adicionales: this.fb.array([]),
    });
  }

  get adicionales(): FormArray { return this.form.get('adicionales') as FormArray; }
  get canal(): string { return this.form.get('canal')?.value; }
  get valorNps(): string { return this.form.get('nps')?.value || ''; }

  opciones(i: number): FormArray {
    return this.adicionales.at(i).get('opciones') as FormArray;
  }

  /** La pregunta abierta que vería el cliente con la nota de la vista previa. */
  get abiertaVista(): string {
    if (this.notaVista === null) return '';
    return this.form.get(['abiertas', segmentoDeNota(this.notaVista)])?.value || '';
  }

  get enlace(): string | null {
    return this.encuesta?.canal === 'enlace' ? enlaceDe(this.encuesta) : null;
  }

  /** El canal se escoge al crear; después el servidor no deja cambiarlo (400 CANAL_FIJO). */
  get canalEditable(): boolean {
    return !this.soloLectura && this.esNueva;
  }

  get faltaResponsable(): boolean {
    return !this.form.get('responsableEmail')?.value;
  }

  ngOnInit(): void {
    this.form.get('canal')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.ajustarDias());

    this.route.paramMap.pipe(
      map((p) => p.get('id') || 'nueva'),
      switchMap((id) => this.cargar(id)),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargar(id: string): Observable<unknown> {
    this.cargando = true;
    this.error = null;
    this.esNueva = id === 'nueva';
    // Las encuestas solo las lee la familia Administrador (el servidor responde 403).
    if (!esAdministradorSesion()) {
      this.cargando = false;
      this.error = 'Las encuestas las ven y las cambian los administradores de tu empresa.';
      return of(null);
    }
    this.cargarResponsables();

    const fuente$: Observable<Encuesta | PreguntasEncuesta> = this.esNueva
      ? this.nps.plantilla().pipe(map((r) => r?.preguntas || PLANTILLA_LOCAL), catchError(() => of(PLANTILLA_LOCAL)))
      : id === 'seller'
        // La encuesta virtual de Julsmind solo viene en el listado.
        ? this.nps.encuestas().pipe(map((r) => {
          const e = (r?.encuestas || []).find((x) => x.id === 'seller');
          if (!e) throw { status: 404 };
          return e;
        }))
        : this.nps.encuesta(id).pipe(map((r) => r.encuesta));

    return fuente$.pipe(
      map((dato) => {
        if (this.esNueva) this.llenarNueva(dato as PreguntasEncuesta);
        else this.llenar(dato as Encuesta);
        this.cargando = false;
      }),
      catchError((e) => {
        this.cargando = false;
        this.error = e?.status === 404
          ? 'No encontramos esta encuesta. Puede que la hayan eliminado.'
          : mensajeError(e, 'No pudimos abrir la encuesta. Intenta de nuevo en unos minutos.');
        return of(null);
      }),
    );
  }

  private cargarResponsables(): void {
    if (!esAdministradorSesion()) return;
    this.nps.responsables().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.responsables = r?.usuarios || []; this.incluirResponsableActual(); },
      error: () => { this.responsables = []; this.incluirResponsableActual(); },
    });
  }

  /** Si el responsable guardado ya no está activo, se sigue mostrando para no perderlo de vista. */
  private incluirResponsableActual(): void {
    const actual = this.encuesta?.responsable;
    if (actual?.email && !this.responsables.some((u) => u.email === actual.email)) {
      this.responsables = [{ email: actual.email, nombre: `${actual.nombre || actual.email} (ya no está activo)`, rol: '' }, ...this.responsables];
    }
  }

  private llenarNueva(preguntas: PreguntasEncuesta): void {
    this.encuesta = null;
    this.soloLectura = !esAdministradorSesion();
    this.adicionales.clear();
    this.form.reset({
      nombre: '',
      canal: 'entrega',
      diasEspera: 3,
      responsableEmail: '',
      nps: preguntas.nps || PLANTILLA_LOCAL.nps,
      abiertas: { ...PLANTILLA_LOCAL.abiertas, ...(preguntas.abiertas || {}) },
    });
    (preguntas.adicionales || []).slice(0, MAX_ADICIONALES).forEach((a) => this.adicionales.push(this.grupoAdicional(a)));
    this.aplicarModo();
  }

  private llenar(e: Encuesta): void {
    this.encuesta = e;
    this.soloLectura = !!e.soloLectura || !esAdministradorSesion();
    this.adicionales.clear();
    this.form.reset({
      nombre: e.nombre,
      canal: e.canal === 'seller' ? 'entrega' : e.canal,
      diasEspera: e.diasEspera || 3,
      responsableEmail: e.responsable?.email || '',
      nps: e.preguntas?.nps || '',
      abiertas: { ...PLANTILLA_LOCAL.abiertas, ...(e.preguntas?.abiertas || {}) },
    });
    (e.preguntas?.adicionales || []).slice(0, MAX_ADICIONALES).forEach((a) => this.adicionales.push(this.grupoAdicional(a)));
    this.incluirResponsableActual();
    this.aplicarModo();
    this.qrImagen = null;
    const url = this.enlace;
    if (url) qrComoImagen(url).then((img) => (this.qrImagen = img));
  }

  private aplicarModo(): void {
    if (this.soloLectura) {
      this.form.disable({ emitEvent: false });
      return;
    }
    this.form.enable({ emitEvent: false });
    if (!this.canalEditable) this.form.get('canal')?.disable({ emitEvent: false });
    this.ajustarDias();
    this.form.markAsPristine();
  }

  /** Los días de espera solo aplican a la encuesta de entrega. */
  private ajustarDias(): void {
    const dias = this.form.get('diasEspera');
    if (!dias || this.soloLectura) return;
    if (this.canal === 'entrega') dias.enable({ emitEvent: false });
    else dias.disable({ emitEvent: false });
  }

  private grupoAdicional(a?: Partial<PreguntaAdicional>): FormGroup {
    const tipo: TipoAdicional = a?.tipo === 'texto' ? 'texto' : 'opcion';
    const opciones = tipo === 'opcion' ? (a?.opciones?.length ? a.opciones : ['', '']) : [];
    return this.fb.group({
      id: [a?.id || idNuevo()],
      tipo: [tipo],
      texto: [a?.texto || '', [Validators.required, Validators.maxLength(MAX_PREGUNTA)]],
      opciones: this.fb.array(opciones.slice(0, MAX_OPCIONES).map((o) => this.controlOpcion(o))),
    }, { validators: opcionesValidas });
  }

  private controlOpcion(valor = ''): AbstractControl {
    return this.fb.control(valor, [Validators.required, Validators.maxLength(MAX_OPCION)]);
  }

  agregarAdicional(): void {
    if (this.adicionales.length >= MAX_ADICIONALES) return;
    this.adicionales.push(this.grupoAdicional());
    this.form.markAsDirty();
  }

  quitarAdicional(i: number): void {
    this.adicionales.removeAt(i);
    this.form.markAsDirty();
  }

  cambiarTipo(i: number, tipo: TipoAdicional): void {
    const grupo = this.adicionales.at(i);
    if (grupo.get('tipo')?.value === tipo) return;
    grupo.get('tipo')?.setValue(tipo);
    const ops = this.opciones(i);
    ops.clear();
    if (tipo === 'opcion') { ops.push(this.controlOpcion()); ops.push(this.controlOpcion()); }
    grupo.updateValueAndValidity();
    this.form.markAsDirty();
  }

  agregarOpcion(i: number): void {
    const ops = this.opciones(i);
    if (ops.length >= MAX_OPCIONES) return;
    ops.push(this.controlOpcion());
    this.adicionales.at(i).updateValueAndValidity();
    this.form.markAsDirty();
  }

  quitarOpcion(i: number, j: number): void {
    const ops = this.opciones(i);
    if (ops.length <= MIN_OPCIONES) return;
    ops.removeAt(j);
    this.adicionales.at(i).updateValueAndValidity();
    this.form.markAsDirty();
  }

  invalido(ruta: (string | number)[]): boolean {
    const c = this.form.get(ruta);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  vista(texto: string): string {
    return conComercio(texto, this.comercio);
  }

  guardar(): void {
    this.guardarSiHaceFalta().pipe(takeUntil(this.destroy$)).subscribe();
  }

  /** Guarda si es nueva o tiene cambios; devuelve la encuesta guardada o null si no se pudo. */
  private guardarSiHaceFalta(): Observable<Encuesta | null> {
    if (this.soloLectura) return of(this.encuesta);
    if (!this.esNueva && this.form.pristine && this.encuesta) return of(this.encuesta);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toastr.warning('Revisa los campos marcados en rojo.', 'Falta completar la encuesta');
      return of(null);
    }
    this.guardando = true;
    const datos = this.datos();
    const peticion$ = this.esNueva || !this.encuesta
      ? this.nps.crearEncuesta(datos)
      : this.nps.editarEncuesta(this.encuesta.id, datos);
    return peticion$.pipe(
      map((r) => {
        this.guardando = false;
        const guardada = r.encuesta;
        this.toastr.success('Encuesta guardada');
        if (this.esNueva) {
          // Desde aquí la dirección es la de la encuesta creada.
          this.router.navigate(['/nps/encuestas', guardada.id], { replaceUrl: true });
        } else {
          this.llenar(guardada);
        }
        return guardada;
      }),
      catchError((e) => {
        this.guardando = false;
        this.toastr.error(mensajeError(e, 'No pudimos guardar la encuesta. Intenta de nuevo.'));
        return of(null);
      }),
    );
  }

  private datos(): EncuestaCambios {
    const v = this.form.getRawValue();
    const canal = v.canal === 'enlace' ? 'enlace' : 'entrega';
    return {
      nombre: String(v.nombre || '').trim(),
      // El canal solo va al crear.
      ...(this.esNueva ? { canal } : {}),
      ...(canal === 'entrega' ? { diasEspera: Number(v.diasEspera) } : {}),
      responsableEmail: v.responsableEmail || '',
      preguntas: {
        nps: String(v.nps || '').trim(),
        abiertas: {
          detractor: String(v.abiertas.detractor || '').trim(),
          pasivo: String(v.abiertas.pasivo || '').trim(),
          promotor: String(v.abiertas.promotor || '').trim(),
        },
        adicionales: (v.adicionales || []).map((a: any) => ({
          id: a.id,
          tipo: a.tipo,
          texto: String(a.texto || '').trim(),
          ...(a.tipo === 'opcion' ? { opciones: (a.opciones || []).map((o: string) => String(o || '').trim()) } : {}),
        })),
      },
    };
  }

  /** Activa (guardando antes si hace falta) o pausa. */
  alternarEstado(): void {
    if (this.cambiandoEstado || this.soloLectura) return;
    const activar = this.encuesta?.estado !== 'activa';
    if (activar && this.faltaResponsable) {
      this.intentoActivar = true;
      this.form.get('responsableEmail')?.markAsTouched();
      this.toastr.warning('Escoge quién atiende a los clientes inconformes antes de activarla.', 'Falta el responsable');
      return;
    }
    this.cambiandoEstado = true;
    this.guardarSiHaceFalta().pipe(
      switchMap((e): Observable<ResultadoEstado> => (e ? cambiarEstadoEncuesta(this.nps, e, activar ? 'activa' : 'pausada') : of({ encuesta: null }))),
      takeUntil(this.destroy$),
    ).subscribe((r) => {
      this.cambiandoEstado = false;
      if (!r.encuesta) return;
      this.llenar(r.encuesta);
      this.toastr.success(activar ? 'La encuesta quedó activa' : 'La encuesta quedó pausada');
      if (r.pausada) this.toastr.info(`"${r.pausada.nombre}" quedó pausada`);
    });
  }

  eliminar(): void {
    if (!this.encuesta || this.soloLectura) return;
    eliminarEncuesta(this.nps, this.encuesta).pipe(takeUntil(this.destroy$)).subscribe((ok) => {
      if (!ok) return;
      this.toastr.success('Encuesta eliminada');
      this.router.navigate(['/nps/encuestas']);
    });
  }

  copiarEnlace(): void {
    const url = this.enlace;
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => this.toastr.success('Enlace copiado'),
      () => this.toastr.info(url, 'Copia el enlace'),
    );
  }

  async descargarQr(): Promise<void> {
    const url = this.enlace;
    if (url && !(await descargarQr(url, nombreArchivo(this.encuesta?.nombre || 'encuesta')))) {
      this.toastr.error('No pudimos generar el QR. Intenta de nuevo.');
    }
  }

  porIndice(i: number): number {
    return i;
  }
}
