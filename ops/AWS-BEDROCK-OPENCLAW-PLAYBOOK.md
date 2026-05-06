# AWS CLI + Bedrock + OpenClaw — Playbook operativo

> Documento de runbook con todos los aprendizajes operativos. Cubre acceso a la cuenta AWS de Katuq, listado de recursos, gestión de modelos en Amazon Bedrock, troubleshooting de OpenClaw-1, y cambios de modelo end-to-end.
>
> Última actualización: 2026-05-04

---

## 1. Cuentas AWS y perfiles CLI

### Cuentas conocidas

| Cuenta | ID | Acceso | Notas |
|---|---|---|---|
| Personal (default) | `862551216617` | IAM user `gogirald@gmail.com` | Otra cuenta del usuario |
| **Katuq / OpenClaw** | `011528299077` | Root access keys | Cuenta donde corre OpenClaw-1, julsmind-api, ultimamilla |

### Configurar perfil para la cuenta Katuq

```powershell
aws configure set aws_access_key_id   <ACCESS_KEY> --profile katuq
aws configure set aws_secret_access_key <SECRET_KEY> --profile katuq
aws configure set region us-east-1 --profile katuq
aws configure set output json --profile katuq

# Validar
aws sts get-caller-identity --profile katuq
```

### Uso del perfil

```powershell
# Por sesión
$env:AWS_PROFILE = "katuq"

# Por comando
aws s3 ls --profile katuq
aws ec2 describe-instances --profile katuq

# Volver al default
$env:AWS_PROFILE = $null
```

### Archivos de credenciales (Windows)

