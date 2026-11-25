import { EtapaId, EtapaInfo } from '../servicios/en-vivo.modelos';

/**
 * Traductor que el componente le pasa a las utilidades puras (que no inyectan `TranslateService`).
 * Se arma en el componente: `(clave, params) => this.translate.instant(clave, params)`.
 */
export type Traductor = (clave: string, params?: Record<string, unknown>) => string;

/**
 * Nombre de una etapa para mostrar. El servidor manda `nombre` en español; la etiqueta se traduce
 * por el id de la etapa (`enVivo.etapa.<id>`). Si no hay clave para ese id, se muestra el nombre que llegó.
 */
export function nombreDeEtapa(id: EtapaId, info: EtapaInfo | undefined | null, t: Traductor): string {
  const clave = `enVivo.etapa.${id}`;
  const traducido = t(clave);
  return traducido !== clave ? traducido : info?.nombre ?? id;
}
