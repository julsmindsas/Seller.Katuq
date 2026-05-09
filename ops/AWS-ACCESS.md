# AWS Access — cuenta Katuq

> Cómo configurar el perfil AWS CLI de la cuenta Katuq y qué recursos hay en ella. Para temas específicos de OpenClaw / Bedrock / modelos AI ver `kai/docs/AWS-BEDROCK-OPENCLAW-PLAYBOOK.md`.
>
> Última actualización: 2026-05-04

---

## 1. Cuentas AWS y perfiles CLI

### Cuentas conocidas

| Cuenta | ID | Acceso | Notas |
|---|---|---|---|
| Personal (default) | `862551216617` | IAM user `gogirald@gmail.com` | Otra cuenta del usuario |
| **Katuq** | `011528299077` | Root access keys | Cuenta donde corre `julsmind-api` (back.katuq.com), OpenClaw-1, ultimamilla |

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
| `i-048c285a773d96d64` | t3.medium | running | `13.222.206.185` | julsmind-api | **Backend Express prod** (`back.katuq.com` + `api.katuq.com`) |
| `i-056afe0336394d4c7` | t3.large | stopped | — | general | Sin uso (consume EBS — eliminar si no se va a usar) |

### Lightsail (us-east-1)

| Instance | Plan | Estado | IP pública | Rol |
|---|---|---|---|---|
| `OpenClaw-1` | medium_3_0 | running | `98.84.41.121` | OpenClaw gateway (Telegram bot) — ver `kai/docs/AWS-BEDROCK-OPENCLAW-PLAYBOOK.md` |
| `julsmind-api` | small_3_0 | running | `34.237.136.82` | Staging/test (katuq-test) |

### S3 (3 buckets)

- `julsmind-s3`
- `ultimamilla-backend-prod-serverlessdeploymentbucke-bnhv6jpq8fop`
- `ultimamilla-uploads-prod`

### Lambda (us-east-1)

- `ultimamilla-backend-prod-api` (nodejs18.x)

### IAM Users

- `BedrockAPIKey-xqch` (usado por kai/adk_agent para Bedrock)
- `claude-code`
- `generl`
- `telemetria`

### Vacío

- ❌ Route53 (DNS de katuq.com está en otro registrador o cuenta)
- ❌ CloudFront
- ❌ RDS

---

## Acceso SSH a producción

- **Prod backend Express** (`julsmind-api` EC2 → `back.katuq.com`): key en `ops/ec2-keys/julsmind-api-prod-legacy.pem`
- **Staging Lightsail** (`julsmind-api` Lightsail → katuq-test): key en `ops/ec2-keys/lightsail-default-us-east-1.pem`

Las pem **NO se comitean** (`.gitignore` cubre `*.pem`). Detalles del workflow de deploy y operación en producción (pm2 como root, logs en `/root/.pm2/logs/`, sin hot-reload) viven en la memoria del proyecto.
