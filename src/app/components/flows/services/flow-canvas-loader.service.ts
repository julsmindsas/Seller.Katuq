import { Injectable } from '@angular/core';

/**
 * Lazy loads the React Web Component bundle exactly once per session.
 *
 * Pilot setup expects the bundle at `assets/flow-canvas/flow-canvas.js`
 * and the matching stylesheet at `assets/flow-canvas/flow-canvas.css`. To
 * publish the bundle, run from the repo root:
 *
 *     cd packages/flow-canvas
 *     npm install
 *     npm run build
 *     // copy dist/flow-canvas.js + dist/flow-canvas.css to
 *     //    src/assets/flow-canvas/
 *
 * ATENCIÓN — regresión conocida de `localeCompare` (ver commit e41486f8):
 * el catálogo de nodos usa `.sort((a,b) => a.displayName.localeCompare(...))`
 * en `packages/flow-canvas/src/components/NodePalette.tsx`, ya con guard
 * defensivo en el fuente TSX (sobrevive al rebuild). Pero React Flow
 * (`@reactflow/core`, dependencia en node_modules, NO en nuestro src) trae
 * OTRO `.sort((o,i) => o.id.localeCompare(i.id))` sin guard al calcular los
 * markers de las flechas — ese vive en el vendor bundle y Vite lo inlinea
 * tal cual. Cada `npm run build` reintroduce ese crash porque no es código
 * nuestro. Después de compilar y ANTES de copiar a `src/assets/flow-canvas/`,
 * hay que volver a parchear esa línea en `dist/flow-canvas.js` (buscar
 * `.sort((o, i) => o.id.localeCompare(i.id))` cerca de la línea ~10092 del
 * bundle minificado y envolver ambos lados en `String(x && x.id || '')`).
 * No hay forma de fijarlo de forma durable en el fuente sin tocar
 * node_modules (fuera de alcance) o subir de versión react-flow con el fix
 * upstream.
 *
 * If you want a CDN-hosted bundle instead, override
 * `bundleUrl` / `cssUrl` from `environment.ts` and feed them in via DI.
 */
@Injectable({
  providedIn: 'root'
})
export class FlowCanvasLoaderService {
  private loadPromise: Promise<void> | null = null;
  private readonly bundleUrl = 'assets/flow-canvas/flow-canvas.js';
  private readonly cssUrl = 'assets/flow-canvas/flow-canvas.css';

  load(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    // Already registered via a previous module entry?
    if ((window as any).customElements?.get('katuq-flow-canvas')) {
      return Promise.resolve();
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      // Stylesheet — non-blocking.
      if (!document.querySelector(`link[data-kfc-style="true"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = this.cssUrl;
        link.setAttribute('data-kfc-style', 'true');
        document.head.appendChild(link);
      }

      // Bundle — must be loaded as a module so the WC registers.
      const existing = document.querySelector('script[data-kfc-bundle="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
        return;
      }
      const script = document.createElement('script');
      script.type = 'module';
      script.src = this.bundleUrl;
      script.setAttribute('data-kfc-bundle', 'true');
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', (e) => {
        this.loadPromise = null;
        reject(e);
      });
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }
}
