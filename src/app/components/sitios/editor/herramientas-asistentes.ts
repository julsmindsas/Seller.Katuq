/**
 * Herramientas del editor de sitios para los asistentes de IA del navegador (WebMCP, `modelContext`).
 *
 * Solo existen mientras el editor está abierto: se registran al entrar y se retiran al salir. Todas envuelven lo que la
 * persona ya puede hacer en la pestaña «Con IA»: el cambio queda en el borrador y se puede deshacer. Ninguna publica,
 * despublica, borra el sitio ni toca el dominio. No pasan por `ToolRegistryService`, para que no les lleguen a los
 * agentes de voz y de ventas.
 *
 * Apagado personal: `localStorage['katuq.webmcp'] = 'off'`. Sin `modelContext` en el navegador, no se hace nada.
 */

/** Lo que el editor les presta a las herramientas. Cada método devuelve datos planos, sin clientes ni pedidos. */
export interface PuertoEditorAsistentes {
  estado(): any;
  pendientes(): any;
  pedir(pedido: string): Promise<any>;
  aplicar(): any;
  descartar(): any;
  deshacer(): any;
  recargarVista(): any;
}

export interface OpcionesHerramientas {
  /** Pregunta a la persona si deja actuar al asistente. Se llama una sola vez por visita al editor. */
  confirmar: () => Promise<boolean>;
  /** Corre la acción dentro de Angular, para que la pantalla se entere. */
  enZona?: <T>(f: () => T) => T;
  /** Para pruebas: el `modelContext` y el interruptor. */
  contexto?: any;
  apagado?: boolean;
}

export const HERRAMIENTAS_EDITOR = [
  "siteEditorGetState",
  "siteEditorGetPublishChecklist",
  "siteEditorProposeEdit",
  "siteEditorApplyProposal",
  "siteEditorDiscardProposal",
  "siteEditorUndoLastEdit",
  "siteEditorReloadPreview",
] as const;

const SIN_PARAMETROS = { type: "object", properties: {}, additionalProperties: false };

function contextoDelNavegador(): any {
  const d = document as any;
  const n = navigator as any;
  return (d && d.modelContext) || (n && n.modelContext) || null;
}

function apagadoPorLaPersona(): boolean {
  try {
    return localStorage.getItem("katuq.webmcp") === "off";
  } catch (e) {
    return false;
  }
}

function comoContenido(resultado: any): any {
  return { content: [{ type: "text", text: typeof resultado === "string" ? resultado : JSON.stringify(resultado) }] };
}

/**
 * Registra las herramientas del editor en el navegador y devuelve la función que las retira.
 * Si el navegador no tiene la API, o la persona la apagó, devuelve una función que no hace nada.
 */
