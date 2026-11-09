import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TEXTOS } from '../plataforma.textos';
import {
  cuerpoPregunta, direccionPlataforma, ESPERA_PREGUNTA_MS, EventoPanel, LectorSse, textoErrorHttp, tokenDeSesion,
} from '../logica/opttia-plataforma';

/**
 * D-700 23.5 — Opttia de plataforma (preguntas). Como el chat básico, va con `fetch` porque la respuesta llega por
 * eventos (SSE). Con la autorización del usuario y SIN encabezado ni campo `company`: la pregunta es de plataforma.
 * No reintenta solo; cada pregunta tiene su `AbortController` (se corta a los ~100 s o al cancelar).
 */
@Injectable({ providedIn: 'root' })
export class OpttiaPlataformaService {
  preguntar(texto: string, companyDocId?: string | null): Observable<EventoPanel> {
    return new Observable<EventoPanel>((obs) => {
      const token = tokenDeSesion(typeof localStorage !== 'undefined' ? localStorage : null);
      if (!token) { obs.next({ tipo: 'error', mensaje: TEXTOS.opttia.errorSesion }); obs.complete(); return undefined; }
      const control = new AbortController();
      let vencio = false;
      const reloj = setTimeout(() => { vencio = true; control.abort(); }, ESPERA_PREGUNTA_MS);

      (async () => {
        try {
          const resp = await fetch(direccionPlataforma(environment as { opttiaApi?: string; urlApi?: string }), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(cuerpoPregunta(texto, companyDocId)),
            signal: control.signal,
          });
          if (!resp.ok) { obs.next({ tipo: 'error', mensaje: textoErrorHttp(resp.status) }); obs.complete(); return; }
          if (!resp.body) { obs.next({ tipo: 'error', mensaje: TEXTOS.opttia.sinRespuesta }); obs.complete(); return; }
          const lector = new LectorSse();
          const lee = resp.body.getReader();
          const dec = new TextDecoder();
          for (;;) {
            const { done, value } = await lee.read();
            for (const ev of lector.alimentar(dec.decode(value || new Uint8Array(), { stream: !done }), done)) obs.next(ev);
            if (done) break;
          }
          obs.complete();
        } catch (e) {
          if (vencio) obs.next({ tipo: 'error', mensaje: TEXTOS.opttia.errorTiempo });
          else if ((e as { name?: string })?.name !== 'AbortError') obs.next({ tipo: 'error', mensaje: TEXTOS.opttia.errorRed });
          obs.complete();
        } finally {
          clearTimeout(reloj);
        }
      })();

      return () => { clearTimeout(reloj); control.abort(); };
    });
  }
}
