import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { AtencionService } from '../../../../../shared/services/messaging/atencion.service';
import {
  ItemRelacionado,
  MiembroEquipo,
  PorqueRelacionado,
  RelacionadosRespuesta,
} from '../../../../../shared/services/messaging/messaging.models';
import { nombreDeAsesor } from '../../../inbox-core/chat-dueno/nombre-asesor';
import { CANAL_BANDEJA_ICONO, CANAL_BANDEJA_LABEL } from '../../bandeja.canales';
import { CanalBandeja } from '../../bandeja.models';
import { claveRelacionado } from '../../bandeja.util';

/** Cuánto vale una respuesta guardada en memoria para el mismo chat. */
export const VIGENCIA_RELACIONADOS_MS = 60_000;
const MAX_CLAVES_EN_MEMORIA = 30;

export type EstadoRelacionados = 'vacio' | 'cargando' | 'listo' | 'limite' | 'error';

const TEXTO_PORQUE: Record<PorqueRelacionado, string> = {
  mismo_telefono: 'notificaciones.bandeja.relacionados.porque.mismo_telefono',
  misma_ficha: 'notificaciones.bandeja.relacionados.porque.misma_ficha',
  vinculo_manual: 'notificaciones.bandeja.relacionados.porque.vinculo_manual',
};

/** Una fila ya lista para pintar (el HTML no calcula nada). */
export interface FilaRelacionado {
  item: ItemRelacionado;
  clave: string;
  icono: string;
  canal: string;
  nombre: string;
  hora: string;
  linea: string;
  porque: string;
  dueno: string;
  cerrado: boolean;
  sinResponder: boolean;
}

/**
 * «Otros chats de este cliente»: botón de la barra del chat abierto con una lista corta de los chats que el
 * servidor une con certeza (mismo teléfono, misma ficha o vínculo manual). Solo lectura: pide una vez al
 * abrir el chat, guarda la respuesta 60 s por chat y descarta la que llegue tarde de otro chat. Quien lo
 * aloja abre el chat elegido con su `abrir()` de siempre. El host es `display: contents`.
 */
