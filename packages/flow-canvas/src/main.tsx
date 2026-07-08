import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FlowCanvasApp } from './FlowCanvasApp';
import { useFlowStore } from './store/flowStore';
import type { FlowGraph, NodeSpec, RunContext } from './contracts/types';
import './styles.css';

/**
 * <katuq-flow-canvas>
 *
 * Custom element that mounts the React + React Flow editor inside an
 * Angular shell. Properties are JS objects (not stringified attributes),
 * outbound notifications use bubbling+composed CustomEvents.
 *
 * Properties:
 *   - graph: FlowGraph
 *   - nodeCatalog: NodeSpec[]
 *   - runContext: RunContext | null
 *   - readOnly: boolean
 *   - selectedNodeId: string | null
 *   - connectedProviders: string[] | null  (provider keys the company connected)
 *
 * Events:
 *   - graphChange:  detail = FlowGraph
 *   - nodeSelected: detail = { nodeId: string | null }
 *   - runRequested: detail = { triggerData?: any }
 *   - canvasIntent: detail = { intent: string, payload?: any }
 *       intents: connectionRejected | connectionCreated | nodeAdded |
 *                autoLayoutApplied | showShortcuts | installTemplate |
 *                openIntegrations ({ provider })
 */
class KatuqFlowCanvas extends HTMLElement {
    private root: Root | null = null;
    private mountPoint: HTMLDivElement | null = null;
    private suppressEmit = false;
    private keydownHandler?: (e: KeyboardEvent) => void;

    private _graph: FlowGraph = { nodes: [], edges: [] };
    private _catalog: NodeSpec[] = [];
    private _runContext: RunContext | null = null;
    private _readOnly = false;
    private _selectedNodeId: string | null = null;
    private _connectedProviders: string[] | null = null;

    // ------ property accessors (Angular property bindings hit these) ------

    set graph(v: FlowGraph) {
        this._graph = v || { nodes: [], edges: [] };
        this.suppressEmit = true;
        useFlowStore.getState().setGraph(this._graph);
        this.suppressEmit = false;
    }
    get graph(): FlowGraph {
        return useFlowStore.getState().graph;
    }

    set nodeCatalog(v: NodeSpec[]) {
        this._catalog = Array.isArray(v) ? v : [];
        useFlowStore.getState().setCatalog(this._catalog);
    }
    get nodeCatalog(): NodeSpec[] {
        return useFlowStore.getState().catalog;
    }

    set runContext(v: RunContext | null) {
        this._runContext = v;
        useFlowStore.getState().setRunContext(v);
    }
    get runContext(): RunContext | null {
        return useFlowStore.getState().runContext;
    }

    set readOnly(v: boolean) {
        this._readOnly = !!v;
        useFlowStore.getState().setReadOnly(this._readOnly);
    }
    get readOnly(): boolean {
        return useFlowStore.getState().readOnly;
    }

    set selectedNodeId(v: string | null) {
        this._selectedNodeId = v;
        useFlowStore.getState().setSelectedNodeId(v);
    }
    get selectedNodeId(): string | null {
        return useFlowStore.getState().selectedNodeId;
    }

    set connectedProviders(v: string[] | null) {
        this._connectedProviders = Array.isArray(v) ? v : null;
        useFlowStore.getState().setConnectedProviders(this._connectedProviders);
    }
    get connectedProviders(): string[] | null {
        return useFlowStore.getState().connectedProviders;
    }

    static get observedAttributes(): string[] {
        // we only support boolean read-only via attribute as a convenience.
        return ['read-only'];
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
        if (name === 'read-only') {
            this.readOnly = value !== null && value !== 'false';
        }
    }

