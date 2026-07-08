import React, { useMemo, useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import type { FlowNode, NodeSpec, JSONSchemaLike } from '../contracts/types';
import { useFlowStore } from '../store/flowStore';
import { findSpec, validateNodeParams } from '../utils/validators';

export interface ConfigPanelProps {
    onClose: () => void;
    /** Click on the "Conectar" button of the missing-integration banner. */
    onOpenIntegrations?: (provider: string) => void;
}

/** Node credential key → integration provider key (they don't always match). */
const PROVIDER_ALIASES: Record<string, string> = {
    worldoffice: 'world_office'
};

/** Friendly labels for the missing-integration banner. */
const PROVIDER_LABELS: Record<string, string> = {
    osmosis: 'Guía Cereza',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    siigo: 'Siigo',
    world_office: 'World Office',
    worldoffice: 'World Office',
    aliaddo: 'Aliaddo',
    enviame: 'Envíame',
    wompi: 'Wompi',
    epayco: 'ePayco'
};

function normalizeProvider(p: string): string {
    const key = (p || '').toLowerCase();
    return PROVIDER_ALIASES[key] || key;
}

function providerLabel(p: string): string {
    const key = (p || '').toLowerCase();
    return PROVIDER_LABELS[normalizeProvider(key)] || PROVIDER_LABELS[key] || p;
}

/**
 * Which of the node's required integrations are NOT connected for this company.
 * Returns [] when we can't verify yet (connectedProviders === null) so we never
 * show a false "missing" warning while the list is still loading.
 */
function missingProviders(
    spec: NodeSpec,
    connected: string[] | null
): string[] {
    if (!connected) return [];
    const creds = spec.credentials;
    if (!creds) return [];
    const required = Array.isArray(creds) ? creds : [creds];
    const connectedSet = new Set(connected.map(normalizeProvider));
    return required.filter((c) => !connectedSet.has(normalizeProvider(c)));
}

type FieldMode = 'fixed' | 'expression';

/** One flattened path of the input data, ready to insert as `{{ $json.path }}`. */
interface DataPath {
    path: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
    preview: string;
}

/** Resolved input available to the selected node (output of its upstream node). */
interface InputData {
    label: string;
    json: Record<string, any> | null;
    paths: DataPath[];
}

/**
 * Right-side configuration panel. Renders a minimal form straight off the
 * NodeSpec.schema (a JSONSchema subset). The kept-it-simple list handles
 * string, number, integer, boolean, enum, array<string>, object — anything
 * unknown falls back to a textarea with JSON parse on save.
 *
 * Each string field has a "Fijo | Expresión" toggle. In expression mode a
 * data picker (n8n-style) lists the upstream node's last-run output so the
 * user can click a property to drop `{{ $json.campo }}` instead of typing it.
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onClose, onOpenIntegrations }) => {
    const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
    const graph = useFlowStore((s) => s.graph);
    const catalog = useFlowStore((s) => s.catalog);
    const runContext = useFlowStore((s) => s.runContext);
    const connectedProviders = useFlowStore((s) => s.connectedProviders);
    const updateNodeParams = useFlowStore((s) => s.updateNodeParams);
    const updateNode = useFlowStore((s) => s.updateNode);
    const deleteNode = useFlowStore((s) => s.deleteNode);
    const readOnly = useFlowStore((s) => s.readOnly);

    const node: FlowNode | undefined = useMemo(
        () => graph.nodes.find((n) => n.id === selectedNodeId),
        [graph.nodes, selectedNodeId]
    );
    const spec: NodeSpec | undefined = useMemo(
        () => (node ? findSpec(catalog, node.type) : undefined),
        [catalog, node]
    );

    // Data available to this node = the output of the node(s) feeding into it
    // (or the trigger payload). Drives the n8n-style expression picker.
    const inputData: InputData | null = useMemo(
        () => (node ? resolveInputData(node, graph, catalog, runContext) : null),
        [node, graph, catalog, runContext]
    );

    const [draft, setDraft] = useState<Record<string, any>>({});
    const [modes, setModes] = useState<Record<string, FieldMode>>({});
    const [notes, setNotes] = useState<string>('');

    useEffect(() => {
        if (!node) return;
        setDraft({ ...(spec?.defaults || {}), ...(node.params || {}) });
        setNotes(node.notes || '');
        const initialModes: Record<string, FieldMode> = {};
        for (const [k, v] of Object.entries(node.params || {})) {
            if (typeof v === 'string' && v.trim().startsWith('{{')) initialModes[k] = 'expression';
        }
        setModes(initialModes);
    }, [node, spec]);

    if (!node || !spec) {
        return (
            <aside className="kfc-config" aria-label="Panel de configuración">
                <div className="kfc-empty">
                    <div className="kfc-empty__title">Sin nodo seleccionado</div>
                    <div className="kfc-empty__desc">
                        Click en un nodo del canvas para editar sus parámetros.
                    </div>
                </div>
            </aside>
        );
    }

    const errors = validateNodeParams({ ...node, params: draft }, spec);
    const properties: Record<string, JSONSchemaLike> = spec.schema?.properties || {};
    const required: string[] = Array.isArray(spec.schema?.required) ? spec.schema.required : [];
    const missing = missingProviders(spec, connectedProviders);

    const setField = (name: string, value: any) => setDraft((d) => ({ ...d, [name]: value }));
    const setMode = (name: string, mode: FieldMode) =>
        setModes((m) => ({ ...m, [name]: mode }));

    const onSave = () => {
        updateNodeParams(node.id, draft);
        if (notes !== (node.notes || '')) updateNode(node.id, { notes });
        onClose();
    };

    const onCancel = () => onClose();

    const onDelete = () => {
        // eslint-disable-next-line no-alert
        if (confirm(`Eliminar el nodo "${spec.displayName}"?`)) {
            deleteNode(node.id);
            onClose();
        }
    };

    return (
        <aside className="kfc-config" aria-label="Panel de configuración">
            <div className="kfc-config__header">
                <div className="kfc-config__heading">
                    <div className="kfc-config__title">{spec.displayName}</div>
                    <div className="kfc-config__subtitle">{spec.type} · v{spec.version}</div>
                </div>
                <button
                    type="button"
                    className="kfc-btn kfc-btn--ghost kfc-config__close"
                    onClick={onClose}
                    aria-label="Cerrar"
                    title="Cerrar"
                >
                    <i className="pi pi-times" />
                </button>
            </div>

            <div className="kfc-config__body">
                {missing.length > 0 && (
                    <div className="kfc-config__missing" role="alert">
                        <div className="kfc-config__missing-head">
                            <i className="pi pi-exclamation-triangle" />
                            <span>
                                {missing.length === 1
                                    ? `Necesitás conectar ${providerLabel(missing[0])} para que este paso funcione.`
                                    : `Este paso necesita estas integraciones conectadas: ${missing
                                          .map(providerLabel)
                                          .join(', ')}.`}
                            </span>
                        </div>
                        <div className="kfc-config__missing-actions">
                            {missing.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className="kfc-btn kfc-btn--warn-solid kfc-btn--sm"
                                    onClick={() => onOpenIntegrations?.(p)}
                                >
                                    <i className="pi pi-link" />
                                    Conectar {providerLabel(p)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {spec.description && (
                    <p className="kfc-config__desc">{spec.description}</p>
                )}
                {errors.length > 0 && (
                    <div className="kfc-config__errors" role="alert">
                        {errors.map((e) => (
                            <div key={e}>· {e}</div>
                        ))}
                    </div>
                )}

                {Object.keys(properties).length === 0 && (
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                        Este nodo no tiene parámetros configurables.
                    </div>
                )}

                {Object.entries(properties).map(([name, schema]) => (
                    <SchemaField
                        key={name}
                        name={name}
                        schema={schema}
                        value={draft[name]}
                        mode={modes[name] || 'fixed'}
                        required={required.includes(name)}
                        readOnly={readOnly}
                        inputData={inputData}
                        onChange={(v) => setField(name, v)}
                        onModeChange={(m) => setMode(name, m)}
                    />
                ))}

                <hr className="kfc-config__sep" />

                <div className="kfc-field">
                    <label className="kfc-field__label">Notas (visibles en el canvas)</label>
                    <textarea
                        className="kfc-textarea"
                        value={notes}
                        readOnly={readOnly}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Comentarios, contexto, decisiones..."
                    />
                </div>

                {spec.category === 'trigger' && (
                    <div className="kfc-config__note">
                        Trigger: la suscripción (cron, webhook) se configura en el header del flow.
                    </div>
                )}
            </div>

            <div className="kfc-config__footer">
                {!readOnly && (
                    <button type="button" className="kfc-btn kfc-btn--danger" onClick={onDelete}>
                        <i className="pi pi-trash" />
                        Eliminar
                    </button>
                )}
                <span className="kfc-config__footer-spacer" />
                <button type="button" className="kfc-btn" onClick={onCancel}>
                    Cancelar
                </button>
                {!readOnly && (
                    <button type="button" className="kfc-btn kfc-btn--primary" onClick={onSave}>
                        <i className="pi pi-check" />
                        Guardar
                    </button>
                )}
            </div>
        </aside>
    );
};

interface SchemaFieldProps {
    name: string;
    schema: JSONSchemaLike;
    value: any;
    mode: FieldMode;
    required: boolean;
    readOnly: boolean;
    inputData: InputData | null;
    onChange: (value: any) => void;
    onModeChange: (mode: FieldMode) => void;
}

const SchemaField: React.FC<SchemaFieldProps> = ({
    name,
    schema,
    value,
    mode,
    required,
    readOnly,
    inputData,
    onChange,
    onModeChange
}) => {
    const label = schema.title || name;
    const description = schema.description;
    const type = schema.type;
    const enumValues: string[] | undefined = schema.enum;
    const inputId = `kfc-field-${name}`;

    // Boolean → checkbox
    if (type === 'boolean') {
        return (
            <div className="kfc-field">
                <label className="kfc-checkbox-row">
                    <input
                        id={inputId}
                        type="checkbox"
                        checked={!!value}
                        disabled={readOnly}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span>
                        {label}
                        {required && <span className="kfc-req"> *</span>}
                    </span>
                    <TypeChip schema={schema} />
                </label>
                {description && <div className="kfc-field__hint">{description}</div>}
            </div>
        );
    }

    // Enum → select
    if (Array.isArray(enumValues)) {
        return (
            <div className="kfc-field">
                <FieldLabel label={label} required={required} schema={schema} htmlFor={inputId} />
                <select
                    id={inputId}
                    className="kfc-select"
                    value={value ?? ''}
                    disabled={readOnly}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">— elegí una opción —</option>
                    {enumValues.map((v) => (
                        <option key={String(v)} value={String(v)}>
                            {String(v)}
                        </option>
                    ))}
                </select>
                {description && <div className="kfc-field__hint">{description}</div>}
            </div>
        );
    }

    // Array → multi-select (enum) or comma-separated input
    if (type === 'array') {
        const itemEnum: string[] | undefined = schema.items?.enum;
        const arr: string[] = Array.isArray(value) ? value : [];
        if (itemEnum) {
            return (
                <div className="kfc-field">
                    <FieldLabel label={label} required={required} schema={schema} />
                    <div className="kfc-checkchips">
                        {itemEnum.map((opt) => {
                            const isOn = arr.includes(opt);
                            return (
                                <label
                                    key={opt}
                                    className={classNames('kfc-checkchip', { 'is-on': isOn })}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isOn}
                                        disabled={readOnly}
                                        onChange={(e) => {
                                            if (e.target.checked) onChange([...arr, opt]);
                                            else onChange(arr.filter((x) => x !== opt));
                                        }}
                                    />
                                    {opt}
                                </label>
                            );
                        })}
                    </div>
                    {description && <div className="kfc-field__hint">{description}</div>}
                </div>
            );
        }
        return (
            <div className="kfc-field">
                <FieldLabel label={label} required={required} schema={schema} htmlFor={inputId} />
                <input
                    id={inputId}
                    type="text"
                    className="kfc-input"
                    value={arr.join(', ')}
                    readOnly={readOnly}
                    onChange={(e) =>
                        onChange(
                            e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                        )
                    }
                    placeholder="valor1, valor2, valor3"
                />
                {description && <div className="kfc-field__hint">{description}</div>}
            </div>
        );
    }

    // Object → JSON textarea (controlled local state, sync con value externo)
    if (type === 'object') {
        return (
            <ObjectFieldEditor
                inputId={inputId}
                label={label}
                schema={schema}
                description={description}
                required={!!required}
                readOnly={!!readOnly}
                value={value}
                onChange={onChange}
                name={name}
            />
        );
    }

    // Number / integer → number input
    if (type === 'number' || type === 'integer') {
        return (
            <div className="kfc-field">
                <FieldLabel label={label} required={required} schema={schema} htmlFor={inputId} />
                <input
                    id={inputId}
                    type="number"
                    className="kfc-input"
                    value={value ?? ''}
                    readOnly={readOnly}
                    min={schema.minimum}
                    max={schema.maximum}
                    step={type === 'integer' ? 1 : 'any'}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') onChange(undefined);
                        else onChange(type === 'integer' ? parseInt(v, 10) : parseFloat(v));
                    }}
                />
                {description && <div className="kfc-field__hint">{description}</div>}
            </div>
        );
    }

    // Default: string with fijo/expresión toggle + n8n-style data picker
    return (
        <div className="kfc-field">
            <FieldLabel
                label={label}
                required={required}
                schema={schema}
                htmlFor={inputId}
                right={
                    <span className="kfc-mode-toggle" role="tablist">
                        <button
                            type="button"
                            className={classNames({ 'is-active': mode === 'fixed' })}
                            onClick={() => onModeChange('fixed')}
                            disabled={readOnly}
                        >
                            Fijo
                        </button>
                        <button
                            type="button"
                            className={classNames({ 'is-active': mode === 'expression' })}
                            onClick={() => onModeChange('expression')}
                            disabled={readOnly}
                            title="Usar datos de pasos anteriores con {{ }}"
                        >
                            Expresión
                        </button>
                    </span>
                }
            />
            {mode === 'expression' ? (
                <ExpressionInput
                    inputId={inputId}
                    value={value ?? ''}
                    readOnly={readOnly}
                    inputData={inputData}
                    onChange={onChange}
                />
            ) : (
                <input
                    id={inputId}
                    type="text"
                    className="kfc-input"
                    value={value ?? ''}
                    readOnly={readOnly}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={schema.default ? `Por defecto: ${schema.default}` : ''}
                />
            )}
            {description && <div className="kfc-field__hint">{description}</div>}
        </div>
    );
};

/* ----------------------------------------------------------------------- */
/* Expression input — text field + click-to-insert data picker (n8n style) */
/* ----------------------------------------------------------------------- */

interface ExpressionInputProps {
    inputId: string;
    value: string;
    readOnly: boolean;
    inputData: InputData | null;
    onChange: (v: string) => void;
}

const ExpressionInput: React.FC<ExpressionInputProps> = ({
    inputId,
    value,
    readOnly,
    inputData,
    onChange
}) => {
    const ref = useRef<HTMLInputElement>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');

    const insertToken = (token: string) => {
        const el = ref.current;
        const current = value || '';
        if (!el) {
            onChange(current + token);
            return;
        }
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? current.length;
        const next = current.slice(0, start) + token + current.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + token.length;
            try {
                el.setSelectionRange(pos, pos);
            } catch {
                /* noop */
            }
        });
    };

    const preview = useMemo(
        () => resolveSimpleExpression(value, inputData?.json),
        [value, inputData]
    );

    const filteredPaths = useMemo(() => {
        const paths = inputData?.paths || [];
        const q = search.trim().toLowerCase();
        if (!q) return paths;
        return paths.filter((p) => p.path.toLowerCase().includes(q));
    }, [inputData, search]);

    return (
        <div className="kfc-expr-wrap">
            <div className="kfc-expr">
                <span className="kfc-expr__fx" title="Modo expresión">
                    <i className="pi pi-bolt" />
                </span>
                <input
                    ref={ref}
                    id={inputId}
                    type="text"
                    className="kfc-input kfc-expr__input"
                    value={value ?? ''}
                    readOnly={readOnly}
                    placeholder="{{ $json.campo }}"
                    onChange={(e) => onChange(e.target.value)}
                />
                {!readOnly && (
                    <button
                        type="button"
                        className={classNames('kfc-expr__pick', { 'is-open': pickerOpen })}
                        onClick={() => setPickerOpen((o) => !o)}
                        title="Insertar dato del paso anterior"
                    >
                        <i className="pi pi-database" />
                        Datos
                    </button>
                )}
            </div>

            {preview !== null && (
                <div className="kfc-expr__preview" title="Valor de muestra del último run">
                    <span className="kfc-expr__preview-eq">=</span> {preview}
                </div>
            )}

            {pickerOpen && (
                <div className="kfc-datapick">
                    <div className="kfc-datapick__head">
                        <i className="pi pi-sign-in" />
                        Datos de «{inputData?.label || 'paso anterior'}»
                    </div>

                    {!inputData || inputData.paths.length === 0 ? (
                        <div className="kfc-datapick__empty">
                            <i className="pi pi-info-circle" />
                            <span>
                                Ejecutá el flow una vez (botón «Ejecutar») para ver las
                                propiedades reales del paso anterior. Mientras tanto podés
                                insertar la raíz:
                            </span>
                            <div className="kfc-datapick__tokens">
                                <button
                                    type="button"
                                    className="kfc-token"
                                    onClick={() => insertToken('{{ $json }}')}
                                >
                                    {'{{ $json }}'}
                                </button>
                                <button
                                    type="button"
                                    className="kfc-token"
                                    onClick={() => insertToken('{{ $vars. }}')}
                                >
                                    {'{{ $vars }}'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <input
                                type="search"
                                className="kfc-datapick__search"
                                placeholder="Buscar propiedad…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <ul className="kfc-datapick__list">
                                {filteredPaths.map((p) => (
                                    <li key={p.path}>
                                        <button
                                            type="button"
                                            className="kfc-datapick__row"
                                            onClick={() => insertToken(`{{ $json.${p.path} }}`)}
                                            title={`Insertar {{ $json.${p.path} }}`}
                                        >
                                            <span
                                                className={`kfc-datapick__type kfc-datapick__type--${p.type}`}
                                            >
                                                {dataTypeLabel(p.type)}
                                            </span>
                                            <span className="kfc-datapick__path">{p.path}</span>
                                            <span className="kfc-datapick__val">{p.preview}</span>
                                        </button>
                                    </li>
                                ))}
                                {filteredPaths.length === 0 && (
                                    <li className="kfc-datapick__noresult">
                                        Sin propiedades que coincidan con «{search}».
                                    </li>
                                )}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

/* ----------------------------------------------------------------------- */
/* Shared label + type-chip helpers                                        */
/* ----------------------------------------------------------------------- */

const FieldLabel: React.FC<{
    label: string;
    required: boolean;
    schema: JSONSchemaLike;
    htmlFor?: string;
    right?: React.ReactNode;
}> = ({ label, required, schema, htmlFor, right }) => (
    <label className="kfc-field__label" htmlFor={htmlFor}>
        <span className="kfc-field__labeltext">
            {label}
            {required && <span className="kfc-req"> *</span>}
            <TypeChip schema={schema} />
        </span>
        {right}
    </label>
);

const TypeChip: React.FC<{ schema: JSONSchemaLike }> = ({ schema }) => {
    const { label, kind } = fieldKind(schema);
    return <span className={`kfc-typechip kfc-typechip--${kind}`}>{label}</span>;
};

function fieldKind(schema: JSONSchemaLike): { label: string; kind: string } {
    if (Array.isArray(schema.enum)) return { label: 'opción', kind: 'enum' };
    const t = schema.type;
    if (t === 'array') return schema.items?.enum
        ? { label: 'multi', kind: 'array' }
        : { label: 'lista', kind: 'array' };
    if (t === 'object') return { label: 'objeto', kind: 'object' };
    if (t === 'boolean') return { label: 'sí/no', kind: 'boolean' };
    if (t === 'number' || t === 'integer') return { label: 'número', kind: 'number' };
    return { label: 'texto', kind: 'string' };
}

interface ObjectFieldEditorProps {
    inputId: string;
    label: string;
    schema: JSONSchemaLike;
    description?: string;
    required: boolean;
    readOnly: boolean;
    value: any;
    onChange: (v: any) => void;
    name: string;
}

const ObjectFieldEditor: React.FC<ObjectFieldEditorProps> = ({
    inputId, label, schema, description, required, readOnly, value, onChange,
}) => {
    const stringified = useMemo(() => {
        try { return JSON.stringify(value ?? {}, null, 2); } catch { return '{}'; }
    }, [value]);

    const [text, setText] = useState<string>(stringified);
    const [error, setError] = useState<string | null>(null);

    // Sync local state cuando el value externo cambia (cambio de nodo seleccionado, etc.)
    useEffect(() => {
        setText(stringified);
        setError(null);
    }, [stringified]);

    return (
        <div className="kfc-field">
            <FieldLabel label={label} required={required} schema={schema} htmlFor={inputId} />
            <textarea
                id={inputId}
                className="kfc-textarea"
                value={text}
                readOnly={readOnly}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => {
                    try {
                        onChange(JSON.parse(text || '{}'));
                        setError(null);
                    } catch (err: any) {
                        setError('JSON inválido: ' + (err && err.message ? err.message : String(err)));
                    }
                }}
            />
            {error && <div className="kfc-field__error">{error}</div>}
            {description && !error && <div className="kfc-field__hint">{description}</div>}
        </div>
    );
};

/* ----------------------------------------------------------------------- */
/* Pure helpers — input-data resolution & expression preview               */
/* ----------------------------------------------------------------------- */

/**
 * The data a node "sees" at runtime is the output of the node(s) feeding into
 * it (or the trigger payload, for trigger/root nodes). We read that from the
 * last run stored in runContext and flatten it into clickable paths.
 */
function resolveInputData(
    node: FlowNode,
    graph: { nodes: FlowNode[]; edges: { source: string; target: string }[] },
    catalog: NodeSpec[],
    runContext: { nodeStates?: Record<string, any>; triggerData?: any[] } | null
): InputData | null {
    const predecessors = graph.edges
        .filter((e) => e.target === node.id)
        .map((e) => e.source);

    // Prefer an upstream node that actually produced output in the last run.
    let chosenId: string | null = null;
    for (const pid of predecessors) {
        const json = firstItemJson(runContext?.nodeStates?.[pid]);
        if (json) { chosenId = pid; break; }
        if (!chosenId) chosenId = pid;
    }

    let label = 'paso anterior';
    let json: Record<string, any> | null = null;

    if (chosenId) {
        json = firstItemJson(runContext?.nodeStates?.[chosenId]);
        const upstream = graph.nodes.find((n) => n.id === chosenId);
        const upSpec = upstream ? findSpec(catalog, upstream.type) : undefined;
        label = upSpec?.displayName || 'paso anterior';
    } else {
        // No upstream edges → this is likely a trigger/root; use the trigger payload.
        const triggerJson = runContext?.triggerData?.[0]?.json;
        if (triggerJson) {
            json = triggerJson;
            label = 'trigger';
        }
    }

    return {
        label,
        json,
        paths: json ? flattenJson(json) : []
    };
}

function firstItemJson(state: any): Record<string, any> | null {
    const json = state?.output?.main?.[0]?.[0]?.json;
    return json && typeof json === 'object' ? json : null;
}

/** Flatten a JSON object into dotted paths (arrays exposed via [0]). */
function flattenJson(
    value: any,
    prefix = '',
    out: DataPath[] = [],
    depth = 0
): DataPath[] {
    if (depth > 5) return out;

    if (Array.isArray(value)) {
        if (prefix) out.push({ path: prefix, type: 'array', preview: `[${value.length} elementos]` });
        if (value.length) flattenJson(value[0], `${prefix}[0]`, out, depth + 1);
        return out;
    }

    if (value && typeof value === 'object') {
        if (prefix) out.push({ path: prefix, type: 'object', preview: '{ objeto }' });
        for (const key of Object.keys(value)) {
            const childPrefix = prefix ? `${prefix}.${key}` : key;
            flattenJson(value[key], childPrefix, out, depth + 1);
        }
        return out;
    }

    out.push({
        path: prefix,
        type: value === null ? 'null' : (typeof value as DataPath['type']),
        preview: previewValue(value)
    });
    return out;
}

function previewValue(v: any): string {
    if (v === null) return 'null';
    if (typeof v === 'string') return v.length > 32 ? `"${v.slice(0, 32)}…"` : `"${v}"`;
    return String(v);
}

function dataTypeLabel(type: DataPath['type']): string {
    switch (type) {
        case 'number': return 'núm';
        case 'boolean': return 'bool';
        case 'object': return '{}';
        case 'array': return '[]';
        case 'null': return 'null';
        default: return 'txt';
    }
}

/** Resolve a single `{{ $json.path }}` expression against sample data (preview only). */
function resolveSimpleExpression(expr: string, json: Record<string, any> | null | undefined): string | null {
    if (typeof expr !== 'string' || !json) return null;
    const m = /^\s*\{\{\s*\$json\.?([\w.$[\]]*)\s*\}\}\s*$/.exec(expr);
    if (!m) return null;
    const path = m[1];
    const val = path ? getByPath(json, path) : json;
    if (val === undefined) return '—';
    if (val === null) return 'null';
    if (typeof val === 'object') return Array.isArray(val) ? `[${val.length} elementos]` : '{ objeto }';
    const s = String(val);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

function getByPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}
