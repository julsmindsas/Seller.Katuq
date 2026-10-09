import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { finalize, map, timeout } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { BaseService } from '../base.service';
import { AILimitsService } from '../ai-limits.service';
import { SubscriptionService } from '../subscription.service';
import {
  CampoFicha,
  DecisionFicha,
  FichaDesdeFoto,
  FotoError,
  LADO_MAXIMO_IA,
  LADO_MAXIMO_PRODUCTO,
  MENSAJES_FOTO,
  RespuestaFichaDesdeFoto,
  TIEMPO_LIMITE_FICHA_MS,
  decidirFoto,
  errorSinFicha,
  medidasReducidas,
  mensajeDeErrorFicha,
  nombresDeCampos,
  normalizarFicha,
} from './ficha-desde-foto.mapper';

/** La foto elegida, lista para las dos cosas que se hacen con ella. */
export interface FotoPreparada {
  /** Copia reducida (JPG, data URL) que viaja a la IA: pesa una fracción de la original. */
  paraIA: string;
  /** Lo que queda como imagen principal del producto: la original, o una versión reducida si hacía falta. */
  paraProducto: File;
  /** Data URL de `paraProducto`, para mostrar la vista previa. */
  vistaPrevia: string;
}

export interface ResultadoFicha {
  ficha: FichaDesdeFoto;
  foto: FotoPreparada;
}

/**
 * Ficha del producto desde UNA foto (bandera `productFromPhoto`).
 *
 * Un solo paso para quien lo usa: elige la foto y el formulario se llena. Este
 * servicio hace lo común a los dos formularios (el rápido y el completo): revisa
 * el cupo de IA del plan, prepara la foto, pide la ficha al servidor y traduce
 * cualquier falla a un aviso en español. Qué campos se llenan y cómo lo decide
 * `ficha-desde-foto.mapper.ts`; poner los valores en cada formulario le toca a
 * cada componente.
 *
 * Esto solo decide qué se MUESTRA y cómo se atiende: quien manda es el servidor
 * (`requireFeature('productFromPhoto')`, responde 403 si la función está apagada).
 */
@Injectable({
  providedIn: 'root',
})
export class FichaDesdeFotoService extends BaseService {
  constructor(
    http: HttpClient,
    private readonly aiLimits: AILimitsService,
    private readonly subscription: SubscriptionService,
  ) {
    super(http);
  }

  /**
   * Pide la ficha al servidor con la copia reducida de la foto.
   * Falla con el error del servidor tal cual (para `mensajeDeErrorFicha`) o, si
   * llega una respuesta sin ficha utilizable, como "no identificamos el producto".
   * Si en `TIEMPO_LIMITE_FICHA_MS` no llega ni una respuesta ni un error (la red se
   * cayó a mitad de la llamada), se rinde con un `TimeoutError` y cancela la petición:
   * así el formulario no se queda esperando para siempre con "Guardar" bloqueado.
   */
  pedirFicha(fotoParaIA: string): Observable<FichaDesdeFoto> {
    return this.post<RespuestaFichaDesdeFoto>('/v1/katuqintelligence/ficha-desde-foto', { imagen: fotoParaIA }).pipe(
      timeout(TIEMPO_LIMITE_FICHA_MS),
      map((respuesta) => {
        const ficha = respuesta && respuesta.success ? normalizarFicha(respuesta.ficha) : null;
        if (!ficha) {
          throw errorSinFicha(respuesta?.message);
        }
        return ficha;
      }),
      // El cupo de IA se descuenta en el servidor ANTES de leer la foto, así que la lectura
      // salga bien o mal el contador que ve la persona cambió: se refresca en ambos casos.
      finalize(() => this.refrescarUso()),
    );
  }

  /**
   * Todo el camino hasta tener la ficha. Devuelve `null` si no se pudo (la
   * persona ya recibió el aviso, no hay que decirle nada más) o si no puede usar
   * la IA por el límite de su plan.
   *
   * `sigueVigente` lo pasa la pantalla: devuelve false si la persona ya cambió de
   * producto o salió de la pantalla mientras se leía la foto. Entonces un fallo no
   * se avisa (el aviso aparecería en otra pantalla, sobre algo que ya no existe).
   */
  async generar(archivo: File, sigueVigente: () => boolean = () => true): Promise<ResultadoFicha | null> {
    if (!this.aiLimits.canUseAIFeature('products')) {
      await Swal.fire({
        icon: 'info',
        title: 'Ya usó las lecturas de IA de su plan',
        // El cupo diario se cuenta por día UTC y se renueva a las 7:00 p. m. hora de Colombia: decir "mañana" era falso para quien lo agotó en la tarde.
        text: 'Llegó al límite de uso de la IA por hoy. Vuelva a intentar más tarde o pase a Premium para usarla sin límite.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return null;
    }

    try {
      const foto = await this.prepararFoto(archivo);
      const ficha = await firstValueFrom(this.pedirFicha(foto.paraIA));
      return { ficha, foto };
    } catch (error) {
      const aviso = mensajeDeErrorFicha(error);
      // 401 y 403 ya los avisó el interceptor global (sesión vencida, función apagada, límite del plan).
      if (!aviso.silencioso && sigueVigente()) {
        await Swal.fire({
          icon: aviso.icono,
          title: aviso.titulo,
          text: aviso.texto,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#5F3FE0',
        });
      }
      return null;
    }
  }

  /**
   * La única pregunta del flujo, y solo cuando hace falta: la foto trae
   * sugerencias para campos que YA tienen algo escrito.
   *  - "Reemplazar con la foto" -> 'todo'
   *  - "Solo llenar lo vacío"   -> 'vacios'
   *  - cerrar o cancelar        -> null (no se toca nada)
   */
  async preguntarSiPisar(conflictos: CampoFicha[]): Promise<DecisionFicha | null> {
    const respuesta = await Swal.fire({
      icon: 'question',
      title: 'Ya hay datos escritos',
      html:
        `<p>La foto trae sugerencias para campos que ya tienen algo: <strong>${nombresDeCampos(conflictos)}</strong>.</p>` +
        '<p>¿Qué prefiere hacer?</p>',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Reemplazar con la foto',
      denyButtonText: 'Solo llenar lo vacío',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
      denyButtonColor: '#8f8bab',
      reverseButtons: true,
    });
    if (respuesta.isConfirmed) {
      return 'todo';
    }
    if (respuesta.isDenied) {
      return 'vacios';
    }
    return null;
  }

  /** Aviso final, que no tapa la pantalla: la persona sigue revisando el formulario. */
  avisarListo(texto: string): void {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: texto,
      showConfirmButton: false,
      timer: 7000,
      timerProgressBar: true,
      width: 'min(92vw, 460px)',
    });
  }

