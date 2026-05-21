#!/usr/bin/env bash
#
# Spec 003.5 T-11 — Audit: vocabulario amigable en la UI de templates.
#
# Detecta jerga técnica que NO debe aparecer al comerciante final:
#   trigger, nodo, binding, expression, cron expression, companyConfig,
#   execution context, runtime, BFS, hook, callback.
#
# Excepciones aceptables: "webhook entrante" como término que sí se usa al
# explicar la URL de webhook al usuario; "experimental" como label visible.
#
# Uso:
#   bash Seller.Katuq/scripts/audit-templates-vocabulary.sh
#   # Exit 0 = limpio, 1 = encontró jerga técnica.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src/app/components/flows/flow-templates"

if [ ! -d "$TARGET" ]; then
  echo "❌ no existe directorio: $TARGET"
  exit 2
fi

# Patrón de jerga prohibida. -w para boundary; case-insensitive.
# 'webhook' está OK cuando va seguido de 'entrante'/'webhook URL' — para MVP
# no distinguimos, solo prohibimos las más obvias.
PROHIBITED='\b(trigger|nodo|binding|expression|companyConfig|execution[[:space:]]+context|BFS|callback)\b'

# Solo .html y .scss (donde se renderiza texto visible al usuario). El .ts
# puede contener 'trigger' como id interno de nodos de grafo sin problema —
# eso NO se muestra al comerciante.
HITS=$(grep -rEni "$PROHIBITED" --include="*.html" --include="*.scss" "$TARGET" 2>/dev/null || true)

if [ -z "$HITS" ]; then
  echo "✅ vocabulario amigable en flow-templates/ (HTML/SCSS) — 0 hits de jerga prohibida"
  exit 0
fi

echo "⚠️  jerga técnica detectada en flow-templates/ (Spec 003.5 AC-003.5-07):"
echo "$HITS"
echo ""
echo "Reemplazá por vocabulario amigable: sincronización, paso, evento,"
echo "cada cuánto, activar/pausar, plantilla."
exit 1