- `C:\Users\danie\.aws\credentials` → access keys
- `C:\Users\danie\.aws\config` → region, role assumption, SSO
- Backups seguros: `C:\Users\danie\.aws\backups\` (ACLs restringidas, hidden, solo user `danie`)

⚠️ **Anti-patterns**:
- Las keys del root user comprometen toda la cuenta. Cuando haya tiempo: crear IAM user con `AdministratorAccess`, generar keys de ese user, eliminar las de root.
- No comitear CSV ni .pem (ya están en `.gitignore` del proyecto via `*.pem`, pero NO `*.csv`).

### Múltiples cuentas: opciones

1. **Access keys (rápido)**: `aws configure --profile <nombre>` y se usa con `--profile`.
2. **SSO (seguro)**: `aws configure sso --profile <nombre>` + `aws sso login --profile <nombre>`. Tokens temporales, no requiere rotación manual.
3. **Role assumption (cross-account)**: en `~/.aws/config`:
   ```ini
   [profile cuenta-nueva]
   role_arn = arn:aws:iam::OTRA_CUENTA:role/NombreDelRol
   source_profile = default
   region = us-east-1
   ```

No hay límite práctico de perfiles. Sí hay límite de **2 access keys por usuario IAM** (límite AWS).

---

## 2. Inventario de recursos cuenta `011528299077`

### EC2 (us-east-1)

| Instance ID | Tipo | Estado | IP pública | Tag Name | Rol |
|---|---|---|---|---|---|
| `i-048c285a773d96d64` | t3.medium | running | `13.222.206.185` | julsmind-api | Backend Express prod (`back.katuq.com` + `api.katuq.com`) |
| `i-056afe0336394d4c7` | t3.large | stopped | — | general | Sin uso (consume EBS — eliminar si no se va a usar) |

### Lightsail (us-east-1)

| Instance | Plan | Estado | IP pública | Rol |
|---|---|---|---|---|
| `OpenClaw-1` | medium_3_0 | running | `98.84.41.121` | OpenClaw gateway (Telegram bot) |
| `julsmind-api` | small_3_0 | running | `34.237.136.82` | Staging/test (katuq-test) |

### S3 (3 buckets)

- `julsmind-s3`
- `ultimamilla-backend-prod-serverlessdeploymentbucke-bnhv6jpq8fop`
- `ultimamilla-uploads-prod`

### Lambda (us-east-1)

- `ultimamilla-backend-prod-api` (nodejs18.x)

### IAM Users

- `BedrockAPIKey-xqch`
- `claude-code`
- `generl`
- `telemetria`

### Vacío

- ❌ Route53 (DNS de katuq.com está en otro registrador o cuenta)
- ❌ CloudFront
- ❌ RDS

---

## 3. Acceso a OpenClaw-1 (Lightsail)

### Particularidades

- **SSH key**: `oe3` (NO la default Lightsail)
- **Puerto 22**: cerrado al público por defecto (solo `lightsail-connect`)
- **Usuario**: `ubuntu`
- **AWS profile en la instancia**: `assumed` → asume role `LightsailRoleFor-i-01e236b15ba29e7c9` con policy inline `OpenClawBedrockAccess` vía IMDS

### Cómo entrar — patrón completo

Como no tenemos la key `oe3` localmente, usamos las credenciales SSH temporales que da Lightsail (cert válido 13 minutos):

```bash
# 1. Detectar mi IP pública
MYIP=$(curl -s https://checkip.amazonaws.com)

# 2. Abrir puerto 22 SOLO a mi IP
export AWS_PROFILE=katuq
aws lightsail open-instance-public-ports \
  --instance-name OpenClaw-1 --region us-east-1 \
  --port-info "fromPort=22,toPort=22,protocol=TCP,cidrs=$MYIP/32"

# 3. Pedir credenciales SSH temporales
aws lightsail get-instance-access-details \
  --instance-name OpenClaw-1 --region us-east-1 --protocol ssh \
  --output json > /c/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-access.json

# 4. Extraer privateKey + cert (Node)
node -e "
  const fs=require('fs');
  const d=JSON.parse(fs.readFileSync('C:/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-access.json','utf8')).accessDetails;
  fs.writeFileSync('C:/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-temp.pem', d.privateKey);
  fs.writeFileSync('C:/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-temp.pem-cert.pub', d.certKey);
"
chmod 400 /c/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-temp.pem

# 5. SSH (el cert -cert.pub se carga automáticamente porque tiene el sufijo correcto)
ssh -i /c/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-temp.pem \
    -o StrictHostKeyChecking=no ubuntu@98.84.41.121
```

### Cleanup obligatorio al salir

```bash
# Cerrar puerto 22
aws lightsail close-instance-public-ports \
  --instance-name OpenClaw-1 --region us-east-1 \
  --port-info "fromPort=22,toPort=22,protocol=TCP,cidrs=$MYIP/32"

# Borrar credenciales temporales
rm -f /c/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-temp.pem \
      /c/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-temp.pem-cert.pub \
      /c/sourcecodejuls/Seller.Katuq/ops/ec2-keys/openclaw-access.json
```

### Estructura interna de OpenClaw-1

| Path | Contenido |
|---|---|
| `/home/ubuntu/.openclaw/openclaw.json` | Config principal (modelos, channels, plugins, sandbox) |
| `/home/ubuntu/.openclaw/agents/main/sessions/` | Sesiones de chat (`*.jsonl` por sesión) |
| `/home/ubuntu/.openclaw/memory/main.sqlite` | Memoria del agente (SQLite) |
| `/home/ubuntu/.openclaw/workspace/` | Archivos editables por el agente (MEMORY.md, IDENTITY.md, USER.md, etc.) |
| `/home/ubuntu/.openclaw/credentials/` | Credenciales de canales (Telegram, WA) |
| `/home/ubuntu/.config/systemd/user/openclaw-gateway.service` | Unit user systemd |
| `/usr/lib/node_modules/openclaw/dist/` | Binario node de openclaw |
| `/tmp/openclaw/openclaw-YYYY-MM-DD.log` | Logs JSON por día |

Servicio:

```bash
systemctl --user status openclaw-gateway
systemctl --user restart openclaw-gateway
systemctl --user reset-failed openclaw-gateway   # cuando systemd se rinde tras 5 fails
journalctl --user -u openclaw-gateway --no-pager -n 50
```

---

## 4. Amazon Bedrock — modelos y model access

### Habilitar modelos (vía Console)

URL directa para `us-east-1`:
```
https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
```

→ **Modify model access** → tildá modelos → **Submit**.
- Anthropic (primera vez): pide use-case form. Acceso inmediato tras enviar.
- Otros: aceptan EULA al instante.

⚠️ Vía CLI no sirve para activar — `put-use-case-for-model-access` solo registra el use case, no activa. AWS lo confirma.

### Listar modelos disponibles

```bash
# Modelos base por proveedor (algunos requieren inference profile para invocar)
aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?modelLifecycle.status==`ACTIVE`].[providerName,modelId,modelName]' \
  --output text | sort

