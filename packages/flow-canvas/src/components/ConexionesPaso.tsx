import React, { useMemo, useState, useEffect } from 'react';
import type { FlowNode, NodeSpec } from '../contracts/types';
import { useFlowStore } from '../store/flowStore';
import { findSpec, getInputPorts, getOutputPorts } from '../utils/validators';
import { nombrePaso } from '../utils/lenguaje';
import { entradaPrincipal, nombrePuerto, nuevaLinea, validarConexion } from '../utils/conexiones';

export interface ConexionesPasoProps {
    node: FlowNode;
    spec: NodeSpec;
}

/**
 * "¿De dónde viene y qué sigue?" dentro del panel del paso: conectar sin arrastrar
 * líneas. Usa las mismas líneas del lienzo, así que se ve el cambio en el acto.
 */
export const ConexionesPaso: React.FC<ConexionesPasoProps> = ({ node, spec }) => {
    const graph = useFlowStore((s) => s.graph);
    const catalog = useFlowStore((s) => s.catalog);
    const readOnly = useFlowStore((s) => s.readOnly);
    const addEdge = useFlowStore((s) => s.addEdge);
    const deleteEdge = useFlowStore((s) => s.deleteEdge);
    const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
    const [aviso, setAviso] = useState('');
    useEffect(() => setAviso(''), [node.id]);

    /** Nombre del paso; si hay dos del mismo tipo se numeran para distinguirlos. */
    const nombre = useMemo(() => {
        const cache = new Map<string, string>();
        for (const n of graph.nodes) {
            const base = nombrePaso(n.type, findSpec(catalog, n.type)?.displayName);
            const iguales = graph.nodes.filter((m) => m.type === n.type);
            cache.set(n.id, iguales.length > 1 ? `${base} (${iguales.indexOf(n) + 1})` : base);
        }
        return (id: string) => cache.get(id) || 'Paso';
    }, [graph.nodes, catalog]);

    const entradas = graph.edges.filter((e) => e.target === node.id);
    const salidas = getOutputPorts(spec);
    const recibe = getInputPorts(spec).length > 0;

    const conectarCon = (puerto: string, destinoId: string) => {
        const destino = graph.nodes.find((n) => n.id === destinoId);
        const entrada = destino ? entradaPrincipal(findSpec(catalog, destino.type)) : null;
        if (!destino || !entrada) return;
        const c = { source: node.id, sourcePort: puerto, target: destino.id, targetPort: entrada };
        const v = validarConexion(graph, catalog, c);
        if (!v.ok) {
            setAviso(v.reason || 'Esos dos pasos no se pueden unir.');
            return;
        }
        setAviso('');
        addEdge(nuevaLinea(c));
    };

    const opcionesPara = (puerto: string) =>
        graph.nodes.filter((n) => {
            if (n.id === node.id) return false;
            const entrada = entradaPrincipal(findSpec(catalog, n.type));
            if (!entrada) return false;
            return validarConexion(graph, catalog, { source: node.id, sourcePort: puerto, target: n.id, targetPort: entrada }).ok;
        });

    return (
        <section className="kfc-conex" aria-label="Conexiones del paso">
            <div className="kfc-conex__fila">
                <span className="kfc-conex__rotulo">Recibe de</span>
                <div className="kfc-conex__chips">
                    {!recibe && <span className="kfc-conex__nada">Nadie: este paso arranca la automatización.</span>}
                    {recibe && entradas.length === 0 && (
                        <span className="kfc-conex__nada kfc-conex__nada--alerta">
                            Ningún paso todavía. Conéctalo desde el paso anterior.
                        </span>
                    )}
                    {entradas.map((e) => (
                        <span key={e.id} className="kfc-conex__chip">
                            <button type="button" className="kfc-conex__ir" onClick={() => setSelectedNodeId(e.source)} title="Ir a ese paso">
                                {nombre(e.source)}
                            </button>
                            {!readOnly && (
                                <button type="button" className="kfc-conex__quitar" onClick={() => deleteEdge(e.id)} title="Quitar esta conexión" aria-label="Quitar esta conexión">
                                    <i className="pi pi-times" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            </div>

            {salidas.map((p) => {
                const lineas = graph.edges.filter((e) => e.source === node.id && e.sourcePort === p.name);
                const opciones = readOnly ? [] : opcionesPara(p.name);
                const etiqueta = nombrePuerto(spec, p, 'out');
                return (
                    <div key={p.name} className="kfc-conex__fila">
                        <span className={`kfc-conex__rotulo${p.isError ? ' kfc-conex__rotulo--error' : ''}`}>
                            {etiqueta ? `${etiqueta}, sigue con` : 'Después sigue con'}
                        </span>
                        <div className="kfc-conex__chips">
                            {lineas.length === 0 && (
                                <span className="kfc-conex__nada">{p.isError ? 'Nada: si falla, se detiene.' : 'Nada: aquí termina.'}</span>
                            )}
                            {lineas.map((e) => (
                                <span key={e.id} className="kfc-conex__chip">
                                    <button type="button" className="kfc-conex__ir" onClick={() => setSelectedNodeId(e.target)} title="Ir a ese paso">
                                        {nombre(e.target)}
                                    </button>
                                    {!readOnly && (
                                        <button type="button" className="kfc-conex__quitar" onClick={() => deleteEdge(e.id)} title="Quitar esta conexión" aria-label="Quitar esta conexión">
                                            <i className="pi pi-times" />
                                        </button>
                                    )}
                                </span>
                            ))}
                            {opciones.length > 0 && (
                                <select
                                    className="kfc-conex__agregar"
                                    value=""
                                    onChange={(ev) => ev.target.value && conectarCon(p.name, ev.target.value)}
                                    aria-label="Conectar con otro paso"
                                >
                                    <option value="">+ Conectar con…</option>
                                    {opciones.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            {nombre(n.id)}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                );
            })}

            {aviso && <div className="kfc-conex__aviso">{aviso}</div>}
            {!readOnly && <div className="kfc-conex__nota">Las conexiones se aplican de una vez, sin tocar «Aplicar».</div>}
        </section>
    );
};
