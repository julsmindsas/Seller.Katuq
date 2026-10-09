// Conectar pasos sin saber de "puertos" (2026-10-08).
// Solo decide CÓMO se arma una línea entre dos pasos; la línea que se guarda es la
// misma de siempre (source, sourcePort, target, targetPort), así que el backend y
// las automatizaciones existentes no cambian.

import type { FlowEdge, FlowGraph, FlowNode, NodePort, NodeSpec } from '../contracts/types';
import { arePortsCompatible, detectCycles, findSpec, getInputPorts, getOutputPorts } from './validators';
import { nombrePaso } from './lenguaje';
import { shortId } from './id';

/** Nombre del punto de conexión para mostrar. Vacío si el paso tiene uno solo de ese lado. */
export function nombrePuerto(spec: NodeSpec | undefined, port: NodePort, lado: 'in' | 'out'): string {
    const ports = lado === 'in' ? getInputPorts(spec) : getOutputPorts(spec);
    if (ports.length <= 1) return '';
    const n = port.name;
    if (port.isError || n === 'error') return lado === 'in' ? 'Errores' : 'Si falla';
    if (n === 'true') return 'Sí se cumple';
    if (n === 'false') return 'No se cumple';
    if (n === 'done') return 'Al terminar';
    if (n === 'default') return 'Otro caso';
    if (/^\d+$/.test(n)) return `Caso ${Number(n) + 1}`;
    if (n === 'mainB') return 'Entrada B';
    if (n === 'main') {
        if (spec?.type === 'loop') return 'Por cada uno';
        if (lado === 'in' && ports.some((p) => p.name === 'mainB')) return 'Entrada A';
        return 'Sigue';
    }
    return port.label || n;
}

/** Salida por la que sigue el camino normal (la primera que no es de error). */
export function salidaPrincipal(spec: NodeSpec | undefined): string | null {
    const outs = getOutputPorts(spec);
    const p = outs.find((o) => !o.isError) || outs[0];
    return p ? p.name : null;
}

/** Entrada normal del paso, o null si el paso arranca la automatización y no recibe nada. */
export function entradaPrincipal(spec: NodeSpec | undefined): string | null {
    const ins = getInputPorts(spec);
    const p = ins.find((i) => !i.isError) || ins[0];
    return p ? p.name : null;
}

export interface Conexion {
    source: string;
    sourcePort: string;
    target: string;
    targetPort: string;
}

/** Revisa una conexión y, si no se puede, explica por qué en palabras del comercio. */
export function validarConexion(
    graph: FlowGraph,
    catalog: NodeSpec[],
    c: Conexion
): { ok: boolean; reason?: string } {
    if (c.source === c.target) return { ok: false, reason: 'Un paso no se puede conectar consigo mismo.' };
    const sNode = graph.nodes.find((n) => n.id === c.source);
    const tNode = graph.nodes.find((n) => n.id === c.target);
    if (!sNode || !tNode) return { ok: false };
    const sSpec = findSpec(catalog, sNode.type);
    const tSpec = findSpec(catalog, tNode.type);
    if (!getInputPorts(tSpec).length) {
        return {
            ok: false,
            reason: `«${nombrePaso(tNode.type, tSpec?.displayName)}» es el paso que arranca la automatización: no recibe nada de otros pasos.`,
        };
    }
    if (!arePortsCompatible(sSpec, c.sourcePort, tSpec, c.targetPort).ok) {
        return { ok: false, reason: 'Esos dos puntos no se pueden unir. Prueba soltando la línea encima del paso.' };
    }
    const repetida = graph.edges.some(
        (e) => e.source === c.source && e.sourcePort === c.sourcePort && e.target === c.target && e.targetPort === c.targetPort
    );
    if (repetida) return { ok: false, reason: 'Esos dos pasos ya están conectados.' };
    const tentativo = { ...graph, edges: [...graph.edges, { id: '__tentativo__', ...c }] };
    if (detectCycles(tentativo)) {
        return { ok: false, reason: 'Esa conexión haría que la automatización diera vueltas sin terminar nunca.' };
    }
    return { ok: true };
}

export function nuevaLinea(c: Conexion): FlowEdge {
    return { id: shortId('e'), ...c };
}

/**
 * Al agregar un paso nuevo: si hay un solo "final suelto" (un paso cuya salida normal
 * no va a ningún lado), el paso nuevo se conecta después de ese. Con varios finales
 * sueltos se escoge el más cercano a la izquierda del paso nuevo; si no hay ninguno
 * claro, no se conecta nada y la persona lo une a mano.
 */
export function autoConexion(graph: FlowGraph, catalog: NodeSpec[], nuevo: FlowNode): { edge: FlowEdge; desde: FlowNode } | null {
    const tSpec = findSpec(catalog, nuevo.type);
    const entrada = entradaPrincipal(tSpec);
    if (!entrada) return null;

    const sueltos = graph.nodes.filter((n) => {
        if (n.id === nuevo.id || n.disabled) return false;
        const salida = salidaPrincipal(findSpec(catalog, n.type));
        return !!salida && !graph.edges.some((e) => e.source === n.id && e.sourcePort === salida);
    });
    if (!sueltos.length) return null;

    let desde: FlowNode | undefined;
    if (sueltos.length === 1) {
        desde = sueltos[0];
    } else {
        const aLaIzquierda = sueltos.filter((n) => n.position.x < nuevo.position.x);
        desde = aLaIzquierda.sort(
            (a, b) =>
                Math.hypot(nuevo.position.x - a.position.x, nuevo.position.y - a.position.y) -
                Math.hypot(nuevo.position.x - b.position.x, nuevo.position.y - b.position.y)
        )[0];
    }
    if (!desde) return null;

    const c: Conexion = {
        source: desde.id,
        sourcePort: salidaPrincipal(findSpec(catalog, desde.type))!,
        target: nuevo.id,
        targetPort: entrada,
    };
    const grafoConNuevo = graph.nodes.some((n) => n.id === nuevo.id) ? graph : { ...graph, nodes: [...graph.nodes, nuevo] };
    if (!validarConexion(grafoConNuevo, catalog, c).ok) return null;
    return { edge: nuevaLinea(c), desde };
}

/** Dónde poner un paso agregado con un toque (sin arrastrar): a la derecha del final suelto. */
export function posicionSiguiente(graph: FlowGraph, catalog: NodeSpec[]): { x: number; y: number } {
    if (!graph.nodes.length) return { x: 100, y: 120 };
    const sueltos = graph.nodes.filter((n) => {
        const salida = salidaPrincipal(findSpec(catalog, n.type));
        return !!salida && !graph.edges.some((e) => e.source === n.id && e.sourcePort === salida);
    });
    const base = (sueltos.length ? sueltos : graph.nodes).reduce((a, b) => (b.position.x > a.position.x ? b : a));
    return { x: base.position.x + 380, y: base.position.y };
}
