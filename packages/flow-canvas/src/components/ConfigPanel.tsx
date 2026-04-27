import React, { useMemo, useState, useEffect } from 'react';
import classNames from 'classnames';
import type { FlowNode, NodeSpec, JSONSchemaLike } from '../contracts/types';
import { useFlowStore } from '../store/flowStore';
import { findSpec, validateNodeParams } from '../utils/validators';

export interface ConfigPanelProps {
    onClose: () => void;
}

type FieldMode = 'fixed' | 'expression';

/**
 * Right-side configuration panel. Renders a minimal form straight off the
 * NodeSpec.schema (a JSONSchema subset). The kept-it-simple list handles
 * string, number, integer, boolean, enum, array<string>, object — anything
 * unknown falls back to a textarea with JSON parse on save.
 *
 * Each string field has a "Fixed | Expression" toggle so users can drop in
 * `{{ ... }}` expressions without writing raw JSON.
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onClose }) => {
    const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
    const graph = useFlowStore((s) => s.graph);
    const catalog = useFlowStore((s) => s.catalog);
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
                <div>
                    <div className="kfc-config__title">{spec.displayName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{spec.type} · v{spec.version}</div>
                </div>
                <button type="button" className="kfc-btn" onClick={onClose} aria-label="Cerrar">
                    Cerrar
                </button>
            </div>

            <div className="kfc-config__body">
                {spec.description && (
                    <p style={{ marginTop: 0, color: '#4b5563', fontSize: 12 }}>{spec.description}</p>
                )}
                {errors.length > 0 && (
                    <div
                        style={{
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            borderRadius: 6,
                            padding: 10,
                            fontSize: 12,
                            marginBottom: 12
                        }}
                    >
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
                        onChange={(v) => setField(name, v)}
                        onModeChange={(m) => setMode(name, m)}
                    />
                ))}

                <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

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
                    <div
                        style={{
                            background: '#fffbeb',
                            border: '1px solid #fcd34d',
                            color: '#92400e',
                            borderRadius: 6,
                            padding: 10,
                            fontSize: 12
                        }}
                    >
                        Trigger: la suscripción (cron, webhook) se configura en el header del flow.
                    </div>
                )}
            </div>

            <div className="kfc-config__footer">
                {!readOnly && (
                    <button type="button" className="kfc-btn kfc-btn--danger" onClick={onDelete}>
                        Eliminar nodo
                    </button>
                )}
                <div style={{ flex: 1 }} />
                <button type="button" className="kfc-btn" onClick={onCancel}>
                    Cancelar
                </button>
                {!readOnly && (
                    <button type="button" className="kfc-btn kfc-btn--primary" onClick={onSave}>
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
                        {required && <span style={{ color: '#dc2626' }}> *</span>}
                    </span>
                </label>
                {description && <div className="kfc-field__hint">{description}</div>}
            </div>
        );
    }

    // Enum → select
    if (Array.isArray(enumValues)) {
        return (
            <div className="kfc-field">
                <label className="kfc-field__label" htmlFor={inputId}>
                    <span>
                        {label}
                        {required && <span style={{ color: '#dc2626' }}> *</span>}
                    </span>
                </label>
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

    // Array → comma-separated input (simple)
    if (type === 'array') {
        const itemEnum: string[] | undefined = schema.items?.enum;
        const arr: string[] = Array.isArray(value) ? value : [];
        if (itemEnum) {
            return (
                <div className="kfc-field">
                    <label className="kfc-field__label">
                        <span>
                            {label}
                            {required && <span style={{ color: '#dc2626' }}> *</span>}
                        </span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {itemEnum.map((opt) => {
                            const isOn = arr.includes(opt);
                            return (
                                <label
                                    key={opt}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: isOn ? '#dbeafe' : '#f3f4f6',
                                        color: isOn ? '#1d4ed8' : '#374151',
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        fontSize: 12,
                                        cursor: readOnly ? 'default' : 'pointer'
                                    }}
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
                <label className="kfc-field__label" htmlFor={inputId}>
                    <span>
                        {label}
                        {required && <span style={{ color: '#dc2626' }}> *</span>}
                    </span>
                </label>
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
                <label className="kfc-field__label" htmlFor={inputId}>
                    <span>
                        {label}
                        {required && <span style={{ color: '#dc2626' }}> *</span>}
                    </span>
                </label>
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

    // Default: string with fixed/expression toggle
    return (
        <div className="kfc-field">
            <label className="kfc-field__label" htmlFor={inputId}>
                <span>
                    {label}
                    {required && <span style={{ color: '#dc2626' }}> *</span>}
                </span>
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
                    >
                        Expresión
                    </button>
                </span>
            </label>
            <input
                id={inputId}
                type="text"
                className="kfc-input"
                value={value ?? ''}
                readOnly={readOnly}
                onChange={(e) => onChange(e.target.value)}
                placeholder={mode === 'expression' ? '{{ $json.field }}' : schema.default ? `Por defecto: ${schema.default}` : ''}
            />
            {description && <div className="kfc-field__hint">{description}</div>}
        </div>
    );
};

interface ObjectFieldEditorProps {
    inputId: string;
    label: string;
    description?: string;
    required: boolean;
    readOnly: boolean;
    value: any;
    onChange: (v: any) => void;
    name: string;
}

const ObjectFieldEditor: React.FC<ObjectFieldEditorProps> = ({
    inputId, label, description, required, readOnly, value, onChange, name,
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
            <label className="kfc-field__label" htmlFor={inputId}>
                <span>
                    {label}
                    {required && <span style={{ color: '#dc2626' }}> *</span>}
                </span>
            </label>
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
            {error && <div className="kfc-field__hint" style={{ color: '#dc2626' }}>{error}</div>}
            {description && !error && <div className="kfc-field__hint">{description}</div>}
        </div>
    );
};

