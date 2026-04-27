# @katuq/flow-canvas

React Flow visual editor for Katuq Flows, packaged as a Web Component
(`<katuq-flow-canvas>`) and embedded inside the Angular 14 shell at
`src/app/components/flows/`.

## Stack

- React 18 + TypeScript
- React Flow 11 (`reactflow`)
- Zustand 4 for in-canvas state
- Vite 5 (lib mode, single ESM bundle)

## Dev

```bash
cd packages/flow-canvas
npm install
npm run dev
```

Visit http://localhost:5180 — the dev harness mounts the Web Component
with a sample graph + catalog (see `src/contracts/sample-data.ts`).

## Build

```bash
npm run build
```

Outputs `dist/flow-canvas.js` and `dist/flow-canvas.css`. React, React Flow,
Zustand, and classnames are inlined so the bundle drops directly into Angular
without npm peers.

## Embedding from Angular

1. Build the WC and copy `dist/flow-canvas.js` + `dist/flow-canvas.css` to
   `src/assets/flow-canvas/` (or serve as a CDN asset).
2. Reference the bundle from `index.html` or load it lazily from
   `flow-editor.component.ts`:

```ts
ngOnInit() {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = '/assets/flow-canvas/flow-canvas.js';
    document.head.appendChild(s);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/flow-canvas/flow-canvas.css';
    document.head.appendChild(link);
}
```

3. Use it inside an Angular template (the host module needs
   `CUSTOM_ELEMENTS_SCHEMA`):

```html
<katuq-flow-canvas
    #canvas
    [graph]="graph"
    [nodeCatalog]="catalog"
    [readOnly]="readOnly"
    (graphChange)="onGraphChange($event)"
    (nodeSelected)="onNodeSelected($event)"
    (runRequested)="onRunRequested($event)">
</katuq-flow-canvas>
```

## Properties (Angular → React)

| Property         | Type                | Notes                                              |
| ---------------- | ------------------- | -------------------------------------------------- |
| `graph`          | `FlowGraph`         | Initial graph; updates from outside replace state. |
| `nodeCatalog`    | `NodeSpec[]`        | The 27 node specs from the backend catalog.        |
| `runContext`     | `RunContext | null` | Animates edges, paints status badges on nodes.     |
| `readOnly`       | `boolean`           | Disables drag, drop, edits.                        |
| `selectedNodeId` | `string | null`     | Programmatically open the config panel.            |

Set them as JS properties (Angular property binding `[graph]="..."` does
this for you), not as stringified HTML attributes.

## Events (React → Angular)

| Event          | Detail                       | Fires when                                       |
| -------------- | ---------------------------- | ------------------------------------------------ |
| `graphChange`  | `FlowGraph`                  | Any node/edge/parameter mutation inside canvas.  |
| `nodeSelected` | `{ nodeId: string | null }`  | Selection state changed.                         |
| `runRequested` | `{ triggerData?: unknown }`  | User clicked the "Ejecutar" toolbar button.      |

## Folder layout

```
src/
├── main.tsx                    Custom element registration
├── FlowCanvasApp.tsx           Top-level layout
├── components/
│   ├── Canvas.tsx              React Flow surface
│   ├── CustomNode.tsx          Node renderer (handles, header, badges)
│   ├── NodePalette.tsx         Left sidebar — drag source
│   ├── ConfigPanel.tsx         Right sidebar — JSONSchema form
│   └── RunHistoryViewer.tsx    Execution timeline
├── store/flowStore.ts          Zustand store
├── utils/
│   ├── validators.ts           Cycle detection + port matching
│   └── id.ts                   Compact non-cryptographic id
├── contracts/
│   ├── types.ts                Local copy of the backend contracts
│   └── sample-data.ts          Dev-harness fixtures
└── styles.css                  Flat, no-gradient styling

dev.html                        Vite dev harness
```

## TODO

- Wire `nodeRunRequested` per-node (current toolbar button runs the whole flow).
- Diff viewer between flow versions.
- AI-assist sidebar that translates natural language into nodes.
- Real-time run streaming from the backend (RunContext is currently snapshot only).
- Replace the lightweight schema renderer with `@rjsf/core` once we ship.