# Inference profiles regionales (los Claude 4.x SOLO se invocan via inference profile)
aws bedrock list-inference-profiles --region us-east-1 \
  --query 'inferenceProfileSummaries[].[inferenceProfileId,inferenceProfileName,status]' \
  --output table
```

### Probar invocación

```bash
# Converse (no streaming)
aws bedrock-runtime converse --region us-east-1 \
  --model-id us.anthropic.claude-haiku-4-5-20251001-v1:0 \
  --messages '[{"role":"user","content":[{"text":"hi"}]}]' \
  --inference-config maxTokens=50

# Test con tools (para verificar tool use support)
aws bedrock-runtime converse --region us-east-1 \
  --model-id us.amazon.nova-lite-v1:0 \
  --messages '[{"role":"user","content":[{"text":"What is the weather in Bogota?"}]}]' \
  --tool-config '{"tools":[{"toolSpec":{"name":"get_weather","description":"Get weather","inputSchema":{"json":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}}]}' \
  --inference-config maxTokens=100
```

### Errores comunes y qué significan

| Error | Causa | Fix |
|---|---|---|
| `AccessDeniedException ... no identity-based policy allows bedrock:*` | El profile/role no tiene policy Bedrock | Usar el profile correcto (en OpenClaw es `--profile assumed`) |
| `ValidationException: ...with on-demand throughput isn't supported` | Modelo Claude 4.x base — debe usarse vía inference profile (`us.*` o `global.*`) | Cambiar `model-id` al inference profile |
| `ResourceNotFoundException: Model is marked by provider as Legacy` | AWS deprecó el modelo por inactividad >30 días | Cambiar a un modelo activo (Sonnet 4.6, Haiku 4.5, etc.) |
| `ValidationException: This model doesn't support tool use in streaming mode` | El modelo (ej. Llama 4 Scout) soporta tools pero no en streaming | Usar otro modelo: Claude o Nova soportan tools+streaming |
| `ValidationException: User messages cannot contain reasoning content` | Modelo (ej. Nova Lite) no acepta bloques `reasoning_content` que openclaw envía | Cambiar a modelo que sí los acepte (Claude 4.x) |
| `ThrottlingException` | Saturación del modelo en la región | Reintentar / usar otro modelo / otra región |

### Compatibilidad con OpenClaw (Converse-stream + tools + reasoning_content)

| Modelo | Tools | Streaming | Reasoning content | Veredicto OpenClaw |
|---|---|---|---|---|
| Claude Sonnet 4.x (`us.anthropic.claude-sonnet-4-*`) | ✅ | ✅ | ✅ | OK pero caro ($3/$15) |
| **Claude Haiku 4.5** | ✅ | ✅ | ✅ | **Recomendado** ($1/$5) |
| Claude Opus 4.x | ✅ | ✅ | ✅ | OK, premium ($15/$75) |
| Llama 4 Scout/Maverick | ✅ | ❌ | ⚠️ | NO con OpenClaw |
| Nova Pro/Lite/Micro | ✅ | ✅ | ❌ | NO con OpenClaw (rechaza reasoning_content) |
| DeepSeek R1 | ✅ | ⚠️ | ⚠️ | Probar con cuidado |
| Gemma 3 (4B/12B/27B) | ⚠️ | — | — | No probado, tool support limitado |

### Costo estimado on-demand (us-east-1, USD por 1M tokens)

| Modelo | Input | Output |
|---|---|---|
| Nova Micro | $0.035 | $0.14 |
| Nova Lite | $0.06 | $0.24 |
| Llama 4 Scout 17B | ~$0.17 | ~$0.66 |
| Llama 3.3 70B | ~$0.72 | ~$0.72 |
| **Claude Haiku 4.5** | $1.00 | $5.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Opus 4.x | $15.00 | $75.00 |

### Verificar costos reales (Cost Explorer)

