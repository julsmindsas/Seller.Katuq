import type { FlowGraph, FlowNode, NodeSpec, NodePort } from '../contracts/types';

/**
 * Detects a directed cycle starting at any node. Returns true if the graph
 * has at least one cycle. Used before save / activate.
 */
export function detectCycles(graph: FlowGraph): boolean {
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source)!.push(e.target);
    }
    const colour = new Map<string, 0 | 1 | 2>();
    const visit = (node: string): boolean => {
        const c = colour.get(node) || 0;
        if (c === 1) return true;
        if (c === 2) return false;
        colour.set(node, 1);
        for (const next of adj.get(node) || []) {
            if (visit(next)) return true;
        }
        colour.set(node, 2);
        return false;
    };
    for (const n of graph.nodes) {
        if (visit(n.id)) return true;
    }
    return false;
}

/**
 * Checks port compatibility between source and target. Today we accept any
 * port combination if both exist; isError ports must wire to isError ports
 * unless target accepts main. Future: dataType matching.
 */
export function arePortsCompatible(
    sourceSpec: NodeSpec | undefined,
    sourcePort: string,
    targetSpec: NodeSpec | undefined,
    targetPort: string
): { ok: boolean; reason?: string } {
    if (!sourceSpec || !targetSpec) return { ok: false, reason: 'Spec faltante' };
    const out = sourceSpec.outputs.find((p) => p.name === sourcePort);
    const inp = targetSpec.inputs.find((p) => p.name === targetPort);
    if (!out) return { ok: false, reason: `Puerto de salida "${sourcePort}" no existe` };
    if (!inp) return { ok: false, reason: `Puerto de entrada "${targetPort}" no existe` };
    return { ok: true };
}

/**
 * Lightweight, optional JSONSchema check for the editor — full validation
 * happens server-side. We surface required-field warnings as a UX hint.
 */
export function validateNodeParams(node: FlowNode, spec: NodeSpec | undefined): string[] {
    if (!spec || !spec.schema) return [];
    const errors: string[] = [];
    const required: string[] = Array.isArray(spec.schema.required) ? spec.schema.required : [];
    for (const key of required) {
        const v = node.params?.[key];
        if (v === undefined || v === null || v === '') {
            errors.push(`Falta parámetro requerido: ${key}`);
        }
    }
    return errors;
}

export function findSpec(catalog: NodeSpec[], type: string): NodeSpec | undefined {
    return catalog.find((s) => s.type === type);
}

export function getInputPorts(spec: NodeSpec | undefined): NodePort[] {
    return spec?.inputs ?? [];
}

export function getOutputPorts(spec: NodeSpec | undefined): NodePort[] {
    return spec?.outputs ?? [{ name: 'main' }];
}
