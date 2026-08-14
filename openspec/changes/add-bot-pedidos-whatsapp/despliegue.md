# Despliegue del bot de pedidos — runbook

Orden pensado para que cada paso deje el sistema igual que antes si algo sale
mal. El bot queda **apagado globalmente** hasta el paso 6.

## 0. Generar el token compartido (una vez)

```bash
openssl rand -hex 32   # → WHATSAPP_BOT_TOKEN (el mismo en backend y ADK)
```

## 1. Backend (repo `katuq_admin_back_firebase`, rama `backend-aws-security`)

```bash
# local: commit + push de los cambios del bot
# prod (13.222.206.185, usuario ubuntu, SIN sudo — daemon ubuntu de PM2):
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@13.222.206.185
cd /home/ubuntu/katuq_admin_back_firebase && git pull origin backend-aws-security
git diff --stat HEAD@{1}..HEAD -- functions/package.json   # si cambió → npm install en functions/
```

Agregar a `functions/.env`:

```
WHATSAPP_BOT_ENABLED=false        # ← apagado hasta el paso 6
WHATSAPP_BOT_TOKEN=<el del paso 0>
# KAI_ADK_URL no hace falta: default http://127.0.0.1:8080
```

```bash
pm2 restart katuq-api --update-env
```

**Verificación:** el buzón sigue enviando/cobrando igual (el refactor del reply
es el único cambio vivo). Responder un hilo real y confirmar en el historial.

## 2. ADK (repo `kai`, el servidor corre la rama `codex/011-agent-context-handoff-protocol`)

```bash
# local: commit + push (canal whatsapp + endpoint)
# prod:
cd /home/ubuntu/kai && git pull
# agregar al .env de adk_agent:  WHATSAPP_BOT_TOKEN=<el del paso 0>
sudo systemctl restart kai-adk        # ← systemd, NUNCA pm2
curl -s http://127.0.0.1:8080/v1/whatsapp-bot/salud   # → {"ok":true,"configurado":true}
```

`configurado:false` = el token no quedó en el env del servicio.

## 3. Frontend

Deploy desde worktree limpio (ver memoria `deploy-frontend-worktree-limpio`):
compilar el commit, no el working tree, para no arrastrar sesiones paralelas.

## 4. Llave MCP del comercio piloto

```bash
# generar la llave (endpoint admin del MCP en el backend):
curl -X POST https://back.katuq.com/mcp/admin/generate-key \
  -H 'Content-Type: application/json' -d '{"company":"<COMERCIO PILOTO>"}'
# guardarla donde el canal la lee:
# Firestore → empresas/<COMERCIO PILOTO>/settings/mcp_config
#   { enabled: true, api_key: "<katuq_..._xxx>" }
```

Sin esto el agente no ve el catálogo y pasa todo a un asesor (no revienta).

## 5. Kapso — número propio del comercio

1. Crear el **customer** del comercio (dashboard/API de plataforma).
2. Generar el **setup link** (vence a los 30 días) y conectarlo: número que
   reciba SMS/llamada y no esté activo en otro WhatsApp + Meta Business.
3. Tomar `api_key` del customer y `phone_number_id` → Katuq → Integraciones →
   WhatsApp → **Credenciales propias**.
4. **Verificar el webhook**: mandar un mensaje al número nuevo y confirmar que
   llega a `whatsapp_inbound` con ese `phone_number_id`. Si no llega, crear el
   webhook del customer en Kapso (kind `meta`, mismo secreto).

## 6. Encender en sombra

```bash
# backend .env:  WHATSAPP_BOT_ENABLED=true  →  pm2 restart katuq-api --update-env
```

En la UI del comercio piloto: Integraciones → WhatsApp → **Bot de pedidos** →
encender (queda en **modo sombra** por defecto). Escribirle al número y revisar:

```bash
pm2 logs katuq-api | grep -E "sombra_no_enviado|sombra_cierre|sombra_traspaso"
```

La pestaña **Pedidos** del buzón muestra el carrito armándose.

## 7. Soltar de verdad

Cuando la sombra convenza: quitar el modo sombra en la UI. Vigilar la primera
semana: consumo con tipo `BOT_REPLY`, traspasos y sus motivos, cotizaciones
origen `whatsapp-bot`.

## Apagados de emergencia (de menor a mayor)

1. UI del comercio: apagar el bot (efecto inmediato).
2. Backend: `WHATSAPP_BOT_ENABLED=false` + `pm2 restart katuq-api --update-env`
   (apaga el despacho para TODOS sin tocar el resto del canal).
3. ADK caído no rompe nada: el despachador traspasa a un asesor.
