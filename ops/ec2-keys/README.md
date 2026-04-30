# EC2 SSH Keys — Acceso a producción y pruebas

Este directorio guarda las llaves SSH para conectarse a las instancias Lightsail/EC2 de Katuq.

## ⚠️ Seguridad

- **NO COMMITEAR llaves al repo.** El `.gitignore` raíz ya excluye `*.pem` / `*.key` / `*.keystore`.
- Si compartís el repo con alguien, **NO le pases este directorio**.
- Si se filtra una llave, rotarla en AWS y borrarla de acá.

## Llaves disponibles

| Archivo | Sirve para | Origen |
|---|---|---|
| `lightsail-default-us-east-1.pem` | TODAS las instancias Lightsail/EC2 de Katuq en `us-east-1` (porque Lightsail usa UNA sola default key por región) — **es la activa** | Lightsail Console → Account → SSH keys → Region us-east-1 → "Default" |
| `julsmind-api-prod-legacy.pem` | Backup histórico — no es la activa hoy. Hash distinto al de Lightsail default. Probable key vieja de antes de migrar a la default Lightsail. **Guardada por seguridad**, no debería usarse para conectar normalmente | Descargada en algún momento como `julsmind-api-prod.pem` (ubicación original Downloads, ya movida) |

## Instancias

### `julsmind-api` (PRODUCCIÓN — `back.katuq.com`)

| Campo | Valor |
|---|---|
| Hostname | `ec2-13-222-206-185.compute-1.amazonaws.com` |
| IP pública | `13.222.206.185` |
| Instance ID | `i-048c285a773d96d64` |
| Usuario SSH | `ubuntu` |
| Llave | `lightsail-default-us-east-1.pem` |
| Región | us-east-1 |
| Origen | Lightsail → exportada a EC2 |

```powershell
ssh -i "ops/ec2-keys/lightsail-default-us-east-1.pem" ubuntu@ec2-13-222-206-185.compute-1.amazonaws.com
```

### `katuq-test` (PRUEBAS / STAGING)

| Campo | Valor |
|---|---|
| IP pública | `34.237.136.82` |
| Usuario SSH | `ubuntu` |
| Llave | `lightsail-default-us-east-1.pem` (la misma que prod) |
| Región | us-east-1 |
| Origen | Lightsail |

```powershell
ssh -i "ops/ec2-keys/lightsail-default-us-east-1.pem" ubuntu@34.237.136.82
```

## Permisos del archivo en Windows

Si SSH tira error `UNPROTECTED PRIVATE KEY FILE`, corré una sola vez:

```powershell
icacls "C:\sourcecodejuls\Seller.Katuq\ops\ec2-keys\lightsail-default-us-east-1.pem" /inheritance:r
icacls "C:\sourcecodejuls\Seller.Katuq\ops\ec2-keys\lightsail-default-us-east-1.pem" /grant:r "$($env:USERNAME):(R)"
```

## Una vez dentro del server

- **Pasar a root**: `sudo -i` (root login directo está deshabilitado por seguridad de Lightsail/EC2)
- **Ver puertos abiertos**: `sudo ss -tlnp` o `sudo netstat -tlnp`
- **Procesos node**: `ps aux | grep node`
- **Servicios systemd**: `systemctl list-units --type=service | grep -i katuq`
- **Si usa pm2**: `pm2 list`, `pm2 logs`, `pm2 restart <app>`
- **Logs**: típicamente en `/var/log/`, `~/.pm2/logs/` o donde la app los escriba

## AWS Console

- **Lightsail** (origen): https://lightsail.aws.amazon.com/ → Account → SSH keys → Region us-east-1 → "Default"
- **EC2** (donde aparece la instancia migrada `julsmind-api`): https://us-east-1.console.aws.amazon.com/ec2/. Muestra "Sin par de claves asociado" porque viene de Lightsail — esto es esperado.

## Recovery: si perdés la llave default

1. **Lightsail Console** → Account → SSH keys → Region `us-east-1` → Download la "Default".
2. Guardala acá como `lightsail-default-us-east-1.pem`.
3. Aplicá permisos (sección de arriba).

Si la default fue eliminada en Lightsail:
- **EC2 Instance Connect** desde la consola EC2 (browser) — no requiere llave.
- **AWS Systems Manager Session Manager** si la instancia tiene rol IAM con `AmazonSSMManagedInstanceCore`.

## Agregar más instancias

Si en el futuro aparecen otros servers (en otras regiones o con keys distintas), actualizar la tabla "Instancias" arriba. Si están en una región DISTINTA a us-east-1, vas a necesitar la default key de ESA región — descargala de Lightsail Console y guardala como `lightsail-default-<region>.pem`.

```
ops/ec2-keys/
├── lightsail-default-us-east-1.pem   ← actual (julsmind-api + katuq-test)
├── lightsail-default-us-east-2.pem   ← (futuro, si hay instancias en us-east-2)
└── README.md
```