@Component({
  selector: 'app-bandeja-relacionados',
  templateUrl: './bandeja-relacionados.component.html',
  styleUrls: ['./bandeja-relacionados.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaRelacionadosComponent implements OnChanges, OnDestroy {
  /** Chat abierto: canal, hash (phoneHash o identidadHash) y línea (solo WhatsApp con número propio). */
  @Input() canal: CanalBandeja | null = null;
  @Input() hash: string | null = null;
  @Input() lineId: string | null = null;
  /** Equipo del comercio: el asesor se muestra con su nombre aunque el chat haya guardado su correo. */
  @Input() equipo: MiembroEquipo[] = [];

  @Output() elegir = new EventEmitter<ItemRelacionado>();
  /** Avisa si el botón se ve, para que la barra de quien lo aloja no quede vacía. */
  @Output() visibleChange = new EventEmitter<boolean>();
  private visibleEmitido: boolean | null = null;

  estado: EstadoRelacionados = 'vacio';
  abierto = false;
  filas: FilaRelacionado[] = [];
  /** Línea de ayuda cuando no se pudo unir por una ficha (texto ya traducido). */
  ayuda = '';
  /** Nombre del cliente cuando el servidor lo ancló a una ficha. */
  clienteNombre = '';

  private claveActual = '';
  /** Última respuesta pintada: si llega el equipo después, las filas se rehacen con los nombres. */
  private ultimaRes: RelacionadosRespuesta | null = null;
  /** Peticiones en vuelo (una por chat). Cambiar de chat NO las cancela: su respuesta llena la memoria igual. */
  private readonly subs = new Set<Subscription>();
  private readonly pendientes = new Set<string>();
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private readonly memoria = new Map<string, { en: number; res: RelacionadosRespuesta }>();

  constructor(
    private readonly atencion: AtencionService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['canal'] || cambios['hash'] || cambios['lineId']) {
      this.cargar();
    } else if (cambios['equipo'] && this.estado === 'listo' && this.ultimaRes) {
      this.aplicar(this.ultimaRes);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs.clear();
    if (this.reintento) clearTimeout(this.reintento);
  }

  /** El botón se ve con resultados, con una ayuda que dar o con un error que reintentar; si no, no estorba. */
  get visible(): boolean {
    if (this.estado === 'listo') return this.filas.length > 0 || !!this.ayuda;
    return this.estado === 'limite' || this.estado === 'error';
  }

  get hayError(): boolean {
    return this.estado === 'limite' || this.estado === 'error';
  }

  get textoError(): string {
    return this.estado === 'limite'
      ? 'notificaciones.bandeja.relacionados.limite'
      : 'notificaciones.bandeja.relacionados.error';
  }

  alternar(): void {
    this.abierto = !this.abierto;
  }

  cerrar(): void {
    this.abierto = false;
  }

  reintentar(): void {
    this.cargar(true);
  }

  elegirFila(fila: FilaRelacionado): void {
    this.abierto = false;
    this.elegir.emit(fila.item);
  }

  trackFila(_: number, f: FilaRelacionado): string {
    return f.clave;
  }

  private cargar(saltarMemoria = false): void {
    if (this.reintento) clearTimeout(this.reintento);
    this.reintento = null;
    this.abierto = false;
    this.filas = [];
    this.ayuda = '';
    this.clienteNombre = '';
    this.ultimaRes = null;
    const canal = this.canal;
    const hash = this.hash;
    if (!canal || !hash) {
      this.claveActual = '';
      this.estado = 'vacio';
      this.actualizar();
      return;
    }
    const lineId = canal === 'whatsapp' ? this.lineId || null : null;
    const clave = `${canal}|${hash}|${lineId || ''}`;
    this.claveActual = clave;

    const guardada = saltarMemoria ? undefined : this.memoria.get(clave);
    if (guardada && Date.now() - guardada.en < VIGENCIA_RELACIONADOS_MS) {
      this.aplicar(guardada.res);
      return;
    }

    this.estado = 'cargando';
    this.actualizar();
    // Si este chat ya tiene una petición en vuelo (el asesor salió y volvió), se espera esa: pedir otra la
    // toparía con el freno del servidor.
    if (this.pendientes.has(clave)) return;
    this.pedir(clave, canal, hash, lineId, true);
  }

  private pedir(clave: string, canal: CanalBandeja, hash: string, lineId: string | null, puedeReintentar: boolean): void {
    this.pendientes.add(clave);
    const sub = this.atencion.relacionados(canal, hash, lineId).subscribe({
      next: (res) => {
        this.pendientes.delete(clave);
        // La respuesta llena la memoria aunque ya no sea el chat abierto; solo se pinta si lo es.
        this.guardar(clave, res);
        if (this.claveActual === clave) this.aplicar(res);
      },
      error: (err) => {
        this.pendientes.delete(clave);
        if (this.claveActual !== clave) return;
        const status = err?.status;
        // Un solo reintento automático cuando el servidor pide esperar un momento.
        if (status === 429 && puedeReintentar) {
          this.reintento = setTimeout(() => {
            this.reintento = null;
            if (this.claveActual === clave && !this.pendientes.has(clave)) this.pedir(clave, canal, hash, lineId, false);
          }, 2300);
          return;
        }
        // 404 es igual si el chat no existe o no se puede ver: no se muestra nada. Sin la bandera (403) tampoco.
        if (status === 404 || status === 403) this.estado = 'vacio';
        else this.estado = status === 429 ? 'limite' : 'error';
        this.actualizar();
      },
    });
    this.subs.add(sub);
    sub.add(() => this.subs.delete(sub));
  }

  private actualizar(): void {
    this.cdr.markForCheck();
    const v = this.visible;
    if (v === this.visibleEmitido) return;
    this.visibleEmitido = v;
    // En una tarea aparte: este método corre dentro de la detección de cambios del padre.
    Promise.resolve().then(() => this.visibleChange.emit(v));
  }

  private guardar(clave: string, res: RelacionadosRespuesta): void {
    this.memoria.delete(clave);
    this.memoria.set(clave, { en: Date.now(), res });
    while (this.memoria.size > MAX_CLAVES_EN_MEMORIA) {
      const primera = this.memoria.keys().next().value as string;
      this.memoria.delete(primera);
    }
  }

  private aplicar(res: RelacionadosRespuesta): void {
    this.ultimaRes = res;
    this.filas = (res.items || []).map((i) => this.fila(i));
    this.clienteNombre = res.ancla?.tipo === 'cliente' ? (res.ancla.clienteNombre || '').trim() : '';
    this.ayuda = this.textoAyuda(res);
    this.estado = 'listo';
    this.actualizar();
  }

  private textoAyuda(res: RelacionadosRespuesta): string {
    let clave = '';
    if (res.motivo === 'sin_telefono') clave = 'notificaciones.bandeja.relacionados.ayuda.sinTelefono';
    else if (res.motivo === 'sin_vinculo') {
      clave = this.canal === 'whatsapp'
        ? 'notificaciones.bandeja.relacionados.ayuda.sinFicha'
        : 'notificaciones.bandeja.relacionados.ayuda.sinVinculo';
    } else if (res.ancla?.ambiguo) clave = 'notificaciones.bandeja.relacionados.ayuda.ambiguo';
    const partes = [clave, res.truncado ? 'notificaciones.bandeja.relacionados.ayuda.truncado' : '']
      .filter(Boolean)
      .map((c) => this.translate.instant(c));
    return partes.join(' ');
  }

  private fila(item: ItemRelacionado): FilaRelacionado {
    const canal = item.canal as CanalBandeja;
    const nombreLinea = item.linea ? [item.linea.nombre, item.linea.telefono].filter(Boolean).join(' · ') : '';
    const lineaWa = item.canal === 'whatsapp'
      ? nombreLinea || this.translate.instant('notificaciones.bandeja.relacionados.numeroCompartido')
      : '';
    // Sin nombre, el número ya es el título de la fila: no se repite.
    const numero = item.canal === 'whatsapp' && (item.nombre || '').trim() ? item.phoneMasked || '' : '';
    const linea = [lineaWa, numero].filter(Boolean).join(' · ');
    return {
      item,
      clave: claveRelacionado(item),
      icono: CANAL_BANDEJA_ICONO[canal] || 'fa fa-comments',
      canal: CANAL_BANDEJA_LABEL[canal] || item.canal,
      nombre: this.nombreDe(item, canal),
      hora: this.tiempoRelativo(item.ultimoEn),
      linea,
      porque: this.translate.instant(TEXTO_PORQUE[item.porque] || TEXTO_PORQUE.mismo_telefono),
      dueno: item.owner ? nombreDeAsesor(item.owner.email, item.owner.nombre, this.equipo) : '',
      cerrado: item.cerrado === true,
      sinResponder: item.cerrado !== true && item.ultimaDireccion === 'inbound',
    };
  }

  /**
   * Nombre del contacto; sin nombre, en WhatsApp su número enmascarado (así dos chats sin nombre no se ven
   * iguales) y en redes «Contacto de Instagram». «Sin nombre» queda solo si tampoco hay número.
   */
  private nombreDe(item: ItemRelacionado, canal: CanalBandeja): string {
    const nombre = (item.nombre || '').trim();
    if (nombre) return nombre;
    if (item.canal === 'whatsapp') {
      return (item.phoneMasked || '').trim() || this.translate.instant('notificaciones.sinNombre');
    }
    return this.translate.instant('notificaciones.meta.contactOf', { canal: CANAL_BANDEJA_LABEL[canal] || item.canal });
  }

  /** Mismo formato relativo de la lista de la bandeja. */
  private tiempoRelativo(iso: string): string {
    const entonces = Date.parse(iso);
    if (Number.isNaN(entonces)) return '';
    const seg = Math.floor((Date.now() - entonces) / 1000);
    if (seg < 60) return this.translate.instant('notificaciones.whatsapp.list.justNow');
    const min = Math.floor(seg / 60);
    if (min < 60) return this.translate.instant('notificaciones.whatsapp.list.minutesAgo', { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return this.translate.instant('notificaciones.whatsapp.list.hoursAgo', { n: h });
    const d = Math.floor(h / 24);
    if (d < 7) return this.translate.instant('notificaciones.whatsapp.list.daysAgo', { n: d });
    return new Date(entonces).toLocaleDateString();
  }
}