```bash
aws ce get-cost-and-usage --region us-east-1 \
  --time-period Start=2026-05-01,End=2026-05-05 \
  --granularity DAILY --metrics BlendedCost UsageQuantity \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Bedrock"]}}' \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

⚠️ **Cost Explorer tiene 24-48h de delay**. Las invocaciones que fallan con AccessDenied o ValidationException **NO se cobran**.

---

## 5. Cambiar modelo en OpenClaw-1 — receta

```bash
# Dentro de la instancia (post-SSH)
CONF=/home/ubuntu/.openclaw/openclaw.json
STAMP=$(date +%Y%m%d-%H%M%S)
cp $CONF $CONF.bak-$STAMP

# Cambiar primary
jq '.agents.defaults.model.primary = "bedrock/us.anthropic.claude-haiku-4-5-20251001-v1:0"' \
   $CONF > $CONF.tmp && mv $CONF.tmp $CONF

# (Opcional) Agregar el modelo a la lista catálogo
jq '.models.providers.bedrock.models += [{
  "api":"bedrock-converse-stream",
  "contextWindow":200000,
  "cost":{"cacheRead":0,"cacheWrite":0,"input":1,"output":5},
  "id":"us.anthropic.claude-haiku-4-5-20251001-v1:0",
  "input":["text","image"],
  "maxTokens":8192,
  "name":"Claude Haiku 4.5",
  "reasoning":false
}]' $CONF > $CONF.tmp && mv $CONF.tmp $CONF

# Restart
systemctl --user restart openclaw-gateway
sleep 5
systemctl --user is-active openclaw-gateway
```

### Reglas de schema del config

- `agents.defaults.model` solo acepta `primary` (NO `fallback` — el schema lo rechaza)
- `models.providers.bedrock.models[*].input` solo acepta `["text"]` o `["text","image"]` (NO `"video"` aunque el modelo lo soporte)
- Si el config queda inválido, openclaw crashea al iniciar y systemd se rinde tras 5 reintentos rápidos. Recovery: `systemctl --user reset-failed openclaw-gateway && systemctl --user start openclaw-gateway`

### Resetear historial de conversación (cuando el modelo "imita" identidad vieja)

```bash
SDIR=/home/ubuntu/.openclaw/agents/main/sessions
SF=$SDIR/<SESSION_ID>.jsonl   # ID está en sessions.json bajo .deliveryContext.to

# Backup + vaciar
cp $SF $SF.bak-$(date +%Y%m%d-%H%M%S)
> $SF

# Resetear flags de la sesión para regenerar system prompt
jq '(.["agent:main:main"].systemSent) = false |
    (.["agent:main:main"].compactionCount) = 0' \
   $SDIR/sessions.json > $SDIR/sessions.json.tmp && \
   mv $SDIR/sessions.json.tmp $SDIR/sessions.json

systemctl --user restart openclaw-gateway
```

---

## 6. Troubleshooting de OpenClaw — patrones reales

### Patrón: "el bot no responde / no procesa mensajes"

1. Verificar service: `systemctl --user is-active openclaw-gateway`
2. Si está failed: ver `journalctl --user -u openclaw-gateway --no-pager -n 30`
3. Si "Start request repeated too quickly": `systemctl --user reset-failed openclaw-gateway && systemctl --user start openclaw-gateway`
4. Si está active pero no invoca modelo:
   - Buscar `embedded_run_start` / `embedded_run_agent_end` en `/tmp/openclaw/openclaw-YYYY-MM-DD.log`
   - Si hay 0 invocaciones nuevas: probable problema de canal (allowFrom Telegram, autenticación, etc.)
5. Si invoca pero falla: ver el campo `error` en `embedded_run_agent_end`

### Patrón: "Sandbox FS error" / "write failed: requires python3 or python"

El sandbox de openclaw busca el binario **`python`** (sin sufijo). Si solo tenés `python3` instalado, los writes fallan.

```bash
sudo apt-get install -y python-is-python3
which python  # debe devolver /usr/bin/python
systemctl --user restart openclaw-gateway
```

### Patrón: "Telegram allowFrom inválido"

```
Invalid allowFrom entry: "julsmind_bot" - allowFrom/groupAllowFrom authorization expects numeric Telegram sender user IDs only
```

El `allowFrom` exige IDs numéricos (no @usernames). Para obtener tu ID: hablale a `@userinfobot` en Telegram. Luego:

```bash
jq '.channels.telegram.allowFrom = [123456789]' $CONF > $CONF.tmp && mv $CONF.tmp $CONF
```

Para grupos: el ID negativo va en `.channels.telegram.groups`, no en `allowFrom`.

### Útil: comandos de diagnóstico rápido

```bash
# Modelo activo
jq '.agents.defaults.model' /home/ubuntu/.openclaw/openclaw.json

