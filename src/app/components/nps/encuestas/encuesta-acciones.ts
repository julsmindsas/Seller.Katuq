import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { NpsService } from '../../../shared/services/nps/nps.service';
import { Encuesta, EstadoEncuesta } from '../../../shared/services/nps/nps.models';
import { codigoError, mensajeError } from '../nps-comun';

/** Resultado de activar o pausar: la encuesta nueva, o null si no se cambió. */
export interface ResultadoEstado {
  encuesta: Encuesta | null;
  pausada?: { id: string; nombre: string };
}

/**
 * Activar o pausar una encuesta (D-490). Si ya hay otra encuesta de entrega activa, el
 * servidor responde 409 OTRA_ACTIVA: se pide confirmación con Swal y se reintenta con
 * `confirmar: true`. Los errores se muestran con Swal y devuelven `{ encuesta: null }`.
 * Lo usan la lista y el editor.
 */
export function cambiarEstadoEncuesta(nps: NpsService, encuesta: Encuesta, estado: Exclude<EstadoEncuesta, 'borrador'>): Observable<ResultadoEstado> {
  return nps.cambiarEstado(encuesta.id, estado).pipe(
    map((r) => ({ encuesta: r.encuesta, pausada: r.pausada })),
    catchError((e) => {
      if (e?.status === 409 && codigoError(e) === 'OTRA_ACTIVA') {
        const otra = e?.error?.otra?.nombre || 'la encuesta de entrega activa';
        return confirmar(
          'Cambiar la encuesta de entrega',
          `Solo puede haber una encuesta activa después de la entrega. Si activas "${encuesta.nombre}", "${otra}" queda pausada y los pedidos nuevos usan la nueva.`,
          'Activar y pausar la otra',
        ).pipe(
          switchMap((ok) => (ok
            ? nps.cambiarEstado(encuesta.id, estado, true).pipe(
              map((r) => ({ encuesta: r.encuesta, pausada: r.pausada } as ResultadoEstado)),
              catchError((e2) => avisarError(e2)),
            )
            : of({ encuesta: null } as ResultadoEstado))),
        );
      }
      return avisarError(e);
    }),
  );
}

function confirmar(titulo: string, texto: string, boton: string): Observable<boolean> {
  return new Observable<boolean>((sub) => {
    Swal.fire({
      title: titulo,
      text: texto,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: boton,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
      cancelButtonColor: '#5A6B78',
      reverseButtons: true,
    }).then((r) => {
      sub.next(!!r.isConfirmed);
      sub.complete();
    });
  });
}

function avisarError(e: any): Observable<ResultadoEstado> {
  const incompleta = codigoError(e) === 'INCOMPLETA';
  Swal.fire({
    title: incompleta ? 'Falta algo para activarla' : 'No pudimos cambiar el estado',
    text: mensajeError(e, incompleta
      ? 'Revisa que tenga la pregunta del 0 al 10 y un responsable de los detractores.'
      : 'Intenta de nuevo en unos minutos.'),
    icon: 'warning',
    confirmButtonColor: '#5F3FE0',
  });
  return of({ encuesta: null });
}

/** Confirmación y borrado; con respuestas el servidor responde 409 TIENE_RESPUESTAS. */
export function eliminarEncuesta(nps: NpsService, encuesta: Encuesta): Observable<boolean> {
  return confirmar('Eliminar la encuesta', `"${encuesta.nombre}" se elimina y no se puede recuperar.`, 'Eliminar').pipe(
    switchMap((ok) => (!ok ? of(false) : nps.eliminarEncuesta(encuesta.id).pipe(
      map(() => true),
      catchError((e) => {
        const conRespuestas = codigoError(e) === 'TIENE_RESPUESTAS';
        Swal.fire({
          title: conRespuestas ? 'Esta encuesta ya tiene respuestas' : 'No pudimos eliminarla',
          text: conRespuestas
            ? 'Para no perder lo que respondieron tus clientes, no se puede eliminar. Puedes pausarla.'
            : mensajeError(e, 'Intenta de nuevo en unos minutos.'),
          icon: 'info',
          confirmButtonColor: '#5F3FE0',
        });
        return of(false);
      }),
    ))),
  );
}

/** El QR del enlace en PNG, para el mostrador, el empaque o las redes. */
export async function descargarQr(enlace: string, nombreArchivo: string): Promise<boolean> {
  try {
    const QRCode = await import('qrcode');
    const datos = await QRCode.toDataURL(enlace, {
      width: 720, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#211F3A', light: '#FFFFFF' },
    });
    const a = document.createElement('a');
    a.href = datos;
    a.download = `qr-${nombreArchivo}.png`;
    a.click();
    return true;
  } catch {
    return false;
  }
}

/** Vista previa del QR (data URL) o null si no se pudo generar. */
export async function qrComoImagen(enlace: string): Promise<string | null> {
  try {
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(enlace, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#211F3A', light: '#FFFFFF' } });
  } catch {
    return null;
  }
}

/** La dirección pública de una encuesta de enlace. */
export function enlaceDe(encuesta: Pick<Encuesta, 'enlace' | 'publicId'>): string | null {
  if (encuesta.enlace) return encuesta.enlace;
  return encuesta.publicId ? `${window.location.origin}/encuesta/e-${encuesta.publicId}` : null;
}

/** Nombre de archivo seguro a partir del nombre de la encuesta. */
export function nombreArchivo(nombre: string): string {
  return String(nombre || 'encuesta')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'encuesta';
}