  // ── La foto ────────────────────────────────────────────────────────────────

  /**
   * Prepara la foto elegida: revisa que sirva, saca la copia reducida para la IA
   * y deja lista la imagen del producto. La original se usa tal cual cuando es
   * JPG/PNG/WEBP de hasta 5 MB (igual que si la hubiera subido a mano); si no
   * (HEIC, GIF, muy pesada) se reduce a un JPG.
   *
   * @throws {FotoError} con un mensaje para el comercio
   */
  async prepararFoto(archivo: File): Promise<FotoPreparada> {
    const decision = decidirFoto(archivo.type, archivo.size);
    if (!decision.aceptar) {
      const motivo = decision.motivo || 'NO_SE_PUDO_LEER';
      throw new FotoError(motivo, MENSAJES_FOTO[motivo]);
    }

    // `URL.createObjectURL` solo se usa para DECODIFICAR la foto en memoria (nunca para
    // mostrarla: el sanitizador de Angular deja el `blob:` en `unsafe:`). Se libera al final.
    const direccion = URL.createObjectURL(archivo);
    try {
      const imagen = await this.cargarImagen(direccion);
      const paraIA = this.dibujar(imagen, LADO_MAXIMO_IA).toDataURL('image/jpeg', 0.85);

      let paraProducto = archivo;
      if (!decision.usarOriginal) {
        const blob = await this.aBlob(this.dibujar(imagen, LADO_MAXIMO_PRODUCTO), 'image/jpeg', 0.9);
        paraProducto = new File([blob], this.nombreJpg(archivo.name), { type: 'image/jpeg' });
      }

      const vistaPrevia = await this.leerComoDataUrl(paraProducto);
      return { paraIA, paraProducto, vistaPrevia };
    } finally {
      URL.revokeObjectURL(direccion);
    }
  }

  private cargarImagen(direccion: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const imagen = new Image();
      imagen.onload = () => resolve(imagen);
      imagen.onerror = () => reject(new FotoError('NO_SE_PUDO_LEER', MENSAJES_FOTO.NO_SE_PUDO_LEER));
      imagen.src = direccion;
    });
  }

  /** Dibuja la foto con su lado más largo como mucho `ladoMaximo`, sobre fondo blanco (un PNG transparente no queda negro en JPG). */
  private dibujar(imagen: HTMLImageElement, ladoMaximo: number): HTMLCanvasElement {
    const medidas = medidasReducidas(imagen.naturalWidth || imagen.width, imagen.naturalHeight || imagen.height, ladoMaximo);
    const lienzo = document.createElement('canvas');
    lienzo.width = medidas.ancho;
    lienzo.height = medidas.alto;
    const contexto = lienzo.getContext('2d');
    if (!contexto || medidas.ancho === 0 || medidas.alto === 0) {
      throw new FotoError('NO_SE_PUDO_LEER', MENSAJES_FOTO.NO_SE_PUDO_LEER);
    }
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, medidas.ancho, medidas.alto);
    contexto.drawImage(imagen, 0, 0, medidas.ancho, medidas.alto);
    return lienzo;
  }

  private aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      lienzo.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new FotoError('NO_SE_PUDO_LEER', MENSAJES_FOTO.NO_SE_PUDO_LEER))),
        tipo,
        calidad,
      );
    });
  }

  private leerComoDataUrl(archivo: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result || ''));
      lector.onerror = () => reject(new FotoError('NO_SE_PUDO_LEER', MENSAJES_FOTO.NO_SE_PUDO_LEER));
      lector.readAsDataURL(archivo);
    });
  }

  private nombreJpg(nombre: string): string {
    const base = String(nombre || '').replace(/\.[^.]+$/, '').trim();
    return `${base || 'foto'}.jpg`;
  }

  /** Actualiza el contador de uso de IA que ve la persona. */
  private refrescarUso(): void {
    try {
      this.subscription.refresh();
    } catch {
      // El contador se actualiza solo en la próxima carga; no vale la pena molestar por esto.
    }
  }
}
