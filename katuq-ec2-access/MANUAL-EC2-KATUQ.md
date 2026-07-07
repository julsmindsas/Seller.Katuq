# Manual de Acceso y Deploy — EC2 Katuq
> Generado 2026-05-15 | Cuenta AWS: `011528299077`

---

## Llaves SSH incluidas en este paquete

| Archivo | Sirve para |
|---|---|
| `lightsail-default-us-east-1.pem` | **ACTIVA** — todas las instancias Lightsail/EC2 en us-east-1 (prod + staging) |

---

## Instancias

### `julsmind-api` — PRODUCCIÓN (`back.katuq.com`)

| Campo | Valor |
|---|---|
| Hostname | `ec2-13-222-206-185.compute-1.amazonaws.com` |
| IP pública | `13.222.206.185` |
| Usuario SSH | `ubuntu` |
| Llave | `lightsail-default-us-east-1.pem` |

```powershell
# Conectar a producción (PowerShell / Windows)
ssh -i "lightsail-default-us-east-1.pem" ubuntu@ec2-13-222-206-185.compute-1.amazonaws.com
```

### `katuq-test` — STAGING

| Campo | Valor |
|---|---|
| IP pública | `34.237.136.82` |
| Usuario SSH | `ubuntu` |
| Llave | `lightsail-default-us-east-1.pem` (misma que prod) |

```powershell
# Conectar a staging
ssh -i "lightsail-default-us-east-1.pem" ubuntu@34.237.136.82
```

---

## Permisos del PEM en Windows

Si SSH tira `UNPROTECTED PRIVATE KEY FILE`, correr una sola vez:

```powershell
icacls "lightsail-default-us-east-1.pem" /inheritance:r
icacls "lightsail-default-us-east-1.pem" /grant:r "$($env:USERNAME):(R)"
```

---

## Una vez dentro del servidor

```bash
# Pasar a root (root login directo está deshabilitado)
sudo -i

# Ver procesos Node
ps aux | grep node

# Ver servicios activos
systemctl list-units --type=service | grep -i katuq
pm2 list

# Logs pm2 (corren como root)
pm2 logs
# o directamente:
tail -f /root/.pm2/logs/*.log
```

---

## Deploy del Backend Express (katuq_admin_back_firebase)

> ⚠️ El backend NO tiene hot-reload. Todo cambio requiere reinicio manual.

```bash
# 1. Conectar al server
ssh -i "lightsail-default-us-east-1.pem" ubuntu@ec2-13-222-206-185.compute-1.amazonaws.com

# 2. Pasar a root
sudo -i

# 3. Ir al directorio del proyecto
cd /root/katuq_admin_back_firebase   # ajustar al path real

# 4. Pull de cambios
git pull origin main

# 5. Instalar dependencias si hubo cambios en package.json
cd functions && npm install

# 6. Reiniciar con pm2
#    IMPORTANTE: usar el daemon ubuntu (NO sudo pm2 — hay 2 daemons)
pm2 restart katuq-api

# 7. Verificar que arrancó
pm2 list
pm2 logs katuq-api --lines 30
```

---

## Deploy del Frontend Angular (Seller.Katuq)

El frontend se deploya a **Firebase Hosting** (no a EC2):

```powershell
# Desde la máquina de desarrollo (Windows)
cd C:\sourcecodejuls\Seller.Katuq

# Build prod + deploy a Firebase Hosting
npm run release
# Equivale a: npm run build:prod && firebase deploy --only hosting
```

---

## Deploy de KAI ADK (Python)

```bash
# En el servidor
sudo -i
cd /home/ubuntu/kai/adk_agent

git pull origin erp-connector    # rama activa en prod

# Reiniciar servicio systemd
systemctl restart kai-adk.service
systemctl status kai-adk.service

# Ver logs
journalctl -u kai-adk.service -f
```

---

## Consolas AWS

- **Lightsail** (origin): https://lightsail.aws.amazon.com/ → Account → SSH keys → us-east-1 → "Default"
- **EC2** (instancia migrada `julsmind-api`): https://us-east-1.console.aws.amazon.com/ec2/

### Si perdés la llave

1. Lightsail Console → Account → SSH keys → Region `us-east-1` → Download "Default"
2. Guardala como `lightsail-default-us-east-1.pem`
3. Aplicar permisos (sección de arriba)

Alternativa si la key fue eliminada en Lightsail:
- **EC2 Instance Connect** desde la consola (browser, sin llave)
- **AWS Systems Manager Session Manager** si la instancia tiene rol `AmazonSSMManagedInstanceCore`

---

## Recursos de la cuenta `011528299077`

| Recurso | Detalle |
|---|---|
| EC2 `julsmind-api` | t3.medium, running, `13.222.206.185` — backend prod |
| EC2 `general` | t3.large, stopped — sin uso |
| Lightsail `OpenClaw-1` | medium_3_0, `98.84.41.121` — bot Telegram/OpenClaw |
| Lightsail `julsmind-api` | small_3_0, `34.237.136.82` — staging |
| S3 | `julsmind-s3`, `ultimamilla-backend-prod-*`, `ultimamilla-uploads-prod` |
| Lambda | `ultimamilla-backend-prod-api` (nodejs18.x) |

---

## Seguridad

- **NO compartir este ZIP por canales inseguros** (WhatsApp, email sin cifrar).
- Si la llave se filtra: rotar en Lightsail Console y eliminar la vieja.
- Próxima mejora recomendada: crear IAM user con `AdministratorAccess` y eliminar las root access keys.