# Última invocación al modelo
tail -300 /tmp/openclaw/openclaw-$(date -u +%Y-%m-%d).log | \
  grep -oE '"event":"embedded_run_(start|agent_end)"|"model":"[^"]+"|"isError":(true|false)|"error":"[^"]{0,150}'

# Errores reales (ignorando false positives como punycode)
START=$(date -u -d '5 minutes ago' +%H:%M)
awk -v s="$START" '$0 ~ "\"date\":\"2026-05-04T" s' \
  /tmp/openclaw/openclaw-$(date -u +%Y-%m-%d).log | \
  grep -iE 'logLevelName.:.ERROR|isError.:true' | \
  grep -v -iE 'punycode|DeprecationWarning'
```

---

## 7. Historial de cambios aplicados (Mayo 2026)

| Fecha | Cambio | Backup |
|---|---|---|
| 2026-05-04 | Sonnet 4 (legacy denied) → Sonnet 4.6 | `openclaw.json.bak-20260504-193827` |
| 2026-05-04 | Sonnet 4.6 → Llama 4 Scout (probar barato) | `openclaw.json.bak-20260504-194609` |
| 2026-05-04 | Llama 4 Scout → Nova Lite (Scout no soporta tools+streaming) | `openclaw.json.bak-20260504-195003` |
| 2026-05-04 | Nova Lite → **Haiku 4.5** (Nova rechaza reasoning_content) | (varios) |
| 2026-05-04 | Reset historial JSONL (3 menciones "Soy Claude Sonnet 4" contaminaban) | `f7dce9eb-...jsonl.bak-20260504-195901` |
| 2026-05-04 | Instalado `python-is-python3` para que sandbox pueda escribir | — |
| 2026-05-04 | KAI/ADK: agregado flag soft `USE_BEDROCK` con LiteLLM. Sin flag → Gemini (default). Con flag → Haiku 4.5 vía Bedrock | Refactor en 7 archivos del adk_agent |

**Modelo final**: `bedrock/us.anthropic.claude-haiku-4-5-20251001-v1:0` (Claude Haiku 4.5)

---

## 8. Ahorro logrado

| Concepto | Antes (Sonnet 4 original) | Ahora (Haiku 4.5) |
|---|---|---|
| Costo input ($/MTok) | 3.00 | 1.00 |
| Costo output ($/MTok) | 15.00 | 5.00 |
| **Reducción** | — | **3× más barato** |

Costo Bedrock real reportado por Cost Explorer entre 2026-05-01 y 2026-05-04: **$0.00** (todas las invocaciones del modelo viejo eran rechazadas antes de cobrar).

---

## 9. KAI/ADK Agent — Bedrock con flag soft

KAI es el agente Python con Google ADK en `kai/adk_agent/`. Tiene un soft flag para alternar entre Gemini y Bedrock sin romper nada.

### Cómo funciona

| Variable | Comportamiento |
|---|---|
| `USE_BEDROCK=false` o no seteado | Default histórico — todos los roles usan Gemini (gemini-2.5-flash, gemini-2.5-flash-lite, etc.) |
| `USE_BEDROCK=true` | Todos los orchestrators y workflows usan AWS Bedrock vía `LiteLlm` (Haiku 4.5 default) |

Los agents `analysis.py` y `assignment.py` usan `vertexai.GenerativeModel` directo y **siempre** se quedan en Gemini (porque vertexai no soporta otros providers). Se controlan con `VERTEX_GEMINI_MODEL`.

### Activar Bedrock

En `kai/adk_agent/.env`:

```bash
USE_BEDROCK=true
AWS_REGION_NAME=us-east-1
AWS_ACCESS_KEY_ID=AKIAQFLZD4JC2LIXJTWE
AWS_SECRET_ACCESS_KEY=<secret>

