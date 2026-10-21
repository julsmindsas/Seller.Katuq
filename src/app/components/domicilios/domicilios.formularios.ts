import { FormControl, FormGroup } from '@angular/forms';
import { PuntoDomicilio } from './domicilios.models';

/** Un punto (recogida o entrega) como formulario: un campo de texto por dato. */
export type GrupoPunto = FormGroup<{ [K in keyof PuntoDomicilio]: FormControl<string> }>;

/** El formulario de «Recoger en»: lo comparten «Nuevo domicilio» y «Cargar archivo». */
export type GrupoRecogida = GrupoPunto;

export function crearGrupoPunto(): GrupoPunto {
  const c = () => new FormControl('', { nonNullable: true });
  return new FormGroup({ nombre: c(), telefono: c(), direccion: c(), ciudad: c(), barrio: c(), indicaciones: c() });
}
