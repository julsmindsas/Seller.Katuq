#!/usr/bin/env bash
#
# Prueba manual del webhook entrante de Osmosis/Cereza.
# Genera la firma HMAC-SHA256 y dispara el POST.
#
# Uso:
#   chmod +x test-webhook.sh
#   ./test-webhook.sh <base-url> <companyId> <webhookSecret>
#
# Ejemplos:
#   ./test-webhook.sh http://localhost:3300/v1 EMPRESA_TEST mi-secret-de-prueba
#   ./test-webhook.sh https://api.katuq.com/v1 ACME abc123
#
# Requiere: bash, curl, openssl, uuidgen (o /proc/sys/kernel/random/uuid).

set -euo pipefail

BASE_URL="${1:-http://localhost:3300/v1}"
COMPANY_ID="${2:-EMPRESA_TEST}"
SECRET="${3:-mi-secret-de-prueba}"

EVENT_ID="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"

# ---------------------------------------------------------------------------
# Caso 1: order.status_updated
# ---------------------------------------------------------------------------
BODY_ORDER=$(cat <<JSON
{
  "event": "order.status_updated",
  "nodeSlug": "${COMPANY_ID}",
  "data": {
    "osmosisOrderId": "OSM-TEST-001",
    "katuqOrderId": "KTQ-TEST-001",
    "status": "shipped",
    "notes": "Prueba desde test-webhook.sh",
    "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
JSON
)

SIG_ORDER="sha256=$(printf '%s' "$BODY_ORDER" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

echo "==> POST ${BASE_URL}/osmosis/webhook/${COMPANY_ID} (order.status_updated)"
echo "    X-Osmosis-Event-Id : ${EVENT_ID}"
echo "    X-Osmosis-Signature: ${SIG_ORDER}"
echo
curl -sS -X POST "${BASE_URL}/osmosis/webhook/${COMPANY_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Osmosis-Event-Id: ${EVENT_ID}" \
  -H "X-Osmosis-Signature: ${SIG_ORDER}" \
  --data "${BODY_ORDER}" | sed 's/^/    /'
echo

# ---------------------------------------------------------------------------
# Caso 2: product.updated
# ---------------------------------------------------------------------------
EVENT_ID_2="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
BODY_PRODUCT=$(cat <<JSON
{
  "event": "product.updated",
  "nodeSlug": "${COMPANY_ID}",
  "data": {
    "osmosisProductId": "OSM-PROD-001",
    "sku": "SKU-TEST-001",
    "name": "Producto de prueba",
    "price": 19990,
    "stock": 42,
    "active": true,
    "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
JSON
)
SIG_PRODUCT="sha256=$(printf '%s' "$BODY_PRODUCT" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

echo "==> POST ${BASE_URL}/osmosis/webhook/${COMPANY_ID} (product.updated)"
echo "    X-Osmosis-Event-Id : ${EVENT_ID_2}"
echo "    X-Osmosis-Signature: ${SIG_PRODUCT}"
echo
curl -sS -X POST "${BASE_URL}/osmosis/webhook/${COMPANY_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Osmosis-Event-Id: ${EVENT_ID_2}" \
  -H "X-Osmosis-Signature: ${SIG_PRODUCT}" \
  --data "${BODY_PRODUCT}" | sed 's/^/    /'
echo

# ---------------------------------------------------------------------------
# Caso 3: idempotencia — reenviar el primer evento, debe ignorar
# ---------------------------------------------------------------------------
echo "==> Reenvío del primer evento (mismo X-Osmosis-Event-Id) — debe responder 200 sin re-procesar"
echo
curl -sS -X POST "${BASE_URL}/osmosis/webhook/${COMPANY_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Osmosis-Event-Id: ${EVENT_ID}" \
  -H "X-Osmosis-Signature: ${SIG_ORDER}" \
  --data "${BODY_ORDER}" | sed 's/^/    /'
echo

# ---------------------------------------------------------------------------
# Caso 4: firma inválida — debe ser rechazado (log: rejected_invalid_signature)
# ---------------------------------------------------------------------------
EVENT_ID_BAD="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
echo "==> Envío con firma manipulada — debe responder 200 (siempre 200) pero log debería marcar rejected_invalid_signature"
echo
curl -sS -X POST "${BASE_URL}/osmosis/webhook/${COMPANY_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Osmosis-Event-Id: ${EVENT_ID_BAD}" \
  -H "X-Osmosis-Signature: sha256=deadbeef" \
  --data "${BODY_ORDER}" | sed 's/^/    /'
echo

echo "==> Listo. Inspeccionar logs en Firestore: osmosis_webhook_log/${COMPANY_ID}/events/{eventId}"