    connectedCallback() {
        if (this.root) return;
        this.mountPoint = document.createElement('div');
        this.mountPoint.style.width = '100%';
        this.mountPoint.style.height = '100%';
        this.mountPoint.style.position = 'relative';
        this.mountPoint.style.display = 'flex';
        this.style.display = this.style.display || 'block';
        this.style.position = this.style.position || 'relative';
        this.style.minHeight = this.style.minHeight || '500px';
        this.appendChild(this.mountPoint);

        // sync any pre-set props (Angular sets them before connectedCallback)
        useFlowStore.getState().setGraph(this._graph);
        useFlowStore.getState().setCatalog(this._catalog);
        useFlowStore.getState().setRunContext(this._runContext);
        useFlowStore.getState().setReadOnly(this._readOnly);
        useFlowStore.getState().setSelectedNodeId(this._selectedNodeId);
        useFlowStore.getState().setConnectedProviders(this._connectedProviders);

        this.root = createRoot(this.mountPoint);
        this.root.render(
            <FlowCanvasApp
                onGraphChange={(g) => this.emitGraphChange(g)}
                onNodeSelected={(id) => this.emitNodeSelected(id)}
                onRunRequested={(payload) => this.emitRunRequested(payload)}
                onIntent={(intent, payload) => this.emitIntent(intent, payload)}
            />
        );

        // Keyboard shortcuts inside the canvas. Host (Angular) keeps Cmd+S etc.
        this.keydownHandler = (e: KeyboardEvent) => this.onKeydown(e);
        document.addEventListener('keydown', this.keydownHandler);
    }

    disconnectedCallback() {
        try {
            this.root?.unmount();
        } catch {
            /* no-op */
        }
        this.root = null;
        if (this.mountPoint && this.mountPoint.parentNode === this) {
            this.removeChild(this.mountPoint);
        }
        this.mountPoint = null;
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = undefined;
        }
    }

    /**
     * Lightweight keyboard shortcuts handled by the WC.
     * - "?" → emit showShortcuts
     * - "Esc" → close right panel
     * - "Ctrl/Cmd+Enter" → request run (if not readOnly)
     * Cmd+S, Cmd+Z stay in Angular (host) so undo/save work outside canvas too.
     */
    private onKeydown(e: KeyboardEvent) {
        const target = e.target as HTMLElement | null;
        const isInInput =
            target &&
            (target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable);
        if (isInInput) return;

        const meta = e.ctrlKey || e.metaKey;
        if (meta && e.key === 'Enter') {
            e.preventDefault();
            if (!useFlowStore.getState().readOnly) {
                this.emitRunRequested({ triggerData: [] });
            }
            return;
        }
        if (e.key === 'Escape') {
            const st = useFlowStore.getState();
            if (st.drawerNodeId) {
                st.setDrawerNodeId(null);
                e.preventDefault();
            } else if (st.rightView !== 'none') {
                st.setRightView('none');
                st.setSelectedNodeId(null);
                e.preventDefault();
            }
            return;
        }
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
            e.preventDefault();
            this.emitIntent('showShortcuts');
        }
    }

    private emitGraphChange(graph: FlowGraph) {
        if (this.suppressEmit) return;
        this.dispatchEvent(
            new CustomEvent('graphChange', {
                detail: graph,
                bubbles: true,
                composed: true
            })
        );
    }

    private emitNodeSelected(nodeId: string | null) {
        this.dispatchEvent(
            new CustomEvent('nodeSelected', {
                detail: { nodeId },
                bubbles: true,
                composed: true
            })
        );
    }

    private emitRunRequested(payload?: any) {
        this.dispatchEvent(
            new CustomEvent('runRequested', {
                detail: payload || {},
                bubbles: true,
                composed: true
            })
        );
    }

    private emitIntent(intent: string, payload?: any) {
        this.dispatchEvent(
            new CustomEvent('canvasIntent', {
                detail: { intent, payload: payload || {} },
                bubbles: true,
                composed: true
            })
        );
    }
}

if (!customElements.get('katuq-flow-canvas')) {
    customElements.define('katuq-flow-canvas', KatuqFlowCanvas);
}

// Re-export types for consumers that want to bundle the WC source directly.
export type { FlowGraph, NodeSpec, RunContext };
export { KatuqFlowCanvas };