# Override por rol (opcional, default = Haiku 4.5)
# BEDROCK_DEFAULT_MODEL=bedrock/us.anthropic.claude-sonnet-4-6
# BEDROCK_FAST_MODEL=bedrock/us.anthropic.claude-haiku-4-5-20251001-v1:0
```

Reiniciar el agent: `python main.py` (Windows) o `pm2 restart 1` (prod).

### IAM user dedicado

User `BedrockAPIKey-xqch` en cuenta `011528299077`. Policies:
- `AmazonBedrockLimitedAccess` (managed)
- `AmazonBedrockMarketplaceAccess` (managed)

Para generar nuevas access keys:
```bash
aws iam create-access-key --user-name BedrockAPIKey-xqch --profile katuq
```
(la respuesta incluye el secret una sola vez)

### Archivos modificados (Mayo 2026)

| Archivo | Cambio |
|---|---|
| `config/model_config.py` | Reescrito con flag + `_wrap_bedrock()` que usa `LiteLlm` |
| `agents/orchestrators/{general_manager,inventory,sales,logistics}.py` | Usan `get_model("default")` / `get_model("fast")` en vez de `os.getenv` |
| `agents/workflows/negotiation_loop.py` | Idem |
| `agents/analysis.py`, `agents/assignment.py` | Renombrado env var a `VERTEX_GEMINI_MODEL` (siempre Gemini) |
| `requirements.txt` | + `litellm>=1.50.0` y `boto3>=1.34.0` |
| `.env.example` | Bloque AWS Bedrock documentado |

### Fallback chains

Cuando `USE_BEDROCK=true`, las cadenas de fallback son:
- `claude-haiku-4-5` → `claude-sonnet-4-6` → `claude-sonnet-4-5`
- `claude-sonnet-4-6` → `claude-haiku-4-5`

### Validación E2E (probado)

```python
import litellm
litellm.completion(
    model='bedrock/us.anthropic.claude-haiku-4-5-20251001-v1:0',
    messages=[{'role':'user','content':'hola'}],
    max_tokens=20,
)
# -> respuesta válida con AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY del IAM user
```

### Limitaciones conocidas

- `analysis.py` / `assignment.py` no migran a Bedrock (vertexai-only)
- `video_orchestrator.py` usa Gemini 2.5 con audio nativo — Bedrock no tiene equivalente
- Haiku 4.5 tiene ~80% del rendimiento agentic de Sonnet 4.6 en multi-step delegations complejas. Si el orchestrator se "pierde", subir a Sonnet 4.6 con `BEDROCK_DEFAULT_MODEL=bedrock/us.anthropic.claude-sonnet-4-6`

---

## 10. Referencias rápidas

### URLs Console

- IAM credentials: https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials
- Bedrock model access: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
- Lightsail OpenClaw-1 connect: https://lightsail.aws.amazon.com/ls/webapp/us-east-1/instances/OpenClaw-1/connect
- Lightsail SSH keys: https://lightsail.aws.amazon.com/ls/webapp/account/keys?region=us-east-1
- Cost Explorer: https://us-east-1.console.aws.amazon.com/cost-management/home

### Inference profiles más usados (us-east-1)

```
us.anthropic.claude-haiku-4-5-20251001-v1:0      # Haiku 4.5 (actual primary OpenClaw)
us.anthropic.claude-sonnet-4-6                   # Sonnet 4.6
us.anthropic.claude-sonnet-4-5-20250929-v1:0     # Sonnet 4.5
us.anthropic.claude-opus-4-7                     # Opus 4.7
us.anthropic.claude-opus-4-6-v1                  # Opus 4.6
us.amazon.nova-pro-v1:0                          # Nova Pro
us.amazon.nova-lite-v1:0                         # Nova Lite
us.amazon.nova-micro-v1:0                        # Nova Micro
us.meta.llama4-scout-17b-instruct-v1:0           # Llama 4 Scout
us.meta.llama4-maverick-17b-instruct-v1:0        # Llama 4 Maverick
us.meta.llama3-3-70b-instruct-v1:0               # Llama 3.3 70B
us.deepseek.r1-v1:0                              # DeepSeek R1
```

### Versiones documentadas

- AWS CLI: 2.34.18
- Python (en OpenClaw-1): 3.12.3
- Node (en OpenClaw-1): 22.22.2
- OpenClaw gateway: v2026.4.14
