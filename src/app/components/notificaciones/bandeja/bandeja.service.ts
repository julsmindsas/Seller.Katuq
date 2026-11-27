import { Injectable } from "@angular/core";
import { Observable, forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

import { WhatsappInboxService } from "../whatsapp-inbox/whatsapp-inbox.service";
import { MetaInboxService } from "../meta-inbox/meta-inbox.service";
import { MetaCanal, MetaHilo } from "../meta-inbox/models/meta-thread.model";
import { CanalBandeja, CargaBandeja, ConversacionResumen } from "./bandeja.models";
import { desdeRed, desdeWhatsapp, mezclar } from "./bandeja.util";

/** Lo que aporta un canal a una carga. */
interface AporteCanal {
  canal: CanalBandeja;
  caido: boolean;
  conversaciones: ConversacionResumen[];
  /** Solo WhatsApp. */
  hayMas?: boolean;
}

/**
 * Arma la lista única de la bandeja juntando los listados que ya existen
 * (WhatsApp, Instagram, Facebook y TikTok). No hace HTTP propio ni guarda
 * nada: cada llamada vuelve a pedir lo que necesita.
 *
 * Un canal que falla no tumba la lista: aporta cero conversaciones y queda
 * anotado en `canalesCaidos`. Sin datos de demostración.
 *
 * Qué canales se consultan lo decide quien llama (los que el usuario tiene en
 * su menú y están conectados): este servicio no mira permisos.
 */
@Injectable({ providedIn: "root" })
export class BandejaService {
  /** Chats de redes que la persona acaba de abrir: clave → hasta cuándo se oculta la insignia y desde qué mensaje. */
  private readonly leidoLocal = new Map<string, { ultimoEn: string; hasta: number }>();

  constructor(
    private readonly whatsapp: WhatsappInboxService,
    private readonly meta: MetaInboxService,
  ) {}

  /**
   * Trae y mezcla los canales pedidos. `paginasWhatsapp` permite refrescar sin
   * perder las páginas que el usuario ya había abierto con «ver más».
   */
  cargar(canales: CanalBandeja[], paginasWhatsapp = 1): Observable<CargaBandeja> {
    const pedidos: Observable<AporteCanal>[] = [];
    if (canales.includes("whatsapp")) {
      pedidos.push(this.traerWhatsapp(Math.max(1, Math.floor(paginasWhatsapp))));
    }
    for (const canal of canales) {
      if (canal !== "whatsapp") pedidos.push(this.traerRed(canal));
    }
    if (!pedidos.length) {
      return of({ conversaciones: [], canalesCaidos: [], paginasWhatsapp: 1, hayMasWhatsapp: false });
    }
    return forkJoin(pedidos).pipe(
      map((aportes) => {
        const wa = aportes.find((a) => a.canal === "whatsapp");
        return {
          conversaciones: mezclar(aportes.map((a) => a.conversaciones)),
          canalesCaidos: aportes.filter((a) => a.caido).map((a) => a.canal),
          paginasWhatsapp: wa && !wa.caido ? Math.max(1, Math.floor(paginasWhatsapp)) : 1,
          hayMasWhatsapp: !!wa?.hayMas,
        };
      }),
    );
  }

  /**
   * «Ver más»: pide la página siguiente de WhatsApp y la suma a lo que ya hay,
   * sin tocar lo de las redes. Si la página no llega, devuelve la carga igual
   * que estaba (todavía se puede reintentar).
   */
  verMasWhatsapp(carga: CargaBandeja): Observable<CargaBandeja> {
    const pagina = carga.paginasWhatsapp + 1;
    return this.whatsapp.getThreads({ page: pagina }).pipe(
      map((res) => ({
        ...carga,
        conversaciones: mezclar([carga.conversaciones, res.items.map(desdeWhatsapp)]),
        paginasWhatsapp: pagina,
        hayMasWhatsapp: !!res.hasMore,
      })),
      catchError(() => of(carga)),
    );
  }

  /**
   * Busca en todos los chats de WhatsApp del comercio (últimos 90 días), también en páginas sin cargar, con la
   * búsqueda que el servidor ya tiene: nombre, número (también los últimos dígitos) y último mensaje. Devuelve
   * la primera página de resultados; si falla, null (la lista se queda con la búsqueda local).
   */
  buscarWhatsapp(texto: string): Observable<ConversacionResumen[] | null> {
    const q = (texto || "").trim();
    if (!q) return of([]);
    return this.whatsapp.getThreads({ search: q }).pipe(
      map((res) => res.items.map(desdeWhatsapp)),
      catchError(() => of(null)),
    );
  }

  /** Las páginas 2..n que fallen se ignoran; si falla la 1, el canal cuenta como caído. */
  private traerWhatsapp(paginas: number): Observable<AporteCanal> {
    const numeros = Array.from({ length: paginas }, (_, i) => i + 1);
    return forkJoin(
      numeros.map((pagina) =>
        this.whatsapp.getThreads({ page: pagina }).pipe(catchError(() => of(null))),
      ),
    ).pipe(
      map((resultados) => {
        if (!resultados[0]) return { canal: "whatsapp", caido: true, conversaciones: [] };
        const buenas = resultados.filter((r): r is NonNullable<typeof r> => !!r);
        return {
          canal: "whatsapp",
          caido: false,
          conversaciones: mezclar(buenas.map((r) => r.items.map(desdeWhatsapp))),
          hayMas: !!buenas[buenas.length - 1].hasMore,
        } as AporteCanal;
      }),
    );
  }

  /**
   * Al abrir un chat de red la insignia se apaga en pantalla. El refresco de 10 s podría devolverla antes de
   * que el servidor confirme, así que durante un minuto un chat sin mensajes posteriores a ese `ultimoEn`
   * sigue en 0. Pasado el minuto manda lo que diga el servidor (si no pudo marcarlo, la insignia vuelve).
   */
  recordarLeidoLocal(clave: string, ultimoEn: string): void {
    this.leidoLocal.set(clave, { ultimoEn, hasta: Date.now() + 60000 });
  }

  private aplicarLeidoLocal(hilo: MetaHilo): MetaHilo {
    const clave = `${hilo.canal}|${hilo.identidadHash}`;
    const marca = this.leidoLocal.get(clave);
    if (!marca) return hilo;
    if (Date.now() > marca.hasta) {
      this.leidoLocal.delete(clave);
      return hilo;
    }
    if (!(hilo.noLeidos && hilo.noLeidos > 0)) return hilo;
    const nuevo = Date.parse(hilo.ultimoMensajeEn);
    const visto = Date.parse(marca.ultimoEn);
    // Un mensaje posterior al que se vio sí cuenta como no leído.
    return Number.isFinite(nuevo) && Number.isFinite(visto) && nuevo <= visto ? { ...hilo, noLeidos: 0 } : hilo;
  }

  private traerRed(canal: MetaCanal): Observable<AporteCanal> {
    return this.meta.listarHilosEstricto(canal).pipe(
      map((hilos) => ({
        canal,
        caido: false,
        conversaciones: hilos.map((h) => desdeRed(this.aplicarLeidoLocal(h))),
      })),
      catchError(() => of({ canal, caido: true, conversaciones: [] })),
    );
  }
}
