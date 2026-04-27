/**
 * Compact non-cryptographic id used for nodes and edges inside the canvas.
 * Server-side will accept these as-is when persisting (they only need to be
 * unique within the flow document).
 */
export function shortId(prefix = 'n'): string {
    const t = Date.now().toString(36).slice(-4);
    const r = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${t}${r}`;
}