export function registrarHerramientasEditor(puerto: PuertoEditorAsistentes, opciones: OpcionesHerramientas): () => void {
  const ctx = opciones.contexto !== undefined ? opciones.contexto : contextoDelNavegador();
  const apagado = opciones.apagado !== undefined ? opciones.apagado : apagadoPorLaPersona();
  if (!ctx || apagado || typeof ctx.registerTool !== "function") return () => {};

  const enZona = opciones.enZona || (<T>(f: () => T) => f());
  let retirado = false;
  const CERRADO = { ok: false, error: "El editor ya se cerró." };
  // La persona decide una vez por visita. Si dice que no, no se le vuelve a preguntar en esta visita.
  let permiso: Promise<boolean> | null = null;
  const conPermiso = (): Promise<boolean> => {
    if (!permiso) permiso = opciones.confirmar().then((ok) => ok === true, () => false);
    return permiso;
  };

  const lectura = (f: () => any) => async () => {
    if (retirado) return comoContenido(CERRADO);
    try {
      return comoContenido(enZona(f));
    } catch (e) {
      return comoContenido({ ok: false, error: "No pude leer el editor." });
    }
  };
  const escritura = (f: (args: any) => any) => async (args: any) => {
    if (retirado) return comoContenido(CERRADO);
    if (!(await conPermiso())) return comoContenido({ ok: false, error: "La persona no permitió que el asistente cambie la página." });
    // La persona pudo salir del editor con la pregunta abierta.
    if (retirado) return comoContenido(CERRADO);
    try {
      return comoContenido(await enZona(() => f(args || {})));
    } catch (e) {
      return comoContenido({ ok: false, error: "No pude hacer el cambio. Inténtalo de nuevo." });
    }
  };

  const NOTA = " El cambio queda en el borrador y se puede deshacer. Esta herramienta nunca publica el sitio: publicar lo decide la persona.";
  const herramientas: any[] = [
    {
      name: "siteEditorGetState",
      description:
        "Lee el estado del editor de sitios de Katuq: sitio y página que se editan, si es borrador o publicado, secciones de la página en orden, si hay una propuesta de la IA pendiente y si hay algo por deshacer. Úsala primero.",
      inputSchema: SIN_PARAMETROS,
      annotations: { readOnlyHint: true },
      execute: lectura(() => puerto.estado()),
    },
    {
      name: "siteEditorGetPublishChecklist",
      description: "Lee lo que le falta al sitio para publicar y cuáles pendientes impiden vender. No publica.",
      inputSchema: SIN_PARAMETROS,
      annotations: { readOnlyHint: true },
      execute: lectura(() => puerto.pendientes()),
    },
    {
      name: "siteEditorProposeEdit",
      description:
        "Pide un cambio a la página en palabras sencillas (por ejemplo: «agrega una sección de preguntas frecuentes»). Un pedido a la vez. Devuelve qué cambiaría, qué no se pudo y avisos. Si el resultado trae propuesta «pendiente», la página no cambia hasta llamar siteEditorApplyProposal; si trae aplicado: true, el cambio ya quedó en el borrador. Cada pedido gasta del cupo de ediciones con IA del comercio y hay un tope de pedidos por visita: no repitas pedidos." + NOTA,
      inputSchema: {
        type: "object",
        properties: { request: { type: "string", description: "El cambio que la persona quiere, en una o dos frases." } },
        required: ["request"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: escritura((a) => puerto.pedir(String(a.request == null ? "" : a.request))),
    },
    {
      name: "siteEditorApplyProposal",
      description: "Aplica al borrador la propuesta pendiente de la IA. Antes, cuéntale a la persona qué cambia y espera su visto bueno." + NOTA,
      inputSchema: SIN_PARAMETROS,
      annotations: { readOnlyHint: false },
      execute: escritura(() => puerto.aplicar()),
    },
    {
      name: "siteEditorDiscardProposal",
      description: "Descarta la propuesta pendiente de la IA sin tocar la página.",
      inputSchema: SIN_PARAMETROS,
      annotations: { readOnlyHint: false },
      execute: escritura(() => puerto.descartar()),
    },
    {
      name: "siteEditorUndoLastEdit",
      description: "Deshace el último cambio que se aplicó desde el chat «Con IA»." + NOTA,
      inputSchema: SIN_PARAMETROS,
      annotations: { readOnlyHint: false },
      execute: escritura(() => puerto.deshacer()),
    },
    {
      name: "siteEditorReloadPreview",
      description: "Vuelve a cargar la vista previa del borrador para que la persona vea cómo quedó. No cambia la página.",
      inputSchema: SIN_PARAMETROS,
      annotations: { readOnlyHint: true },
      execute: lectura(() => puerto.recargarVista()),
    },
  ];

  const corte = typeof AbortController === "function" ? new AbortController() : null;
  const registradas: string[] = [];
  herramientas.forEach((h) => {
    try {
      if (corte) ctx.registerTool(h, { signal: corte.signal });
      else ctx.registerTool(h);
      registradas.push(h.name);
    } catch (e) {
      // Un nombre repetido o una API distinta no deben tumbar el editor.
    }
  });

  return () => {
    if (retirado) return;
    retirado = true;
    if (corte) corte.abort();
    if (typeof ctx.unregisterTool === "function") {
      registradas.forEach((n) => {
        try {
          ctx.unregisterTool(n);
        } catch (e) {}
      });
    }
  };
}
