import { Injectable } from "@angular/core";
import { Observable, forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

import { WhatsappInboxService } from "../whatsapp-inbox/whatsapp-inbox.service";
import { MetaInboxService } from "../meta-inbox/meta-inbox.service";
import { MetaCanal } from "../meta-inbox/models/meta-thread.model";
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

  private traerRed(canal: MetaCanal): Observable<AporteCanal> {
    return this.meta.listarHilosEstricto(canal).pipe(
      map((hilos) => ({
        canal,
        caido: false,
        conversaciones: hilos.map(desdeRed),
      })),
      catchError(() => of({ canal, caido: true, conversaciones: [] })),
    );
  }
}
